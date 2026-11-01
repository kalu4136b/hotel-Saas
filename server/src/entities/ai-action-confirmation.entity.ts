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
import { Tenant } from './tenant.entity';
import { Property } from './property.entity';
import { User } from './user.entity';
import { AiConversation } from './ai-conversation.entity';

@Entity('ai_action_confirmations')
@Index(['tenantId', 'propertyId'])
@Index(['userId', 'status'])
@Index(['conversationId'])
export class AiActionConfirmation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id', type: 'varchar', length: 36 })
  conversationId: string;

  @ManyToOne(() => AiConversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: AiConversation;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'property_id', type: 'varchar', length: 36 })
  propertyId: string;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'action_type', type: 'varchar', length: 80 })
  actionType: string; // e.g. 'UPDATE_ROOM_STATUS', 'CREATE_RESERVATION', 'ASSIGN_ROOM', 'CREATE_PURCHASE_ORDER'

  @Column({ name: 'target_entity', type: 'varchar', length: 60 })
  targetEntity: string; // e.g. 'room', 'reservation', 'purchase_order'

  @Column({ name: 'target_id', type: 'varchar', length: 100, nullable: true })
  targetId: string | null;

  @Column({ type: 'json' })
  parameters: any;

  @Column({
    type: 'varchar',
    length: 30,
    default: 'PENDING',
  })
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'EXPIRED' | 'EXECUTED' | 'FAILED';

  @Column({ name: 'preview_summary', type: 'text' })
  previewSummary: string;

  @Column({ name: 'execution_result', type: 'json', nullable: true })
  executionResult: any | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  @Column({ name: 'confirmed_at', type: 'datetime', nullable: true })
  confirmedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
