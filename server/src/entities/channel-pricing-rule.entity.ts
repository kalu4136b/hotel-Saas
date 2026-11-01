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
import { ChannelConnection } from './channel-connection.entity';
import { RoomType } from './room-type.entity';

export enum PricingAdjustmentType {
  PERCENTAGE_MARKUP = 'PERCENTAGE_MARKUP',
  FIXED_MARKUP = 'FIXED_MARKUP',
  PERCENTAGE_DISCOUNT = 'PERCENTAGE_DISCOUNT',
}

@Entity('channel_pricing_rules')
@Index(['connectionId'])
export class ChannelPricingRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'connection_id' })
  connectionId: string;

  @ManyToOne(() => ChannelConnection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'connection_id' })
  connection: ChannelConnection;

  @Column({ name: 'room_type_id', type: 'varchar', length: 36, nullable: true })
  roomTypeId: string | null;

  @ManyToOne(() => RoomType, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'room_type_id' })
  roomType: RoomType | null;

  @Column({
    name: 'adjustment_type',
    type: 'enum',
    enum: PricingAdjustmentType,
    default: PricingAdjustmentType.PERCENTAGE_MARKUP,
  })
  adjustmentType: PricingAdjustmentType;

  @Column({
    name: 'adjustment_value',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 10.0,
  })
  adjustmentValue: number; // e.g. 10.00 for 10% markup

  @Column({ length: 10, default: 'LKR' })
  currency: string;

  @Column({ name: 'apply_to_all_room_types', type: 'boolean', default: true })
  applyToAllRoomTypes: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
