import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Property } from './property.entity';

export enum ChannelCode {
  BOOKING_COM = 'BOOKING_COM',
  AGODA = 'AGODA',
  AIRBNB = 'AIRBNB',
  EXPEDIA = 'EXPEDIA',
  TRIPADVISOR = 'TRIPADVISOR',
  ICAL = 'ICAL',
}

export enum ChannelConnectionStatus {
  NOT_CONNECTED = 'NOT_CONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  SYNC_REQUIRED = 'SYNC_REQUIRED',
  SYNC_FAILED = 'SYNC_FAILED',
  DISABLED = 'DISABLED',
}

export enum SyncHealth {
  HEALTHY = 'HEALTHY',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  UNKNOWN = 'UNKNOWN',
}

@Entity('channel_connections')
@Index(['tenantId', 'propertyId'])
@Index(['propertyId', 'channelCode'], { unique: true })
export class ChannelConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'property_id' })
  propertyId: string;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({
    name: 'channel_code',
    type: 'enum',
    enum: ChannelCode,
  })
  channelCode: ChannelCode;

  @Column({ length: 100, default: '' })
  name: string;

  @Column({
    type: 'enum',
    enum: ChannelConnectionStatus,
    default: ChannelConnectionStatus.NOT_CONNECTED,
  })
  status: ChannelConnectionStatus;

  @Column({
    name: 'sync_health',
    type: 'enum',
    enum: SyncHealth,
    default: SyncHealth.UNKNOWN,
  })
  syncHealth: SyncHealth;

  @Column({ name: 'encrypted_credentials', type: 'text', nullable: true })
  encryptedCredentials: string | null;

  @Column({ name: 'external_property_id', type: 'varchar', length: 150, nullable: true })
  externalPropertyId: string | null;

  @Column({ name: 'webhook_secret', type: 'varchar', length: 120, nullable: true })
  webhookSecret: string | null;

  @Column({ name: 'auto_sync_enabled', type: 'boolean', default: true })
  autoSyncEnabled: boolean;

  @Column({ name: 'last_sync_at', type: 'datetime', nullable: true })
  lastSyncAt: Date | null;

  @Column({ name: 'last_successful_sync_at', type: 'datetime', nullable: true })
  lastSuccessfulSyncAt: Date | null;

  @Column({ name: 'last_error_message', type: 'text', nullable: true })
  lastErrorMessage: string | null;

  @Column({ name: 'settings_json', type: 'text', nullable: true })
  settingsJson: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
