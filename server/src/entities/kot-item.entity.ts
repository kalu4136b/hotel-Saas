import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { KOT } from './kot.entity';
import { KOTStatus } from './kot-status.enum';

@Entity('kot_items')
export class KOTItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  kotId: string;

  @ManyToOne('KOT', (kot: KOT) => kot.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kotId' })
  kot: KOT;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  orderItemId: string;

  @Column({ type: 'varchar', length: 150 })
  productName: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string;

  @Column({
    type: 'enum',
    enum: KOTStatus,
    default: KOTStatus.PENDING,
  })
  status: KOTStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
