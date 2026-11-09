import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AiSubscriptionTier {
  TIER_1_BASIC = 'TIER_1_BASIC',
  TIER_2_SPECIFIC = 'TIER_2_SPECIFIC',
  TIER_3_ALL = 'TIER_3_ALL',
}

@Entity('ai_tenant_entitlements')
export class AiTenantEntitlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId: string;

  @Column({
    name: 'ai_tier',
    type: 'enum',
    enum: AiSubscriptionTier,
    default: AiSubscriptionTier.TIER_1_BASIC,
  })
  aiTier: AiSubscriptionTier;

  // Specific providers included under purchased plan (e.g. ['internal'], ['internal', 'gemini'], or ['internal', 'gemini', 'openai', 'claude', 'deepseek'])
  @Column({ name: 'subscribed_providers', type: 'simple-json', nullable: true })
  subscribedProviders: string[];

  // Tenant Administrator active toggles (subset of subscribed_providers)
  @Column({ name: 'enabled_providers', type: 'simple-json', nullable: true })
  enabledProviders: string[];

  // Tenant default model
  @Column({ name: 'default_model_id', type: 'varchar', length: 80, default: 'builtin-rule-nlp' })
  defaultModelId: string;

  // Default provider ID
  @Column({ name: 'default_provider_id', type: 'varchar', length: 50, default: 'internal' })
  defaultProviderId: string;

  // Monthly quotas
  @Column({ name: 'monthly_request_limit', type: 'int', default: 1000 })
  monthlyRequestLimit: number;

  @Column({ name: 'monthly_token_limit', type: 'int', default: 500000 })
  monthlyTokenLimit: number;

  @Column({ name: 'requests_used_this_month', type: 'int', default: 0 })
  requestsUsedThisMonth: number;

  @Column({ name: 'tokens_used_this_month', type: 'int', default: 0 })
  tokensUsedThisMonth: number;

  @Column({ name: 'billing_period_start', type: 'datetime' })
  billingPeriodStart: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

