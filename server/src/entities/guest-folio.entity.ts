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
import { Reservation } from './reservation.entity';
import { Guest } from './guest.entity';
import { Room } from './room.entity';
import { FolioItem } from './folio-item.entity';
import { FolioPayment } from './folio-payment.entity';

export enum FolioStatus {
  OPEN = 'OPEN',
  SETTLED = 'SETTLED',
}

@Entity('guest_folios')
@Index(['tenantId', 'propertyId'])
export class GuestFolio {
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

  @Column({ name: 'guest_id' })
  guestId: string;

  @ManyToOne(() => Guest, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'guest_id' })
  guest: Guest;

  @Column({ name: 'room_id', nullable: true })
  roomId: string;

  @ManyToOne(() => Room, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column({
    name: 'total_charges',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0.0,
  })
  totalCharges: number;

  @Column({
    name: 'total_payments',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0.0,
  })
  totalPayments: number;

  @Column({
    name: 'balance_due',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0.0,
  })
  balanceDue: number;

  @Column({
    type: 'enum',
    enum: FolioStatus,
    default: FolioStatus.OPEN,
  })
  status: FolioStatus;

  @OneToMany(() => FolioItem, (item) => item.folio)
  items: FolioItem[];

  @OneToMany(() => FolioPayment, (p) => p.folio)
  payments: FolioPayment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
