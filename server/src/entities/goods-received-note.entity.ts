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
import { PurchaseOrder } from './purchase-order.entity';
import { InventoryItem } from './inventory-item.entity';

export enum GRNStatus {
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

@Entity('goods_received_notes')
@Index(['tenantId', 'propertyId'])
@Index(['tenantId', 'propertyId', 'grnNumber'])
export class GoodsReceivedNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  tenantId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  propertyId: string;

  @Column({ type: 'varchar', length: 50 })
  grnNumber: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  purchaseOrderId: string;

  @ManyToOne(() => PurchaseOrder, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'purchaseOrderId' })
  purchaseOrder: PurchaseOrder;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  supplierId: string;

  @ManyToOne(() => Supplier, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplierId' })
  supplier: Supplier;

  @Column({ type: 'varchar', length: 30, default: 'ALL' })
  inventoryCategory: string; // ALL, BAR, KITCHEN, OPERATIONAL

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  receivedDate: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deliveryNoteNumber: string; // Vendor invoice / challan #

  @Column({
    type: 'enum',
    enum: GRNStatus,
    default: GRNStatus.RECEIVED,
  })
  status: GRNStatus;

  @Column({ type: 'int', default: 0 })
  totalReceivedItems: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  totalAcceptedQuantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  totalRejectedQuantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  totalAmount: number;

  @Column({ type: 'varchar', length: 36, nullable: true })
  receivedById: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  receivedByName: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => GoodsReceivedNoteItem, (item) => item.grn, {
    cascade: true,
  })
  items: GoodsReceivedNoteItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('goods_received_note_items')
export class GoodsReceivedNoteItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  grnId: string;

  @ManyToOne(() => GoodsReceivedNote, (grn) => grn.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'grnId' })
  grn: GoodsReceivedNote;

  @Index()
  @Column({ type: 'varchar', length: 36, nullable: true })
  purchaseOrderItemId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  inventoryItemId: string;

  @ManyToOne(() => InventoryItem, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'inventoryItemId' })
  inventoryItem: InventoryItem;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  quantityOrdered: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  quantityPreviouslyReceived: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  quantityReceiving: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  quantityAccepted: number; // Increments inventory

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0.0 })
  quantityRejected: number; // Does NOT increment inventory

  @Column({ type: 'varchar', length: 255, nullable: true })
  rejectionReason: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  unitCost: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  totalCost: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  batchNumber: string;

  @Column({ type: 'datetime', nullable: true })
  expiryDate: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string;
}
