import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { GuestFolio } from './guest-folio.entity';

@Entity('folio_payments')
@Index(['folioId'])
export class FolioPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'folio_id' })
  folioId: string;

  @ManyToOne(() => GuestFolio, (folio) => folio.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'folio_id' })
  folio: GuestFolio;

  @Column({ name: 'payment_method', length: 50, default: 'CARD' })
  paymentMethod: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0.0,
  })
  amount: number;

  @Column({ name: 'receipt_number', length: 60, nullable: true })
  receiptNumber: string;

  @CreateDateColumn({ name: 'paid_at' })
  paidAt: Date;
}
