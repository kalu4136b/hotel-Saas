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
  ORDERED = 'ORDERED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

@Entity('purchase_orders')
@Index(['tenantId', 'propertyId'])
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

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  totalAmount: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'datetime', nullable: true })
  expectedDate: Date;

  @Column({ type: 'datetime', nullable: true })
  receivedAt: Date;

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

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  quantityOrdered: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  quantityReceived: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  unitCost: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  totalCost: number;
}
