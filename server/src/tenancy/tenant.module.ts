import { Module, Global } from '@nestjs/common';
import { TenantCacheService } from './tenant-cache.service';
import { TenantResolverMiddleware } from './tenant-resolver.middleware';

@Global()
@Module({
  providers: [TenantCacheService, TenantResolverMiddleware],
  exports: [TenantCacheService, TenantResolverMiddleware],
})
export class TenancyModule {}
