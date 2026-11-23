import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantContext } from '../tenancy/tenant-context.interface';
import { tenantOperationalEntities } from './tenant-entities';

export interface ProvisionResult {
  success: boolean;
  dbName: string;
  tablesCreated: number;
}

@Injectable()
export class TenantConnectionManager implements OnModuleDestroy {
  private readonly logger = new Logger(TenantConnectionManager.name);
  private readonly tenantDataSources = new Map<string, DataSource>();

  constructor(private readonly defaultDataSource: DataSource) {}

  /**
   * Retrieves active TypeORM DataSource for the given tenant context.
   * Returns default pooled connection for SHARED mode, or isolated connection for DEDICATED mode.
   */
  async getDataSource(context?: TenantContext): Promise<DataSource> {
    if (!context || context.storageMode === 'SHARED' || !context.dbName) {
      return this.defaultDataSource;
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
      this.logger.error(`Failed to connect dedicated DB ${database} for tenant ${context.slug}: ${err.message}. Falling back to default pool.`);
      return this.defaultDataSource;
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
