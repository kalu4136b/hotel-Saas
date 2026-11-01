import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('ai_tool_audit_logs')
@Index(['tenantId', 'propertyId'])
@Index(['userId', 'createdAt'])
@Index(['toolName'])
export class AiToolAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId: string;

  @Column({ name: 'property_id', type: 'varchar', length: 36 })
  propertyId: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @Column({ name: 'conversation_id', type: 'varchar', length: 36, nullable: true })
  conversationId: string | null;

  @Column({ name: 'tool_name', type: 'varchar', length: 80 })
  toolName: string;

  @Column({ type: 'json' })
  parameters: any;

  @Column({ name: 'is_write', type: 'boolean', default: false })
  isWrite: boolean;

  @Column({ type: 'boolean', default: false })
  confirmed: boolean;

  @Column({ type: 'varchar', length: 30, default: 'SUCCESS' })
  status: 'SUCCESS' | 'FAILED' | 'REJECTED';

  @Column({ name: 'result_summary', type: 'text', nullable: true })
  resultSummary: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'execution_time_ms', type: 'int', nullable: true })
  executionTimeMs: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
