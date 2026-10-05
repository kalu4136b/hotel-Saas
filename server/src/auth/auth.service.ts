import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  Tenant,
  TenantStatus,
  SubscriptionTier,
} from '../entities/tenant.entity';
import { Property } from '../entities/property.entity';
import { User, UserRole } from '../entities/user.entity';
import { POSOutlet } from '../entities/pos-outlet.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { resolveUserPermissions } from './permissions';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  async register(dto: RegisterDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Check existing username or email
      const existingUser = await queryRunner.manager.findOne(User, {
        where: [{ email: dto.email.toLowerCase() }, { username: dto.username.toLowerCase() }],
      });

      if (existingUser) {
        if (existingUser.email.toLowerCase() === dto.email.toLowerCase()) {
          throw new ConflictException('An account with this email address already exists');
        }
        throw new ConflictException('This username is already taken. Please choose another');
      }

      // 2. Generate unique tenant slug
      const propertyTitle = dto.propertyName?.trim() || `${dto.fullName.trim()}'s Resort`;
      const baseSlug = propertyTitle
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'hotel';
      const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

      // 3. Create Tenant
      const tenant = queryRunner.manager.create(Tenant, {
        name: propertyTitle,
        slug: uniqueSlug,
        status: TenantStatus.ACTIVE,
        subscriptionTier: SubscriptionTier.STARTER,
        subscriptionPlan: 'HOSPITALITY_PRO',
        modules: [
          'pos', 'orders', 'tables', 'menu', 'kitchen',
          'pms_hub', 'pms_rooms', 'pms_reservations', 'pms_front_desk',
          'inventory', 'reports', 'settings', 'dashboard'
        ],
        planPrice: 89.0,
        billingCycle: 'MONTHLY',
      });
      const savedTenant = await queryRunner.manager.save(tenant);

      // 4. Create Default Property
      const property = queryRunner.manager.create(Property, {
        tenantId: savedTenant.id,
        name: propertyTitle,
        code: 'PROP-01',
        currency: dto.currency || 'USD',
        timezone: 'UTC',
        defaultTaxRate: 10.0,
        serviceChargeRate: 0.0,
        phone: dto.phone || undefined,
        email: dto.email.toLowerCase(),
        isActive: true,
      });
      const savedProperty = await queryRunner.manager.save(property);

      // 5. Create Default POS Outlet
      const outlet = queryRunner.manager.create(POSOutlet, {
        tenantId: savedTenant.id,
        propertyId: savedProperty.id,
        name: 'Main Restaurant & Bar',
        code: 'OUT-01',
        isActive: true,
      });
      const savedOutlet = await queryRunner.manager.save(outlet);

      // 6. Hash password and Create User (Tenant Admin)
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(dto.password, salt);

      const user = queryRunner.manager.create(User, {
        tenantId: savedTenant.id,
        propertyId: savedProperty.id,
        email: dto.email.toLowerCase(),
        username: dto.username.toLowerCase(),
        fullName: dto.fullName.trim(),
        phone: dto.phone || undefined,
        passwordHash,
        role: UserRole.TENANT_ADMIN,
        isActive: true,
      });
      const savedUser = await queryRunner.manager.save(user);



      // 10. Audit Log Entry
      const audit = queryRunner.manager.create(AuditLog, {
        tenantId: savedTenant.id,
        propertyId: savedProperty.id,
        userId: savedUser.id,
        action: 'TENANT_REGISTERED',
        entity: 'Tenant',
        entityId: savedTenant.id,
        details: JSON.stringify({
          tenantName: savedTenant.name,
          property: savedProperty.name,
          adminEmail: savedUser.email,
        }),
      });
      await queryRunner.manager.save(audit);

      await queryRunner.commitTransaction();

      // Generate Access Token
      const token = this.generateToken(savedUser, savedTenant.id, savedProperty.id);

      return {
        accessToken: token,
        user: {
          id: savedUser.id,
          username: savedUser.username,
          email: savedUser.email,
          fullName: savedUser.fullName,
          role: savedUser.role,
        },
        tenant: {
          id: savedTenant.id,
          name: savedTenant.name,
          slug: savedTenant.slug,
          subscriptionTier: savedTenant.subscriptionTier,
        },
        property: {
          id: savedProperty.id,
          name: savedProperty.name,
          currency: savedProperty.currency,
          defaultTaxRate: savedProperty.defaultTaxRate,
        },
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

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
            currency: user.property.currency || 'USD',
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
