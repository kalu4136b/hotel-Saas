import {
  Controller,
  Get,
  Query,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { TenantCacheService } from './tenant-cache.service';

@Controller('api/tenants')
export class TenantController {
  constructor(private readonly tenantCache: TenantCacheService) {}

  @Get('public/lookup')
  async lookupTenant(
    @Query('slug') slug?: string,
    @Query('domain') domain?: string,
    @Query('id') id?: string,
    @Req() req?: any,
  ) {
    const host = domain || (req?.headers?.host as string);
    const tenantInfo = await this.tenantCache.getPublicTenantInfo({
      slug: slug?.trim(),
      domain: host,
      id: id?.trim(),
    });

    if (!tenantInfo) {
      throw new NotFoundException('Hotel tenant not found or inactive');
    }

    return {
      success: true,
      tenant: tenantInfo,
    };
  }
}
