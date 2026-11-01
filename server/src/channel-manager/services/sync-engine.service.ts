import { Injectable, Logger } from '@nestjs/common';
import { DataSource, In, LessThanOrEqual } from 'typeorm';
import {
  ChannelConnection,
  ChannelConnectionStatus,
  SyncHealth,
  ChannelSyncJob,
  SyncJobType,
  SyncJobStatus,
  ChannelSyncLog,
  SyncOperationType,
  SyncLogStatus,
  ChannelRoomMapping,
  ChannelRatePlanMapping,
} from '../../entities';
import { ChannelEncryptionService } from './encryption.service';
import { AvailabilityCalculationService } from './availability-calc.service';
import { PricingEngineService } from './pricing-engine.service';
import {
  ChannelManagerProvider,
  AvailabilitySyncRequest,
  RateSyncRequest,
  SyncResult,
} from '../adapters/base.adapter';
import { BookingComAdapter } from '../adapters/booking-com.adapter';
import { ExpediaAdapter } from '../adapters/expedia.adapter';
import { AgodaAdapter } from '../adapters/agoda.adapter';
import { AirbnbAdapter } from '../adapters/airbnb.adapter';
import { TripadvisorAdapter } from '../adapters/tripadvisor.adapter';
import { ICalAdapter } from '../adapters/ical.adapter';

@Injectable()
export class SyncEngineService {
  private readonly logger = new Logger(SyncEngineService.name);
  private readonly adapters: Map<string, ChannelManagerProvider> = new Map();
  private isProcessing = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly encryptionService: ChannelEncryptionService,
    private readonly availabilityCalcService: AvailabilityCalculationService,
    private readonly pricingEngineService: PricingEngineService,
    private readonly bookingComAdapter: BookingComAdapter,
    private readonly expediaAdapter: ExpediaAdapter,
    private readonly agodaAdapter: AgodaAdapter,
    private readonly airbnbAdapter: AirbnbAdapter,
    private readonly tripadvisorAdapter: TripadvisorAdapter,
    private readonly icalAdapter: ICalAdapter,
  ) {
    this.adapters.set('BOOKING_COM', bookingComAdapter);
    this.adapters.set('EXPEDIA', expediaAdapter);
    this.adapters.set('AGODA', agodaAdapter);
    this.adapters.set('AIRBNB', airbnbAdapter);
    this.adapters.set('TRIPADVISOR', tripadvisorAdapter);
    this.adapters.set('ICAL', icalAdapter);

    // Periodically process queue every 30 seconds
    setInterval(() => {
      this.processNextBatch().catch((err) =>
        this.logger.error('Error in sync engine background loop', err),
      );
    }, 30000);
  }

  getAdapter(channelCode: string): ChannelManagerProvider | undefined {
    return this.adapters.get(channelCode);
  }

  /**
   * Enqueue a new sync job
   */
  async enqueueJob(
    tenantId: string,
    propertyId: string,
    connectionId: string,
    jobType: SyncJobType,
    payload?: any,
  ): Promise<ChannelSyncJob> {
    const jobRepo = this.dataSource.getRepository(ChannelSyncJob);
    const job = jobRepo.create({
      tenantId,
      propertyId,
      connectionId,
      jobType,
      status: SyncJobStatus.PENDING,
      attemptCount: 0,
      maxAttempts: 5,
      payloadJson: payload ? JSON.stringify(payload) : null,
      nextRunAt: new Date(),
    });
    const saved = await jobRepo.save(job);

    // Process immediately in background without blocking caller
    setImmediate(() => {
      this.processJob(saved.id).catch((err) =>
        this.logger.error(`Error executing job ${saved.id}`, err),
      );
    });

    return saved;
  }

  /**
   * Process a single job by ID
   */
  async processJob(jobId: string): Promise<boolean> {
    const jobRepo = this.dataSource.getRepository(ChannelSyncJob);
    const connRepo = this.dataSource.getRepository(ChannelConnection);
    const logRepo = this.dataSource.getRepository(ChannelSyncLog);

    const job = await jobRepo.findOne({
      where: { id: jobId },
      relations: { connection: true },
    });

    if (!job || !job.connection) return false;
    if (job.status === SyncJobStatus.COMPLETED) return true;

    const connection = job.connection;
    const adapter = this.adapters.get(connection.channelCode);
    if (!adapter) {
      this.logger.warn(`No adapter found for channel code ${connection.channelCode}`);
      return false;
    }

    job.status = SyncJobStatus.PROCESSING;
    job.attemptCount += 1;
    await jobRepo.save(job);

    const startTime = Date.now();
    let syncResult: SyncResult = {
      success: false,
      message: 'Unknown operation',
    };

    try {
      // Decrypt credentials
      const credentials = connection.encryptedCredentials
        ? this.encryptionService.decryptObject(connection.encryptedCredentials) || {}
        : {};

      // 1. Availability Push
      if (
        job.jobType === SyncJobType.AVAILABILITY_PUSH ||
        job.jobType === SyncJobType.FULL_SYNC
      ) {
        const roomMappings = await this.dataSource
          .getRepository(ChannelRoomMapping)
          .find({
            where: { connectionId: connection.id, isActive: true },
          });

        const grid = await this.availabilityCalcService.getAvailabilityGrid(
          job.tenantId,
          job.propertyId,
          14,
        );

        const availRequest: AvailabilitySyncRequest = {
          propertyId: job.propertyId,
          externalPropertyId: connection.externalPropertyId || '',
          credentials,
          roomMappings: roomMappings.map((m) => ({
            internalRoomTypeId: m.roomTypeId,
            externalRoomId: m.externalRoomId,
          })),
          dailyAvailability: grid.map((g) => ({
            date: g.date,
            internalRoomTypeId: g.roomTypeId,
            availableRooms: g.availableRooms,
            stopSell: g.stopSell,
          })),
        };

        syncResult = await adapter.syncAvailability(availRequest);
      }

      // 2. Rate Push
      if (
        (job.jobType === SyncJobType.RATE_PUSH || job.jobType === SyncJobType.FULL_SYNC) &&
        adapter.capabilities.supportsRatePush
      ) {
        const ratePlanMappings = await this.dataSource
          .getRepository(ChannelRatePlanMapping)
          .find({
            where: { connectionId: connection.id, isActive: true },
          });

        const roomMappings = await this.dataSource
          .getRepository(ChannelRoomMapping)
          .find({
            where: { connectionId: connection.id, isActive: true },
          });

        const grid = await this.availabilityCalcService.getAvailabilityGrid(
          job.tenantId,
          job.propertyId,
          14,
        );

        const dailyRates = [];
        for (const item of grid) {
          const rm = roomMappings.find((m) => m.roomTypeId === item.roomTypeId);
          if (!rm) continue;

          for (const rpm of ratePlanMappings) {
            const calculated = await this.pricingEngineService.calculateExternalRate(
              connection.id,
              item.roomTypeId,
              item.basePrice,
            );

            dailyRates.push({
              date: item.date,
              internalRoomTypeId: item.roomTypeId,
              externalRoomId: rm.externalRoomId,
              externalRatePlanId: rpm.externalRatePlanId,
              rate: calculated.adjustedRate,
              currency: calculated.currency,
              minStay: item.minStay,
              maxStay: item.maxStay,
              closedToArrival: item.closedToArrival,
              closedToDeparture: item.closedToDeparture,
            });
          }
        }

        const rateRequest: RateSyncRequest = {
          propertyId: job.propertyId,
          externalPropertyId: connection.externalPropertyId || '',
          credentials,
          ratePlanMappings: ratePlanMappings.map((m) => ({
            internalRatePlanCode: m.internalRatePlanCode,
            externalRatePlanId: m.externalRatePlanId,
          })),
          dailyRates,
        };

        const rateResult = await adapter.syncRatesAndRestrictions(rateRequest);
        if (!syncResult.success) {
          syncResult = rateResult;
        }
      }

      const durationMs = Date.now() - startTime;

      // Handle Outcome
      if (syncResult.success) {
        job.status = SyncJobStatus.COMPLETED;
        job.completedAt = new Date();
        job.lastError = null;

        connection.lastSyncAt = new Date();
        connection.lastSuccessfulSyncAt = new Date();
        connection.syncHealth = SyncHealth.HEALTHY;
        connection.lastErrorMessage = null;
        if (connection.status === ChannelConnectionStatus.SYNC_REQUIRED) {
          connection.status = ChannelConnectionStatus.CONNECTED;
        }

        await jobRepo.save(job);
        await connRepo.save(connection);

        await logRepo.save({
          tenantId: job.tenantId,
          propertyId: job.propertyId,
          connectionId: connection.id,
          channelCode: connection.channelCode,
          operation:
            job.jobType === SyncJobType.AVAILABILITY_PUSH
              ? SyncOperationType.AVAILABILITY_SYNC
              : SyncOperationType.RATE_SYNC,
          status: SyncLogStatus.SUCCESS,
          httpStatusCode: syncResult.httpStatusCode || 200,
          durationMs,
          requestPayload: syncResult.requestPayload || null,
          responsePayload: syncResult.responsePayload || null,
          errorMessage: null,
        });

        return true;
      } else {
        throw new Error(syncResult.message);
      }
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errorMsg = err.message || 'Unknown synchronization error';

      job.lastError = errorMsg;
      if (job.attemptCount >= job.maxAttempts) {
        job.status = SyncJobStatus.FAILED;
        connection.syncHealth = SyncHealth.CRITICAL;
        connection.status = ChannelConnectionStatus.SYNC_FAILED;
      } else {
        job.status = SyncJobStatus.PENDING;
        // Exponential backoff: 1m, 5m, 15m, 60m
        const backoffMinutes = [1, 5, 15, 60][Math.min(job.attemptCount - 1, 3)];
        job.nextRunAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
        connection.syncHealth = SyncHealth.WARNING;
      }

      connection.lastSyncAt = new Date();
      connection.lastErrorMessage = errorMsg;

      await jobRepo.save(job);
      await connRepo.save(connection);

      await logRepo.save({
        tenantId: job.tenantId,
        propertyId: job.propertyId,
        connectionId: connection.id,
        channelCode: connection.channelCode,
        operation:
          job.jobType === SyncJobType.AVAILABILITY_PUSH
            ? SyncOperationType.AVAILABILITY_SYNC
            : SyncOperationType.RATE_SYNC,
        status: SyncLogStatus.FAILED,
        httpStatusCode: syncResult.httpStatusCode || 500,
        durationMs,
        requestPayload: syncResult.requestPayload || null,
        responsePayload: syncResult.responsePayload || null,
        errorMessage: errorMsg,
      });

      return false;
    }
  }

  /**
   * Process next batch of pending jobs
   */
  async processNextBatch(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const jobRepo = this.dataSource.getRepository(ChannelSyncJob);
      const pendingJobs = await jobRepo.find({
        where: {
          status: In([SyncJobStatus.PENDING]),
          nextRunAt: LessThanOrEqual(new Date()),
        },
        take: 10,
        order: { nextRunAt: 'ASC' },
      });

      for (const job of pendingJobs) {
        await this.processJob(job.id);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Manually trigger a retry for a specific failed job
   */
  async retryJob(jobId: string): Promise<boolean> {
    const jobRepo = this.dataSource.getRepository(ChannelSyncJob);
    const job = await jobRepo.findOne({ where: { id: jobId } });
    if (!job) return false;

    job.status = SyncJobStatus.PENDING;
    job.nextRunAt = new Date();
    await jobRepo.save(job);

    return this.processJob(job.id);
  }
}
