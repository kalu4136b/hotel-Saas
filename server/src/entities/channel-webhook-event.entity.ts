import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ChannelConnection, ChannelCode } from './channel-connection.entity';

export enum WebhookEventStatus {
  RECEIVED = 'RECEIVED',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  IGNORED = 'IGNORED',
}

@Entity('channel_webhook_events')
@Index(['connectionId', 'eventId'], { unique: true })
@Index(['channelCode', 'status'])
export class ChannelWebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({ name: 'event_id', length: 150 })
  eventId: string;

  @Column({ name: 'event_type', length: 100, default: 'BOOKING_NOTIFICATION' })
  eventType: string;

  @Column({
    type: 'enum',
    enum: WebhookEventStatus,
    default: WebhookEventStatus.RECEIVED,
  })
  status: WebhookEventStatus;

  @Column({ name: 'payload_json', type: 'text', nullable: true })
  payloadJson: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
