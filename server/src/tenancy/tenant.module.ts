import { Module, Global } from '@nestjs/common';
import { TenantCacheService } from './tenant-cache.service';
import { TenantResolverMiddleware } from './tenant-resolver.middleware';
import { TenantController } from './tenant.controller';
import { TenantConnectionManager } from '../database/tenant-connection-manager.service';

@Global()
@Module({
  controllers: [TenantController],
  providers: [
    TenantCacheService,
    TenantResolverMiddleware,
    TenantConnectionManager,
  ],
  exports: [
    TenantCacheService,
    TenantResolverMiddleware,
    TenantConnectionManager,
  ],
})
export class TenancyModule {}
