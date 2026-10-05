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

export enum PourType {
  SALE = 'SALE',
  COMPLIMENTARY = 'COMPLIMENTARY',
  WASTAGE = 'WASTAGE',
  TASTING = 'TASTING',
}

@Entity('bar_pour_logs')
@Index(['tenantId', 'propertyId'])
@Index(['propertyId', 'createdAt'])
export class BarPourLog {
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
    enum: PourType,
    default: PourType.SALE,
  })
  pourType: PourType;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  millilitersPoured: number;

  @Column({ type: 'int', default: 1 })
  servingsCount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  totalSaleAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  costAmount: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bartenderName: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
