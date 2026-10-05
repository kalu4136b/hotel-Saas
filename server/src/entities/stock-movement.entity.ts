import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InventoryItem } from './inventory-item.entity';

export enum StockMovementType {
  PURCHASE_RECEIPT = 'PURCHASE_RECEIPT',
  RECIPE_DEDUCTION = 'RECIPE_DEDUCTION',
  WASTE_SPOILAGE = 'WASTE_SPOILAGE',
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
  RETURN = 'RETURN',
}

@Entity('stock_movements')
@Index(['tenantId', 'propertyId'])
export class StockMovement {
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
  inventoryItemId: string;

  @ManyToOne(() => InventoryItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inventoryItemId' })
  inventoryItem: InventoryItem;

  @Column({
    type: 'enum',
    enum: StockMovementType,
    default: StockMovementType.MANUAL_ADJUSTMENT,
  })
  movementType: StockMovementType;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  unitCost: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referenceId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;
}
