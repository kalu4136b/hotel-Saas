import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Property } from './property.entity';
import { ChannelConnection } from './channel-connection.entity';

export enum SyncJobType {
  AVAILABILITY_PUSH = 'AVAILABILITY_PUSH',
  RATE_PUSH = 'RATE_PUSH',
  RESERVATION_PULL = 'RESERVATION_PULL',
  FULL_SYNC = 'FULL_SYNC',
}

export enum SyncJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity('channel_sync_jobs')
@Index(['tenantId', 'propertyId'])
@Index(['status', 'nextRunAt'])
export class ChannelSyncJob {
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
    name: 'job_type',
    type: 'enum',
    enum: SyncJobType,
    default: SyncJobType.FULL_SYNC,
  })
  jobType: SyncJobType;

  @Column({
    type: 'enum',
    enum: SyncJobStatus,
    default: SyncJobStatus.PENDING,
  })
  status: SyncJobStatus;

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount: number;

  @Column({ name: 'max_attempts', type: 'int', default: 5 })
  maxAttempts: number;

  @Column({ name: 'payload_json', type: 'text', nullable: true })
  payloadJson: string | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ name: 'next_run_at', type: 'datetime' })
  nextRunAt: Date;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
