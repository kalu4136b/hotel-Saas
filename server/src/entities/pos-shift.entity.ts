import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ShiftStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

@Entity('pos_shifts')
export class POSShift {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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
  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @Column({
    type: 'enum',
    enum: ShiftStatus,
    default: ShiftStatus.OPEN,
  })
  status: ShiftStatus;

  @Column({ type: 'datetime' })
  openedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  closedAt: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  startingFloat: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  expectedCash: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  actualCashCount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  cashVariance: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
