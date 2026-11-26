import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { PosService } from './pos.service';
import { OrderType, OrderStatus } from '../entities/order.entity';
import { KOTStatus } from '../entities/kot-status.enum';
import { PaymentMethod } from '../entities/payment.entity';

@Controller('api/pos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('pos', 'orders', 'tables', 'menu', 'kitchen', 'bar')
export class PosController {
  constructor(private readonly posService: PosService) {}

  private getPropId(req: any): string | undefined {
    return req.user?.propertyId || req.user?.property?.id;
  }

  private getUserId(req: any): string {
    return req.user?.id || req.user?.userId;
  }

  // Master Data
  @Get('categories')
  async getCategories(@Request() req: any) {
    return this.posService.getCategories(req.user.tenantId, this.getPropId(req)!);
  }

  @Post('categories')
  async createCategory(
    @Request() req: any,
    @Body() dto: { name: string; code?: string; sortOrder?: number },
  ) {
    return this.posService.createCategory(req.user.tenantId, this.getPropId(req)!, dto);
  }

  @Get('products')
  async getProducts(@Request() req: any, @Query('categoryId') categoryId?: string) {
    return this.posService.getProducts(req.user.tenantId, this.getPropId(req)!, categoryId);
  }

  @Post('products')
  async createProduct(
    @Request() req: any,
    @Body()
    dto: {
      name: string;
      sku?: string;
      categoryId: string;
      price: number;
      taxRate?: number;
      description?: string;
    },
  ) {
    return this.posService.createProduct(req.user.tenantId, this.getPropId(req)!, dto);
  }

  @Patch('products/:id')
  async updateProduct(
    @Request() req: any,
    @Param('id') productId: string,
    @Body()
    dto: {
      name?: string;
      price?: number;
      isAvailable?: boolean;
      description?: string;
    },
  ) {
    return this.posService.updateProduct(req.user.tenantId, this.getPropId(req)!, productId, dto);
  }

  @Delete('products/:id')
  async deleteProduct(@Request() req: any, @Param('id') productId: string) {
    return this.posService.deleteProduct(req.user.tenantId, this.getPropId(req)!, productId);
  }

  @Get('tables')
  async getTables(@Request() req: any) {
    return this.posService.getTables(req.user.tenantId, this.getPropId(req)!);
  }

  @Post('tables')
  async createTable(
    @Request() req: any,
    @Body() dto: { tableNumber: string; capacity?: number },
  ) {
    return this.posService.createTable(req.user.tenantId, this.getPropId(req)!, dto);
  }

  @Get('tables/:id/active-order')
  async getTableActiveOrder(@Request() req: any, @Param('id') tableId: string) {
    return this.posService.getTableActiveOrder(tableId, req.user.tenantId, this.getPropId(req)!);
  }

  @Delete('tables/:id')
  async deleteTable(@Request() req: any, @Param('id') tableId: string) {
    return this.posService.deleteTable(req.user.tenantId, this.getPropId(req)!, tableId);
  }

  // Shifts
  @Get('shifts/current')
  async getCurrentShift(@Request() req: any) {
    return this.posService.getCurrentShift(this.getUserId(req), req.user.tenantId);
  }

  @Post('shifts/open')
  async openShift(
    @Request() req: any,
    @Body() body: { startingFloat: number; notes?: string },
  ) {
    return this.posService.openShift(
      this.getUserId(req),
      req.user.tenantId,
      this.getPropId(req)!,
      body.startingFloat,
      body.notes,
    );
  }

  @Post('shifts/close')
  async closeShift(
    @Request() req: any,
    @Body() body: { shiftId: string; actualCashCount: number; notes?: string },
  ) {
    return this.posService.closeShift(
      body.shiftId,
      this.getUserId(req),
      req.user.tenantId,
      body.actualCashCount,
      body.notes,
    );
  }

  // Orders
  @Get('orders')
  async getOrders(
    @Request() req: any,
    @Query('status') status?: OrderStatus,
    @Query('tableId') tableId?: string,
  ) {
    return this.posService.getOrders(req.user.tenantId, this.getPropId(req)!, status, tableId);
  }

  @Get('orders/:id')
  async getOrder(@Request() req: any, @Param('id') id: string) {
    return this.posService.getOrder(id, req.user.tenantId);
  }

  @Post('orders')
  async createOrder(
    @Request() req: any,
    @Body()
    dto: {
      orderType: OrderType;
      tableId?: string;
      customerName?: string;
      guestCount?: number;
      notes?: string;
      items: Array<{ productId: string; quantity: number; notes?: string }>;
    },
  ) {
    return this.posService.createOrder(
      dto,
      this.getUserId(req),
      req.user.tenantId,
      this.getPropId(req)!,
    );
  }

  // KOT
  @Post('orders/:id/kot')
  async sendToKitchen(@Request() req: any, @Param('id') id: string) {
    return this.posService.sendToKitchen(id, req.user.tenantId, this.getPropId(req)!);
  }

  @Get('kitchen/kots')
  async getKitchenKots(@Request() req: any) {
    return this.posService.getKitchenKots(req.user.tenantId, this.getPropId(req)!);
  }

  @Patch('kitchen/kots/:id/status')
  async updateKotStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: KOTStatus,
  ) {
    return this.posService.updateKotStatus(id, status, req.user.tenantId);
  }

  // Billing & Payment
  @Post('orders/:id/bill')
  async generateBill(@Request() req: any, @Param('id') id: string) {
    return this.posService.generateBill(
      id,
      this.getUserId(req),
      req.user.tenantId,
      this.getPropId(req)!,
    );
  }

  @Post('orders/:id/payment')
  async settlePayment(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    dto: {
      paymentMethod: PaymentMethod;
      amountPaid: number;
      cardLast4?: string;
      transactionRef?: string;
      roomId?: string;
    },
  ) {
    return this.posService.settlePayment(
      id,
      dto,
      this.getUserId(req),
      req.user.tenantId,
      this.getPropId(req)!,
    );
  }

  @Post('orders/:id/cancel')
  async cancelOrder(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.posService.cancelOrder(
      id,
      reason || 'Customer request',
      this.getUserId(req),
      req.user.tenantId,
    );
  }
}
