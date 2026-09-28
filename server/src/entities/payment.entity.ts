import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
}

export enum PaymentStatus {
  COMPLETED = 'COMPLETED',
  REFUNDED = 'REFUNDED',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  receiptNumber: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  tenantId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  propertyId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  orderId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  billId: string;

  @Index()
  @Column({ type: 'varchar', length: 36, nullable: true })
  shiftId: string;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CASH,
  })
  paymentMethod: PaymentMethod;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amountPaid: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  changeGiven: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  cardLast4: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  transactionRef: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  processedByUserId: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.COMPLETED,
  })
  status: PaymentStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
