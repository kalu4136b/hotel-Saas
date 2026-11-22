import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  Tenant,
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

export class CreateTenantDto {
  name: string;
  slug?: string;
  subscriptionPlan: string;
  modules?: string[];
  planPrice?: number;
  billingCycle?: 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
  maxRooms?: number;
  maxStaff?: number;
  propertyName?: string;
  currency?: string;
  adminFullName: string;
  adminUsername: string;
  adminEmail: string;
  adminPhone?: string;
  adminPassword: string;
}

export class UpdateTenantSubscriptionDto {
  subscriptionPlan?: string;
  status?: TenantStatus;
  planPrice?: number;
  billingCycle?: 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
  maxRooms?: number;
  maxStaff?: number;
  expiresAt?: string | null;
}

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantCache: TenantCacheService,
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

    const [totalUsers, totalProperties, totalRooms, totalOrders] =
      await Promise.all([
        userRepo.count(),
        propertyRepo.count(),
        roomRepo.count(),
        orderRepo.count(),
      ]);

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
          roomCount = await roomRepo
            .createQueryBuilder('room')
            .where('room.propertyId IN (:...propIds)', { propIds })
            .getCount();
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

    const [users, properties] = await Promise.all([
      this.dataSource.getRepository(User).find({
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
      this.dataSource.getRepository(Property).find({
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

      // 4. Create Tenant
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
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
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

    // Invalidate tenant cache in Redis for real-time feature flag sync
    await this.tenantCache.invalidateTenant(id);

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

    // Invalidate tenant cache in Redis for real-time subscription & status sync
    await this.tenantCache.invalidateTenant(id);

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

    return {
      success: true,
      message: `Password for admin user "${adminUser.username}" (${adminUser.email}) has been successfully updated.`,
      username: adminUser.username,
      email: adminUser.email,
    };
  }
}
