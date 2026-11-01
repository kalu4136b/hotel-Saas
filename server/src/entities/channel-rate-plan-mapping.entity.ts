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

export enum MealPlanType {
  ROOM_ONLY = 'ROOM_ONLY',
  BREAKFAST = 'BREAKFAST',
  HALF_BOARD = 'HALF_BOARD',
  ALL_INCLUSIVE = 'ALL_INCLUSIVE',
}

export enum CancellationPolicyType {
  FLEXIBLE = 'FLEXIBLE',
  MODERATE = 'MODERATE',
  STRICT = 'STRICT',
  NON_REFUNDABLE = 'NON_REFUNDABLE',
}

@Entity('channel_rate_plan_mappings')
@Index(['connectionId', 'internalRatePlanCode'])
export class ChannelRatePlanMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'connection_id' })
  connectionId: string;

  @ManyToOne(() => ChannelConnection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'connection_id' })
  connection: ChannelConnection;

  @Column({ name: 'internal_rate_plan_code', length: 80, default: 'STANDARD' })
  internalRatePlanCode: string;

  @Column({ name: 'external_rate_plan_id', length: 150 })
  externalRatePlanId: string;

  @Column({ name: 'external_rate_plan_name', length: 180, default: '' })
  externalRatePlanName: string;

  @Column({
    name: 'meal_plan',
    type: 'enum',
    enum: MealPlanType,
    default: MealPlanType.ROOM_ONLY,
  })
  mealPlan: MealPlanType;

  @Column({
    name: 'cancellation_policy',
    type: 'enum',
    enum: CancellationPolicyType,
    default: CancellationPolicyType.FLEXIBLE,
  })
  cancellationPolicy: CancellationPolicyType;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
