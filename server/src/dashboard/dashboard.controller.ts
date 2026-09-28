import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('api/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@Request() req: any) {
    const tenantId = req.user.tenantId;
    const propertyId = req.user.propertyId || req.user.property?.id;
    return this.dashboardService.getStats(tenantId, propertyId);
  }

  @Get('recent-orders')
  async getRecentOrders(@Request() req: any) {
    const tenantId = req.user.tenantId;
    const propertyId = req.user.propertyId || req.user.property?.id;
    return this.dashboardService.getRecentOrders(tenantId, propertyId);
  }

  @Get('top-products')
  async getTopProducts(@Request() req: any) {
    const tenantId = req.user.tenantId;
    const propertyId = req.user.propertyId || req.user.property?.id;
    return this.dashboardService.getTopProducts(tenantId, propertyId);
  }

  @Get('live-tables')
  async getLiveTables(@Request() req: any) {
    const tenantId = req.user.tenantId;
    const propertyId = req.user.propertyId || req.user.property?.id;
    return this.dashboardService.getLiveTables(tenantId, propertyId);
  }
}
