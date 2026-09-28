import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  BILLED = 'BILLED',
}

@Entity('dining_tables')
export class DiningTable {
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

  @Column({ type: 'varchar', length: 50 })
  tableNumber: string;

  @Column({ type: 'int', default: 4 })
  capacity: number;

  @Column({
    type: 'enum',
    enum: TableStatus,
    default: TableStatus.AVAILABLE,
  })
  status: TableStatus;

  @Column({ type: 'varchar', length: 36, nullable: true })
  currentOrderId: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
