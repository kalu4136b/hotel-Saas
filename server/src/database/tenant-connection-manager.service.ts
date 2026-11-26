import {
  Injectable,
  Logger,
  OnModuleDestroy,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import { TenantContext } from '../tenancy/tenant-context.interface';
import { TenantCacheService } from '../tenancy/tenant-cache.service';
import { tenantOperationalEntities } from './tenant-entities';
import { Property, Tenant, TenantStatus } from '../entities';

export interface ProvisionResult {
  success: boolean;
  dbName: string;
  tablesCreated: number;
}

export interface ResolvedTenantScope {
  ds: DataSource;
  tenantId: string;
  propertyId: string;
  isDedicated: boolean;
  context: TenantContext;
}

@Injectable()
export class TenantConnectionManager implements OnModuleDestroy {
  private readonly logger = new Logger(TenantConnectionManager.name);
  private readonly tenantDataSources = new Map<string, DataSource>();

  constructor(
    private readonly defaultDataSource: DataSource,
    private readonly tenantCacheService: TenantCacheService,
  ) {}

  /**
   * Returns the master control-plane DataSource (hotel_saas).
   */
  getMasterDataSource(): DataSource {
    return this.defaultDataSource;
  }

  /**
   * Enforces a non-empty tenantId string so TypeORM never strips `undefined` in WHERE clauses.
   */
  assertValidTenantId(tenantId?: string | null): string {
    if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
      throw new ForbiddenException(
        'Tenant isolation error: Missing or invalid tenant context in session.',
      );
    }
    return tenantId.trim();
  }

  /**
   * Resolves the active TypeORM DataSource for a tenantId, plus validated non-empty tenantId & propertyId.
   * Guarantees:
   * - DEDICATED tenants NEVER fall back to the shared pool database.
   * - `tenantId` and `propertyId` are always non-empty strings (preventing TypeORM undefined-filter leaks).
   */
  async resolveTenantScope(
    tenantId?: string | null,
    propertyId?: string | null,
  ): Promise<ResolvedTenantScope> {
    const validTenantId = this.assertValidTenantId(tenantId);
    const context = await this.tenantCacheService.getTenantContextById(validTenantId);
    if (!context) {
      throw new NotFoundException(`Tenant ${validTenantId} not found`);
    }

    const isDedicated = context.storageMode === 'DEDICATED';
    const ds = await this.getDataSource(context);

    let validPropertyId =
      (typeof propertyId === 'string' && propertyId.trim()) ||
      (typeof context.propertyId === 'string' && context.propertyId.trim()) ||
      '';

    if (!validPropertyId) {
      let prop = await ds.getRepository(Property).findOne({
        where: { tenantId: validTenantId },
        order: { createdAt: 'ASC' },
      });

      // Self-heal if dedicated DB was missing the initial Tenant/Property mirror row
      if (!prop && isDedicated) {
        const masterProp = await this.defaultDataSource.getRepository(Property).findOne({
          where: { tenantId: validTenantId },
          order: { createdAt: 'ASC' },
        });
        if (masterProp) {
          const masterTenant = await this.defaultDataSource.getRepository(Tenant).findOne({
            where: { id: validTenantId },
          });
          if (masterTenant) {
            await ds.getRepository(Tenant).save(masterTenant);
          }
          prop = await ds.getRepository(Property).save(masterProp);
        }
      }

      if (prop?.id) {
        validPropertyId = prop.id;
      }
    }

    if (!validPropertyId) {
      throw new ForbiddenException(
        'Tenant isolation error: No active property context found for this tenant.',
      );
    }

    return {
      ds,
      tenantId: validTenantId,
      propertyId: validPropertyId,
      isDedicated,
      context,
    };
  }

  /**
   * Resolves the active TypeORM DataSource for a given tenantId (for tenant-level queries that don't require propertyId).
   */
  async getDataSourceForTenant(tenantId?: string | null): Promise<{
    ds: DataSource;
    tenantId: string;
    isDedicated: boolean;
    context: TenantContext;
  }> {
    const validTenantId = this.assertValidTenantId(tenantId);
    const context = await this.tenantCacheService.getTenantContextById(validTenantId);
    if (!context) {
      throw new NotFoundException(`Tenant ${validTenantId} not found`);
    }
    const ds = await this.getDataSource(context);
    return {
      ds,
      tenantId: validTenantId,
      isDedicated: context.storageMode === 'DEDICATED',
      context,
    };
  }

  /**
   * Helper to get a tenant-routed TypeORM Repository directly.
   */
  async getRepository<T extends ObjectLiteral>(
    tenantId: string,
    entity: EntityTarget<T>,
  ): Promise<Repository<T>> {
    const { ds } = await this.getDataSourceForTenant(tenantId);
    return ds.getRepository(entity);
  }

  /**
   * Returns all active DataSources (shared master + all active DEDICATED tenant DataSources)
   * for background workers (e.g. Channel Manager sync queue) or unauthenticated webhook/iCal lookups.
   */
  async getAllActiveDataSources(): Promise<DataSource[]> {
    const sources: DataSource[] = [this.defaultDataSource];
    try {
      const dedicatedTenants = await this.defaultDataSource.getRepository(Tenant).find({
        where: { storageMode: 'DEDICATED', status: TenantStatus.ACTIVE },
      });
      for (const t of dedicatedTenants) {
        if (!t.dbDatabaseName) continue;
        try {
          const ctx = await this.tenantCacheService.getTenantContextById(t.id);
          if (ctx) {
            const ds = await this.getDataSource(ctx);
            if (ds !== this.defaultDataSource) {
              sources.push(ds);
            }
          }
        } catch (err: any) {
          this.logger.warn(`Skipping unreachable dedicated DB for tenant ${t.slug}: ${err.message}`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed enumerating dedicated tenants: ${err.message}`);
    }
    return sources;
  }

  /**
   * Retrieves active TypeORM DataSource for the given tenant context.
   * Returns default pooled connection for SHARED mode, or isolated connection for DEDICATED mode.
   * NEVER falls back to shared pool if tenant is DEDICATED.
   */
  async getDataSource(context?: TenantContext): Promise<DataSource> {
    if (!context || context.storageMode !== 'DEDICATED') {
      return this.defaultDataSource;
    }

    if (!context.dbName) {
      throw new ServiceUnavailableException(
        `Dedicated database is not configured for tenant "${context.slug}".`,
      );
    }

    const tenantId = context.tenantId;

    // Check cached active connection
    const existing = this.tenantDataSources.get(tenantId);
    if (existing && existing.isInitialized) {
      return existing;
    }

    // Connect to dedicated isolated database
    const host = context.dbHost || process.env.DB_HOST || '127.0.0.1';
    const port = context.dbPort || Number(process.env.DB_PORT) || 3306;
    const username = context.dbUser || process.env.DB_USERNAME || 'root';
    const password = context.dbPassword !== undefined ? context.dbPassword : (process.env.DB_PASSWORD || '');
    const database = context.dbName;

    this.logger.log(`Connecting dedicated DataSource for tenant ${context.slug} -> DB: ${database}`);

    const dedicatedDs = new DataSource({
      type: 'mysql',
      host,
      port,
      username,
      password,
      database,
      entities: tenantOperationalEntities,
      synchronize: false,
      logging: ['error', 'warn'],
      extra: {
        connectionLimit: 10,
        waitForConnections: true,
      },
    });

    try {
      await dedicatedDs.initialize();
      this.tenantDataSources.set(tenantId, dedicatedDs);
      return dedicatedDs;
    } catch (err: any) {
      this.logger.error(
        `CRITICAL: Failed to connect dedicated DB ${database} for tenant ${context.slug}: ${err.message}`,
      );
      throw new ServiceUnavailableException(
        `Dedicated database "${database}" for tenant "${context.name}" is unavailable: ${err.message}`,
      );
    }
  }

  /**
   * Automates MySQL schema creation and TypeORM table generation on the fly.
   * Zero manual SQL or SSH work required.
   */
  async provisionDedicatedDatabase(options: {
    dbName: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
  }): Promise<ProvisionResult> {
    const rawDbName = options.dbName.trim().toLowerCase();
    const cleanDbName = rawDbName.replace(/[^a-z0-9_]/g, '_');

    if (!cleanDbName) {
      throw new Error('Invalid database name');
    }

    this.logger.log(`Provisioning new dedicated MySQL schema: ${cleanDbName}`);

    // 1. Create the database schema on MySQL server using master connection
    await this.defaultDataSource.query(
      `CREATE DATABASE IF NOT EXISTS \`${cleanDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );

    // 2. Initialize a temporary provisioning DataSource with synchronize: true to build all tables
    const host = options.host || process.env.DB_HOST || '127.0.0.1';
    const port = options.port || Number(process.env.DB_PORT) || 3306;
    const username = options.username || process.env.DB_USERNAME || 'root';
    const password = options.password !== undefined ? options.password : (process.env.DB_PASSWORD || '');

    const provisioningDs = new DataSource({
      type: 'mysql',
      host,
      port,
      username,
      password,
      database: cleanDbName,
      entities: tenantOperationalEntities,
      synchronize: true,
      logging: ['error', 'warn'],
    });

    await provisioningDs.initialize();

    // 3. Verify created tables count
    const tablesQuery = await provisioningDs.query(
      `SELECT COUNT(*) as tableCount FROM information_schema.tables WHERE table_schema = ?`,
      [cleanDbName]
    );
    const tablesCreated = Number(tablesQuery[0]?.tableCount || 0);

    this.logger.log(`Successfully provisioned ${cleanDbName} with ${tablesCreated} tables.`);

    // 4. Close temporary provisioning connection
    await provisioningDs.destroy();

    return {
      success: true,
      dbName: cleanDbName,
      tablesCreated,
    };
  }

  /**
   * Syncs and verifies the table schema for an isolated dedicated database.
   */
  async syncDedicatedDatabaseSchema(context: TenantContext): Promise<{ success: boolean; message: string; tablesCount: number }> {
    if (context.storageMode !== 'DEDICATED' || !context.dbName) {
      throw new Error('Tenant is not configured for a dedicated database');
    }

    const host = context.dbHost || process.env.DB_HOST || '127.0.0.1';
    const port = context.dbPort || Number(process.env.DB_PORT) || 3306;
    const username = context.dbUser || process.env.DB_USERNAME || 'root';
    const password = context.dbPassword !== undefined ? context.dbPassword : (process.env.DB_PASSWORD || '');

    const syncDs = new DataSource({
      type: 'mysql',
      host,
      port,
      username,
      password,
      database: context.dbName,
      entities: tenantOperationalEntities,
      synchronize: true,
    });

    await syncDs.initialize();
    const tablesQuery = await syncDs.query(
      `SELECT COUNT(*) as tableCount FROM information_schema.tables WHERE table_schema = ?`,
      [context.dbName]
    );
    const tablesCount = Number(tablesQuery[0]?.tableCount || 0);
    await syncDs.destroy();

    // Invalidate cached DataSource in memory so next request gets fresh connection
    const existing = this.tenantDataSources.get(context.tenantId);
    if (existing && existing.isInitialized) {
      await existing.destroy();
      this.tenantDataSources.delete(context.tenantId);
    }

    return {
      success: true,
      message: `Schema successfully verified and synced with ${tablesCount} operational tables.`,
      tablesCount,
    };
  }

  async onModuleDestroy() {
    for (const ds of this.tenantDataSources.values()) {
      if (ds.isInitialized) {
        try {
          await ds.destroy();
        } catch {
          // ignore
        }
      }
    }
    this.tenantDataSources.clear();
  }
}
