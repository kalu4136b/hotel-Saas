import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  AiTenantEntitlement,
  AiSubscriptionTier,
  AiUsageRecord,
  Tenant,
  User,
  UserRole,
} from '../../entities';
import { hasPermission } from '../../auth/permissions';
import { PRICING_PACKAGES } from '../../super-admin/packages.config';

export const AI_COPILOT_MODULE_ID = 'ai_copilot';

/**
 * Returns true when the tenant has the AI Co-Pilot module enabled.
 * Tenants without an explicit module list are treated as "all modules" (same as the client).
 */
export function isAiModuleEnabled(modules: unknown): boolean {
  let list: unknown = modules;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      list = [];
    }
  }
  if (!Array.isArray(list) || list.length === 0) return true;
  return list.includes(AI_COPILOT_MODULE_ID);
}

/**
 * Resolve the AI entitlement defaults (tier, providers, quotas) for a tenant's subscription plan.
 * Uses the `aiTier` definition in PRICING_PACKAGES and falls back to legacy tier heuristics.
 */
export function resolvePlanAiDefaults(tenant?: Partial<Tenant> | null): {
  aiTier: AiSubscriptionTier;
  subscribedProviders: string[];
  monthlyRequestLimit: number;
  monthlyTokenLimit: number;
  defaultProviderId: string;
  defaultModelId: string;
} {
  const planKey = (tenant?.subscriptionPlan || '').toUpperCase();
  const pkgAi = PRICING_PACKAGES[planKey]?.aiTier;

  let aiTier = AiSubscriptionTier.TIER_1_BASIC;
  let subscribedProviders = ['internal'];
  let monthlyRequestLimit = 1000;
  let monthlyTokenLimit = 500000;

  if (pkgAi) {
    aiTier = pkgAi.aiTier as AiSubscriptionTier;
    subscribedProviders = [...pkgAi.subscribedProviders];
    monthlyRequestLimit = pkgAi.monthlyRequestLimit;
    monthlyTokenLimit = pkgAi.monthlyTokenLimit;
  } else {
    const subTier = String(tenant?.subscriptionTier || '').toUpperCase();
    if (planKey.includes('ENTERPRISE') || subTier === 'ENTERPRISE') {
      aiTier = AiSubscriptionTier.TIER_3_ALL;
      subscribedProviders = ['internal', 'gemini', 'groq', 'openai', 'claude', 'deepseek'];
      monthlyRequestLimit = 25000;
      monthlyTokenLimit = 10000000;
    } else if (planKey.includes('PRO') || subTier === 'LUXURY' || subTier === 'BUSINESS') {
      aiTier = AiSubscriptionTier.TIER_2_SPECIFIC;
      subscribedProviders = ['internal', 'gemini', 'groq'];
      monthlyRequestLimit = 5000;
      monthlyTokenLimit = 2500000;
    }
  }

  if (!subscribedProviders.includes('internal')) subscribedProviders.unshift('internal');

  const hasGemini = subscribedProviders.includes('gemini');
  return {
    aiTier,
    subscribedProviders,
    monthlyRequestLimit,
    monthlyTokenLimit,
    defaultProviderId: hasGemini ? 'gemini' : 'internal',
    defaultModelId: hasGemini ? 'gemini-3.5-flash' : 'builtin-rule-nlp',
  };
}

/**
 * Re-apply a tenant's subscription plan to its AI entitlement (called when the plan changes).
 * Keeps usage counters, trims enabled providers / default model to what the new plan includes.
 */
export async function syncAiEntitlementWithPlan(
  dataSource: DataSource,
  tenantId: string,
): Promise<void> {
  const tenant = await dataSource.getRepository(Tenant).findOne({ where: { id: tenantId } });
  if (!tenant) return;

  const repo = dataSource.getRepository(AiTenantEntitlement);
  const entitlement = await repo.findOne({ where: { tenantId } });
  if (!entitlement) return; // Will be lazily created from the plan on first AI use

  const defaults = resolvePlanAiDefaults(tenant);
  const subscribed = new Set(defaults.subscribedProviders);
  const previouslySubscribed = new Set(entitlement.subscribedProviders || ['internal']);

  entitlement.aiTier = defaults.aiTier;
  entitlement.subscribedProviders = defaults.subscribedProviders;
  entitlement.monthlyRequestLimit = defaults.monthlyRequestLimit;
  entitlement.monthlyTokenLimit = defaults.monthlyTokenLimit;

  // Keep admin toggles for still-included providers, auto-enable newly included implemented ones
  const enabled = (entitlement.enabledProviders || ['internal']).filter((p) => subscribed.has(p));
  for (const pid of defaults.subscribedProviders) {
    const reg = PLATFORM_AI_MODEL_REGISTRY.find((m) => m.id === pid);
    if (!previouslySubscribed.has(pid) && reg?.isImplemented && reg.isPlatformEnabled && !enabled.includes(pid)) {
      enabled.push(pid);
    }
  }
  if (!enabled.includes('internal')) enabled.unshift('internal');
  entitlement.enabledProviders = enabled;

  if (!enabled.includes(entitlement.defaultProviderId)) {
    const fallback = enabled.includes(defaults.defaultProviderId) ? defaults.defaultProviderId : 'internal';
    const reg = PLATFORM_AI_MODEL_REGISTRY.find((m) => m.id === fallback);
    entitlement.defaultProviderId = fallback;
    entitlement.defaultModelId = reg?.modelId || 'builtin-rule-nlp';
  }

  await repo.save(entitlement);
}

export interface ModelRegistryItem {
  id: string; // provider id: 'internal', 'gemini', 'openai', 'claude', 'deepseek'
  modelId: string; // model id: 'builtin-rule-nlp', 'gemini-3.8-flash', etc.
  name: string;
  providerName: string;
  description: string;
  badge: string;
  status: 'AVAILABLE' | 'COMING_SOON' | 'DEPRECATED';
  isImplemented: boolean;
  isPlatformEnabled: boolean;
  minTier: AiSubscriptionTier;
  maxTokensPerRequest: number;
}

export const PLATFORM_AI_MODEL_REGISTRY: ModelRegistryItem[] = [
  {
    id: 'internal',
    modelId: 'builtin-rule-nlp',
    name: 'Hotel Ops Engine',
    providerName: 'Internal',
    description: 'Instant deterministic PMS, POS & Channel Manager execution engine.',
    badge: 'Always Free / Offline',
    status: 'AVAILABLE',
    isImplemented: true,
    isPlatformEnabled: true,
    minTier: AiSubscriptionTier.TIER_1_BASIC,
    maxTokensPerRequest: 4096,
  },
  {
    id: 'gemini',
    modelId: 'gemini-3.5-flash',
    name: 'Google Gemini 3.5 Flash',
    providerName: 'Google AI Studio',
    description: 'High-speed multimodal AI co-pilot with Sinhala & multilingual intelligence.',
    badge: 'Production Ready',
    status: 'AVAILABLE',
    isImplemented: true,
    isPlatformEnabled: true,
    minTier: AiSubscriptionTier.TIER_2_SPECIFIC,
    maxTokensPerRequest: 8192,
  },
  {
    id: 'groq',
    modelId: 'qwen/qwen3.8-27b',
    name: 'Groq Cloud (Qwen 3.8 27B)',
    providerName: 'Groq Cloud LPU',
    description: 'Ultra-fast LPU inference hosting Qwen 3.8 27B with instantaneous response times.',
    badge: 'Ultra-Fast LPU',
    status: 'AVAILABLE',
    isImplemented: true,
    isPlatformEnabled: true,
    minTier: AiSubscriptionTier.TIER_2_SPECIFIC,
    maxTokensPerRequest: 8192,
  },
  {
    id: 'openai',
    modelId: 'gpt-4o-mini',
    name: 'OpenAI GPT-4o mini',
    providerName: 'OpenAI',
    description: 'Industry-standard reasoning and conversational intelligence.',
    badge: 'Coming Soon',
    status: 'COMING_SOON',
    isImplemented: false,
    isPlatformEnabled: false,
    minTier: AiSubscriptionTier.TIER_3_ALL,
    maxTokensPerRequest: 4096,
  },
  {
    id: 'claude',
    modelId: 'claude-3-5-sonnet',
    name: 'Anthropic Claude 3.5 Sonnet',
    providerName: 'Anthropic',
    description: 'Complex organizational reasoning and detailed policy guidance.',
    badge: 'Coming Soon',
    status: 'COMING_SOON',
    isImplemented: false,
    isPlatformEnabled: false,
    minTier: AiSubscriptionTier.TIER_3_ALL,
    maxTokensPerRequest: 8192,
  },
  {
    id: 'deepseek',
    modelId: 'deepseek-chat',
    name: 'DeepSeek-V3 Chat',
    providerName: 'DeepSeek',
    description: 'Cost-effective high-speed operational reasoning model.',
    badge: 'Coming Soon',
    status: 'COMING_SOON',
    isImplemented: false,
    isPlatformEnabled: false,
    minTier: AiSubscriptionTier.TIER_3_ALL,
    maxTokensPerRequest: 8192,
  },
];

@Injectable()
export class AiEntitlementService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * 1. Get or initialize tenant AI entitlement based on subscription package
   */
  async getOrCreateTenantEntitlement(tenantId: string): Promise<AiTenantEntitlement> {
    const entitlementRepo = this.dataSource.getRepository(AiTenantEntitlement);
    let entitlement = await entitlementRepo.findOne({ where: { tenantId } });

    if (!entitlement) {
      // Determine tier from the tenant's subscription package (PRICING_PACKAGES.aiTier)
      const tenantRepo = this.dataSource.getRepository(Tenant);
      const tenant = await tenantRepo.findOne({ where: { id: tenantId } });

      const {
        aiTier,
        subscribedProviders,
        monthlyRequestLimit,
        monthlyTokenLimit,
        defaultModelId,
        defaultProviderId,
      } = resolvePlanAiDefaults(tenant);

      // Enable every subscribed provider that is actually implemented & platform-enabled
      const enabledProviders = subscribedProviders.filter((pid) => {
        const reg = PLATFORM_AI_MODEL_REGISTRY.find((m) => m.id === pid);
        return pid === 'internal' || (reg?.isImplemented && reg.isPlatformEnabled);
      });

      entitlement = entitlementRepo.create({
        tenantId,
        aiTier,
        subscribedProviders,
        enabledProviders,
        defaultModelId,
        defaultProviderId,
        monthlyRequestLimit,
        monthlyTokenLimit,
        requestsUsedThisMonth: 0,
        tokensUsedThisMonth: 0,
        billingPeriodStart: new Date(),
      });

      await entitlementRepo.save(entitlement);
    } else {
      let needsSave = false;
      if (entitlement.defaultModelId === 'gemini-3.8-flash') {
        entitlement.defaultModelId = 'gemini-3.5-flash';
        needsSave = true;
      }
      if (entitlement.defaultModelId === 'llama-3.3-70b-versatile') {
        entitlement.defaultModelId = 'qwen/qwen3.8-27b';
        needsSave = true;
      }

      // Monthly rollover check (30 days cycle)
      const now = new Date();
      const periodStart = new Date(entitlement.billingPeriodStart);
      const diffDays = (now.getTime() - periodStart.getTime()) / (1000 * 3600 * 24);

      if (diffDays >= 30) {
        entitlement.requestsUsedThisMonth = 0;
        entitlement.tokensUsedThisMonth = 0;
        entitlement.billingPeriodStart = now;
        needsSave = true;
      }

      if (needsSave) {
        await entitlementRepo.save(entitlement);
      }
    }

    return entitlement;
  }

  /**
   * 2. Get available models for chat user, considering all 6 entitlement conditions
   */
  async getAvailableModelsForUser(
    tenantId: string,
    user: { id?: string; role: UserRole | string; permissions?: string[] | null },
  ) {
    const entitlement = await this.getOrCreateTenantEntitlement(tenantId);
    const canSelectModel = hasPermission(user, 'ai_model_select');
    const canChat = hasPermission(user, 'ai_chat') || hasPermission(user, 'ai_view');

    const subscribedSet = new Set(entitlement.subscribedProviders || ['internal']);
    const enabledSet = new Set(entitlement.enabledProviders || ['internal']);

    const resolvedModels = PLATFORM_AI_MODEL_REGISTRY.map((reg) => {
      const isImplemented = reg.isImplemented;
      const isPlatformEnabled = reg.isPlatformEnabled;
      const isSubscribed = subscribedSet.has(reg.id);
      const isTenantEnabled = enabledSet.has(reg.id);
      const isDefault = reg.id === entitlement.defaultProviderId;

      // Condition evaluations
      let isSelectable = false;
      let badge = reg.badge;
      let accessStatus: 'READY' | 'COMING_SOON' | 'UPGRADE_REQUIRED' | 'DISABLED_BY_ADMIN' | 'RESTRICTED_ROLE' =
        'READY';
      let restrictionReason: string | undefined = undefined;

      if (!isImplemented || reg.status === 'COMING_SOON') {
        isSelectable = false;
        accessStatus = 'COMING_SOON';
        badge = 'Coming Soon';
        restrictionReason = 'Integration coming soon. Not selectable.';
      } else if (!isPlatformEnabled) {
        isSelectable = false;
        accessStatus = 'DISABLED_BY_ADMIN';
        badge = 'Unavailable';
        restrictionReason = 'Temporarily disabled platform-wide.';
      } else if (!isSubscribed) {
        isSelectable = false;
        accessStatus = 'UPGRADE_REQUIRED';
        badge = 'Upgrade Plan';
        restrictionReason = `Requires ${reg.minTier.replace('_', ' ')} or AI Add-on.`;
      } else if (!isTenantEnabled) {
        isSelectable = false;
        accessStatus = 'DISABLED_BY_ADMIN';
        badge = 'Disabled by Hotel';
        restrictionReason = 'Disabled by your hotel administrator.';
      } else if (!canSelectModel && !isDefault) {
        isSelectable = false;
        accessStatus = 'RESTRICTED_ROLE';
        badge = 'Role Restricted';
        restrictionReason = 'Your staff role cannot switch models. Tenant default in use.';
      } else if (!canChat) {
        isSelectable = false;
        accessStatus = 'RESTRICTED_ROLE';
        badge = 'No Access';
        restrictionReason = 'Your staff role does not have AI Assistant permission.';
      } else {
        isSelectable = true;
        accessStatus = 'READY';
      }

      return {
        id: reg.id,
        modelId: reg.modelId,
        name: reg.name,
        providerName: reg.providerName,
        description: reg.description,
        badge,
        status: reg.status,
        isSelectable,
        isDefault,
        accessStatus,
        restrictionReason,
      };
    });

    return {
      tier: entitlement.aiTier,
      defaultModelId: entitlement.defaultModelId,
      defaultProviderId: entitlement.defaultProviderId,
      canSelectModel,
      usage: {
        requestsUsed: entitlement.requestsUsedThisMonth,
        requestLimit: entitlement.monthlyRequestLimit,
        tokensUsed: entitlement.tokensUsedThisMonth,
        tokenLimit: entitlement.monthlyTokenLimit,
        percentRequests: Math.min(
          100,
          Math.round((entitlement.requestsUsedThisMonth / (entitlement.monthlyRequestLimit || 1)) * 100),
        ),
      },
      models: resolvedModels,
    };
  }

  /**
   * 3. Validate chat execution request against all 6 conditions & quotas
   */
  async validateExecution(
    tenantId: string,
    user: {
      id: string;
      role: UserRole | string;
      permissions?: string[] | null;
      tenantModules?: string[] | string | null;
    },
    requestedProviderId?: string,
    requestedModelId?: string,
  ): Promise<{ providerId: string; modelId: string; allowedProviders: string[] }> {
    // 0. Check the tenant purchased / has enabled the AI Co-Pilot module
    if (!isAiModuleEnabled(user.tenantModules)) {
      throw new ForbiddenException(
        'The AI Operations Co-Pilot module is not enabled for your hotel subscription. Please contact your platform administrator.',
      );
    }

    // A. Check user AI chat permission
    if (!hasPermission(user, 'ai_chat') && !hasPermission(user, 'ai_view')) {
      throw new ForbiddenException(
        'Access Denied: Your staff role is not authorized to use the AI Assistant.',
      );
    }

    const entitlement = await this.getOrCreateTenantEntitlement(tenantId);

    // B. Check monthly request limit
    if (entitlement.requestsUsedThisMonth >= entitlement.monthlyRequestLimit) {
      throw new ForbiddenException(
        `Monthly AI usage limit reached (${entitlement.requestsUsedThisMonth}/${entitlement.monthlyRequestLimit} requests). Please contact your hotel administrator or upgrade your subscription.`,
      );
    }

    // Determine target provider & model
    const targetProviderId = requestedProviderId || entitlement.defaultProviderId || 'internal';
    const targetModelId = requestedModelId || entitlement.defaultModelId || 'builtin-rule-nlp';

    // C. Find in registry (explicitly requested provider wins over model-id match)
    const registryItem =
      PLATFORM_AI_MODEL_REGISTRY.find((m) => m.id === targetProviderId) ||
      PLATFORM_AI_MODEL_REGISTRY.find((m) => m.modelId === targetModelId);

    if (!registryItem) {
      throw new BadRequestException(`Unrecognized AI provider: '${targetProviderId}'.`);
    }

    // D. Coming Soon / Implementation check
    if (!registryItem.isImplemented || registryItem.status === 'COMING_SOON') {
      throw new BadRequestException(
        `The '${registryItem.name}' provider is Coming Soon and cannot process requests at this time.`,
      );
    }

    // E. Platform enabled check
    if (!registryItem.isPlatformEnabled) {
      throw new ForbiddenException(
        `The '${registryItem.name}' provider is temporarily disabled by platform administration.`,
      );
    }

    // F. Tenant subscription check
    const subscribedSet = new Set(entitlement.subscribedProviders || ['internal']);
    if (!subscribedSet.has(registryItem.id)) {
      throw new ForbiddenException(
        `Your subscription tier (${entitlement.aiTier}) does not include ${registryItem.name}. Please upgrade to access this model.`,
      );
    }

    // G. Tenant admin enabled check
    const enabledSet = new Set(entitlement.enabledProviders || ['internal']);
    if (!enabledSet.has(registryItem.id)) {
      throw new ForbiddenException(
        `${registryItem.name} has been disabled by your hotel administrator in AI Settings.`,
      );
    }

    // H. User permission to switch away from tenant default
    const isDefault = registryItem.id === entitlement.defaultProviderId;

    if (!isDefault && !hasPermission(user, 'ai_model_select')) {
      throw new ForbiddenException(
        'Your staff role is restricted from switching AI models. Please use your hotel default model.',
      );
    }

    // Providers this tenant may fall back to if the selected provider is unavailable
    const allowedProviders = PLATFORM_AI_MODEL_REGISTRY.filter(
      (m) =>
        m.isImplemented &&
        m.isPlatformEnabled &&
        m.status !== 'COMING_SOON' &&
        subscribedSet.has(m.id) &&
        enabledSet.has(m.id),
    ).map((m) => m.id);

    return {
      providerId: registryItem.id,
      modelId: registryItem.modelId,
      allowedProviders,
    };
  }

  /**
   * 4. Record consumption in usage record and update monthly counters
   */
  async recordUsage(
    tenantId: string,
    userId: string,
    conversationId: string | undefined,
    providerId: string,
    modelId: string,
    promptTokens: number,
    completionTokens: number,
    latencyMs: number,
    isSuccess: boolean,
    errorMessage?: string,
  ): Promise<void> {
    const totalTokens = promptTokens + completionTokens;

    // 1. Create audit usage record
    const usageRepo = this.dataSource.getRepository(AiUsageRecord);
    const usage = usageRepo.create({
      tenantId,
      userId,
      conversationId,
      providerId,
      modelId,
      promptTokens,
      completionTokens,
      totalTokens,
      requestCount: 1,
      latencyMs,
      isSuccess,
      errorMessage,
    });
    await usageRepo.save(usage);

    // 2. Increment counters on tenant entitlement
    const entitlementRepo = this.dataSource.getRepository(AiTenantEntitlement);
    await entitlementRepo.increment(
      { tenantId },
      'requestsUsedThisMonth',
      1,
    );
    if (totalTokens > 0) {
      await entitlementRepo.increment(
        { tenantId },
        'tokensUsedThisMonth',
        totalTokens,
      );
    }
  }

  /**
   * 5. Get full tenant AI configuration for Tenant Admin Dashboard
   */
  async getTenantAdminConfig(tenantId: string) {
    const entitlement = await this.getOrCreateTenantEntitlement(tenantId);

    const subscribedSet = new Set(entitlement.subscribedProviders || ['internal']);
    const enabledSet = new Set(entitlement.enabledProviders || ['internal']);

    // Map each platform provider with subscription & enabled status
    const providerCards = PLATFORM_AI_MODEL_REGISTRY.map((p) => {
      const isSubscribed = subscribedSet.has(p.id);
      const isEnabled = enabledSet.has(p.id);
      const isComingSoon = !p.isImplemented || p.status === 'COMING_SOON';

      return {
        id: p.id,
        modelId: p.modelId,
        name: p.name,
        providerName: p.providerName,
        description: p.description,
        badge: p.badge,
        status: p.status,
        isComingSoon,
        isSubscribed,
        isEnabled: isEnabled && isSubscribed && !isComingSoon,
        canToggle: isSubscribed && !isComingSoon && p.id !== 'internal', // internal is always enabled
        minTier: p.minTier,
      };
    });

    return {
      tenantId,
      aiTier: entitlement.aiTier,
      defaultProviderId: entitlement.defaultProviderId,
      defaultModelId: entitlement.defaultModelId,
      monthlyRequestLimit: entitlement.monthlyRequestLimit,
      monthlyTokenLimit: entitlement.monthlyTokenLimit,
      requestsUsedThisMonth: entitlement.requestsUsedThisMonth,
      tokensUsedThisMonth: entitlement.tokensUsedThisMonth,
      billingPeriodStart: entitlement.billingPeriodStart,
      percentUsed: Math.min(
        100,
        Math.round((entitlement.requestsUsedThisMonth / (entitlement.monthlyRequestLimit || 1)) * 100),
      ),
      providers: providerCards,
    };
  }

  /**
   * 6. Update tenant AI configuration by Tenant Administrator
   */
  async updateTenantAdminConfig(
    tenantId: string,
    dto: {
      enabledProviders?: string[];
      defaultProviderId?: string;
      defaultModelId?: string;
    },
  ) {
    const entitlement = await this.getOrCreateTenantEntitlement(tenantId);
    const entitlementRepo = this.dataSource.getRepository(AiTenantEntitlement);

    const subscribedSet = new Set(entitlement.subscribedProviders || ['internal']);

    // Validate that enabledProviders is strictly a subset of subscribedProviders
    if (dto.enabledProviders && Array.isArray(dto.enabledProviders)) {
      for (const pid of dto.enabledProviders) {
        if (!subscribedSet.has(pid)) {
          throw new BadRequestException(
            `Provider '${pid}' is not included in your purchased AI subscription tier.`,
          );
        }
        const registryItem = PLATFORM_AI_MODEL_REGISTRY.find((m) => m.id === pid);
        if (registryItem?.status === 'COMING_SOON') {
          throw new BadRequestException(
            `Provider '${registryItem.name}' is Coming Soon and cannot be activated.`,
          );
        }
      }

      // Ensure internal engine is always enabled as safe fallback
      if (!dto.enabledProviders.includes('internal')) {
        dto.enabledProviders.push('internal');
      }

      entitlement.enabledProviders = dto.enabledProviders;
    }

    if (dto.defaultProviderId) {
      if (!subscribedSet.has(dto.defaultProviderId)) {
        throw new BadRequestException(
          `Default provider '${dto.defaultProviderId}' is not included in your subscription.`,
        );
      }
      const providerReg = PLATFORM_AI_MODEL_REGISTRY.find((m) => m.id === dto.defaultProviderId);
      if (!providerReg || providerReg.status === 'COMING_SOON' || !providerReg.isImplemented) {
        throw new BadRequestException('Cannot set a Coming Soon or unknown provider as default.');
      }
      entitlement.defaultProviderId = dto.defaultProviderId;
      // Keep model id consistent with the chosen provider
      if (!dto.defaultModelId) {
        entitlement.defaultModelId = providerReg.modelId;
      }
    }

    if (dto.defaultModelId) {
      const model = PLATFORM_AI_MODEL_REGISTRY.find((m) => m.modelId === dto.defaultModelId);
      if (model?.status === 'COMING_SOON') {
        throw new BadRequestException('Cannot set a Coming Soon model as default.');
      }
      entitlement.defaultModelId = dto.defaultModelId;
    }

    // The default provider must be one of the enabled providers; otherwise fall back to internal
    const enabledNow = entitlement.enabledProviders || ['internal'];
    if (!enabledNow.includes(entitlement.defaultProviderId)) {
      entitlement.defaultProviderId = 'internal';
      entitlement.defaultModelId = 'builtin-rule-nlp';
    }

    await entitlementRepo.save(entitlement);
    return this.getTenantAdminConfig(tenantId);
  }
}

