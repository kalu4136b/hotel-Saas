import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsEmail,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  Tenant,
  TenantDomain,
  Property,
  User,
  POSOutlet,
  UserRole,
  TenantStatus,
  SubscriptionTier,
  Room,
  Order,
  AuditLog,
} from '../entities';
import {
  PRICING_PACKAGES,
  PLATFORM_MODULES,
  PricingPackageDefinition,
} from './packages.config';
import { syncAiEntitlementWithPlan } from '../ai-assistant/services/ai-entitlement.service';
import { TenantCacheService } from '../tenancy/tenant-cache.service';
import { TenantConnectionManager } from '../database/tenant-connection-manager.service';
import { tenantOperationalEntities } from '../database/tenant-entities';
import { RedisService } from '../redis/redis.service';

export class CreateTenantDto {
  @IsNotEmpty({ message: 'Hotel name is required' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsNotEmpty({ message: 'Subscription plan is required' })
  @IsString()
  subscriptionPlan: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modules?: string[];

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  planPrice?: number;

  @IsOptional()
  @IsEnum(['MONTHLY', 'ANNUAL', 'LIFETIME'])
  billingCycle?: 'MONTHLY' | 'ANNUAL' | 'LIFETIME';

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxRooms?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxStaff?: number;

  @IsOptional()
  @IsString()
  propertyName?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsNotEmpty({ message: 'Admin full name is required' })
  @IsString()
  adminFullName: string;

  @IsNotEmpty({ message: 'Admin username is required' })
  @IsString()
  adminUsername: string;

  @IsNotEmpty({ message: 'Admin email is required' })
  @IsEmail({}, { message: 'A valid admin email is required' })
  adminEmail: string;

  @IsOptional()
  @IsString()
  adminPhone?: string;

  @IsNotEmpty({ message: 'Admin password is required' })
  @IsString()
  adminPassword: string;

  @IsOptional()
  @IsEnum(['SHARED', 'DEDICATED'])
  storageMode?: 'SHARED' | 'DEDICATED';

  @IsOptional()
  @IsString()
  dbHost?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  dbPort?: number;

  @IsOptional()
  @IsString()
  dbDatabaseName?: string;

  @IsOptional()
  @IsString()
  dbUsername?: string;

  @IsOptional()
  @IsString()
  dbPassword?: string;
}

export class UpdateTenantSubscriptionDto {
  @IsOptional()
  @IsString()
  subscriptionPlan?: string;

  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  planPrice?: number;

  @IsOptional()
  @IsEnum(['MONTHLY', 'ANNUAL', 'LIFETIME'])
  billingCycle?: 'MONTHLY' | 'ANNUAL' | 'LIFETIME';

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxRooms?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxStaff?: number;

  @IsOptional()
  @IsString()
  expiresAt?: string | null;
}

export class UpdateTenantModulesDto {
  @IsArray()
  @IsString({ each: true })
  modules: string[];
}

export class ResetTenantPasswordDto {
  @IsNotEmpty()
  @IsString()
  newPassword: string;
}

export class AddTenantDomainDto {
  @IsNotEmpty()
  @IsString()
  domain: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class ProvisionDedicatedDatabaseDto {
  @IsOptional()
  @IsString()
  dbName?: string;
}

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantCache: TenantCacheService,
    private readonly tenantConnectionManager: TenantConnectionManager,
    private readonly redis: RedisService,
  ) {}

  getPackagesConfig() {
    return {
      packages: PRICING_PACKAGES,
      modules: PLATFORM_MODULES,
    };
  }

  async getPlatformOverview() {
    const tenantRepo = this.dataSource.getRepository(Tenant);
    const userRepo = this.dataSource.getRepository(User);
    const propertyRepo = this.dataSource.getRepository(Property);
    const roomRepo = this.dataSource.getRepository(Room);
    const orderRepo = this.dataSource.getRepository(Order);

    const [totalTenants, activeTenants, suspendedTenants] = await Promise.all([
      tenantRepo.count(),
      tenantRepo.count({ where: { status: TenantStatus.ACTIVE } }),
      tenantRepo.count({ where: { status: TenantStatus.SUSPENDED } }),
    ]);

    const allTenants = await tenantRepo.find({
      select: { id: true, planPrice: true, billingCycle: true, status: true },
    });

    let mrr = 0;
    for (const t of allTenants) {
      if (t.status === TenantStatus.ACTIVE) {
        const price = Number(t.planPrice) || 0;
        if (t.billingCycle === 'ANNUAL') {
          mrr += price / 12;
        } else if (t.billingCycle === 'MONTHLY') {
          mrr += price;
        }
      }
    }

    const [totalUsers, totalProperties] = await Promise.all([
      userRepo.count(),
      propertyRepo.count(),
    ]);

    const activeSources = await this.tenantConnectionManager.getAllActiveDataSources();
    let totalRooms = 0;
    let totalOrders = 0;
    for (const ds of activeSources) {
      const [rc, oc] = await Promise.all([
        ds.getRepository(Room).count(),
        ds.getRepository(Order).count(),
      ]);
      totalRooms += rc;
      totalOrders += oc;
    }

    return {
      totalTenants,
      activeTenants,
      suspendedTenants,
      mrr: Math.round(mrr * 100) / 100,
      totalUsers,
      totalProperties,
      totalRooms,
      totalOrders,
    };
  }

  async getTenants(filters?: {
    search?: string;
    status?: string;
    plan?: string;
  }) {
    const tenantRepo = this.dataSource.getRepository(Tenant);
    const tenants = await tenantRepo.find({
      order: { createdAt: 'DESC' },
    });

    const userRepo = this.dataSource.getRepository(User);
    const propertyRepo = this.dataSource.getRepository(Property);
    const roomRepo = this.dataSource.getRepository(Room);

    const results = await Promise.all(
      tenants.map(async (tenant) => {
        const [users, properties] = await Promise.all([
          userRepo.find({
            where: { tenantId: tenant.id },
            select: {
              id: true,
              fullName: true,
              username: true,
              email: true,
              phone: true,
              role: true,
              isActive: true,
              lastLoginAt: true,
            },
          }),
          propertyRepo.find({
            where: { tenantId: tenant.id },
            select: { id: true, name: true, code: true, currency: true, isActive: true },
          }),
        ]);

        const adminUser =
          users.find((u) => u.role === UserRole.TENANT_ADMIN) || users[0];

        let roomCount = 0;
        if (properties.length > 0) {
          const propIds = properties.map((p) => p.id);
          let targetRoomRepo = roomRepo;
          if (tenant.storageMode === 'DEDICATED' && tenant.dbDatabaseName) {
            try {
              const { ds } = await this.tenantConnectionManager.getDataSourceForTenant(tenant.id);
              targetRoomRepo = ds.getRepository(Room);
            } catch {
              // Fallback to 0 if dedicated DB unreachable
              targetRoomRepo = null as any;
            }
          }
          if (targetRoomRepo) {
            roomCount = await targetRoomRepo
              .createQueryBuilder('room')
              .where('room.tenantId = :tenantId', { tenantId: tenant.id })
              .andWhere('room.propertyId IN (:...propIds)', { propIds })
              .getCount();
          }
        }

        const modules: string[] =
          tenant.modules && Array.isArray(tenant.modules)
            ? tenant.modules
            : typeof tenant.modules === 'string'
            ? JSON.parse(tenant.modules)
            : PRICING_PACKAGES[tenant.subscriptionPlan]?.defaultModules || [];

        return {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
          subscriptionTier: tenant.subscriptionTier,
          subscriptionPlan: tenant.subscriptionPlan || 'CUSTOM',
          planPrice: Number(tenant.planPrice) || 0,
          billingCycle: tenant.billingCycle || 'MONTHLY',
          modules,
          maxRooms: tenant.maxRooms,
          maxStaff: tenant.maxStaff,
          expiresAt: tenant.expiresAt,
          createdAt: tenant.createdAt,
          userCount: users.length,
          propertyCount: properties.length,
          roomCount,
          admin: adminUser
            ? {
                id: adminUser.id,
                fullName: adminUser.fullName,
                username: adminUser.username,
                email: adminUser.email,
                phone: adminUser.phone,
                lastLoginAt: adminUser.lastLoginAt,
              }
            : null,
          properties,
        };
      }),
    );

    // Apply filters
    return results.filter((item) => {
      if (filters?.status && filters.status !== 'ALL') {
        if (item.status !== filters.status) return false;
      }
      if (filters?.plan && filters.plan !== 'ALL') {
        if (item.subscriptionPlan !== filters.plan) return false;
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesSlug = item.slug.toLowerCase().includes(q);
        const matchesEmail = item.admin?.email?.toLowerCase().includes(q);
        const matchesAdmin = item.admin?.fullName?.toLowerCase().includes(q);
        if (!matchesName && !matchesSlug && !matchesEmail && !matchesAdmin) {
          return false;
        }
      }
      return true;
    });
  }

  async getTenantById(id: string) {
    const tenantRepo = this.dataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    let targetDs = this.dataSource;
    if (tenant.storageMode === 'DEDICATED' && tenant.dbDatabaseName) {
      try {
        const { ds } = await this.tenantConnectionManager.getDataSourceForTenant(id);
        targetDs = ds;
      } catch {
        targetDs = this.dataSource;
      }
    }

    const [users, properties] = await Promise.all([
      targetDs.getRepository(User).find({
        where: { tenantId: id },
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          phone: true,
          role: true,
          permissions: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
      targetDs.getRepository(Property).find({
        where: { tenantId: id },
      }),
    ]);

    const modules: string[] =
      tenant.modules && Array.isArray(tenant.modules)
        ? tenant.modules
        : typeof tenant.modules === 'string'
        ? JSON.parse(tenant.modules)
        : PRICING_PACKAGES[tenant.subscriptionPlan]?.defaultModules || [];

    return {
      ...tenant,
      modules,
      users,
      properties,
    };
  }

  async createTenant(dto: CreateTenantDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Verify username and email don't clash
      const existingUser = await queryRunner.manager.findOne(User, {
        where: [
          { email: dto.adminEmail.toLowerCase() },
          { username: dto.adminUsername.toLowerCase() },
        ],
      });
      if (existingUser) {
        if (existingUser.email.toLowerCase() === dto.adminEmail.toLowerCase()) {
          throw new ConflictException(
            'A user with this email address already exists in the system',
          );
        }
        throw new ConflictException(
          'This username is already taken. Please choose another username',
        );
      }

      // 2. Slug generation
      const baseSlug = (dto.slug || dto.name)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'hotel';
      const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

      // 3. Package & Modules resolution
      const pkg = PRICING_PACKAGES[dto.subscriptionPlan];
      const selectedModules =
        dto.modules && dto.modules.length > 0
          ? dto.modules
          : pkg?.defaultModules || [
              'pos',
              'orders',
              'tables',
              'menu',
              'reports',
              'settings',
              'dashboard',
            ];

      const planPrice =
        dto.planPrice !== undefined
          ? Number(dto.planPrice)
          : dto.billingCycle === 'ANNUAL'
          ? pkg?.annualPrice || 0
          : pkg?.monthlyPrice || 0;

      // 4. Provision Dedicated Database if DEDICATED storage mode is requested
      let dedicatedDbName: string | null = null;
      if (dto.storageMode === 'DEDICATED') {
        const rawTargetDb =
          dto.dbDatabaseName?.trim().toLowerCase() ||
          `hotel_${uniqueSlug.replace(/[^a-z0-9_]/g, '_')}_db`;
        try {
          const provision =
            await this.tenantConnectionManager.provisionDedicatedDatabase({
              dbName: rawTargetDb,
              host: dto.dbHost,
              port: dto.dbPort,
              username: dto.dbUsername,
              password: dto.dbPassword,
            });
          dedicatedDbName = provision.dbName;
        } catch (dbErr: any) {
          this.logger.error(`Dedicated DB provisioning error: ${dbErr.message}`, dbErr.stack);
          throw new BadRequestException(
            `Dedicated database provisioning failed: ${dbErr.message}. Ensure MySQL user has CREATE DATABASE privileges or select Shared Pool.`,
          );
        }
      }

      // 5. Create Tenant in Master Catalog
      const tenant = queryRunner.manager.create(Tenant, {
        name: dto.name.trim(),
        slug: uniqueSlug,
        status: TenantStatus.ACTIVE,
        subscriptionTier:
          dto.subscriptionPlan === 'ENTERPRISE_SUITE'
            ? SubscriptionTier.ENTERPRISE
            : dto.subscriptionPlan === 'HOSPITALITY_PRO'
            ? SubscriptionTier.BUSINESS
            : SubscriptionTier.STARTER,
        subscriptionPlan: dto.subscriptionPlan || 'CUSTOM',
        modules: selectedModules,
        planPrice,
        billingCycle: dto.billingCycle || 'MONTHLY',
        maxRooms: dto.maxRooms ?? (pkg?.maxRooms || null),
        maxStaff: dto.maxStaff ?? (pkg?.maxStaff || null),
        storageMode: dto.storageMode || 'SHARED',
        dbDatabaseName: dedicatedDbName,
        dbHost: dto.dbHost || null,
        dbPort: dto.dbPort || 3306,
        dbUsername: dto.dbUsername || null,
        dbPassword: dto.dbPassword || null,
      } as any);
      const savedTenant = await queryRunner.manager.save(tenant);

      // 5. Create Default Property
      const propTitle = dto.propertyName?.trim() || `${dto.name.trim()} Main`;
      const property = queryRunner.manager.create(Property, {
        tenantId: savedTenant.id,
        name: propTitle,
        code: 'PROP-01',
        currency: dto.currency || 'LKR',
        timezone: 'Asia/Colombo',
        defaultTaxRate: 10.0,
        serviceChargeRate: 0.0,
        phone: dto.adminPhone || undefined,
        email: dto.adminEmail.toLowerCase(),
        isActive: true,
      });
      const savedProperty = await queryRunner.manager.save(property);

      // 6. Create Default POS Outlet
      const outlet = queryRunner.manager.create(POSOutlet, {
        tenantId: savedTenant.id,
        propertyId: savedProperty.id,
        name: 'Main Station & Counter',
        code: 'OUT-01',
        isActive: true,
      });
      await queryRunner.manager.save(outlet);

      // 7. Hash password & Create Tenant Admin User
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(dto.adminPassword, salt);

      const adminUser = queryRunner.manager.create(User, {
        tenantId: savedTenant.id,
        propertyId: savedProperty.id,
        email: dto.adminEmail.toLowerCase(),
        username: dto.adminUsername.toLowerCase(),
        fullName: dto.adminFullName.trim(),
        phone: dto.adminPhone || undefined,
        passwordHash,
        role: UserRole.TENANT_ADMIN,
        permissions: selectedModules,
        isActive: true,
      });
      const savedUser = await queryRunner.manager.save(adminUser);

      // 8. Audit log entry
      const audit = queryRunner.manager.create(AuditLog, {
        tenantId: savedTenant.id,
        propertyId: savedProperty.id,
        userId: savedUser.id,
        action: 'TENANT_ONBOARDED_BY_COMPANY',
        entity: 'Tenant',
        entityId: savedTenant.id,
        details: JSON.stringify({
          plan: dto.subscriptionPlan,
          modulesCount: selectedModules.length,
          adminEmail: savedUser.email,
        }),
      });
      await queryRunner.manager.save(audit);

      await queryRunner.commitTransaction();

      // 9. Replicate initial Property, Outlet, and Admin User into Dedicated DB if provisioned
      if (dedicatedDbName) {
        try {
          const dedicatedDs = await this.tenantConnectionManager.getDataSource({
            tenantId: savedTenant.id,
            slug: savedTenant.slug,
            name: savedTenant.name,
            status: savedTenant.status,
            subscriptionTier: savedTenant.subscriptionTier,
            subscriptionPlan: savedTenant.subscriptionPlan,
            modules: savedTenant.modules,
            storageMode: 'DEDICATED',
            dbName: dedicatedDbName,
            dbHost: savedTenant.dbHost || undefined,
            dbPort: savedTenant.dbPort || undefined,
            dbUser: savedTenant.dbUsername || undefined,
            dbPassword: savedTenant.dbPassword || undefined,
          });
          await dedicatedDs.getRepository(Tenant).save(savedTenant);
          await dedicatedDs.getRepository(Property).save(savedProperty);
          await dedicatedDs.getRepository(POSOutlet).save(outlet);
          await dedicatedDs.getRepository(User).save(savedUser);
        } catch (e: any) {
          this.logger.warn(`Failed to replicate initial records to dedicated DB: ${e.message}`);
        }
      }

      return {
        success: true,
        tenant: savedTenant,
        property: savedProperty,
        user: {
          id: savedUser.id,
          username: savedUser.username,
          email: savedUser.email,
          fullName: savedUser.fullName,
          role: savedUser.role,
        },
      };
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`createTenant failed: ${err.message}`, err.stack);
      if (
        err instanceof ConflictException ||
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      throw new BadRequestException(
        err.message || 'Failed to create tenant. Please check server logs.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async updateTenantModules(id: string, modules: string[]) {
    const tenantRepo = this.dataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    if (!Array.isArray(modules)) {
      throw new BadRequestException('Modules must be an array of module identifiers');
    }

    tenant.modules = modules;
    await tenantRepo.save(tenant);

    if (tenant.storageMode === 'DEDICATED' && tenant.dbDatabaseName) {
      try {
        const { ds } = await this.tenantConnectionManager.getDataSourceForTenant(id);
        await ds.getRepository(Tenant).save(tenant);
      } catch {
        // Non-blocking mirror sync
      }
    }

    // Invalidate tenant & user session caches in Redis for real-time feature flag sync
    await this.tenantCache.invalidateTenant(id);
    const tenantUsers = await this.dataSource.getRepository(User).find({
      where: { tenantId: id },
      select: { id: true },
    });
    await Promise.all(tenantUsers.map((u) => this.redis.del(`auth:session:${u.id}`)));

    return {
      success: true,
      id: tenant.id,
      name: tenant.name,
      modules: tenant.modules,
    };
  }

  async updateTenantSubscription(id: string, dto: UpdateTenantSubscriptionDto) {
    const tenantRepo = this.dataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    if (dto.subscriptionPlan) {
      tenant.subscriptionPlan = dto.subscriptionPlan;
    }
    if (dto.status) {
      tenant.status = dto.status;
    }
    if (dto.planPrice !== undefined) {
      tenant.planPrice = Number(dto.planPrice);
    }
    if (dto.billingCycle) {
      tenant.billingCycle = dto.billingCycle;
    }
    if (dto.maxRooms !== undefined) {
      tenant.maxRooms = dto.maxRooms;
    }
    if (dto.maxStaff !== undefined) {
      tenant.maxStaff = dto.maxStaff;
    }
    if (dto.expiresAt !== undefined) {
      tenant.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : (null as any);
    }

    await tenantRepo.save(tenant);

    if (tenant.storageMode === 'DEDICATED' && tenant.dbDatabaseName) {
      try {
        const { ds } = await this.tenantConnectionManager.getDataSourceForTenant(id);
        await ds.getRepository(Tenant).save(tenant);
      } catch {
        // Non-blocking mirror sync
      }
    }

    // Invalidate tenant & user session caches in Redis for real-time subscription & status sync
    await this.tenantCache.invalidateTenant(id);
    const tenantUsers = await this.dataSource.getRepository(User).find({
      where: { tenantId: id },
      select: { id: true },
    });
    await Promise.all(tenantUsers.map((u) => this.redis.del(`auth:session:${u.id}`)));

    // Keep AI Co-Pilot entitlement (tier, providers, quotas) aligned with the new plan
    if (dto.subscriptionPlan) {
      await syncAiEntitlementWithPlan(this.dataSource, tenant.id);
    }

    return {
      success: true,
      tenant,
    };
  }

  async resetTenantAdminPassword(id: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters long');
    }

    const userRepo = this.dataSource.getRepository(User);
    const adminUser = await userRepo.findOne({
      where: { tenantId: id, role: UserRole.TENANT_ADMIN },
    });

    if (!adminUser) {
      throw new NotFoundException(`No admin user found for tenant ${id}`);
    }

    const salt = await bcrypt.genSalt(10);
    adminUser.passwordHash = await bcrypt.hash(newPassword, salt);
    adminUser.tokenVersion = (adminUser.tokenVersion || 0) + 1;
    await userRepo.save(adminUser);

    await this.redis.del(`auth:session:${adminUser.id}`);

    try {
      const { ds, isDedicated } = await this.tenantConnectionManager.getDataSourceForTenant(id);
      if (isDedicated) {
        const dedUserRepo = ds.getRepository(User);
        const dedAdmin = await dedUserRepo.findOne({ where: { id: adminUser.id, tenantId: id } });
        if (dedAdmin) {
          dedAdmin.passwordHash = adminUser.passwordHash;
          dedAdmin.tokenVersion = adminUser.tokenVersion;
          await dedUserRepo.save(dedAdmin);
        }
      }
    } catch {
      // Non-blocking mirror sync
    }

    return {
      success: true,
      message: `Password for admin user "${adminUser.username}" (${adminUser.email}) has been successfully updated.`,
      username: adminUser.username,
      email: adminUser.email,
    };
  }

  // ================= TENANT CUSTOM DOMAINS =================

  async getTenantDomains(tenantId: string) {
    const tenant = await this.dataSource.getRepository(Tenant).findOne({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException(`Tenant with ID ${tenantId} not found`);

    const domains = await this.dataSource.getRepository(TenantDomain).find({
      where: { tenantId },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });

    return {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      defaultSubdomain: `${tenant.slug}.hotelia.tenura.tech`,
      domains,
    };
  }

  async addTenantDomain(tenantId: string, domainRaw: string, isPrimary = false) {
    const tenant = await this.dataSource.getRepository(Tenant).findOne({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException(`Tenant with ID ${tenantId} not found`);

    // Clean and validate domain
    let clean = domainRaw.trim().toLowerCase();
    clean = clean.replace(/^https?:\/\//, '').replace(/\/.*$/, '').split(':')[0];

    const fqdnRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,}$/;
    if (!clean || !fqdnRegex.test(clean)) {
      throw new BadRequestException('Invalid domain format. Example: pms.grandazurehotel.com');
    }

    const domainRepo = this.dataSource.getRepository(TenantDomain);
    const existing = await domainRepo.findOne({ where: { domain: clean } });
    if (existing) {
      throw new ConflictException(`Domain "${clean}" is already assigned to a tenant`);
    }

    if (isPrimary) {
      await domainRepo.update({ tenantId }, { isPrimary: false });
    }

    const newDomain = domainRepo.create({
      tenantId,
      domain: clean,
      isPrimary,
      isVerified: true,
    });

    const saved = await domainRepo.save(newDomain);

    // Sync to Redis for 0ms routing
    await this.tenantCache.setDomainMapping(clean, tenantId);

    return {
      success: true,
      domain: saved,
    };
  }

  async deleteTenantDomain(tenantId: string, domainId: string) {
    const domainRepo = this.dataSource.getRepository(TenantDomain);
    const domainRecord = await domainRepo.findOne({
      where: { id: domainId, tenantId },
    });

    if (!domainRecord) {
      throw new NotFoundException('Domain mapping not found');
    }

    await domainRepo.remove(domainRecord);

    // Remove from Redis cache
    await this.tenantCache.deleteDomainMapping(domainRecord.domain);

    return {
      success: true,
      message: `Domain "${domainRecord.domain}" successfully removed`,
    };
  }

  async setPrimaryDomain(tenantId: string, domainId: string) {
    const domainRepo = this.dataSource.getRepository(TenantDomain);
    const target = await domainRepo.findOne({
      where: { id: domainId, tenantId },
    });

    if (!target) {
      throw new NotFoundException('Domain mapping not found');
    }

    // Unset all, then set primary
    await domainRepo.update({ tenantId }, { isPrimary: false });
    target.isPrimary = true;
    await domainRepo.save(target);

    return {
      success: true,
      domain: target,
    };
  }

  // ================= TENANT DATABASE INFRASTRUCTURE =================

  async getTenantDatabaseInfo(tenantId: string) {
    const tenant = await this.dataSource.getRepository(Tenant).findOne({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException(`Tenant with ID ${tenantId} not found`);

    const isDedicated = tenant.storageMode === 'DEDICATED';
    const dbName = isDedicated
      ? tenant.dbDatabaseName || `hotel_${tenant.slug}_db`
      : process.env.DB_DATABASE || 'hotel_saas';

    let tableCount = 0;
    try {
      const res = await this.dataSource.query(
        `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ?`,
        [dbName]
      );
      tableCount = Number(res[0]?.count || 0);
    } catch {
      // ignore
    }

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      storageMode: tenant.storageMode || 'SHARED',
      isDedicated,
      dbDatabaseName: dbName,
      resolvedDatabase: dbName,
      dbHost: tenant.dbHost || process.env.DB_HOST || '127.0.0.1',
      dbPort: tenant.dbPort || Number(process.env.DB_PORT) || 3306,
      tableCount,
      status: 'ONLINE',
    };
  }

  async provisionAndIsolateExistingTenant(tenantId: string, customDbName?: string) {
    const tenantRepo = this.dataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant with ID ${tenantId} not found`);

    if (tenant.storageMode === 'DEDICATED' && tenant.dbDatabaseName) {
      return {
        success: true,
        alreadyIsolated: true,
        dbName: tenant.dbDatabaseName,
        message: `Tenant is already isolated in database "${tenant.dbDatabaseName}".`,
      };
    }

    const rawTargetDb =
      customDbName?.trim().toLowerCase() ||
      `hotel_${tenant.slug.replace(/[^a-z0-9_]/g, '_')}_db`;

    // 1. Provision new database schema and all 50+ tables
    const provision = await this.tenantConnectionManager.provisionDedicatedDatabase({
      dbName: rawTargetDb,
    });

    // 2. Connect to the new dedicated database
    const dedicatedDs = await this.tenantConnectionManager.getDataSource({
      tenantId: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      status: tenant.status,
      subscriptionTier: tenant.subscriptionTier,
      subscriptionPlan: tenant.subscriptionPlan,
      modules: tenant.modules,
      storageMode: 'DEDICATED',
      dbName: provision.dbName,
    });

    // 3. Migrate all existing operational rows from shared pool into the new database
    let migratedTables = 0;
    for (const entityClass of tenantOperationalEntities) {
      try {
        const rows = await this.dataSource.getRepository(entityClass as any).find({
          where: { tenantId } as any,
        });
        if (rows && rows.length > 0) {
          await dedicatedDs.getRepository(entityClass as any).save(rows);
          migratedTables++;
        }
      } catch (err: any) {
        // Continue with other entities
      }
    }

    // 4. Update tenant in Master DB
    tenant.storageMode = 'DEDICATED';
    tenant.dbDatabaseName = provision.dbName;
    await tenantRepo.save(tenant);

    // 5. Invalidate Redis cache so routing switches instantly
    await this.tenantCache.invalidateTenant(tenantId);

    return {
      success: true,
      dbName: provision.dbName,
      tablesCreated: provision.tablesCreated,
      migratedEntities: migratedTables,
      message: `Tenant "${tenant.name}" successfully upgraded and isolated to dedicated database "${provision.dbName}".`,
    };
  }

  async syncTenantDatabaseSchema(tenantId: string) {
    const tenant = await this.dataSource.getRepository(Tenant).findOne({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException(`Tenant with ID ${tenantId} not found`);

    if (tenant.storageMode !== 'DEDICATED' || !tenant.dbDatabaseName) {
      throw new BadRequestException('Tenant is on shared pool database. Schema is automatically managed by master.');
    }

    const context = await this.tenantCache.getTenantContextById(tenantId);
    if (!context) throw new NotFoundException('Tenant context not resolved');

    return this.tenantConnectionManager.syncDedicatedDatabaseSchema(context);
  }
}
