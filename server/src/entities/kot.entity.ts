import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { KOTItem } from './kot-item.entity';
import { KOTStatus } from './kot-status.enum';

export { KOTStatus };

@Entity('kots')
export class KOT {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  kotNumber: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  tenantId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  propertyId: string;

  @Index()
  @Column({ type: 'varchar', length: 36, nullable: true })
  outletId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  orderId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tableNumber: string;

  @Column({
    type: 'enum',
    enum: KOTStatus,
    default: KOTStatus.PENDING,
  })
  status: KOTStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => KOTItem, (item) => item.kot, { cascade: true })
  items: KOTItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
