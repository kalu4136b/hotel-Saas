import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { Tenant, TenantStatus, SubscriptionTier } from '../entities/tenant.entity';
import { TenantDomain } from '../entities/TenantDomain.entity';
import { Property } from '../entities/property.entity';
import { TenantContext, TenantPropertyConfig } from './tenant-context.interface';

const TENANT_CACHE_TTL_SECONDS = 3600; // 1 hour (event-invalidated on change)
const USER_SESSION_TTL_SECONDS = 300;  // 5 minutes fast cache for token validation

@Injectable()
export class TenantCacheService {
  private readonly logger = new Logger(TenantCacheService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Resolves TenantContext by tenant UUID (reads from Redis or falls back to DB).
   */
  async getTenantContextById(tenantId: string, propertyId?: string): Promise<TenantContext | null> {
    const cacheKey = `tenant:id:${tenantId}`;
    let context = await this.redis.getJSON<TenantContext>(cacheKey);

    if (!context) {
      context = await this.loadAndCacheTenantFromDb({ id: tenantId });
      if (!context) return null;
    }

    if (propertyId && context.property?.id !== propertyId) {
      const propConfig = await this.getPropertyConfig(tenantId, propertyId);
      if (propConfig) {
        return { ...context, propertyId, property: propConfig };
      }
    }

    return context;
  }

  /**
   * Resolves TenantContext by slug (e.g. "grand-palace").
   */
  async getTenantContextBySlug(slug: string): Promise<TenantContext | null> {
    const slugKey = `tenant:slug:${slug.toLowerCase()}`;
    const cachedId = await this.redis.get(slugKey);

    if (cachedId) {
      const context = await this.getTenantContextById(cachedId);
      if (context) return context;
    }

    return this.loadAndCacheTenantFromDb({ slug: slug.toLowerCase() });
  }

  /**
   * Resolves TenantContext by incoming hostname (subdomain or custom domain).
   * E.g. grandpalace.hotelia.tenura.tech or pms.grandhotel.com
   */
  async getTenantContextByDomain(host: string): Promise<TenantContext | null> {
    const cleanHost = host.split(':')[0].toLowerCase().trim();
    const domainKey = `tenant:domain:${cleanHost}`;
    const cachedTenantId = await this.redis.get(domainKey);

    if (cachedTenantId) {
      const context = await this.getTenantContextById(cachedTenantId);
      if (context) return context;
    }

    // 1. Check custom domain table in database
    const domainRepo = this.dataSource.getRepository(TenantDomain);
    const domainRecord = await domainRepo.findOne({
      where: { domain: cleanHost },
    });
    if (domainRecord) {
      await this.redis.set(domainKey, domainRecord.tenantId, TENANT_CACHE_TTL_SECONDS);
      return this.getTenantContextById(domainRecord.tenantId);
    }

    // 2. Check if host is a subdomain like <slug>.hotelia.tenura.tech or <slug>.localhost
    const parts = cleanHost.split('.');
    if (parts.length >= 3 || (parts.length === 2 && parts[1] === 'localhost')) {
      const potentialSlug = parts[0];
      const context = await this.getTenantContextBySlug(potentialSlug);
      if (context) {
        await this.redis.set(domainKey, context.tenantId, TENANT_CACHE_TTL_SECONDS);
        return context;
      }
    }

    return null;
  }

  /**
   * Set dynamic custom domain mapping in Redis.
   */
  async setDomainMapping(domain: string, tenantId: string): Promise<void> {
    const cleanDomain = domain.split(':')[0].toLowerCase().trim();
    await this.redis.set(`tenant:domain:${cleanDomain}`, tenantId, TENANT_CACHE_TTL_SECONDS);
  }

  /**
   * Remove custom domain mapping from Redis.
   */
  async deleteDomainMapping(domain: string): Promise<void> {
    const cleanDomain = domain.split(':')[0].toLowerCase().trim();
    await this.redis.del(`tenant:domain:${cleanDomain}`);
  }

  /**
   * Resolves public tenant information for client branding & white-labeling.
   */
  async getPublicTenantInfo(query: { slug?: string; domain?: string; id?: string }) {
    let context: TenantContext | null = null;
    if (query.slug) {
      context = await this.getTenantContextBySlug(query.slug);
    } else if (query.domain) {
      context = await this.getTenantContextByDomain(query.domain);
    } else if (query.id) {
      context = await this.getTenantContextById(query.id);
    }

    if (!context || context.status !== TenantStatus.ACTIVE) {
      return null;
    }

    return {
      id: context.tenantId,
      name: context.name,
      slug: context.slug,
      status: context.status,
      subscriptionTier: context.subscriptionTier,
      propertyName: context.property?.name,
      currency: context.property?.currency || 'LKR',
      timezone: context.property?.timezone || 'Asia/Colombo',
    };
  }

  /**
   * Invalidate tenant cache across all keys when settings, plan, or status change.
   */
  async invalidateTenant(tenantId: string): Promise<void> {
    try {
      const context = await this.redis.getJSON<TenantContext>(`tenant:id:${tenantId}`);
      const keysToDelete = [`tenant:id:${tenantId}`];

      if (context?.slug) {
        keysToDelete.push(`tenant:slug:${context.slug.toLowerCase()}`);
      }

      await this.redis.del(keysToDelete);
      this.logger.log(`Invalidated cache for tenant ${tenantId}`);
    } catch (err: any) {
      this.logger.warn(`Failed to invalidate cache for tenant ${tenantId}: ${err.message}`);
    }
  }

  /**
   * Fast session token verification: checks cached user tokenVersion in Redis.
   */
  async getCachedUserTokenVersion(userId: string): Promise<number | null> {
    const raw = await this.redis.get(`auth:user:${userId}:tv`);
    if (raw === null) return null;
    return parseInt(raw, 10);
  }

  /**
   * Cache user token version in Redis.
   */
  async setCachedUserTokenVersion(userId: string, tv: number): Promise<void> {
    await this.redis.set(`auth:user:${userId}:tv`, String(tv), USER_SESSION_TTL_SECONDS);
  }

  /**
   * Invalidate user session globally (increments version in Redis).
   */
  async invalidateUserSession(userId: string): Promise<void> {
    await this.redis.incr(`auth:user:${userId}:tv`);
  }

  /**
   * Hydrates tenant details from DB and stores into Redis.
   */
  private async loadAndCacheTenantFromDb(criteria: { id?: string; slug?: string }): Promise<TenantContext | null> {
    const tenantRepo = this.dataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({
      where: criteria as any,
    });

    if (!tenant) return null;

    // Fetch primary property for default configuration
    const propertyRepo = this.dataSource.getRepository(Property);
    const primaryProperty = await propertyRepo.findOne({
      where: { tenantId: tenant.id },
      order: { createdAt: 'ASC' },
    });

    const parsedModules: string[] =
      tenant.modules && Array.isArray(tenant.modules)
        ? tenant.modules
        : typeof tenant.modules === 'string'
        ? JSON.parse(tenant.modules)
        : [];

    const defaultPropertyConfig: TenantPropertyConfig | undefined = primaryProperty
      ? {
          id: primaryProperty.id,
          name: primaryProperty.name,
          code: primaryProperty.code,
          currency: primaryProperty.currency || 'LKR',
          timezone: primaryProperty.timezone || 'Asia/Colombo',
          defaultTaxRate: Number(primaryProperty.defaultTaxRate) || 10.0,
          serviceChargeRate: Number(primaryProperty.serviceChargeRate) || 10.0,
        }
      : undefined;

    const isEnterprise = tenant.subscriptionTier === SubscriptionTier.ENTERPRISE;
    const context: TenantContext = {
      tenantId: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      status: tenant.status,
      subscriptionTier: tenant.subscriptionTier,
      subscriptionPlan: tenant.subscriptionPlan || 'CUSTOM',
      modules: parsedModules,
      maxRooms: tenant.maxRooms,
      maxStaff: tenant.maxStaff,
      expiresAt: tenant.expiresAt ? new Date(tenant.expiresAt).toISOString() : null,
      storageMode: isEnterprise ? 'DEDICATED' : 'SHARED',
      propertyId: defaultPropertyConfig?.id,
      property: defaultPropertyConfig,
    };

    // Cache in Redis
    await this.redis.setJSON(`tenant:id:${tenant.id}`, context, TENANT_CACHE_TTL_SECONDS);
    if (tenant.slug) {
      await this.redis.set(`tenant:slug:${tenant.slug.toLowerCase()}`, tenant.id, TENANT_CACHE_TTL_SECONDS);
    }

    return context;
  }

  private async getPropertyConfig(tenantId: string, propertyId: string): Promise<TenantPropertyConfig | null> {
    const propKey = `tenant:${tenantId}:prop:${propertyId}`;
    const cached = await this.redis.getJSON<TenantPropertyConfig>(propKey);
    if (cached) return cached;

    const property = await this.dataSource.getRepository(Property).findOne({
      where: { id: propertyId, tenantId },
    });

    if (!property) return null;

    const config: TenantPropertyConfig = {
      id: property.id,
      name: property.name,
      code: property.code,
      currency: property.currency || 'LKR',
      timezone: property.timezone || 'Asia/Colombo',
      defaultTaxRate: Number(property.defaultTaxRate) || 10.0,
      serviceChargeRate: Number(property.serviceChargeRate) || 10.0,
    };

    await this.redis.setJSON(propKey, config, TENANT_CACHE_TTL_SECONDS);
    return config;
  }
}
