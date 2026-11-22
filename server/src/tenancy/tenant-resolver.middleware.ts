import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantCacheService } from './tenant-cache.service';
import { TenantContextStorage } from './tenant-context.storage';
import { TenantContext } from './tenant-context.interface';

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  constructor(private readonly tenantCacheService: TenantCacheService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    let context: TenantContext | null = null;

    // 1. Check explicit header X-Tenant-Id
    const tenantIdHeader = req.headers['x-tenant-id'] as string;
    if (tenantIdHeader) {
      context = await this.tenantCacheService.getTenantContextById(tenantIdHeader);
    }

    // 2. Check explicit header X-Tenant-Slug
    if (!context) {
      const tenantSlugHeader = req.headers['x-tenant-slug'] as string;
      if (tenantSlugHeader) {
        context = await this.tenantCacheService.getTenantContextBySlug(tenantSlugHeader);
      }
    }

    // 3. Resolve from incoming Host header (subdomain or custom domain)
    if (!context && req.headers.host) {
      context = await this.tenantCacheService.getTenantContextByDomain(req.headers.host);
    }

    if (context) {
      req.tenantContext = context;
      return TenantContextStorage.run(context, () => next());
    }

    next();
  }
}
