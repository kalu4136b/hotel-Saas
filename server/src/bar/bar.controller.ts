import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  BarService,
  CreateBarItemDto,
  UpdateBarItemDto,
  QuickPourDto,
  LogWastageDto,
  RestockBarItemDto,
} from './bar.service';

@Controller('api/bar')
@UseGuards(JwtAuthGuard)
export class BarController {
  constructor(private readonly barService: BarService) {}

  @Get('items')
  getItems(
    @Request() req: any,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('lowStock') lowStock?: string,
  ) {
    const tenantId = req.user.tenantId;
    const propertyId = req.user.propertyId || req.user.property?.id;
    return this.barService.getItems(tenantId, propertyId, {
      category,
      search,
      lowStock: lowStock === 'true',
    });
  }

  @Get('items/:id')
  getItem(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    const propertyId = req.user.propertyId || req.user.property?.id;
    return this.barService.getItem(tenantId, propertyId, id);
  }

  @Post('items')
  createItem(@Request() req: any, @Body() dto: CreateBarItemDto) {
    const tenantId = req.user.tenantId;
    const propertyId = req.user.propertyId || req.user.property?.id;
    return this.barService.createItem(tenantId, propertyId, dto);
  }

  @Patch('items/:id')
  updateItem(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateBarItemDto,
  ) {
    const tenantId = req.user.tenantId;
    const propertyId = req.user.propertyId || req.user.property?.id;
    return this.barService.updateItem(tenantId, propertyId, id, dto);
  }

  @Delete('items/:id')
  deleteItem(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    const propertyId = req.user.propertyId || req.user.property?.id;
    return this.barService.deleteItem(tenantId, propertyId, id);
  }

  @Post('pour')
  quickPour(@Request() req: any, @Body() dto: QuickPourDto) {
    const tenantId = req.user.tenantId;
    const propertyId = req.user.propertyId || req.user.property?.id;
    const bartenderName = dto.bartenderName || req.user.fullName || req.user.username;
    return this.barService.quickPour(tenantId, propertyId, {
      ...dto,
      bartenderName,
    });
  }

  @Post('wastage')
  logWastage(@Request() req: any, @Body() dto: LogWastageDto) {
    const tenantId = req.user.tenantId;
    const propertyId = req.user.propertyId || req.user.property?.id;
    const bartenderName = dto.bartenderName || req.user.fullName || req.user.username;
    return this.barService.logWastage(tenantId, propertyId, {
      ...dto,
      bartenderName,
    });
  }

  @Post('items/:id/restock')
  restockBottles(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RestockBarItemDto,
  ) {
    const tenantId = req.user.tenantId;
    const propertyId = req.user.propertyId || req.user.property?.id;
    return this.barService.restockBottles(tenantId, propertyId, id, dto);
  }

  @Post('items/:id/open-bottle')
  openBottle(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    const propertyId = req.user.propertyId || req.user.property?.id;
    return this.barService.openBottle(tenantId, propertyId, id);
  }

  @Get('logs')
  getPourLogs(
    @Request() req: any,
    @Query('pourType') pourType?: string,
    @Query('category') category?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = req.user.tenantId;
    const propertyId = req.user.propertyId || req.user.property?.id;
    return this.barService.getPourLogs(tenantId, propertyId, {
      pourType,
      category,
      startDate,
      endDate,
      search,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('analytics')
  getBarAnalyticsReport(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = req.user.tenantId;
    const propertyId = req.user.propertyId || req.user.property?.id;
    return this.barService.getBarAnalyticsReport(
      tenantId,
      propertyId,
      startDate,
      endDate,
    );
  }
}
