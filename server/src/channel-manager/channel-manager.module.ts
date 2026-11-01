import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ChannelConnection,
  ChannelRoomMapping,
  ChannelRatePlanMapping,
  ChannelPricingRule,
  ChannelSyncJob,
  ChannelSyncLog,
  ChannelReservation,
  ChannelWebhookEvent,
  RoomType,
  Room,
  Reservation,
  Guest,
  GuestFolio,
  Property,
} from '../entities';
import { ChannelManagerService } from './channel-manager.service';
import { ChannelManagerController } from './channel-manager.controller';
import { ChannelWebhookController } from './controllers/channel-webhook.controller';
import { ChannelEncryptionService } from './services/encryption.service';
import { AvailabilityCalculationService } from './services/availability-calc.service';
import { PricingEngineService } from './services/pricing-engine.service';
import { SyncEngineService } from './services/sync-engine.service';
import { BookingComAdapter } from './adapters/booking-com.adapter';
import { ExpediaAdapter } from './adapters/expedia.adapter';
import { AgodaAdapter } from './adapters/agoda.adapter';
import { AirbnbAdapter } from './adapters/airbnb.adapter';
import { TripadvisorAdapter } from './adapters/tripadvisor.adapter';
import { ICalAdapter } from './adapters/ical.adapter';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChannelConnection,
      ChannelRoomMapping,
      ChannelRatePlanMapping,
      ChannelPricingRule,
      ChannelSyncJob,
      ChannelSyncLog,
      ChannelReservation,
      ChannelWebhookEvent,
      RoomType,
      Room,
      Reservation,
      Guest,
      GuestFolio,
      Property,
    ]),
  ],
  controllers: [ChannelManagerController, ChannelWebhookController],
  providers: [
    ChannelManagerService,
    ChannelEncryptionService,
    AvailabilityCalculationService,
    PricingEngineService,
    SyncEngineService,
    BookingComAdapter,
    ExpediaAdapter,
    AgodaAdapter,
    AirbnbAdapter,
    TripadvisorAdapter,
    ICalAdapter,
  ],
  exports: [
    ChannelManagerService,
    AvailabilityCalculationService,
    PricingEngineService,
    SyncEngineService,
  ],
})
export class ChannelManagerModule {}
