import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DataSource, In, Like } from 'typeorm';
import {
  ChannelConnection,
  ChannelCode,
  ChannelConnectionStatus,
  SyncHealth,
  ChannelRoomMapping,
  ChannelRatePlanMapping,
  ChannelPricingRule,
  ChannelSyncJob,
  SyncJobType,
  ChannelSyncLog,
  ChannelReservation,
  ChannelWebhookEvent,
  WebhookEventStatus,
  RoomType,
  Room,
  Reservation,
  ReservationStatus,
  Guest,
  GuestFolio,
  FolioStatus,
  Property,
} from '../entities';
import { ChannelEncryptionService } from './services/encryption.service';
import { AvailabilityCalculationService } from './services/availability-calc.service';
import { PricingEngineService } from './services/pricing-engine.service';
import { SyncEngineService } from './services/sync-engine.service';
import {
  ChannelCredentials,
  ExternalReservation,
} from './adapters/base.adapter';

export const SUPPORTED_CHANNELS = [
  {
    code: ChannelCode.BOOKING_COM,
    name: 'Booking.com',
    logo: 'booking_com',
    type: 'OTA XML / REST API',
    description: 'Direct 2-way connection for rates, inventory, and instant reservations.',
  },
  {
    code: ChannelCode.EXPEDIA,
    name: 'Expedia Partner Central',
    logo: 'expedia',
    type: 'EPC QuickConnect',
    description: 'Distribution to Expedia, Hotels.com, Vrbo, and Orbitz networks.',
  },
  {
    code: ChannelCode.AGODA,
    name: 'Agoda YCS',
    logo: 'agoda',
    type: 'YCS Connectivity API',
    description: 'High-volume distribution across Asia-Pacific and international travelers.',
  },
  {
    code: ChannelCode.AIRBNB,
    name: 'Airbnb',
    logo: 'airbnb',
    type: 'Direct API & 2-Way iCal',
    description: 'Connect boutique hotels, villas, and vacation rentals to global guests.',
  },
  {
    code: ChannelCode.TRIPADVISOR,
    name: 'Tripadvisor TripConnect',
    logo: 'tripadvisor',
    type: 'TripConnect Instant Booking',
    description: 'Direct booking and price comparison on the worlds largest travel guidance platform.',
  },
  {
    code: ChannelCode.ICAL,
    name: 'Universal 2-Way iCal',
    logo: 'calendar',
    type: 'RFC 5545 Calendar Feed',
    description: 'Universal calendar sync for villas, boutique resorts, and external portals.',
  },
];

@Injectable()
export class ChannelManagerService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly encryptionService: ChannelEncryptionService,
    private readonly availabilityCalcService: AvailabilityCalculationService,
    private readonly pricingEngineService: PricingEngineService,
    private readonly syncEngineService: SyncEngineService,
  ) {}

  /**
   * 1. Centralized Channel Manager Dashboard
   */
  async getDashboardOverview(tenantId: string, propertyId: string) {
    const connRepo = this.dataSource.getRepository(ChannelConnection);
    const jobRepo = this.dataSource.getRepository(ChannelSyncJob);
    const resRepo = this.dataSource.getRepository(ChannelReservation);

    // Ensure all supported channels have a row for this property
    await this.ensureAllConnectionsExist(tenantId, propertyId);

    const connections = await connRepo.find({
      where: { tenantId, propertyId },
      order: { channelCode: 'ASC' },
    });

    const totalChannels = SUPPORTED_CHANNELS.length;
    const connectedChannels = connections.filter(
      (c) => c.status === ChannelConnectionStatus.CONNECTED,
    ).length;
    const activeChannels = connections.filter(
      (c) =>
        c.status === ChannelConnectionStatus.CONNECTED &&
        c.autoSyncEnabled,
    ).length;
    const inactiveChannels = connections.filter(
      (c) =>
        c.status === ChannelConnectionStatus.NOT_CONNECTED ||
        c.status === ChannelConnectionStatus.DISABLED,
    ).length;
    const channelsRequiringAttention = connections.filter(
      (c) =>
        c.status === ChannelConnectionStatus.SYNC_FAILED ||
        c.status === ChannelConnectionStatus.SYNC_REQUIRED ||
        c.syncHealth === SyncHealth.CRITICAL,
    ).length;

    // Last successful sync across any channel
    const lastSuccessfulSyncConnection = [...connections]
      .filter((c) => c.lastSuccessfulSyncAt)
      .sort(
        (a, b) =>
          new Date(b.lastSuccessfulSyncAt!).getTime() -
          new Date(a.lastSuccessfulSyncAt!).getTime(),
      )[0];

    const pendingJobsCount = await jobRepo.count({
      where: {
        tenantId,
        propertyId,
        status: In(['PENDING', 'PROCESSING'] as any),
      },
    });

    const failedSyncAttempts = await jobRepo.count({
      where: {
        tenantId,
        propertyId,
        status: 'FAILED' as any,
      },
    });

    const totalChannelReservations = await resRepo.count({
      where: { tenantId, propertyId },
    });

    // Decorate connection objects with metadata
    const channelCards = connections.map((conn) => {
      const meta = SUPPORTED_CHANNELS.find((s) => s.code === conn.channelCode);
      const adapter = this.syncEngineService.getAdapter(conn.channelCode);

      return {
        id: conn.id,
        channelCode: conn.channelCode,
        platformName: meta?.name || conn.channelCode,
        platformLogo: meta?.logo || 'generic',
        integrationType: meta?.type || 'API',
        status: conn.status,
        syncHealth: conn.syncHealth,
        autoSyncEnabled: conn.autoSyncEnabled,
        externalPropertyId: conn.externalPropertyId,
        lastSyncAt: conn.lastSyncAt,
        lastSuccessfulSyncAt: conn.lastSuccessfulSyncAt,
        lastErrorMessage: conn.lastErrorMessage,
        requiresOfficialPartnerApproval:
          adapter?.capabilities.requiresOfficialPartnerApproval || false,
        officialDocumentationUrl:
          adapter?.capabilities.officialDocumentationUrl || '',
      };
    });

    return {
      summary: {
        totalChannels,
        connectedChannels,
        activeChannels,
        inactiveChannels,
        channelsRequiringAttention,
        lastSuccessfulSync: lastSuccessfulSyncConnection?.lastSuccessfulSyncAt || null,
        pendingSyncJobs: pendingJobsCount,
        failedSyncAttempts,
        totalChannelReservations,
      },
      channels: channelCards,
    };
  }

  /**
   * 2. Ensure connection records exist for all supported channels
   */
  async ensureAllConnectionsExist(tenantId: string, propertyId: string) {
    const connRepo = this.dataSource.getRepository(ChannelConnection);
    const existing = await connRepo.find({ where: { tenantId, propertyId } });
    const existingCodes = new Set(existing.map((e) => e.channelCode));

    for (const ch of SUPPORTED_CHANNELS) {
      if (!existingCodes.has(ch.code as ChannelCode)) {
        const newConn = connRepo.create({
          tenantId,
          propertyId,
          channelCode: ch.code as ChannelCode,
          name: ch.name,
          status: ChannelConnectionStatus.NOT_CONNECTED,
          syncHealth: SyncHealth.UNKNOWN,
          autoSyncEnabled: true,
        });
        await connRepo.save(newConn);
      }
    }
  }

  /**
   * 3. Get connection details
   */
  async getConnection(tenantId: string, propertyId: string, channelCode: ChannelCode) {
    const connRepo = this.dataSource.getRepository(ChannelConnection);
    const conn = await connRepo.findOne({
      where: { tenantId, propertyId, channelCode },
    });
    if (!conn) throw new NotFoundException('Channel connection not found');

    const meta = SUPPORTED_CHANNELS.find((s) => s.code === conn.channelCode);
    const adapter = this.syncEngineService.getAdapter(conn.channelCode);

    // Decrypt credentials for viewing/editing (with password masked)
    let decryptedCreds: ChannelCredentials = {};
    if (conn.encryptedCredentials) {
      decryptedCreds =
        this.encryptionService.decryptObject(conn.encryptedCredentials) || {};
    }

    const maskedCreds = { ...decryptedCreds };
    if (maskedCreds.password) {
      maskedCreds.password = '••••••••';
    }
    if (maskedCreds.apiSecret) {
      maskedCreds.apiSecret = '••••••••';
    }

    return {
      ...conn,
      platformName: meta?.name || conn.channelCode,
      platformLogo: meta?.logo || 'generic',
      integrationType: meta?.type || 'API',
      credentials: maskedCreds,
      capabilities: adapter?.capabilities,
    };
  }

  /**
   * 4. Update credentials and connection configuration
   */
  async updateConnection(
    tenantId: string,
    propertyId: string,
    channelCode: ChannelCode,
    dto: {
      credentials: ChannelCredentials;
      externalPropertyId?: string;
      autoSyncEnabled?: boolean;
    },
  ) {
    const connRepo = this.dataSource.getRepository(ChannelConnection);
    const conn = await connRepo.findOne({
      where: { tenantId, propertyId, channelCode },
    });
    if (!conn) throw new NotFoundException('Channel connection not found');

    // Merge credentials if masked
    let mergedCreds = { ...dto.credentials };
    if (conn.encryptedCredentials) {
      const existing =
        this.encryptionService.decryptObject<ChannelCredentials>(
          conn.encryptedCredentials,
        ) || {};

      if (dto.credentials.password === '••••••••') {
        mergedCreds.password = existing.password;
      }
      if (dto.credentials.apiSecret === '••••••••') {
        mergedCreds.apiSecret = existing.apiSecret;
      }
    }

    // Encrypt credentials
    conn.encryptedCredentials = this.encryptionService.encryptObject(mergedCreds);
    if (dto.externalPropertyId !== undefined) {
      conn.externalPropertyId = dto.externalPropertyId.trim();
    }
    if (dto.autoSyncEnabled !== undefined) {
      conn.autoSyncEnabled = dto.autoSyncEnabled;
    }

    conn.status = ChannelConnectionStatus.CONNECTING;
    const saved = await connRepo.save(conn);

    // Automatically test connection
    const testResult = await this.testConnection(tenantId, propertyId, channelCode);
    return { connection: saved, testResult };
  }

  /**
   * 5. Test live connection
   */
  async testConnection(tenantId: string, propertyId: string, channelCode: ChannelCode) {
    const connRepo = this.dataSource.getRepository(ChannelConnection);
    const conn = await connRepo.findOne({
      where: { tenantId, propertyId, channelCode },
    });
    if (!conn) throw new NotFoundException('Channel connection not found');

    const adapter = this.syncEngineService.getAdapter(channelCode);
    if (!adapter) throw new BadRequestException(`Unsupported channel: ${channelCode}`);

    const credentials = conn.encryptedCredentials
      ? this.encryptionService.decryptObject<ChannelCredentials>(
          conn.encryptedCredentials,
        ) || {}
      : {};

    const health = await adapter.testConnection(credentials);

    if (health.healthy) {
      conn.status = ChannelConnectionStatus.CONNECTED;
      conn.syncHealth = SyncHealth.HEALTHY;
      conn.lastErrorMessage = null;
      if (health.externalPropertyId) {
        conn.externalPropertyId = health.externalPropertyId;
      }
    } else {
      conn.syncHealth = health.requiresPartnerApproval
        ? SyncHealth.WARNING
        : SyncHealth.CRITICAL;
      conn.lastErrorMessage = health.message;
      if (conn.status === ChannelConnectionStatus.CONNECTING) {
        conn.status = ChannelConnectionStatus.SYNC_REQUIRED;
      }
    }

    await connRepo.save(conn);
    return health;
  }

  /**
   * 6. Disconnect channel
   */
  async disconnectChannel(tenantId: string, propertyId: string, channelCode: ChannelCode) {
    const connRepo = this.dataSource.getRepository(ChannelConnection);
    const conn = await connRepo.findOne({
      where: { tenantId, propertyId, channelCode },
    });
    if (!conn) throw new NotFoundException('Channel connection not found');

    conn.status = ChannelConnectionStatus.DISABLED;
    conn.autoSyncEnabled = false;
    conn.syncHealth = SyncHealth.UNKNOWN;
    return connRepo.save(conn);
  }

  /**
   * 7. Reconnect channel
   */
  async reconnectChannel(tenantId: string, propertyId: string, channelCode: ChannelCode) {
    const connRepo = this.dataSource.getRepository(ChannelConnection);
    const conn = await connRepo.findOne({
      where: { tenantId, propertyId, channelCode },
    });
    if (!conn) throw new NotFoundException('Channel connection not found');

    conn.status = ChannelConnectionStatus.CONNECTED;
    conn.autoSyncEnabled = true;
    return connRepo.save(conn);
  }

  // ==========================================
  // ROOM MAPPINGS
  // ==========================================

  async getRoomMappings(tenantId: string, propertyId: string, connectionId: string) {
    const mappingRepo = this.dataSource.getRepository(ChannelRoomMapping);
    const roomTypeRepo = this.dataSource.getRepository(RoomType);

    const internalRoomTypes = await roomTypeRepo.find({
      where: { tenantId, propertyId, isActive: true },
      order: { name: 'ASC' },
    });

    const mappings = await mappingRepo.find({
      where: { connectionId },
      relations: { roomType: true },
    });

    return {
      internalRoomTypes,
      mappings,
    };
  }

  async saveRoomMapping(
    connectionId: string,
    dto: {
      roomTypeId: string;
      externalRoomId: string;
      externalRoomName?: string;
      externalMaxOccupancy?: number;
      syncAvailability?: boolean;
      syncRates?: boolean;
    },
  ) {
    const repo = this.dataSource.getRepository(ChannelRoomMapping);
    let mapping = await repo.findOne({
      where: { connectionId, roomTypeId: dto.roomTypeId },
    });

    if (!mapping) {
      mapping = repo.create({
        connectionId,
        roomTypeId: dto.roomTypeId,
        externalRoomId: dto.externalRoomId.trim(),
        externalRoomName: dto.externalRoomName?.trim() || '',
        externalMaxOccupancy: Number(dto.externalMaxOccupancy) || 2,
        syncAvailability: dto.syncAvailability ?? true,
        syncRates: dto.syncRates ?? true,
        isActive: true,
      });
    } else {
      mapping.externalRoomId = dto.externalRoomId.trim();
      mapping.externalRoomName = dto.externalRoomName?.trim() || mapping.externalRoomName;
      mapping.externalMaxOccupancy = Number(dto.externalMaxOccupancy) || mapping.externalMaxOccupancy;
      if (dto.syncAvailability !== undefined) mapping.syncAvailability = dto.syncAvailability;
      if (dto.syncRates !== undefined) mapping.syncRates = dto.syncRates;
    }

    return repo.save(mapping);
  }

  async deleteRoomMapping(connectionId: string, mappingId: string) {
    const repo = this.dataSource.getRepository(ChannelRoomMapping);
    const mapping = await repo.findOne({ where: { id: mappingId, connectionId } });
    if (!mapping) throw new NotFoundException('Mapping not found');
    return repo.remove(mapping);
  }

  /**
   * Automatic mapping suggestions based on room type name similarity
   */
  async autoSuggestRoomMappings(tenantId: string, propertyId: string, connectionId: string) {
    const roomTypes = await this.dataSource.getRepository(RoomType).find({
      where: { tenantId, propertyId, isActive: true },
    });

    return roomTypes.map((rt) => ({
      roomTypeId: rt.id,
      roomTypeName: rt.name,
      suggestedExternalId: `EXT-${rt.code || rt.name.slice(0, 4).toUpperCase()}`,
      suggestedExternalName: rt.name,
      suggestedOccupancy: rt.maxOccupancy,
    }));
  }

  // ==========================================
  // RATE PLAN MAPPINGS
  // ==========================================

  async getRatePlanMappings(connectionId: string) {
    return this.dataSource.getRepository(ChannelRatePlanMapping).find({
      where: { connectionId },
      order: { internalRatePlanCode: 'ASC' },
    });
  }

  async saveRatePlanMapping(
    connectionId: string,
    dto: {
      internalRatePlanCode: string;
      externalRatePlanId: string;
      externalRatePlanName?: string;
      mealPlan?: any;
      cancellationPolicy?: any;
    },
  ) {
    const repo = this.dataSource.getRepository(ChannelRatePlanMapping);
    let mapping = await repo.findOne({
      where: {
        connectionId,
        internalRatePlanCode: dto.internalRatePlanCode.toUpperCase().trim(),
      },
    });

    if (!mapping) {
      mapping = repo.create({
        connectionId,
        internalRatePlanCode: dto.internalRatePlanCode.toUpperCase().trim(),
        externalRatePlanId: dto.externalRatePlanId.trim(),
        externalRatePlanName: dto.externalRatePlanName?.trim() || '',
        mealPlan: dto.mealPlan || 'ROOM_ONLY',
        cancellationPolicy: dto.cancellationPolicy || 'FLEXIBLE',
        isActive: true,
      });
    } else {
      mapping.externalRatePlanId = dto.externalRatePlanId.trim();
      mapping.externalRatePlanName = dto.externalRatePlanName?.trim() || mapping.externalRatePlanName;
      if (dto.mealPlan) mapping.mealPlan = dto.mealPlan;
      if (dto.cancellationPolicy) mapping.cancellationPolicy = dto.cancellationPolicy;
    }

    return repo.save(mapping);
  }

  async deleteRatePlanMapping(connectionId: string, mappingId: string) {
    const repo = this.dataSource.getRepository(ChannelRatePlanMapping);
    const mapping = await repo.findOne({ where: { id: mappingId, connectionId } });
    if (!mapping) throw new NotFoundException('Rate plan mapping not found');
    return repo.remove(mapping);
  }

  // ==========================================
  // PRICING RULES
  // ==========================================

  async getPricingRules(connectionId: string) {
    return this.dataSource.getRepository(ChannelPricingRule).find({
      where: { connectionId },
      relations: { roomType: true },
      order: { createdAt: 'DESC' },
    });
  }

  async savePricingRule(
    connectionId: string,
    dto: {
      roomTypeId?: string;
      adjustmentType: any;
      adjustmentValue: number;
      applyToAllRoomTypes?: boolean;
    },
  ) {
    const repo = this.dataSource.getRepository(ChannelPricingRule);
    const rule = repo.create({
      connectionId,
      roomTypeId: dto.roomTypeId || null,
      adjustmentType: dto.adjustmentType,
      adjustmentValue: Number(dto.adjustmentValue) || 0,
      currency: 'LKR',
      applyToAllRoomTypes: dto.applyToAllRoomTypes ?? !dto.roomTypeId,
      isActive: true,
    });
    return repo.save(rule);
  }

  async deletePricingRule(connectionId: string, ruleId: string) {
    const repo = this.dataSource.getRepository(ChannelPricingRule);
    const rule = await repo.findOne({ where: { id: ruleId, connectionId } });
    if (!rule) throw new NotFoundException('Pricing rule not found');
    return repo.remove(rule);
  }

  // ==========================================
  // AVAILABILITY & RATES MATRIX
  // ==========================================

  async getAvailabilityGrid(tenantId: string, propertyId: string, days = 14) {
    return this.availabilityCalcService.getAvailabilityGrid(tenantId, propertyId, days);
  }

  // ==========================================
  // SYNC DISPATCH & QUEUE
  // ==========================================

  async triggerSync(
    tenantId: string,
    propertyId: string,
    channelCode: ChannelCode,
    jobType = SyncJobType.FULL_SYNC,
  ) {
    const connRepo = this.dataSource.getRepository(ChannelConnection);
    const conn = await connRepo.findOne({
      where: { tenantId, propertyId, channelCode },
    });
    if (!conn) throw new NotFoundException('Channel connection not found');

    return this.syncEngineService.enqueueJob(
      tenantId,
      propertyId,
      conn.id,
      jobType,
    );
  }

  // ==========================================
  // CHANNEL RESERVATIONS
  // ==========================================

  async getChannelReservations(
    tenantId: string,
    propertyId: string,
    channelCode?: string,
    search?: string,
  ) {
    const qb = this.dataSource
      .getRepository(ChannelReservation)
      .createQueryBuilder('cr')
      .leftJoinAndSelect('cr.reservation', 'res')
      .leftJoinAndSelect('res.guest', 'guest')
      .leftJoinAndSelect('res.roomType', 'roomType')
      .leftJoinAndSelect('res.room', 'room')
      .where('cr.tenantId = :tenantId', { tenantId })
      .andWhere('cr.propertyId = :propertyId', { propertyId });

    if (channelCode) {
      qb.andWhere('cr.channelCode = :channelCode', { channelCode });
    }

    if (search) {
      qb.andWhere(
        '(cr.externalReservationId LIKE :q OR res.reservationNumber LIKE :q OR guest.fullName LIKE :q)',
        { q: `%${search}%` },
      );
    }

    qb.orderBy('cr.createdAt', 'DESC');
    return qb.getMany();
  }

  // ==========================================
  // SYNC LOGS & RETRIES
  // ==========================================

  async getSyncLogs(tenantId: string, propertyId: string, limit = 50) {
    return this.dataSource.getRepository(ChannelSyncLog).find({
      where: { tenantId, propertyId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async retryFailedJob(tenantId: string, propertyId: string, jobId: string) {
    const job = await this.dataSource.getRepository(ChannelSyncJob).findOne({
      where: { id: jobId, tenantId, propertyId },
    });
    if (!job) throw new NotFoundException('Sync job not found');
    return this.syncEngineService.retryJob(job.id);
  }

  // ==========================================
  // INBOUND RESERVATION INGESTION (WEBHOOK OR PULL)
  // ==========================================

  async ingestExternalReservation(
    tenantId: string,
    propertyId: string,
    connectionId: string,
    resData: ExternalReservation,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Idempotency Check: Does this external reservation already exist?
      const existingChannelRes = await queryRunner.manager
        .getRepository(ChannelReservation)
        .findOne({
          where: {
            propertyId,
            externalReservationId: resData.externalId,
            channelCode: resData.channelCode as ChannelCode,
          },
          relations: { reservation: true },
        });

      if (existingChannelRes) {
        // Handle cancellation
        if (resData.status === 'CANCELLED') {
          existingChannelRes.channelStatus = 'CANCELLED';
          await queryRunner.manager.getRepository(ChannelReservation).save(existingChannelRes);

          if (existingChannelRes.reservation) {
            existingChannelRes.reservation.status = ReservationStatus.CANCELLED;
            await queryRunner.manager
              .getRepository(Reservation)
              .save(existingChannelRes.reservation);
          }
          await queryRunner.commitTransaction();
          return { status: 'CANCELLED_EXISTING', reservation: existingChannelRes.reservation };
        }

        await queryRunner.rollbackTransaction();
        return { status: 'ALREADY_EXISTS', reservation: existingChannelRes.reservation };
      }

      // 2. Resolve internal room type from external mapping
      let roomTypeId = resData.roomTypeId;
      if (!roomTypeId && resData.externalRoomId) {
        const mapping = await queryRunner.manager
          .getRepository(ChannelRoomMapping)
          .findOne({
            where: {
              connectionId,
              externalRoomId: resData.externalRoomId,
            },
          });
        if (mapping) roomTypeId = mapping.roomTypeId;
      }

      // Fallback to first available room type if unmapped
      if (!roomTypeId) {
        const firstType = await queryRunner.manager.getRepository(RoomType).findOne({
          where: { tenantId, propertyId, isActive: true },
        });
        if (!firstType) throw new BadRequestException('No room types available on property');
        roomTypeId = firstType.id;
      }

      const roomType = await queryRunner.manager
        .getRepository(RoomType)
        .findOne({ where: { id: roomTypeId } });

      // 3. Resolve or create Guest
      let guest = await queryRunner.manager.getRepository(Guest).findOne({
        where: { propertyId, fullName: resData.guestName.trim() },
      });

      if (!guest) {
        guest = queryRunner.manager.getRepository(Guest).create({
          tenantId,
          propertyId,
          fullName: resData.guestName.trim(),
          email: resData.guestEmail?.trim(),
          phone: resData.guestPhone?.trim(),
          vipLevel: 'OTA_GUEST',
          notes: `Imported via ${resData.channelCode}`,
        });
        guest = await queryRunner.manager.getRepository(Guest).save(guest);
      }

      // 4. Compute nights and amounts
      const start = new Date(resData.checkInDate);
      const end = new Date(resData.checkOutDate);
      const diffTime = Math.max(1, end.getTime() - start.getTime());
      const nightsCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      const nightlyRate = Number(roomType?.basePricePerNight) || 100;
      const totalAmount = resData.totalAmount || nightsCount * nightlyRate;

      // 5. Generate internal reservation number
      const count = await queryRunner.manager
        .getRepository(Reservation)
        .count({ where: { propertyId } });
      const reservationNumber = `OTA-${resData.channelCode.slice(0, 3)}-${(8000 + count + 1).toString()}`;

      // 6. Create internal Reservation
      const reservation = queryRunner.manager.getRepository(Reservation).create({
        tenantId,
        propertyId,
        reservationNumber,
        guestId: guest.id,
        roomTypeId,
        checkInDate: resData.checkInDate,
        checkOutDate: resData.checkOutDate,
        nightsCount,
        adultsCount: resData.adultsCount || 2,
        childrenCount: resData.childrenCount || 0,
        nightlyRate,
        totalAmount,
        depositPaid: 0,
        status: ReservationStatus.CONFIRMED,
        source: resData.channelCode,
        specialRequests: resData.specialRequests,
      });

      const savedReservation = await queryRunner.manager
        .getRepository(Reservation)
        .save(reservation);

      // 7. Create ChannelReservation link
      const channelRes = queryRunner.manager.getRepository(ChannelReservation).create({
        tenantId,
        propertyId,
        reservationId: savedReservation.id,
        connectionId,
        channelCode: resData.channelCode as ChannelCode,
        externalReservationId: resData.externalId,
        channelStatus: resData.status,
        channelTotalAmount: totalAmount,
        channelCurrency: resData.currency || 'LKR',
        channelCommissionAmount: resData.commissionAmount || 0,
        rawPayloadJson: JSON.stringify(resData.rawPayload || {}),
      });

      await queryRunner.manager.getRepository(ChannelReservation).save(channelRes);

      await queryRunner.commitTransaction();
      return { status: 'CREATED', reservation: savedReservation };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
