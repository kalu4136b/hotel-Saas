import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BarItem, BarCategory } from './bar-item.entity';

export enum BarAdjustmentType {
  PHYSICAL_AUDIT = 'PHYSICAL_AUDIT',
  BREAKAGE = 'BREAKAGE',
  EXPIRY_SPOILAGE = 'EXPIRY_SPOILAGE',
  OVERPOUR_VARIANCE = 'OVERPOUR_VARIANCE',
  INTERNAL_TRANSFER = 'INTERNAL_TRANSFER',
  INITIAL_SETUP = 'INITIAL_SETUP',
  CORRECTION = 'CORRECTION',
}

@Entity('bar_stock_adjustments')
@Index(['tenantId', 'propertyId'])
@Index(['propertyId', 'createdAt'])
export class BarStockAdjustment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  tenantId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  propertyId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  barItemId: string;

  @ManyToOne(() => BarItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'barItemId' })
  barItem: BarItem;

  @Column({ type: 'varchar', length: 150 })
  barItemName: string;

  @Column({
    type: 'enum',
    enum: BarCategory,
    default: BarCategory.WHISKEY,
  })
  category: BarCategory;

  @Column({
    type: 'enum',
    enum: BarAdjustmentType,
    default: BarAdjustmentType.CORRECTION,
  })
  adjustmentType: BarAdjustmentType;

  @Column({ type: 'int', default: 0 })
  previousFullBottles: number;

  @Column({ type: 'int', default: 0 })
  newFullBottles: number;

  @Column({ type: 'int', default: 0 })
  fullBottlesDelta: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0.0 })
  previousOpenMl: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0.0 })
  newOpenMl: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0.0 })
  openMlDelta: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  netVolumeDeltaMl: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  costImpact: number;

  @Column({ type: 'varchar', length: 100 })
  adjustedBy: string;

  @Column({ type: 'varchar', length: 255 })
  reason: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
