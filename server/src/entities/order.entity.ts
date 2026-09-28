import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

export enum OrderType {
  DINE_IN = 'DINE_IN',
  TAKEAWAY = 'TAKEAWAY',
}

export enum OrderStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  KOT_SENT = 'KOT_SENT',
  IN_PREPARATION = 'IN_PREPARATION',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  BILLED = 'BILLED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  orderNumber: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  tenantId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  propertyId: string;

  @Index()
  @Column({ type: 'varchar', length: 36, nullable: true })
  outletId: string;

  @Index()
  @Column({ type: 'varchar', length: 36, nullable: true })
  shiftId: string;

  @Index()
  @Column({ type: 'varchar', length: 36, nullable: true })
  tableId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tableNumber: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  createdByUserId: string;

  @Column({
    type: 'enum',
    enum: OrderType,
    default: OrderType.DINE_IN,
  })
  orderType: OrderType;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.OPEN,
  })
  status: OrderStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  customerName: string;

  @Column({ type: 'int', default: 1 })
  guestCount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  discountAmount: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  discountReason: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  serviceChargeAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  totalAmount: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  cancelledByUserId: string;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
