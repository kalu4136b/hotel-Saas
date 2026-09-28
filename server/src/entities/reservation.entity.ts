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
import { Guest } from './guest.entity';
import { RoomType } from './room-type.entity';
import { Room } from './room.entity';

export enum ReservationStatus {
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

@Entity('reservations')
@Index(['tenantId', 'propertyId'])
@Index(['propertyId', 'reservationNumber'], { unique: true })
export class Reservation {
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

  @Column({ name: 'reservation_number', length: 50 })
  reservationNumber: string;

  @Column({ name: 'guest_id' })
  guestId: string;

  @ManyToOne(() => Guest, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'guest_id' })
  guest: Guest;

  @Column({ name: 'room_type_id' })
  roomTypeId: string;

  @ManyToOne(() => RoomType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'room_type_id' })
  roomType: RoomType;

  @Column({ name: 'room_id', nullable: true })
  roomId: string;

  @ManyToOne(() => Room, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column({ name: 'check_in_date', type: 'date' })
  checkInDate: string;

  @Column({ name: 'check_out_date', type: 'date' })
  checkOutDate: string;

  @Column({ name: 'nights_count', type: 'int', default: 1 })
  nightsCount: number;

  @Column({ name: 'adults_count', type: 'int', default: 1 })
  adultsCount: number;

  @Column({ name: 'children_count', type: 'int', default: 0 })
  childrenCount: number;

  @Column({
    name: 'nightly_rate',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0.0,
  })
  nightlyRate: number;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0.0,
  })
  totalAmount: number;

  @Column({
    name: 'deposit_paid',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0.0,
  })
  depositPaid: number;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.CONFIRMED,
  })
  status: ReservationStatus;

  @Column({ name: 'booking_source', length: 50, default: 'DIRECT' })
  source: string;

  @Column({ name: 'special_requests', type: 'text', nullable: true })
  specialRequests: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
