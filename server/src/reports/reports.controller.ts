import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { ReportsService } from './reports.service';

@Controller('api/reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-sales')
  async getDailySales(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getDailySalesReport(
      req.user.tenantId,
      req.user.propertyId,
      startDate,
      endDate,
    );
  }

  @Get('payments')
  async getPaymentMethods(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getPaymentMethodReport(
      req.user.tenantId,
      req.user.propertyId,
      startDate,
      endDate,
    );
  }

  @Get('item-sales')
  async getItemSales(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getItemSalesReport(
      req.user.tenantId,
      req.user.propertyId,
      startDate,
      endDate,
    );
  }

  @Get('cancellations')
  async getCancellations(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getCancellationReport(
      req.user.tenantId,
      req.user.propertyId,
      startDate,
      endDate,
    );
  }
}
