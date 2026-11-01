import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Property } from './property.entity';
import { ChannelConnection, ChannelCode } from './channel-connection.entity';

export enum SyncOperationType {
  AVAILABILITY_SYNC = 'AVAILABILITY_SYNC',
  RATE_SYNC = 'RATE_SYNC',
  RESERVATION_IMPORT = 'RESERVATION_IMPORT',
  WEBHOOK_RECEIVE = 'WEBHOOK_RECEIVE',
  CONNECTION_TEST = 'CONNECTION_TEST',
}

export enum SyncLogStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  WARNING = 'WARNING',
}

@Entity('channel_sync_logs')
@Index(['tenantId', 'propertyId'])
@Index(['connectionId', 'createdAt'])
export class ChannelSyncLog {
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

  @Column({ name: 'connection_id' })
  connectionId: string;

  @ManyToOne(() => ChannelConnection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'connection_id' })
  connection: ChannelConnection;

  @Column({
    name: 'channel_code',
    type: 'enum',
    enum: ChannelCode,
  })
  channelCode: ChannelCode;

  @Column({
    type: 'enum',
    enum: SyncOperationType,
  })
  operation: SyncOperationType;

  @Column({
    type: 'enum',
    enum: SyncLogStatus,
    default: SyncLogStatus.SUCCESS,
  })
  status: SyncLogStatus;

  @Column({ name: 'http_status_code', type: 'int', nullable: true })
  httpStatusCode: number | null;

  @Column({ name: 'duration_ms', type: 'int', default: 0 })
  durationMs: number;

  @Column({ name: 'request_payload', type: 'text', nullable: true })
  requestPayload: string | null;

  @Column({ name: 'response_payload', type: 'text', nullable: true })
  responsePayload: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
