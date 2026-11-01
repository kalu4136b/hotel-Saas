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
import { Reservation } from './reservation.entity';
import { ChannelConnection, ChannelCode } from './channel-connection.entity';

@Entity('channel_reservations')
@Index(['tenantId', 'propertyId'])
@Index(['propertyId', 'externalReservationId', 'channelCode'], { unique: true })
@Index(['reservationId'], { unique: true })
export class ChannelReservation {
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

  @Column({ name: 'reservation_id' })
  reservationId: string;

  @ManyToOne(() => Reservation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reservation_id' })
  reservation: Reservation;

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

  @Column({ name: 'external_reservation_id', length: 150 })
  externalReservationId: string;

  @Column({ name: 'channel_status', length: 60, default: 'CONFIRMED' })
  channelStatus: string;

  @Column({
    name: 'channel_total_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0.0,
  })
  channelTotalAmount: number;

  @Column({ name: 'channel_currency', length: 10, default: 'LKR' })
  channelCurrency: string;

  @Column({
    name: 'channel_commission_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0.0,
  })
  channelCommissionAmount: number;

  @Column({ name: 'raw_payload_json', type: 'text', nullable: true })
  rawPayloadJson: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
