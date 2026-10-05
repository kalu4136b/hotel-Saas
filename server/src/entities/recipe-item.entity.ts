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
import { Product } from './product.entity';
import { InventoryItem } from './inventory-item.entity';

@Entity('recipe_items')
@Index(['tenantId', 'propertyId'])
@Index(['productId', 'inventoryItemId'], { unique: true })
export class RecipeItem {
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
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  inventoryItemId: string;

  @ManyToOne(() => InventoryItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inventoryItemId' })
  inventoryItem: InventoryItem;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 1.0 })
  quantityRequired: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
