import { Injectable, Logger } from '@nestjs/common';
import { In, LessThanOrEqual } from 'typeorm';
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
import { TenantConnectionManager } from '../../database/tenant-connection-manager.service';

@Injectable()
export class SyncEngineService {
  private readonly logger = new Logger(SyncEngineService.name);
  private readonly adapters: Map<string, ChannelManagerProvider> = new Map();
  private isProcessing = false;

  constructor(
    private readonly tenantConn: TenantConnectionManager,
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

    // Periodically process queue every 30 seconds across shared + dedicated tenant DBs
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
    rawTenantId: string,
    rawPropertyId: string,
    connectionId: string,
    jobType: SyncJobType,
    payload?: any,
  ): Promise<ChannelSyncJob> {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const jobRepo = ds.getRepository(ChannelSyncJob);
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
      this.processJob(tenantId, saved.id).catch((err) =>
        this.logger.error(`Error executing job ${saved.id}`, err),
      );
    });

    return saved;
  }

  /**
   * Process a single job by tenantId & ID
   */
  async processJob(rawTenantId: string, jobId: string): Promise<boolean> {
    const { ds, tenantId } = await this.tenantConn.getDataSourceForTenant(rawTenantId);
    const jobRepo = ds.getRepository(ChannelSyncJob);
    const connRepo = ds.getRepository(ChannelConnection);
    const logRepo = ds.getRepository(ChannelSyncLog);

    const job = await jobRepo.findOne({
      where: { id: jobId, tenantId },
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
      const credentials = connection.encryptedCredentials
        ? this.encryptionService.decryptObject(connection.encryptedCredentials) || {}
        : {};

      // 1. Availability Push
      if (
        job.jobType === SyncJobType.AVAILABILITY_PUSH ||
        job.jobType === SyncJobType.FULL_SYNC
      ) {
        const roomMappings = await ds.getRepository(ChannelRoomMapping).find({
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
        const ratePlanMappings = await ds.getRepository(ChannelRatePlanMapping).find({
          where: { connectionId: connection.id, isActive: true },
        });

        const roomMappings = await ds.getRepository(ChannelRoomMapping).find({
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
              job.tenantId,
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
   * Process next batch of pending jobs across shared and dedicated tenant DBs
   */
  async processNextBatch(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const sources = await this.tenantConn.getAllActiveDataSources();
      for (const ds of sources) {
        const jobRepo = ds.getRepository(ChannelSyncJob);
        const pendingJobs = await jobRepo.find({
          where: {
            status: In([SyncJobStatus.PENDING]),
            nextRunAt: LessThanOrEqual(new Date()),
          },
          take: 10,
          order: { nextRunAt: 'ASC' },
        });

        for (const job of pendingJobs) {
          if (job.tenantId) {
            await this.processJob(job.tenantId, job.id);
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Manually trigger a retry for a specific failed job
   */
  async retryJob(rawTenantId: string, jobId: string): Promise<boolean> {
    const { ds, tenantId } = await this.tenantConn.getDataSourceForTenant(rawTenantId);
    const jobRepo = ds.getRepository(ChannelSyncJob);
    const job = await jobRepo.findOne({ where: { id: jobId, tenantId } });
    if (!job) return false;

    job.status = SyncJobStatus.PENDING;
    job.nextRunAt = new Date();
    await jobRepo.save(job);

    return this.processJob(tenantId, job.id);
  }
}
