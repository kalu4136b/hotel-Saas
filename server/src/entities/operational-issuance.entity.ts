import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { InventoryItem, ItemType } from './inventory-item.entity';

export enum IssuanceStatus {
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('operational_stock_issuances')
@Index(['tenantId', 'propertyId'])
@Index(['tenantId', 'propertyId', 'issuanceNumber'])
export class OperationalStockIssuance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  tenantId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  propertyId: string;

  @Column({ type: 'varchar', length: 50 })
  issuanceNumber: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  issuanceDate: Date;

  @Index()
  @Column({ type: 'varchar', length: 80 })
  department: string; // E.g., FRONT_OFFICE, BAR, KITCHEN, HOUSEKEEPING, MAINTENANCE, ADMIN

  @Column({ type: 'varchar', length: 36, nullable: true })
  issuedById: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  issuedByName: string;

  @Column({ type: 'varchar', length: 150 })
  receivedByName: string;

  @Column({ type: 'int', default: 0 })
  totalItems: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  totalQuantity: number;

  @Column({
    type: 'enum',
    enum: IssuanceStatus,
    default: IssuanceStatus.COMPLETED,
  })
  status: IssuanceStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => OperationalStockIssuanceItem, (item) => item.issuance, {
    cascade: true,
  })
  items: OperationalStockIssuanceItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('operational_stock_issuance_items')
export class OperationalStockIssuanceItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  issuanceId: string;

  @ManyToOne(() => OperationalStockIssuance, (iss) => iss.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'issuanceId' })
  issuance: OperationalStockIssuance;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  inventoryItemId: string;

  @ManyToOne(() => InventoryItem, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'inventoryItemId' })
  inventoryItem: InventoryItem;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  unitCost: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  totalCost: number;

  @Column({
    type: 'enum',
    enum: ItemType,
    default: ItemType.CONSUMABLE,
  })
  itemType: ItemType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  assetTag: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  serialNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  purpose: string;
}
