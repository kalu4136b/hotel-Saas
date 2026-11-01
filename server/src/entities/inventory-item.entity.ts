import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Supplier } from './supplier.entity';

export enum MainInventoryCategory {
  BAR = 'BAR',
  KITCHEN = 'KITCHEN',
  OPERATIONAL = 'OPERATIONAL',
}

export enum ItemType {
  CONSUMABLE = 'CONSUMABLE',
  REUSABLE_EQUIPMENT = 'REUSABLE_EQUIPMENT',
}

export enum InventoryCategory {
  PRODUCE = 'PRODUCE',
  DAIRY = 'DAIRY',
  MEAT = 'MEAT',
  DRY_GOODS = 'DRY_GOODS',
  BEVERAGES = 'BEVERAGES',
  PACKAGING = 'PACKAGING',
  AMENITIES = 'AMENITIES',
  OTHER = 'OTHER',
}

export enum InventoryUnit {
  KG = 'KG',
  G = 'G',
  L = 'L',
  ML = 'ML',
  PCS = 'PCS',
  PACK = 'PACK',
  BOTTLE = 'BOTTLE',
  CAN = 'CAN',
  BOX = 'BOX',
  CARTON = 'CARTON',
  ROLL = 'ROLL',
}

@Entity('inventory_items')
@Index(['tenantId', 'propertyId'])
@Index(['tenantId', 'propertyId', 'mainCategory'])
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  tenantId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  propertyId: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sku: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  itemCode: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Index()
  @Column({
    type: 'enum',
    enum: MainInventoryCategory,
    default: MainInventoryCategory.KITCHEN,
  })
  mainCategory: MainInventoryCategory;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subcategory: string;

  // Legacy category for backward compatibility
  @Column({
    type: 'enum',
    enum: InventoryCategory,
    default: InventoryCategory.DRY_GOODS,
  })
  category: InventoryCategory;

  // Stock Unit & Purchase Unit
  @Column({
    type: 'varchar',
    length: 30,
    default: 'PCS',
  })
  unit: string; // Stock unit (e.g. PCS, KG, L, BOTTLE, CAN, ROLL)

  @Column({
    type: 'varchar',
    length: 30,
    default: 'PCS',
  })
  purchaseUnit: string; // Purchase unit (e.g. CARTON, BAG, BOX, CRATE, DRUM, PCS)

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 1.0 })
  conversionFactor: number; // 1 Purchase Unit = conversionFactor Stock Units (e.g. 1 carton = 24 bottles)

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  currentStock: number; // Always tracked in Stock Units

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 5.0 })
  minStockLevel: number; // Safety stock alert threshold

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 10.0 })
  reorderLevel: number; // Suggested reorder trigger level

  @Index()
  @Column({ type: 'varchar', length: 36, nullable: true })
  defaultSupplierId: string;

  @ManyToOne(() => Supplier, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'defaultSupplierId' })
  defaultSupplier: Supplier;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  purchaseCost: number; // Cost per purchase unit (e.g. $48 per carton)

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  costPerUnit: number; // Cost per stock unit (e.g. $2 per bottle)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  sellingPrice: number; // Retail selling price (for direct customer sales, e.g. bar beer bottle)

  @Column({ type: 'boolean', default: false })
  isSellingItem: boolean; // True for Bar/Kitchen retail items, false for internal operational supplies

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.0 })
  taxRate: number; // Applicable tax percentage

  @Column({ type: 'boolean', default: false })
  expiryTracking: boolean;

  @Column({ type: 'boolean', default: false })
  batchTracking: boolean;

  // Operational distinctions
  @Column({
    type: 'enum',
    enum: ItemType,
    default: ItemType.CONSUMABLE,
  })
  itemType: ItemType; // CONSUMABLE (bill rolls, soap) vs REUSABLE_EQUIPMENT (PCs, keyboards, vacuums)

  @Column({ type: 'varchar', length: 100, nullable: true })
  assetTag: string; // Asset code for equipment

  @Column({ type: 'varchar', length: 100, nullable: true })
  serialNumber: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  assignedDepartment: string; // E.g., FRONT_OFFICE, BAR, KITCHEN, HOUSEKEEPING, ADMIN

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
