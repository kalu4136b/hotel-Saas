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

export enum FolioChargeType {
  ROOM_CHARGE = 'ROOM_CHARGE',
  TAX = 'TAX',
  RESTAURANT_POS = 'RESTAURANT_POS',
  ROOM_SERVICE = 'ROOM_SERVICE',
  LAUNDRY = 'LAUNDRY',
  MINIBAR = 'MINIBAR',
  OTHER = 'OTHER',
}

@Entity('folio_items')
@Index(['folioId'])
export class FolioItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'folio_id' })
  folioId: string;

  @ManyToOne(() => GuestFolio, (folio) => folio.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'folio_id' })
  folio: GuestFolio;

  @Column({
    name: 'charge_type',
    type: 'enum',
    enum: FolioChargeType,
    default: FolioChargeType.ROOM_CHARGE,
  })
  chargeType: FolioChargeType;

  @Column({ length: 255 })
  description: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0.0,
  })
  amount: number;

  @Column({ name: 'reference_id', nullable: true, length: 100 })
  referenceId: string; // e.g. POS Order ID or ticket number

  @CreateDateColumn({ name: 'posted_at' })
  postedAt: Date;
}
