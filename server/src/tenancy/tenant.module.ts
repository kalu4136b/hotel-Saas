import { Module, Global } from '@nestjs/common';
import { TenantCacheService } from './tenant-cache.service';
import { TenantResolverMiddleware } from './tenant-resolver.middleware';
import { TenantController } from './tenant.controller';

@Global()
@Module({
  controllers: [TenantController],
  providers: [TenantCacheService, TenantResolverMiddleware],
  exports: [TenantCacheService, TenantResolverMiddleware],
})
export class TenancyModule {}
