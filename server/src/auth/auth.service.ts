import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { TenantStatus } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { resolveUserPermissions } from './permissions';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  async login(dto: LoginDto) {
    const identifier = dto.usernameOrEmail.trim().toLowerCase();

    const user = await this.dataSource.getRepository(User).findOne({
      where: [{ email: identifier }, { username: identifier }],
      relations: { property: true, tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials. Please verify username/email and password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your user account has been deactivated. Please contact support');
    }

    if (user.tenant && user.tenant.status !== TenantStatus.ACTIVE) {
      throw new UnauthorizedException('Your hotel subscription is suspended or pending activation');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials. Please verify username/email and password');
    }

    // Update lastLoginAt
    const permissions = resolveUserPermissions(user);
    const token = this.generateToken(user, user.tenantId, user.propertyId, permissions);

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
      property: user.property
        ? {
            id: user.property.id,
            name: user.property.name,
            currency: user.property.currency || 'LKR',
            defaultTaxRate: user.property.defaultTaxRate || 10.0,
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
      property: user.property,
    };
  }

  private generateToken(user: User, tenantId: string, propertyId?: string, permissions?: string[]): string {
    const effectivePermissions = permissions || resolveUserPermissions(user);
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      tenantId: tenantId,
      propertyId: propertyId || user.propertyId,
      role: user.role,
      permissions: effectivePermissions,
    };

    return this.jwtService.sign(payload);
  }
}
