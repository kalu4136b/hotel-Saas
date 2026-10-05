import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

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
}

@Entity('inventory_items')
@Index(['tenantId', 'propertyId'])
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

  @Column({
    type: 'enum',
    enum: InventoryCategory,
    default: InventoryCategory.DRY_GOODS,
  })
  category: InventoryCategory;

  @Column({
    type: 'enum',
    enum: InventoryUnit,
    default: InventoryUnit.PCS,
  })
  unit: InventoryUnit;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  currentStock: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 5.0 })
  minStockLevel: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  costPerUnit: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
