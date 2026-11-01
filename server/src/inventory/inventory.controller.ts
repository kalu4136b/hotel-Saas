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
import { InventoryService } from './inventory.service';
import {
  InventoryCategory,
  MainInventoryCategory,
  ItemType,
  StockMovementType,
  ProcurementCategory,
  PurchaseOrderStatus,
} from '../entities';

@Controller('api/inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ================= 1. INVENTORY ITEMS =================
  @Get('items')
  getItems(
    @Request() req: any,
    @Query('category') category?: string,
    @Query('subcategory') subcategory?: string,
    @Query('search') search?: string,
    @Query('lowStock') lowStock?: string,
    @Query('itemType') itemType?: string,
  ) {
    return this.inventoryService.getItems(
      req.user.tenantId,
      req.user.propertyId,
      category || subcategory,
      search,
      lowStock === 'true',
      itemType,
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
      itemCode?: string;
      description?: string;
      mainCategory?: MainInventoryCategory;
      subcategory?: string;
      category?: InventoryCategory;
      unit?: string;
      purchaseUnit?: string;
      conversionFactor?: number;
      currentStock?: number;
      minStockLevel?: number;
      reorderLevel?: number;
      defaultSupplierId?: string;
      purchaseCost?: number;
      costPerUnit?: number;
      sellingPrice?: number;
      isSellingItem?: boolean;
      taxRate?: number;
      expiryTracking?: boolean;
      batchTracking?: boolean;
      itemType?: ItemType;
      assetTag?: string;
      serialNumber?: string;
      assignedDepartment?: string;
    },
  ) {
    return this.inventoryService.createItem(
      req.user.tenantId,
      req.user.propertyId,
      dto,
      req.user.userId || req.user.id,
      req.user.fullName || req.user.username,
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

  @Delete('items/:id')
  deleteItem(@Request() req: any, @Param('id') id: string) {
    return this.inventoryService.deleteItem(
      req.user.tenantId,
      req.user.propertyId,
      id,
    );
  }

  @Post('items/:id/adjust')
  adjustStock(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    dto: {
      quantity: number;
      movementType?: StockMovementType;
      unitCost?: number;
      reason: string;
      referenceId?: string;
      department?: string;
    },
  ) {
    return this.inventoryService.adjustStock(
      req.user.tenantId,
      req.user.propertyId,
      id,
      req.user.userId || req.user.id,
      req.user.fullName || req.user.username,
      dto,
    );
  }

  // ================= 2. PURCHASE ORDERS (PO) =================
  @Get('purchase-orders')
  getPurchaseOrders(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('supplierId') supplierId?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.inventoryService.getPurchaseOrders(
      req.user.tenantId,
      req.user.propertyId,
      status,
      category,
      supplierId,
      search,
      startDate,
      endDate,
    );
  }

  @Get('purchase-orders/:id')
  getPurchaseOrder(@Request() req: any, @Param('id') id: string) {
    return this.inventoryService.getPurchaseOrder(
      req.user.tenantId,
      req.user.propertyId,
      id,
    );
  }

  @Post('purchase-orders')
  createPurchaseOrder(
    @Request() req: any,
    @Body()
    dto: {
      supplierId: string;
      inventoryCategory?: ProcurementCategory;
      expectedDate?: string;
      deliveryLocation?: string;
      paymentTerms?: string;
      notes?: string;
      status?: PurchaseOrderStatus;
      items: Array<{
        inventoryItemId: string;
        purchaseUnit?: string;
        conversionFactor?: number;
        quantityOrdered: number;
        unitCost: number;
        discountPercent?: number;
        taxRate?: number;
      }>;
    },
  ) {
    return this.inventoryService.createPurchaseOrder(
      req.user.tenantId,
      req.user.propertyId,
      dto,
      req.user.userId || req.user.id,
      req.user.fullName || req.user.username,
    );
  }

  @Patch('purchase-orders/:id')
  updatePurchaseOrder(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.inventoryService.updatePurchaseOrder(
      req.user.tenantId,
      req.user.propertyId,
      id,
      dto,
    );
  }

  @Post('purchase-orders/:id/approve')
  approvePurchaseOrder(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.inventoryService.approvePurchaseOrder(
      req.user.tenantId,
      req.user.propertyId,
      id,
      req.user.userId || req.user.id,
      req.user.fullName || req.user.username,
    );
  }

  @Post('purchase-orders/:id/cancel')
  cancelPurchaseOrder(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.inventoryService.cancelPurchaseOrder(
      req.user.tenantId,
      req.user.propertyId,
      id,
      reason,
    );
  }

  // Legacy direct receiving wrapper for backward compatibility
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
      req.user.fullName || req.user.username,
    );
  }

  // ================= 3. GOODS RECEIVED NOTES (GRN) =================
  @Get('grns')
  getGRNs(
    @Request() req: any,
    @Query('poId') poId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.inventoryService.getGRNs(
      req.user.tenantId,
      req.user.propertyId,
      poId,
      supplierId,
      category,
      status,
      search,
      startDate,
      endDate,
    );
  }

  @Get('grns/:id')
  getGRN(@Request() req: any, @Param('id') id: string) {
    return this.inventoryService.getGRN(
      req.user.tenantId,
      req.user.propertyId,
      id,
    );
  }

  @Post('grns')
  createGRN(
    @Request() req: any,
    @Body()
    dto: {
      purchaseOrderId: string;
      deliveryNoteNumber?: string;
      receivedDate?: string;
      notes?: string;
      items: Array<{
        purchaseOrderItemId?: string;
        inventoryItemId: string;
        quantityReceiving: number;
        quantityAccepted: number;
        quantityRejected?: number;
        rejectionReason?: string;
        unitCost: number;
        batchNumber?: string;
        expiryDate?: string;
      }>;
    },
  ) {
    return this.inventoryService.createGRN(
      req.user.tenantId,
      req.user.propertyId,
      dto,
      req.user.userId || req.user.id,
      req.user.fullName || req.user.username,
    );
  }

  // ================= 4. OPERATIONAL STOCK ISSUANCE =================
  @Get('issuances')
  getIssuances(
    @Request() req: any,
    @Query('department') department?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.inventoryService.getIssuances(
      req.user.tenantId,
      req.user.propertyId,
      department,
      search,
      startDate,
      endDate,
    );
  }

  @Get('issuances/:id')
  getIssuance(@Request() req: any, @Param('id') id: string) {
    return this.inventoryService.getIssuance(
      req.user.tenantId,
      req.user.propertyId,
      id,
    );
  }

  @Post('issuances')
  createIssuance(
    @Request() req: any,
    @Body()
    dto: {
      department: string;
      receivedByName: string;
      notes?: string;
      items: Array<{
        inventoryItemId: string;
        quantity: number;
        purpose?: string;
        assetTag?: string;
        serialNumber?: string;
      }>;
    },
  ) {
    return this.inventoryService.createIssuance(
      req.user.tenantId,
      req.user.propertyId,
      dto,
      req.user.userId || req.user.id,
      req.user.fullName || req.user.username,
    );
  }

  // ================= 5. STOCK MOVEMENTS =================
  @Get('movements')
  getStockMovements(
    @Request() req: any,
    @Query('itemId') itemId?: string,
    @Query('category') category?: string,
    @Query('movementType') movementType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.inventoryService.getStockMovements(
      req.user.tenantId,
      req.user.propertyId,
      itemId,
      category,
      movementType,
      startDate,
      endDate,
    );
  }

  // ================= 6. RECIPE (BOM) MANAGEMENT =================
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

  // ================= 7. SUPPLIERS =================
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
      supplierCode?: string;
      contactPerson?: string;
      email?: string;
      phone?: string;
      address?: string;
      paymentTerms?: string;
      taxNumber?: string;
    },
  ) {
    return this.inventoryService.createSupplier(
      req.user.tenantId,
      req.user.propertyId,
      dto,
    );
  }

  @Patch('suppliers/:id')
  updateSupplier(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.inventoryService.updateSupplier(
      req.user.tenantId,
      req.user.propertyId,
      id,
      dto,
    );
  }

  // ================= 8. INVENTORY REPORTS & KPI ANALYTICS =================
  @Get('reports/summary')
  getSummaryStats(@Request() req: any) {
    return this.inventoryService.getInventorySummaryStats(
      req.user.tenantId,
      req.user.propertyId,
    );
  }

  @Get('reports/stock')
  getStockReport(
    @Request() req: any,
    @Query('category') category?: string,
  ) {
    return this.inventoryService.getStockReport(
      req.user.tenantId,
      req.user.propertyId,
      category,
    );
  }

  @Get('reports/valuation')
  getValuationReport(@Request() req: any) {
    return this.inventoryService.getValuationReport(
      req.user.tenantId,
      req.user.propertyId,
    );
  }

  @Get('reports/low-stock')
  getLowStockReport(
    @Request() req: any,
    @Query('category') category?: string,
  ) {
    return this.inventoryService.getLowStockReport(
      req.user.tenantId,
      req.user.propertyId,
      category,
    );
  }

  @Get('reports/department-issuance')
  getDepartmentIssuanceReport(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.inventoryService.getDepartmentIssuanceReport(
      req.user.tenantId,
      req.user.propertyId,
      startDate,
      endDate,
    );
  }
}
