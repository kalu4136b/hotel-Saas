import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { TenantStatus } from '../entities/tenant.entity';
import { resolveUserPermissions } from './permissions';
import { RedisService } from '../redis/redis.service';

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
    private readonly redis: RedisService,
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
    const sessionKey = `auth:session:${payload.sub}`;
    const tokenVer = payload.tv ?? 0;

    // 1. Fast-path: Check Redis cached session (0.2ms vs full SQL join)
    const cachedUser = await this.redis.getJSON<User>(sessionKey);
    if (cachedUser) {
      const cachedVer = cachedUser.tokenVersion ?? 0;
      if (tokenVer !== cachedVer) {
        throw new UnauthorizedException('Session has been revoked or expired. Please sign in again.');
      }
      return cachedUser;
    }

    // 2. Database validation on cache miss
    const user = await this.userRepository.findOne({
      where: { id: payload.sub, isActive: true },
      relations: { property: true, tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('User is not authorized or account is inactive');
    }

    // Verify server-side session token version (revokes tokens on logout, password reset, or role change)
    const currentVer = user.tokenVersion ?? 0;
    if (tokenVer !== currentVer) {
      throw new UnauthorizedException('Session has been revoked or expired. Please sign in again.');
    }

    // Verify hotel tenant subscription is active
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

    // Attach fresh resolved permissions
    user.permissions = resolveUserPermissions(user);

    // Cache user session in Redis for 120 seconds for ultra-fast subsequent requests
    await this.redis.setJSON(sessionKey, user, 120);

    return user;
  }
}

