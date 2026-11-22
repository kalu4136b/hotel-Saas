import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Property } from '../entities/property.entity';
import { User, UserRole } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { TenantCacheService } from '../tenancy/tenant-cache.service';
import {
  SYSTEM_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  resolveUserPermissions,
} from '../auth/permissions';

@Injectable()
export class SettingsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantCache: TenantCacheService,
  ) {}

  // 1. Get Property Settings
  async getProperty(tenantId: string, propertyId: string) {
    const property = await this.dataSource.getRepository(Property).findOne({
      where: { id: propertyId, tenantId },
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  // 2. Update Property Settings
  async updateProperty(
    tenantId: string,
    propertyId: string,
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
    const propRepo = this.dataSource.getRepository(Property);
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

    // Invalidate tenant & property config cache in Redis
    await this.tenantCache.invalidateTenant(tenantId);

    // Audit log
    await this.dataSource.getRepository(AuditLog).save({
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
  async getUsers(tenantId: string) {
    const users = await this.dataSource.getRepository(User).find({
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
    tenantId: string,
    propertyId: string,
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
    const userRepo = this.dataSource.getRepository(User);

    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot assign platform SUPER_ADMIN role to tenant staff');
    }

    const existing = await userRepo.findOne({
      where: [{ email: dto.email.toLowerCase() }, { username: dto.username.toLowerCase() }],
    });

    if (existing) {
      if (existing.email.toLowerCase() === dto.email.toLowerCase()) {
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

    const newUser = userRepo.create({
      tenantId,
      propertyId,
      fullName: dto.fullName.trim(),
      username: dto.username.toLowerCase().trim(),
      email: dto.email.toLowerCase().trim(),
      phone: dto.phone || undefined,
      passwordHash,
      role: dto.role,
      permissions,
      isActive: true,
    });

    const saved = await userRepo.save(newUser);

    // Audit log
    await this.dataSource.getRepository(AuditLog).save({
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
    tenantId: string,
    adminUserId: string,
  ) {
    const userRepo = this.dataSource.getRepository(User);
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

    // Audit log
    await this.dataSource.getRepository(AuditLog).save({
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
  async toggleUserStatus(userId: string, isActive: boolean, tenantId: string, adminUserId: string) {
    if (userId === adminUserId) {
      throw new ForbiddenException('You cannot deactivate your own administrative account');
    }

    const userRepo = this.dataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('User not found');

    user.isActive = isActive;
    if (!isActive) {
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }
    await userRepo.save(user);

    return { id: user.id, isActive: user.isActive };
  }

  // 6. Audit Logs
  async getAuditLogs(tenantId: string, propertyId: string) {
    return this.dataSource.getRepository(AuditLog).find({
      where: { tenantId, propertyId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
