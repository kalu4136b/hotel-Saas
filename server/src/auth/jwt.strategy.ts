import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { TenantStatus } from '../entities/tenant.entity';
import { resolveUserPermissions } from './permissions';

export interface JwtPayload {
  sub: string;
  username: string;
  email: string;
  tenantId: string;
  propertyId?: string;
  role: string;
  tv?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        process.env.JWT_SECRET ||
        'super-secret-hotel-saas-jwt-key-2026',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub, isActive: true },
      relations: { property: true, tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('User is not authorized or account is inactive');
    }

    // 1. Verify server-side session token version (revokes tokens on logout, password reset, or role change)
    const tokenVer = payload.tv ?? 0;
    const currentVer = user.tokenVersion ?? 0;
    if (tokenVer !== currentVer) {
      throw new UnauthorizedException('Session has been revoked or expired. Please sign in again.');
    }

    // 2. Verify hotel tenant subscription is active (prevents suspended/expired tenants from continuing to use cached JWTs)
    if (user.role !== UserRole.SUPER_ADMIN) {
      if (!user.tenant || user.tenant.status !== TenantStatus.ACTIVE) {
        throw new UnauthorizedException(
          'Your hotel subscription is suspended or inactive. Please contact platform support.',
        );
      }
      if (user.tenant.expiresAt && new Date(user.tenant.expiresAt).getTime() < Date.now()) {
        throw new UnauthorizedException(
          'Your hotel subscription has expired. Please renew your plan to continue.',
        );
      }
    }

    // 3. Attach fresh resolved permissions from the database
    user.permissions = resolveUserPermissions(user);

    return user;
  }
}
