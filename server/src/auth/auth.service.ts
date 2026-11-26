import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { Property } from '../entities/property.entity';
import { TenantStatus } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { resolveUserPermissions } from './permissions';
import { RedisService } from '../redis/redis.service';
import { TenantConnectionManager } from '../database/tenant-connection-manager.service';

interface LoginAttemptRecord {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class AuthService {
  private readonly loginAttempts = new Map<string, LoginAttemptRecord>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    private readonly redis: RedisService,
    private readonly tenantConn: TenantConnectionManager,
  ) {}

  private checkRateLimit(key: string): void {
    const now = Date.now();
    const record = this.loginAttempts.get(key);
    if (!record) return;

    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingMinutes = Math.ceil((record.lockedUntil - now) / 60000);
      throw new HttpException(
        `Too many failed sign-in attempts. Please wait ${remainingMinutes} minute(s) before trying again.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (now - record.firstAttemptAt > ATTEMPT_WINDOW_MS) {
      this.loginAttempts.delete(key);
    }
  }

  private recordFailedAttempt(key: string): void {
    const now = Date.now();
    const record = this.loginAttempts.get(key);
    if (!record || now - record.firstAttemptAt > ATTEMPT_WINDOW_MS) {
      this.loginAttempts.set(key, { count: 1, firstAttemptAt: now });
      return;
    }

    record.count += 1;
    if (record.count >= MAX_FAILED_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_DURATION_MS;
    }
    this.loginAttempts.set(key, record);
  }

  async login(dto: LoginDto, clientIp = 'unknown') {
    const identifier = dto.usernameOrEmail.trim().toLowerCase();
    const throttleKey = `${clientIp}:${identifier}`;

    this.checkRateLimit(throttleKey);

    const userRepo = this.dataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: [{ email: identifier }, { username: identifier }],
      relations: { property: true, tenant: true },
    });

    if (!user) {
      this.recordFailedAttempt(throttleKey);
      throw new UnauthorizedException('Invalid credentials. Please verify username/email and password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your user account has been deactivated. Please contact support');
    }

    if (user.tenant && user.tenant.status !== TenantStatus.ACTIVE) {
      throw new UnauthorizedException('Your hotel subscription is suspended or pending activation');
    }

    if (user.tenant?.expiresAt && new Date(user.tenant.expiresAt).getTime() < Date.now()) {
      throw new UnauthorizedException('Your hotel subscription has expired. Please contact support');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      this.recordFailedAttempt(throttleKey);
      throw new UnauthorizedException('Invalid credentials. Please verify username/email and password');
    }

    // Clear failed login counter on success & record lastLoginAt
    this.loginAttempts.delete(throttleKey);
    user.lastLoginAt = new Date();
    await userRepo.update(user.id, { lastLoginAt: user.lastLoginAt });

    let activeProperty = user.property;
    if (user.tenantId && user.tenant?.storageMode === 'DEDICATED') {
      try {
        const { ds, isDedicated } = await this.tenantConn.getDataSourceForTenant(user.tenantId);
        if (isDedicated) {
          await ds.getRepository(User).update(user.id, { lastLoginAt: user.lastLoginAt });
          if (user.propertyId) {
            const dedProp = await ds.getRepository(Property).findOne({
              where: { id: user.propertyId, tenantId: user.tenantId },
            });
            if (dedProp) activeProperty = dedProp;
          }
        }
      } catch {
        // Non-blocking sync on login
      }
    }

    const permissions = resolveUserPermissions(user);
    const expiresIn = dto.rememberMe === false ? '8h' : '12h';
    const token = this.generateToken(user, user.tenantId, user.propertyId, permissions, expiresIn);

    return {
      accessToken: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        permissions,
        avatarUrl: user.avatarUrl,
      },
      tenant: user.tenant
        ? {
            id: user.tenant.id,
            name: user.tenant.name,
            slug: user.tenant.slug,
            status: user.tenant.status,
            subscriptionTier: user.tenant.subscriptionTier,
            subscriptionPlan: user.tenant.subscriptionPlan || 'CUSTOM',
            modules: user.tenant.modules || [],
            planPrice: user.tenant.planPrice,
            billingCycle: user.tenant.billingCycle,
            maxRooms: user.tenant.maxRooms,
            maxStaff: user.tenant.maxStaff,
            expiresAt: user.tenant.expiresAt,
          }
        : null,
      property: activeProperty
        ? {
            id: activeProperty.id,
            name: activeProperty.name,
            currency: activeProperty.currency || 'LKR',
            defaultTaxRate: activeProperty.defaultTaxRate || 10.0,
          }
        : null,
    };
  }

  async getMe(userId: string) {
    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: userId },
      relations: { property: true, tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    let activeProperty = user.property;
    if (user.tenantId && user.tenant?.storageMode === 'DEDICATED' && user.propertyId) {
      try {
        const { ds, isDedicated } = await this.tenantConn.getDataSourceForTenant(user.tenantId);
        if (isDedicated) {
          const dedProp = await ds.getRepository(Property).findOne({
            where: { id: user.propertyId, tenantId: user.tenantId },
          });
          if (dedProp) activeProperty = dedProp;
        }
      } catch {
        // Fallback to master mirror property
      }
    }

    const permissions = resolveUserPermissions(user);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        permissions,
        avatarUrl: user.avatarUrl,
      },
      tenant: user.tenant,
      property: activeProperty,
    };
  }

  async logout(userId: string) {
    if (userId) {
      const user = await this.dataSource.getRepository(User).findOne({
        where: { id: userId },
        select: { id: true, tenantId: true },
      });

      await Promise.all([
        this.dataSource
          .getRepository(User)
          .increment({ id: userId }, 'tokenVersion', 1),
        this.redis.del(`auth:session:${userId}`),
        this.redis.incr(`auth:user:${userId}:tv`),
      ]);

      if (user?.tenantId) {
        try {
          const { ds, isDedicated } = await this.tenantConn.getDataSourceForTenant(user.tenantId);
          if (isDedicated) {
            await ds.getRepository(User).increment({ id: userId }, 'tokenVersion', 1);
          }
        } catch {
          // Ignore dedicated sync error on logout
        }
      }
    }
    return {
      success: true,
      message: 'Session revoked and logged out successfully',
    };
  }

  private generateToken(
    user: User,
    tenantId: string,
    propertyId?: string,
    permissions?: string[],
    expiresIn?: string,
  ): string {
    const effectivePermissions = permissions || resolveUserPermissions(user);
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      tenantId: tenantId,
      propertyId: propertyId || user.propertyId,
      role: user.role,
      permissions: effectivePermissions,
      tv: user.tokenVersion ?? 0,
    };

    return this.jwtService.sign(
      payload,
      expiresIn ? ({ expiresIn: expiresIn as any } as any) : undefined,
    );
  }
}
