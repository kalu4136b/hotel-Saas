import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { SettingsService } from './settings.service';
import { UserRole } from '../entities/user.entity';
import { SYSTEM_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '../auth/permissions';

@Controller('api/settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('permissions-meta')
  async getPermissionsMeta() {
    return {
      permissions: SYSTEM_PERMISSIONS,
      roleDefaults: DEFAULT_ROLE_PERMISSIONS,
    };
  }

  @Get('property')
  async getProperty(@Request() req: any) {
    return this.settingsService.getProperty(req.user.tenantId, req.user.propertyId);
  }

  @RequirePermissions('settings')
  @Put('property')
  async updateProperty(
    @Request() req: any,
    @Body()
    dto: {
      name?: string;
      address?: string;
      phone?: string;
      email?: string;
      currency?: string;
      defaultTaxRate?: number;
      serviceChargeRate?: number;
    },
  ) {
    return this.settingsService.updateProperty(
      req.user.tenantId,
      req.user.propertyId,
      dto,
      req.user.id,
    );
  }

  @RequirePermissions('settings')
  @Get('users')
  async getUsers(@Request() req: any) {
    return this.settingsService.getUsers(req.user.tenantId);
  }

  @RequirePermissions('settings')
  @Post('users')
  async createUser(
    @Request() req: any,
    @Body()
    dto: {
      fullName: string;
      username: string;
      email: string;
      phone?: string;
      password: string;
      role: UserRole;
      permissions?: string[];
    },
  ) {
    return this.settingsService.createUser(
      req.user.tenantId,
      req.user.propertyId,
      dto,
      req.user.id,
    );
  }

  @RequirePermissions('settings')
  @Patch('users/:id')
  async updateUser(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    dto: {
      fullName?: string;
      phone?: string;
      role?: UserRole;
      permissions?: string[];
      password?: string;
    },
  ) {
    return this.settingsService.updateUser(
      id,
      dto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @RequirePermissions('settings')
  @Patch('users/:id/status')
  async toggleUserStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.settingsService.toggleUserStatus(
      id,
      isActive,
      req.user.tenantId,
      req.user.id,
    );
  }

  @RequirePermissions('settings')
  @Get('audit-logs')
  async getAuditLogs(@Request() req: any) {
    return this.settingsService.getAuditLogs(req.user.tenantId, req.user.propertyId);
  }
}
