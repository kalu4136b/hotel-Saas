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
  POS_DIRECT_SALE = 'POS_DIRECT_SALE',
  OPERATIONAL_ISSUANCE = 'OPERATIONAL_ISSUANCE',
  OPERATIONAL_RETURN = 'OPERATIONAL_RETURN',
  WASTE_SPOILAGE = 'WASTE_SPOILAGE',
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
  RETURN = 'RETURN',
  TRANSFER = 'TRANSFER',
}

@Entity('stock_movements')
@Index(['tenantId', 'propertyId'])
@Index(['tenantId', 'propertyId', 'inventoryItemId'])
@Index(['tenantId', 'propertyId', 'movementType'])
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

  @Column({ type: 'varchar', length: 30, nullable: true })
  inventoryCategory: string; // BAR, KITCHEN, OPERATIONAL

  @Column({
    type: 'enum',
    enum: StockMovementType,
    default: StockMovementType.MANUAL_ADJUSTMENT,
  })
  movementType: StockMovementType;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  quantity: number; // Signed delta or total moved

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  quantityIn: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  quantityOut: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  previousStock: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  newStock: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  unitCost: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referenceId: string; // E.g., GRN-2026-0001, PO-2026-0001, KOT-1002, ISS-2026-0001

  @Column({ type: 'varchar', length: 80, nullable: true })
  department: string; // E.g. FRONT_OFFICE, BAR, KITCHEN

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  createdById: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  createdByName: string;

  @CreateDateColumn()
  createdAt: Date;
}
