import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';
import {
  SuperAdminService,
  CreateTenantDto,
  UpdateTenantSubscriptionDto,
} from './super-admin.service';

@Controller('api/super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('packages')
  getPackagesConfig() {
    return this.superAdminService.getPackagesConfig();
  }

  @Get('overview')
  getOverview() {
    return this.superAdminService.getPlatformOverview();
  }

  @Get('tenants')
  getTenants(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('plan') plan?: string,
  ) {
    return this.superAdminService.getTenants({ search, status, plan });
  }

  @Get('tenants/:id')
  getTenantById(@Param('id') id: string) {
    return this.superAdminService.getTenantById(id);
  }

  @Post('tenants')
  createTenant(@Body() dto: CreateTenantDto) {
    return this.superAdminService.createTenant(dto);
  }

  @Patch('tenants/:id/modules')
  updateTenantModules(
    @Param('id') id: string,
    @Body('modules') modules: string[],
  ) {
    return this.superAdminService.updateTenantModules(id, modules);
  }

  @Patch('tenants/:id/subscription')
  updateTenantSubscription(
    @Param('id') id: string,
    @Body() dto: UpdateTenantSubscriptionDto,
  ) {
    return this.superAdminService.updateTenantSubscription(id, dto);
  }

  @Post('tenants/:id/reset-password')
  resetTenantAdminPassword(
    @Param('id') id: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.superAdminService.resetTenantAdminPassword(id, newPassword);
  }

  // ================= TENANT DOMAIN MANAGEMENT =================

  @Get('tenants/:id/domains')
  getTenantDomains(@Param('id') id: string) {
    return this.superAdminService.getTenantDomains(id);
  }

  @Post('tenants/:id/domains')
  addTenantDomain(
    @Param('id') id: string,
    @Body('domain') domain: string,
    @Body('isPrimary') isPrimary?: boolean,
  ) {
    return this.superAdminService.addTenantDomain(id, domain, isPrimary);
  }

  @Delete('tenants/:id/domains/:domainId')
  deleteTenantDomain(
    @Param('id') id: string,
    @Param('domainId') domainId: string,
  ) {
    return this.superAdminService.deleteTenantDomain(id, domainId);
  }

  @Put('tenants/:id/domains/:domainId/primary')
  setPrimaryDomain(
    @Param('id') id: string,
    @Param('domainId') domainId: string,
  ) {
    return this.superAdminService.setPrimaryDomain(id, domainId);
  }

  // ================= TENANT DATABASE / HYBRID ISOLATION =================

  @Get('tenants/:id/database')
  getTenantDatabaseInfo(@Param('id') id: string) {
    return this.superAdminService.getTenantDatabaseInfo(id);
  }

  @Post('tenants/:id/database/provision')
  provisionDedicatedDatabase(
    @Param('id') id: string,
    @Body('dbName') dbName?: string,
  ) {
    return this.superAdminService.provisionAndIsolateExistingTenant(id, dbName);
  }

  @Post('tenants/:id/database/sync-schema')
  syncTenantDatabaseSchema(@Param('id') id: string) {
    return this.superAdminService.syncTenantDatabaseSchema(id);
  }
}
