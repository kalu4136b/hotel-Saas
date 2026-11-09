import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('ai_usage_records')
@Index(['tenantId', 'createdAt'])
@Index(['userId', 'createdAt'])
export class AiUsageRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @Column({ name: 'conversation_id', type: 'varchar', length: 36, nullable: true })
  conversationId: string;

  @Column({ name: 'provider_id', type: 'varchar', length: 50 })
  providerId: string;

  @Column({ name: 'model_id', type: 'varchar', length: 80 })
  modelId: string;

  @Column({ name: 'prompt_tokens', type: 'int', default: 0 })
  promptTokens: number;

  @Column({ name: 'completion_tokens', type: 'int', default: 0 })
  completionTokens: number;

  @Column({ name: 'total_tokens', type: 'int', default: 0 })
  totalTokens: number;

  @Column({ name: 'request_count', type: 'int', default: 1 })
  requestCount: number;

  @Column({ name: 'estimated_cost', type: 'decimal', precision: 10, scale: 6, default: 0.0 })
  estimatedCost: number;

  @Column({ name: 'is_success', type: 'boolean', default: true })
  isSuccess: boolean;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'latency_ms', type: 'int', default: 0 })
  latencyMs: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

