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
import { Supplier } from './supplier.entity';
import { InventoryItem } from './inventory-item.entity';

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  FULLY_RECEIVED = 'FULLY_RECEIVED',
  CANCELLED = 'CANCELLED',
  // Backward compatibility
  ORDERED = 'ORDERED',
  RECEIVED = 'RECEIVED',
}

export enum ProcurementCategory {
  ALL = 'ALL',
  BAR = 'BAR',
  KITCHEN = 'KITCHEN',
  OPERATIONAL = 'OPERATIONAL',
}

@Entity('purchase_orders')
@Index(['tenantId', 'propertyId'])
@Index(['tenantId', 'propertyId', 'status'])
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  tenantId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  propertyId: string;

  @Column({ type: 'varchar', length: 50 })
  poNumber: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  supplierId: string;

  @ManyToOne(() => Supplier, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplierId' })
  supplier: Supplier;

  @Column({
    type: 'enum',
    enum: PurchaseOrderStatus,
    default: PurchaseOrderStatus.DRAFT,
  })
  status: PurchaseOrderStatus;

  @Column({
    type: 'enum',
    enum: ProcurementCategory,
    default: ProcurementCategory.ALL,
  })
  inventoryCategory: ProcurementCategory;

  @Column({ type: 'varchar', length: 150, nullable: true })
  deliveryLocation: string; // E.g., Central Kitchen Store, Bar Storage, Operations Depo

  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentTerms: string; // E.g., Net 30, Cash on Delivery, Due on Receipt

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  totalAmount: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'datetime', nullable: true })
  expectedDate: Date;

  @Column({ type: 'datetime', nullable: true })
  receivedAt: Date;

  @Column({ type: 'varchar', length: 36, nullable: true })
  createdById: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  createdByName: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  approvedById: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  approvedByName: string;

  @Column({ type: 'datetime', nullable: true })
  approvedAt: Date;

  @OneToMany(() => PurchaseOrderItem, (item) => item.purchaseOrder, {
    cascade: true,
  })
  items: PurchaseOrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('purchase_order_items')
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  purchaseOrderId: string;

  @ManyToOne(() => PurchaseOrder, (po) => po.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchaseOrderId' })
  purchaseOrder: PurchaseOrder;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  inventoryItemId: string;

  @ManyToOne(() => InventoryItem, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'inventoryItemId' })
  inventoryItem: InventoryItem;

  @Column({ type: 'varchar', length: 30, nullable: true })
  purchaseUnit: string;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 1.0 })
  conversionFactor: number;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  quantityOrdered: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  quantityReceived: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  quantityRejected: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  unitCost: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.0 })
  discountPercent: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.0 })
  taxRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  totalCost: number; // Subtotal before tax/discount or net total
}
