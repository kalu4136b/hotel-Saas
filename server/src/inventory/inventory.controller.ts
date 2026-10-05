import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InventoryService } from './inventory.service';
import {
  InventoryCategory,
  InventoryUnit,
  StockMovementType,
} from '../entities';

@Controller('api/inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // 1. Inventory Items
  @Get('items')
  getItems(
    @Request() req: any,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('lowStock') lowStock?: string,
  ) {
    return this.inventoryService.getItems(
      req.user.tenantId,
      req.user.propertyId,
      category,
      search,
      lowStock === 'true',
    );
  }

  @Get('items/:id')
  getItem(@Request() req: any, @Param('id') id: string) {
    return this.inventoryService.getItem(req.user.tenantId, req.user.propertyId, id);
  }

  @Post('items')
  createItem(
    @Request() req: any,
    @Body()
    dto: {
      name: string;
      sku?: string;
      category: InventoryCategory;
      unit: InventoryUnit;
      currentStock?: number;
      minStockLevel?: number;
      costPerUnit?: number;
    },
  ) {
    return this.inventoryService.createItem(
      req.user.tenantId,
      req.user.propertyId,
      dto,
    );
  }

  @Patch('items/:id')
  updateItem(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.inventoryService.updateItem(
      req.user.tenantId,
      req.user.propertyId,
      id,
      dto,
    );
  }

  @Post('items/:id/adjust')
  adjustStock(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    dto: {
      quantity: number;
      movementType: StockMovementType;
      unitCost?: number;
      reason: string;
      referenceId?: string;
    },
  ) {
    return this.inventoryService.adjustStock(
      req.user.tenantId,
      req.user.propertyId,
      id,
      req.user.userId || req.user.id,
      dto,
    );
  }

  @Get('movements')
  getStockMovements(
    @Request() req: any,
    @Query('itemId') itemId?: string,
  ) {
    return this.inventoryService.getStockMovements(
      req.user.tenantId,
      req.user.propertyId,
      itemId,
    );
  }

  // 2. Recipe (BOM) Management
  @Get('recipes/:productId')
  getRecipe(@Request() req: any, @Param('productId') productId: string) {
    return this.inventoryService.getRecipe(
      req.user.tenantId,
      req.user.propertyId,
      productId,
    );
  }

  @Post('recipes/:productId')
  saveRecipe(
    @Request() req: any,
    @Param('productId') productId: string,
    @Body('items')
    items: Array<{ inventoryItemId: string; quantityRequired: number }>,
  ) {
    return this.inventoryService.saveRecipe(
      req.user.tenantId,
      req.user.propertyId,
      productId,
      items || [],
    );
  }

  // 3. Suppliers
  @Get('suppliers')
  getSuppliers(@Request() req: any) {
    return this.inventoryService.getSuppliers(
      req.user.tenantId,
      req.user.propertyId,
    );
  }

  @Post('suppliers')
  createSupplier(
    @Request() req: any,
    @Body()
    dto: {
      name: string;
      contactPerson?: string;
      email?: string;
      phone?: string;
      address?: string;
    },
  ) {
    return this.inventoryService.createSupplier(
      req.user.tenantId,
      req.user.propertyId,
      dto,
    );
  }

  // 4. Purchase Orders (PO)
  @Get('purchase-orders')
  getPurchaseOrders(
    @Request() req: any,
    @Query('status') status?: string,
  ) {
    return this.inventoryService.getPurchaseOrders(
      req.user.tenantId,
      req.user.propertyId,
      status,
    );
  }

  @Post('purchase-orders')
  createPurchaseOrder(
    @Request() req: any,
    @Body()
    dto: {
      supplierId: string;
      expectedDate?: string;
      notes?: string;
      items: Array<{
        inventoryItemId: string;
        quantityOrdered: number;
        unitCost: number;
      }>;
    },
  ) {
    return this.inventoryService.createPurchaseOrder(
      req.user.tenantId,
      req.user.propertyId,
      dto,
    );
  }

  @Post('purchase-orders/:id/receive')
  receivePurchaseOrder(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.inventoryService.receivePurchaseOrder(
      req.user.tenantId,
      req.user.propertyId,
      id,
      req.user.userId || req.user.id,
    );
  }
}
