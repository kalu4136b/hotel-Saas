import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Property } from '../entities/property.entity';
import { User, UserRole } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { TenantCacheService } from '../tenancy/tenant-cache.service';
import { TenantConnectionManager } from '../database/tenant-connection-manager.service';
import { RedisService } from '../redis/redis.service';
import {
  DEFAULT_ROLE_PERMISSIONS,
  resolveUserPermissions,
} from '../auth/permissions';

@Injectable()
export class SettingsService {
  constructor(
    private readonly tenantConn: TenantConnectionManager,
    private readonly tenantCache: TenantCacheService,
    private readonly redis: RedisService,
  ) {}

  // 1. Get Property Settings
  async getProperty(rawTenantId: string, rawPropertyId: string) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const property = await ds.getRepository(Property).findOne({
      where: { id: propertyId, tenantId },
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  // 2. Update Property Settings
  async updateProperty(
    rawTenantId: string,
    rawPropertyId: string,
    dto: {
      name?: string;
      address?: string;
      phone?: string;
      email?: string;
      currency?: string;
      defaultTaxRate?: number;
      serviceChargeRate?: number;
    },
    userId: string,
  ) {
    const { ds, tenantId, propertyId, isDedicated } =
      await this.tenantConn.resolveTenantScope(rawTenantId, rawPropertyId);

    const propRepo = ds.getRepository(Property);
    const property = await propRepo.findOne({
      where: { id: propertyId, tenantId },
    });
    if (!property) throw new NotFoundException('Property not found');

    if (dto.name) property.name = dto.name;
    if (dto.address !== undefined) property.address = dto.address;
    if (dto.phone !== undefined) property.phone = dto.phone;
    if (dto.email !== undefined) property.email = dto.email;
    if (dto.currency) property.currency = dto.currency;
    if (dto.defaultTaxRate !== undefined) property.defaultTaxRate = Number(dto.defaultTaxRate);
    if (dto.serviceChargeRate !== undefined) property.serviceChargeRate = Number(dto.serviceChargeRate);

    const updated = await propRepo.save(property);

    // Mirror property metadata to master catalog for global auth/tenant resolution if dedicated
    if (isDedicated) {
      await this.tenantConn.getMasterDataSource().getRepository(Property).save(updated);
    }

    // Invalidate tenant & property config cache in Redis
    await this.tenantCache.invalidateTenant(tenantId);

    // Audit log inside tenant's isolated DataSource
    await ds.getRepository(AuditLog).save({
      tenantId,
      propertyId,
      userId,
      action: 'PROPERTY_UPDATED',
      entity: 'Property',
      entityId: property.id,
      details: JSON.stringify({ name: property.name, tax: property.defaultTaxRate }),
    });

    return updated;
  }

  // 3. Get Staff Members
  async getUsers(rawTenantId: string) {
    const { ds, tenantId } = await this.tenantConn.getDataSourceForTenant(rawTenantId);
    const users = await ds.getRepository(User).find({
      where: { tenantId },
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
      order: { createdAt: 'ASC' },
    });

    return users.map((u) => ({
      ...u,
      permissions: resolveUserPermissions(u),
    }));
  }

  // 4. Create Staff Member
  async createUser(
    rawTenantId: string,
    rawPropertyId: string,
    dto: {
      fullName: string;
      username: string;
      email: string;
      phone?: string;
      password: string;
      role: UserRole;
      permissions?: string[];
    },
    adminUserId: string,
  ) {
    const { ds, tenantId, propertyId, isDedicated } =
      await this.tenantConn.resolveTenantScope(rawTenantId, rawPropertyId);

    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot assign platform SUPER_ADMIN role to tenant staff');
    }

    const masterUserRepo = this.tenantConn.getMasterDataSource().getRepository(User);
    const tenantUserRepo = ds.getRepository(User);

    // Check global login uniqueness across master auth directory AND tenant DB
    const cleanEmail = dto.email.toLowerCase().trim();
    const cleanUsername = dto.username.toLowerCase().trim();

    const existingMaster = await masterUserRepo.findOne({
      where: [{ email: cleanEmail }, { username: cleanUsername }],
    });
    const existingTenant = isDedicated
      ? await tenantUserRepo.findOne({
          where: [{ email: cleanEmail }, { username: cleanUsername }],
        })
      : null;
    const existing = existingMaster || existingTenant;

    if (existing) {
      if (existing.email.toLowerCase() === cleanEmail) {
        throw new ConflictException('An account with this email already exists');
      }
      throw new ConflictException('This username is already taken');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const permissions =
      dto.permissions && dto.permissions.length > 0
        ? dto.permissions
        : DEFAULT_ROLE_PERMISSIONS[dto.role] || [];

    // Save in master auth directory (for global /api/auth/login routing)
    const masterUser = masterUserRepo.create({
      tenantId,
      propertyId,
      fullName: dto.fullName.trim(),
      username: cleanUsername,
      email: cleanEmail,
      phone: dto.phone || undefined,
      passwordHash,
      role: dto.role,
      permissions,
      isActive: true,
    });
    const saved = await masterUserRepo.save(masterUser);

    // Mirror identical UUID record into dedicated DB if DEDICATED
    if (isDedicated) {
      await tenantUserRepo.save(saved);
    }

    // Audit log inside tenant's isolated DataSource
    await ds.getRepository(AuditLog).save({
      tenantId,
      propertyId,
      userId: adminUserId,
      action: 'STAFF_CREATED',
      entity: 'User',
      entityId: saved.id,
      details: JSON.stringify({
        username: saved.username,
        role: saved.role,
        permissions: saved.permissions,
      }),
    });

    const { passwordHash: _, ...result } = saved;
    return {
      ...result,
      permissions: resolveUserPermissions(result),
    };
  }

  // 4b. Update Staff Member (Role & Permissions)
  async updateUser(
    userId: string,
    dto: {
      fullName?: string;
      phone?: string;
      role?: UserRole;
      permissions?: string[];
      password?: string;
    },
    rawTenantId: string,
    adminUserId: string,
  ) {
    const { ds, tenantId, isDedicated } =
      await this.tenantConn.getDataSourceForTenant(rawTenantId);

    const userRepo = ds.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.fullName) user.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.role) {
      if (dto.role === UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Cannot promote tenant user to platform SUPER_ADMIN');
      }
      if (user.role !== dto.role) {
        user.tokenVersion = (user.tokenVersion || 0) + 1;
      }
      user.role = dto.role;
    }
    if (dto.permissions !== undefined) {
      user.permissions = dto.permissions;
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }
    if (dto.password && dto.password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(dto.password, salt);
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }

    const saved = await userRepo.save(user);

    if (isDedicated) {
      await this.tenantConn.getMasterDataSource().getRepository(User).save(saved);
    }
    await this.redis.del(`auth:session:${userId}`);

    // Audit log
    await ds.getRepository(AuditLog).save({
      tenantId,
      propertyId: user.propertyId,
      userId: adminUserId,
      action: 'STAFF_PERMISSIONS_UPDATED',
      entity: 'User',
      entityId: saved.id,
      details: JSON.stringify({
        username: saved.username,
        role: saved.role,
        permissions: saved.permissions,
      }),
    });

    const { passwordHash: _, ...result } = saved;
    return {
      ...result,
      permissions: resolveUserPermissions(result),
    };
  }

  // 5. Toggle Staff Active Status
  async toggleUserStatus(
    userId: string,
    isActive: boolean,
    rawTenantId: string,
    adminUserId: string,
  ) {
    if (userId === adminUserId) {
      throw new ForbiddenException('You cannot deactivate your own administrative account');
    }

    const { ds, tenantId, isDedicated } =
      await this.tenantConn.getDataSourceForTenant(rawTenantId);

    const userRepo = ds.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('User not found');

    user.isActive = isActive;
    if (!isActive) {
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }
    const saved = await userRepo.save(user);

    if (isDedicated) {
      await this.tenantConn.getMasterDataSource().getRepository(User).save(saved);
    }
    await this.redis.del(`auth:session:${userId}`);

    return { id: user.id, isActive: user.isActive };
  }

  // 6. Audit Logs
  async getAuditLogs(rawTenantId: string, rawPropertyId: string) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    return ds.getRepository(AuditLog).find({
      where: { tenantId, propertyId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
