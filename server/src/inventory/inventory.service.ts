import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { In } from 'typeorm';
import {
  InventoryItem,
  MainInventoryCategory,
  ItemType,
  InventoryCategory,
  RecipeItem,
  StockMovement,
  StockMovementType,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  ProcurementCategory,
  GoodsReceivedNote,
  GoodsReceivedNoteItem,
  GRNStatus,
  OperationalStockIssuance,
  OperationalStockIssuanceItem,
  IssuanceStatus,
  Product,
} from '../entities';
import { TenantConnectionManager } from '../database/tenant-connection-manager.service';

@Injectable()
export class InventoryService {
  constructor(private readonly tenantConn: TenantConnectionManager) {}

  // ================= 1. INVENTORY ITEMS =================

  async getItems(
    rawTenantId: string,
    rawPropertyId: string,
    category?: string,
    search?: string,
    lowStockOnly?: boolean,
    itemType?: string,
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const qb = ds
      .getRepository(InventoryItem)
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.defaultSupplier', 'supplier')
      .where('item.tenantId = :tenantId', { tenantId })
      .andWhere('item.propertyId = :propertyId', { propertyId })
      .andWhere('item.isActive = :isActive', { isActive: true });

    if (category) {
      const upperCat = category.toUpperCase();
      if (['BAR', 'KITCHEN', 'OPERATIONAL'].includes(upperCat)) {
        qb.andWhere('item.mainCategory = :mainCat', { mainCat: upperCat });
      } else {
        qb.andWhere(
          '(item.subcategory = :cat OR item.category = :cat)',
          { cat: category },
        );
      }
    }

    if (itemType) {
      qb.andWhere('item.itemType = :itemType', { itemType });
    }

    if (search) {
      qb.andWhere(
        '(LOWER(item.name) LIKE :q OR LOWER(item.sku) LIKE :q OR LOWER(COALESCE(item.itemCode, "")) LIKE :q OR LOWER(COALESCE(item.assetTag, "")) LIKE :q)',
        { q: `%${search.toLowerCase()}%` },
      );
    }

    if (lowStockOnly) {
      qb.andWhere('item.currentStock <= item.minStockLevel');
    }

    qb.orderBy('item.name', 'ASC');
    return qb.getMany();
  }

  async getItem(rawTenantId: string, rawPropertyId: string, id: string) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const item = await ds.getRepository(InventoryItem).findOne({
      where: { id, tenantId, propertyId },
      relations: { defaultSupplier: true },
    });
    if (!item) throw new NotFoundException('Inventory item not found');
    return item;
  }

  async createItem(
    rawTenantId: string,
    rawPropertyId: string,
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
    userId = 'SYSTEM',
    userName = 'System Administrator',
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const queryRunner = ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (dto.defaultSupplierId) {
        const sup = await queryRunner.manager.getRepository(Supplier).findOne({
          where: { id: dto.defaultSupplierId, tenantId, propertyId },
        });
        if (!sup) {
          throw new NotFoundException('Selected supplier not found for this property');
        }
      }

      const repo = queryRunner.manager.getRepository(InventoryItem);

      let mainCat = dto.mainCategory;
      if (!mainCat) {
        if (dto.category === InventoryCategory.BEVERAGES) {
          mainCat = MainInventoryCategory.BAR;
        } else if (
          dto.category === InventoryCategory.AMENITIES ||
          dto.category === InventoryCategory.PACKAGING
        ) {
          mainCat = MainInventoryCategory.OPERATIONAL;
        } else {
          mainCat = MainInventoryCategory.KITCHEN;
        }
      }

      const conversionFactor =
        Number(dto.conversionFactor) > 0 ? Number(dto.conversionFactor) : 1.0;
      let costPerUnit = Number(dto.costPerUnit || 0);
      let purchaseCost = Number(dto.purchaseCost || 0);

      if (purchaseCost > 0 && costPerUnit === 0) {
        costPerUnit = Number((purchaseCost / conversionFactor).toFixed(2));
      } else if (costPerUnit > 0 && purchaseCost === 0) {
        purchaseCost = Number((costPerUnit * conversionFactor).toFixed(2));
      }

      const sku = dto.sku || dto.itemCode || `SKU-${Date.now().toString().slice(-6)}`;
      const currentStock = Number(dto.currentStock || 0);

      const item = repo.create({
        tenantId,
        propertyId,
        name: dto.name.trim(),
        sku,
        itemCode: dto.itemCode || sku,
        description: (dto as any).notes || dto.description,
        mainCategory: mainCat,
        subcategory: dto.subcategory || (dto.category ? String(dto.category) : 'General'),
        category: dto.category || InventoryCategory.DRY_GOODS,
        unit: dto.unit || 'PCS',
        purchaseUnit: dto.purchaseUnit || dto.unit || 'PCS',
        conversionFactor,
        currentStock,
        minStockLevel: dto.minStockLevel !== undefined ? Number(dto.minStockLevel) : 5,
        reorderLevel: dto.reorderLevel !== undefined ? Number(dto.reorderLevel) : 10,
        defaultSupplierId: dto.defaultSupplierId || undefined,
        purchaseCost,
        costPerUnit,
        sellingPrice: dto.sellingPrice !== undefined ? Number(dto.sellingPrice) : undefined,
        isSellingItem:
          mainCat === MainInventoryCategory.OPERATIONAL ? false : (dto.isSellingItem ?? false),
        taxRate: Number(dto.taxRate || 0),
        expiryTracking: dto.expiryTracking ?? false,
        batchTracking: dto.batchTracking ?? false,
        itemType: dto.itemType || ItemType.CONSUMABLE,
        assetTag: dto.assetTag,
        serialNumber: dto.serialNumber,
        assignedDepartment: dto.assignedDepartment,
        isActive: true,
      });

      const savedItem = await repo.save(item);

      // Record opening stock movement if stock > 0
      if (currentStock > 0) {
        const movementRepo = queryRunner.manager.getRepository(StockMovement);
        const movement = movementRepo.create({
          tenantId,
          propertyId,
          inventoryItemId: savedItem.id,
          inventoryCategory: mainCat,
          movementType: StockMovementType.MANUAL_ADJUSTMENT,
          quantity: currentStock,
          quantityIn: currentStock,
          quantityOut: 0,
          previousStock: 0,
          newStock: currentStock,
          unitCost: costPerUnit,
          referenceId: `OPENING-BAL-${savedItem.id.slice(0, 8)}`,
          reason: 'Initial opening stock intake',
          createdById: userId,
          createdByName: userName,
        });
        await movementRepo.save(movement);
      }

      await queryRunner.commitTransaction();
      return savedItem;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateItem(
    rawTenantId: string,
    rawPropertyId: string,
    id: string,
    dto: Partial<InventoryItem>,
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const repo = ds.getRepository(InventoryItem);
    const item = await repo.findOne({ where: { id, tenantId, propertyId } });
    if (!item) throw new NotFoundException('Inventory item not found');

    if (dto.defaultSupplierId) {
      const sup = await ds.getRepository(Supplier).findOne({
        where: { id: dto.defaultSupplierId, tenantId, propertyId },
      });
      if (!sup) {
        throw new NotFoundException('Selected supplier not found for this property');
      }
    }

    if (dto.name !== undefined) item.name = dto.name.trim();
    if (dto.sku !== undefined) item.sku = dto.sku;
    if (dto.itemCode !== undefined) item.itemCode = dto.itemCode;
    if (dto.description !== undefined) item.description = dto.description;
    if (dto.mainCategory !== undefined) item.mainCategory = dto.mainCategory;
    if (dto.subcategory !== undefined) item.subcategory = dto.subcategory;
    if (dto.category !== undefined) item.category = dto.category;
    if (dto.unit !== undefined) item.unit = dto.unit;
    if (dto.purchaseUnit !== undefined) item.purchaseUnit = dto.purchaseUnit;
    if (dto.conversionFactor !== undefined) item.conversionFactor = Number(dto.conversionFactor);
    if (dto.minStockLevel !== undefined) item.minStockLevel = Number(dto.minStockLevel);
    if (dto.reorderLevel !== undefined) item.reorderLevel = Number(dto.reorderLevel);
    if (dto.defaultSupplierId !== undefined) item.defaultSupplierId = dto.defaultSupplierId;
    if (dto.purchaseCost !== undefined) item.purchaseCost = Number(dto.purchaseCost);
    if (dto.costPerUnit !== undefined) item.costPerUnit = Number(dto.costPerUnit);
    if (dto.sellingPrice !== undefined) item.sellingPrice = Number(dto.sellingPrice);
    if (dto.isSellingItem !== undefined) item.isSellingItem = dto.isSellingItem;
    if (dto.taxRate !== undefined) item.taxRate = Number(dto.taxRate);
    if (dto.expiryTracking !== undefined) item.expiryTracking = dto.expiryTracking;
    if (dto.batchTracking !== undefined) item.batchTracking = dto.batchTracking;
    if (dto.itemType !== undefined) item.itemType = dto.itemType;
    if (dto.assetTag !== undefined) item.assetTag = dto.assetTag;
    if (dto.serialNumber !== undefined) item.serialNumber = dto.serialNumber;
    if (dto.assignedDepartment !== undefined) item.assignedDepartment = dto.assignedDepartment;
    if (dto.isActive !== undefined) item.isActive = dto.isActive;

    return repo.save(item);
  }

  async deleteItem(rawTenantId: string, rawPropertyId: string, id: string) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const repo = ds.getRepository(InventoryItem);
    const item = await repo.findOne({ where: { id, tenantId, propertyId } });
    if (!item) throw new NotFoundException('Inventory item not found');

    item.isActive = false;
    return repo.save(item);
  }

  async adjustStock(
    rawTenantId: string,
    rawPropertyId: string,
    itemId: string,
    userId: string,
    userName: string,
    dto: {
      quantity: number;
      movementType?: StockMovementType;
      unitCost?: number;
      reason: string;
      referenceId?: string;
      department?: string;
    },
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const queryRunner = ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const item = await queryRunner.manager.getRepository(InventoryItem).findOne({
        where: { id: itemId, tenantId, propertyId },
      });
      if (!item) throw new NotFoundException('Inventory item not found');

      const qty = Number(dto.quantity);
      const previousStock = Number(item.currentStock);
      const newStock = previousStock + qty;

      if (newStock < 0) {
        throw new BadRequestException(
          `Insufficient stock for "${item.name}". Current available: ${previousStock} ${item.unit}, requested reduction: ${Math.abs(qty)} ${item.unit}`,
        );
      }

      item.currentStock = newStock;
      await queryRunner.manager.getRepository(InventoryItem).save(item);

      const movement = queryRunner.manager.getRepository(StockMovement).create({
        tenantId,
        propertyId,
        inventoryItemId: item.id,
        inventoryCategory: item.mainCategory,
        movementType: dto.movementType || StockMovementType.MANUAL_ADJUSTMENT,
        quantity: qty,
        quantityIn: qty > 0 ? qty : 0,
        quantityOut: qty < 0 ? Math.abs(qty) : 0,
        previousStock,
        newStock,
        unitCost: dto.unitCost !== undefined ? Number(dto.unitCost) : Number(item.costPerUnit),
        referenceId: dto.referenceId,
        department: dto.department,
        reason: dto.reason || 'Manual stock adjustment',
        createdById: userId,
        createdByName: userName,
      });
      await queryRunner.manager.getRepository(StockMovement).save(movement);

      await queryRunner.commitTransaction();
      return { item, movement };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ================= 2. PURCHASE ORDERS (PO) =================

  async getPurchaseOrders(
    rawTenantId: string,
    rawPropertyId: string,
    status?: string,
    category?: string,
    supplierId?: string,
    search?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const qb = ds
      .getRepository(PurchaseOrder)
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.supplier', 'supplier')
      .leftJoinAndSelect('po.items', 'item')
      .leftJoinAndSelect('item.inventoryItem', 'inv')
      .where('po.tenantId = :tenantId', { tenantId })
      .andWhere('po.propertyId = :propertyId', { propertyId });

    if (status) {
      qb.andWhere('po.status = :status', { status });
    }

    if (category && category !== 'ALL') {
      qb.andWhere('(po.inventoryCategory = :category OR po.inventoryCategory = "ALL")', {
        category,
      });
    }

    if (supplierId) {
      qb.andWhere('po.supplierId = :supplierId', { supplierId });
    }

    if (search) {
      qb.andWhere('(LOWER(po.poNumber) LIKE :q OR LOWER(supplier.name) LIKE :q)', {
        q: `%${search.toLowerCase()}%`,
      });
    }

    if (startDate) {
      qb.andWhere('DATE(po.createdAt) >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('DATE(po.createdAt) <= :endDate', { endDate });
    }

    qb.orderBy('po.createdAt', 'DESC');
    return qb.getMany();
  }

  async getPurchaseOrder(rawTenantId: string, rawPropertyId: string, id: string) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const po = await ds.getRepository(PurchaseOrder).findOne({
      where: { id, tenantId, propertyId },
      relations: {
        supplier: true,
        items: { inventoryItem: true },
      },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async createPurchaseOrder(
    rawTenantId: string,
    rawPropertyId: string,
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
    userId = 'SYSTEM',
    userName = 'Purchasing Officer',
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const queryRunner = ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (!dto.items || dto.items.length === 0) {
        throw new BadRequestException('At least one item is required in the Purchase Order');
      }

      const supplier = await queryRunner.manager.getRepository(Supplier).findOne({
        where: { id: dto.supplierId, tenantId, propertyId },
      });
      if (!supplier) {
        throw new NotFoundException('Selected supplier not found for this property');
      }

      const uniqueInvIds = [...new Set(dto.items.map((i) => i.inventoryItemId))];
      const validInvItems = await queryRunner.manager.getRepository(InventoryItem).find({
        where: { id: In(uniqueInvIds), tenantId, propertyId },
      });
      if (validInvItems.length !== uniqueInvIds.length) {
        throw new BadRequestException('One or more inventory items do not belong to this property');
      }

      const poCount = await queryRunner.manager.getRepository(PurchaseOrder).count({
        where: { tenantId, propertyId },
      });
      const poNumber = `PO-${new Date().getFullYear()}-${String(poCount + 1).padStart(4, '0')}`;

      let subtotal = 0;
      let totalDiscount = 0;
      let totalTax = 0;

      const poItems = dto.items.map((i) => {
        const qty = Number(i.quantityOrdered);
        const cost = Number(i.unitCost);
        const discountPct = Number(i.discountPercent || 0);
        const taxRate = Number(i.taxRate || 0);

        const lineBase = qty * cost;
        const lineDiscount = lineBase * (discountPct / 100);
        const lineAfterDiscount = lineBase - lineDiscount;
        const lineTax = lineAfterDiscount * (taxRate / 100);
        const lineTotal = Number((lineAfterDiscount + lineTax).toFixed(2));

        subtotal += lineBase;
        totalDiscount += lineDiscount;
        totalTax += lineTax;

        return queryRunner.manager.getRepository(PurchaseOrderItem).create({
          inventoryItemId: i.inventoryItemId,
          purchaseUnit: i.purchaseUnit || 'PCS',
          conversionFactor: Number(i.conversionFactor || 1.0),
          quantityOrdered: qty,
          quantityReceived: 0,
          quantityRejected: 0,
          unitCost: cost,
          discountPercent: discountPct,
          taxRate,
          taxAmount: Number(lineTax.toFixed(2)),
          totalCost: lineTotal,
        });
      });

      const grandTotal = Number((subtotal - totalDiscount + totalTax).toFixed(2));

      const po = queryRunner.manager.getRepository(PurchaseOrder).create({
        tenantId,
        propertyId,
        supplierId: dto.supplierId,
        poNumber,
        status: dto.status || PurchaseOrderStatus.PENDING_APPROVAL,
        inventoryCategory: dto.inventoryCategory || ProcurementCategory.ALL,
        deliveryLocation: dto.deliveryLocation || 'Main Receiving Dock',
        paymentTerms: dto.paymentTerms || 'Net 30',
        subtotal: Number(subtotal.toFixed(2)),
        discountAmount: Number(totalDiscount.toFixed(2)),
        taxAmount: Number(totalTax.toFixed(2)),
        totalAmount: grandTotal,
        notes: dto.notes,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        createdById: userId,
        createdByName: userName,
        items: poItems,
      });

      const savedPo = await queryRunner.manager.getRepository(PurchaseOrder).save(po);
      await queryRunner.commitTransaction();
      return savedPo;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updatePurchaseOrder(
    rawTenantId: string,
    rawPropertyId: string,
    id: string,
    dto: any,
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const poRepo = ds.getRepository(PurchaseOrder);
    const po = await poRepo.findOne({
      where: { id, tenantId, propertyId },
      relations: { items: true },
    });
    if (!po) throw new NotFoundException('Purchase Order not found');

    if (
      po.status === PurchaseOrderStatus.APPROVED ||
      po.status === PurchaseOrderStatus.PARTIALLY_RECEIVED ||
      po.status === PurchaseOrderStatus.FULLY_RECEIVED
    ) {
      throw new BadRequestException(
        `Cannot modify Purchase Order in ${po.status} status. Approved purchase orders are protected against tampering.`,
      );
    }

    if (dto.notes !== undefined) po.notes = dto.notes;
    if (dto.expectedDate !== undefined) po.expectedDate = new Date(dto.expectedDate);
    if (dto.deliveryLocation !== undefined) po.deliveryLocation = dto.deliveryLocation;
    if (dto.paymentTerms !== undefined) po.paymentTerms = dto.paymentTerms;
    if (dto.status !== undefined) po.status = dto.status;

    return poRepo.save(po);
  }

  async approvePurchaseOrder(
    rawTenantId: string,
    rawPropertyId: string,
    id: string,
    userId: string,
    userName: string,
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const poRepo = ds.getRepository(PurchaseOrder);
    const po = await poRepo.findOne({
      where: { id, tenantId, propertyId },
    });
    if (!po) throw new NotFoundException('Purchase Order not found');

    if (
      po.status === PurchaseOrderStatus.APPROVED ||
      po.status === PurchaseOrderStatus.PARTIALLY_RECEIVED ||
      po.status === PurchaseOrderStatus.FULLY_RECEIVED
    ) {
      throw new BadRequestException(`Purchase Order is already in ${po.status} status`);
    }

    if (po.status === PurchaseOrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot approve a cancelled Purchase Order');
    }

    po.status = PurchaseOrderStatus.APPROVED;
    po.approvedById = userId;
    po.approvedByName = userName;
    po.approvedAt = new Date();

    return poRepo.save(po);
  }

  async cancelPurchaseOrder(
    rawTenantId: string,
    rawPropertyId: string,
    id: string,
    reason?: string,
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const poRepo = ds.getRepository(PurchaseOrder);
    const po = await poRepo.findOne({
      where: { id, tenantId, propertyId },
    });
    if (!po) throw new NotFoundException('Purchase Order not found');

    if (po.status === PurchaseOrderStatus.FULLY_RECEIVED) {
      throw new BadRequestException('Cannot cancel a fully received Purchase Order');
    }

    po.status = PurchaseOrderStatus.CANCELLED;
    if (reason) {
      po.notes = po.notes ? `${po.notes}\n[Cancelled]: ${reason}` : `[Cancelled]: ${reason}`;
    }

    return poRepo.save(po);
  }

  // ================= 3. GOODS RECEIVED NOTE (GRN) =================

  async getGRNs(
    rawTenantId: string,
    rawPropertyId: string,
    poId?: string,
    supplierId?: string,
    category?: string,
    status?: string,
    search?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const qb = ds
      .getRepository(GoodsReceivedNote)
      .createQueryBuilder('grn')
      .leftJoinAndSelect('grn.supplier', 'supplier')
      .leftJoinAndSelect('grn.purchaseOrder', 'po')
      .leftJoinAndSelect('grn.items', 'item')
      .leftJoinAndSelect('item.inventoryItem', 'inv')
      .where('grn.tenantId = :tenantId', { tenantId })
      .andWhere('grn.propertyId = :propertyId', { propertyId });

    if (poId) {
      qb.andWhere('grn.purchaseOrderId = :poId', { poId });
    }

    if (supplierId) {
      qb.andWhere('grn.supplierId = :supplierId', { supplierId });
    }

    if (category && category !== 'ALL') {
      qb.andWhere('(grn.inventoryCategory = :category OR grn.inventoryCategory = "ALL")', {
        category,
      });
    }

    if (status) {
      qb.andWhere('grn.status = :status', { status });
    }

    if (search) {
      qb.andWhere(
        '(LOWER(grn.grnNumber) LIKE :q OR LOWER(po.poNumber) LIKE :q OR LOWER(supplier.name) LIKE :q OR LOWER(COALESCE(grn.deliveryNoteNumber, "")) LIKE :q)',
        { q: `%${search.toLowerCase()}%` },
      );
    }

    if (startDate) {
      qb.andWhere('DATE(grn.receivedDate) >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('DATE(grn.receivedDate) <= :endDate', { endDate });
    }

    qb.orderBy('grn.receivedDate', 'DESC');
    return qb.getMany();
  }

  async getGRN(rawTenantId: string, rawPropertyId: string, id: string) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const grn = await ds.getRepository(GoodsReceivedNote).findOne({
      where: { id, tenantId, propertyId },
      relations: {
        supplier: true,
        purchaseOrder: true,
        items: { inventoryItem: true },
      },
    });
    if (!grn) throw new NotFoundException('Goods Received Note not found');
    return grn;
  }

  async createGRN(
    rawTenantId: string,
    rawPropertyId: string,
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
    userId = 'SYSTEM',
    userName = 'Receiving Officer',
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const queryRunner = ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const poRepo = queryRunner.manager.getRepository(PurchaseOrder);
      const po = await poRepo.findOne({
        where: { id: dto.purchaseOrderId, tenantId, propertyId },
        relations: { items: { inventoryItem: true }, supplier: true },
      });

      if (!po) {
        throw new NotFoundException('Originating Purchase Order not found');
      }

      if (po.status === PurchaseOrderStatus.CANCELLED) {
        throw new BadRequestException('Cannot receive goods against a Cancelled Purchase Order');
      }

      if (
        po.status === PurchaseOrderStatus.DRAFT ||
        po.status === PurchaseOrderStatus.PENDING_APPROVAL
      ) {
        throw new BadRequestException(
          `Purchase Order ${po.poNumber} is in ${po.status} status. GRN can only be processed against APPROVED Purchase Orders.`,
        );
      }

      if (po.status === PurchaseOrderStatus.FULLY_RECEIVED) {
        throw new BadRequestException(
          `Purchase Order ${po.poNumber} has already been fully received`,
        );
      }

      const grnCount = await queryRunner.manager.getRepository(GoodsReceivedNote).count({
        where: { tenantId, propertyId },
      });
      const grnNumber = `GRN-${new Date().getFullYear()}-${String(grnCount + 1).padStart(4, '0')}`;

      let totalAccepted = 0;
      let totalRejected = 0;
      let totalReceivedValue = 0;
      const grnItems: GoodsReceivedNoteItem[] = [];

      for (const inputItem of dto.items) {
        const poItem = po.items.find(
          (p) =>
            (inputItem.purchaseOrderItemId && p.id === inputItem.purchaseOrderItemId) ||
            p.inventoryItemId === inputItem.inventoryItemId,
        );

        if (!poItem) {
          throw new BadRequestException(
            `Item ${inputItem.inventoryItemId} does not exist on Purchase Order ${po.poNumber}`,
          );
        }

        const remainingQty = Number(poItem.quantityOrdered) - Number(poItem.quantityReceived);
        const qtyReceiving = Number(inputItem.quantityReceiving);
        const qtyAccepted = Number(inputItem.quantityAccepted);
        const qtyRejected = Number(inputItem.quantityRejected || 0);

        if (qtyReceiving > remainingQty + 0.001) {
          throw new BadRequestException(
            `Receiving quantity (${qtyReceiving}) exceeds remaining ordered quantity (${remainingQty}) for item ${poItem.inventoryItem?.name || poItem.inventoryItemId}`,
          );
        }

        if (Math.abs(qtyAccepted + qtyRejected - qtyReceiving) > 0.001) {
          throw new BadRequestException(
            `Accepted quantity (${qtyAccepted}) + Rejected quantity (${qtyRejected}) must equal total receiving quantity (${qtyReceiving})`,
          );
        }

        if (qtyRejected > 0 && !inputItem.rejectionReason) {
          throw new BadRequestException(
            `Rejection reason is required for rejected items on ${poItem.inventoryItem?.name}`,
          );
        }

        const unitCost = Number(inputItem.unitCost || poItem.unitCost);
        const lineTotal = Number((qtyAccepted * unitCost).toFixed(2));

        totalAccepted += qtyAccepted;
        totalRejected += qtyRejected;
        totalReceivedValue += lineTotal;

        poItem.quantityReceived = Number(poItem.quantityReceived) + qtyAccepted;
        poItem.quantityRejected = Number(poItem.quantityRejected || 0) + qtyRejected;
        await queryRunner.manager.getRepository(PurchaseOrderItem).save(poItem);

        const inv = await queryRunner.manager.getRepository(InventoryItem).findOne({
          where: { id: poItem.inventoryItemId, tenantId, propertyId },
        });

        if (inv) {
          const conversionFactor = Number(inv.conversionFactor || poItem.conversionFactor || 1.0);
          const stockUnitsToAdd = qtyAccepted * conversionFactor;
          const previousStock = Number(inv.currentStock);
          const newStock = previousStock + stockUnitsToAdd;

          inv.currentStock = newStock;
          if (stockUnitsToAdd > 0) {
            inv.costPerUnit = Number((unitCost / conversionFactor).toFixed(2));
            inv.purchaseCost = unitCost;
          }
          await queryRunner.manager.getRepository(InventoryItem).save(inv);

          if (qtyAccepted > 0) {
            const movement = queryRunner.manager.getRepository(StockMovement).create({
              tenantId,
              propertyId,
              inventoryItemId: inv.id,
              inventoryCategory: inv.mainCategory,
              movementType: StockMovementType.PURCHASE_RECEIPT,
              quantity: stockUnitsToAdd,
              quantityIn: stockUnitsToAdd,
              quantityOut: 0,
              previousStock,
              newStock,
              unitCost: inv.costPerUnit,
              referenceId: grnNumber,
              reason: `GRN ${grnNumber} against PO ${po.poNumber} (${qtyAccepted} ${poItem.purchaseUnit || 'units'} accepted)`,
              createdById: userId,
              createdByName: userName,
            });
            await queryRunner.manager.getRepository(StockMovement).save(movement);
          }
        }

        const grnItem = queryRunner.manager.getRepository(GoodsReceivedNoteItem).create({
          purchaseOrderItemId: poItem.id,
          inventoryItemId: poItem.inventoryItemId,
          quantityOrdered: poItem.quantityOrdered,
          quantityPreviouslyReceived: Number(poItem.quantityReceived) - qtyAccepted,
          quantityReceiving: qtyReceiving,
          quantityAccepted: qtyAccepted,
          quantityRejected: qtyRejected,
          rejectionReason: inputItem.rejectionReason,
          unitCost,
          totalCost: lineTotal,
          batchNumber: inputItem.batchNumber,
          expiryDate: inputItem.expiryDate ? new Date(inputItem.expiryDate) : undefined,
        });
        grnItems.push(grnItem);
      }

      const allPoItemsFullyReceived = po.items.every(
        (pi) => Number(pi.quantityReceived) >= Number(pi.quantityOrdered) - 0.001,
      );

      po.status = allPoItemsFullyReceived
        ? PurchaseOrderStatus.FULLY_RECEIVED
        : PurchaseOrderStatus.PARTIALLY_RECEIVED;

      if (allPoItemsFullyReceived) {
        po.receivedAt = new Date();
      }
      await poRepo.save(po);

      const grn = queryRunner.manager.getRepository(GoodsReceivedNote).create({
        tenantId,
        propertyId,
        grnNumber,
        purchaseOrderId: po.id,
        supplierId: po.supplierId,
        inventoryCategory: po.inventoryCategory || 'ALL',
        receivedDate: dto.receivedDate ? new Date(dto.receivedDate) : new Date(),
        deliveryNoteNumber: dto.deliveryNoteNumber,
        status: GRNStatus.RECEIVED,
        totalReceivedItems: grnItems.length,
        totalAcceptedQuantity: Number(totalAccepted.toFixed(3)),
        totalRejectedQuantity: Number(totalRejected.toFixed(3)),
        totalAmount: Number(totalReceivedValue.toFixed(2)),
        receivedById: userId,
        receivedByName: userName,
        notes: dto.notes,
        items: grnItems,
      });

      const savedGRN = await queryRunner.manager.getRepository(GoodsReceivedNote).save(grn);
      await queryRunner.commitTransaction();
      return savedGRN;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async receivePurchaseOrder(
    rawTenantId: string,
    rawPropertyId: string,
    poId: string,
    userId: string,
    userName = 'Storekeeper',
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const po = await ds.getRepository(PurchaseOrder).findOne({
      where: { id: poId, tenantId, propertyId },
      relations: { items: true },
    });
    if (!po) throw new NotFoundException('Purchase Order not found');

    if (
      po.status === PurchaseOrderStatus.DRAFT ||
      po.status === PurchaseOrderStatus.PENDING_APPROVAL ||
      po.status === PurchaseOrderStatus.ORDERED
    ) {
      po.status = PurchaseOrderStatus.APPROVED;
      await ds.getRepository(PurchaseOrder).save(po);
    }

    const itemsToReceive = po.items
      .map((i) => {
        const remaining = Number(i.quantityOrdered) - Number(i.quantityReceived);
        return {
          purchaseOrderItemId: i.id,
          inventoryItemId: i.inventoryItemId,
          quantityReceiving: remaining,
          quantityAccepted: remaining,
          quantityRejected: 0,
          unitCost: Number(i.unitCost),
        };
      })
      .filter((i) => i.quantityReceiving > 0);

    if (itemsToReceive.length === 0) {
      throw new BadRequestException('All items in this Purchase Order are already received');
    }

    return this.createGRN(
      tenantId,
      propertyId,
      {
        purchaseOrderId: poId,
        notes: `Quick receiving against PO ${po.poNumber}`,
        items: itemsToReceive,
      },
      userId,
      userName,
    );
  }

  // ================= 4. OPERATIONAL STOCK ISSUANCE =================

  async getIssuances(
    rawTenantId: string,
    rawPropertyId: string,
    department?: string,
    search?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const qb = ds
      .getRepository(OperationalStockIssuance)
      .createQueryBuilder('iss')
      .leftJoinAndSelect('iss.items', 'item')
      .leftJoinAndSelect('item.inventoryItem', 'inv')
      .where('iss.tenantId = :tenantId', { tenantId })
      .andWhere('iss.propertyId = :propertyId', { propertyId });

    if (department) {
      qb.andWhere('iss.department = :department', { department });
    }

    if (search) {
      qb.andWhere(
        '(LOWER(iss.issuanceNumber) LIKE :q OR LOWER(iss.receivedByName) LIKE :q OR LOWER(iss.department) LIKE :q)',
        { q: `%${search.toLowerCase()}%` },
      );
    }

    if (startDate) {
      qb.andWhere('DATE(iss.issuanceDate) >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('DATE(iss.issuanceDate) <= :endDate', { endDate });
    }

    qb.orderBy('iss.issuanceDate', 'DESC');
    return qb.getMany();
  }

  async getIssuance(rawTenantId: string, rawPropertyId: string, id: string) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const iss = await ds.getRepository(OperationalStockIssuance).findOne({
      where: { id, tenantId, propertyId },
      relations: { items: { inventoryItem: true } },
    });
    if (!iss) throw new NotFoundException('Operational stock issuance record not found');
    return iss;
  }

  async createIssuance(
    rawTenantId: string,
    rawPropertyId: string,
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
    userId = 'SYSTEM',
    userName = 'Storekeeper',
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const queryRunner = ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (!dto.items || dto.items.length === 0) {
        throw new BadRequestException('At least one operational item must be issued');
      }

      const issCount = await queryRunner.manager.getRepository(OperationalStockIssuance).count({
        where: { tenantId, propertyId },
      });
      const issuanceNumber = `ISS-${new Date().getFullYear()}-${String(issCount + 1).padStart(4, '0')}`;

      let totalQty = 0;
      const issuanceItems: OperationalStockIssuanceItem[] = [];

      for (const reqItem of dto.items) {
        const item = await queryRunner.manager.getRepository(InventoryItem).findOne({
          where: { id: reqItem.inventoryItemId, tenantId, propertyId },
        });

        if (!item) {
          throw new NotFoundException(`Inventory item ${reqItem.inventoryItemId} not found`);
        }

        const qty = Number(reqItem.quantity);
        if (qty <= 0) {
          throw new BadRequestException('Issuance quantity must be greater than zero');
        }

        const previousStock = Number(item.currentStock);
        if (previousStock < qty) {
          throw new BadRequestException(
            `Insufficient stock for "${item.name}". Available: ${previousStock} ${item.unit}, requested issue: ${qty} ${item.unit}`,
          );
        }

        const newStock = previousStock - qty;
        item.currentStock = newStock;

        if (item.itemType === ItemType.REUSABLE_EQUIPMENT) {
          item.assignedDepartment = dto.department;
          if (reqItem.assetTag) item.assetTag = reqItem.assetTag;
        }

        await queryRunner.manager.getRepository(InventoryItem).save(item);

        totalQty += qty;
        const lineCost = Number((qty * Number(item.costPerUnit)).toFixed(2));

        const movement = queryRunner.manager.getRepository(StockMovement).create({
          tenantId,
          propertyId,
          inventoryItemId: item.id,
          inventoryCategory: item.mainCategory,
          movementType: StockMovementType.OPERATIONAL_ISSUANCE,
          quantity: -qty,
          quantityIn: 0,
          quantityOut: qty,
          previousStock,
          newStock,
          unitCost: item.costPerUnit,
          referenceId: issuanceNumber,
          department: dto.department,
          reason: `Issued to ${dto.department} (Received by ${dto.receivedByName})`,
          createdById: userId,
          createdByName: userName,
        });
        await queryRunner.manager.getRepository(StockMovement).save(movement);

        const issItem = queryRunner.manager.getRepository(OperationalStockIssuanceItem).create({
          inventoryItemId: item.id,
          quantity: qty,
          unitCost: item.costPerUnit,
          totalCost: lineCost,
          itemType: item.itemType,
          assetTag: reqItem.assetTag || item.assetTag,
          serialNumber: reqItem.serialNumber || item.serialNumber,
          purpose: reqItem.purpose,
        });
        issuanceItems.push(issItem);
      }

      const issuance = queryRunner.manager.getRepository(OperationalStockIssuance).create({
        tenantId,
        propertyId,
        issuanceNumber,
        issuanceDate: new Date(),
        department: dto.department,
        issuedById: userId,
        issuedByName: userName,
        receivedByName: dto.receivedByName.trim(),
        totalItems: issuanceItems.length,
        totalQuantity: Number(totalQty.toFixed(3)),
        status: IssuanceStatus.COMPLETED,
        notes: dto.notes,
        items: issuanceItems,
      });

      const savedIssuance = await queryRunner.manager
        .getRepository(OperationalStockIssuance)
        .save(issuance);
      await queryRunner.commitTransaction();
      return savedIssuance;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ================= 5. STOCK MOVEMENTS AUDIT LOG =================

  async getStockMovements(
    rawTenantId: string,
    rawPropertyId: string,
    itemId?: string,
    category?: string,
    movementType?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const qb = ds
      .getRepository(StockMovement)
      .createQueryBuilder('sm')
      .leftJoinAndSelect('sm.inventoryItem', 'item')
      .where('sm.tenantId = :tenantId', { tenantId })
      .andWhere('sm.propertyId = :propertyId', { propertyId });

    if (itemId) {
      qb.andWhere('sm.inventoryItemId = :itemId', { itemId });
    }

    if (category) {
      qb.andWhere('(sm.inventoryCategory = :category OR item.mainCategory = :category)', {
        category,
      });
    }

    if (movementType) {
      qb.andWhere('sm.movementType = :movementType', { movementType });
    }

    if (startDate) {
      qb.andWhere('DATE(sm.createdAt) >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('DATE(sm.createdAt) <= :endDate', { endDate });
    }

    qb.orderBy('sm.createdAt', 'DESC').take(250);
    return qb.getMany();
  }

  // ================= 6. RECIPE (BOM) MANAGEMENT =================

  async getRecipe(rawTenantId: string, rawPropertyId: string, productId: string) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    return ds.getRepository(RecipeItem).find({
      where: { tenantId, propertyId, productId },
      relations: { inventoryItem: true },
      order: { createdAt: 'ASC' },
    });
  }

  async saveRecipe(
    rawTenantId: string,
    rawPropertyId: string,
    productId: string,
    items: Array<{ inventoryItemId: string; quantityRequired: number }>,
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const queryRunner = ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const product = await queryRunner.manager.getRepository(Product).findOne({
        where: { id: productId, tenantId, propertyId },
      });
      if (!product) {
        throw new NotFoundException('Product not found for this property');
      }

      if (items.length > 0) {
        const uniqueInvIds = [...new Set(items.map((i) => i.inventoryItemId))];
        const validInvItems = await queryRunner.manager.getRepository(InventoryItem).find({
          where: { id: In(uniqueInvIds), tenantId, propertyId },
        });
        if (validInvItems.length !== uniqueInvIds.length) {
          throw new BadRequestException(
            'One or more recipe ingredients do not belong to this property',
          );
        }
      }

      const recipeRepo = queryRunner.manager.getRepository(RecipeItem);
      await recipeRepo.delete({ tenantId, propertyId, productId });

      const newItems = items.map((i) =>
        recipeRepo.create({
          tenantId,
          propertyId,
          productId,
          inventoryItemId: i.inventoryItemId,
          quantityRequired: Number(i.quantityRequired),
        }),
      );

      await recipeRepo.save(newItems);
      await queryRunner.commitTransaction();

      return this.getRecipe(tenantId, propertyId, productId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deductIngredientsForOrder(
    rawTenantId: string,
    rawPropertyId: string,
    orderItems: Array<{ productId: string; quantity: number }>,
    orderReference: string,
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const productIds = orderItems.map((oi) => oi.productId);
    if (productIds.length === 0) return;

    const recipes = await ds.getRepository(RecipeItem).find({
      where: { tenantId, propertyId, productId: In(productIds) },
      relations: { inventoryItem: true },
    });

    if (recipes.length === 0) return;

    for (const orderItem of orderItems) {
      const productRecipes = recipes.filter((r) => r.productId === orderItem.productId);
      for (const recipe of productRecipes) {
        const totalDeduction = Number(recipe.quantityRequired) * Number(orderItem.quantity);
        try {
          await this.adjustStock(
            tenantId,
            propertyId,
            recipe.inventoryItemId,
            'SYSTEM',
            'POS Terminal',
            {
              quantity: -totalDeduction,
              movementType: StockMovementType.RECIPE_DEDUCTION,
              unitCost: recipe.inventoryItem?.costPerUnit,
              reason: `POS Order ${orderReference}`,
              referenceId: orderReference,
            },
          );
        } catch (e: any) {
          console.warn(`[Inventory] Recipe stock deduction skipped: ${e?.message}`);
        }
      }
    }
  }

  // ================= 7. SUPPLIERS =================

  async getSuppliers(rawTenantId: string, rawPropertyId: string) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    return ds.getRepository(Supplier).find({
      where: { tenantId, propertyId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async createSupplier(
    rawTenantId: string,
    rawPropertyId: string,
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
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const repo = ds.getRepository(Supplier);
    const supplier = repo.create({
      name: dto.name?.trim(),
      supplierCode: dto.supplierCode,
      contactPerson: dto.contactPerson,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      paymentTerms: dto.paymentTerms,
      taxNumber: dto.taxNumber,
      tenantId,
      propertyId,
    });
    return repo.save(supplier);
  }

  async updateSupplier(
    rawTenantId: string,
    rawPropertyId: string,
    id: string,
    dto: Partial<Supplier>,
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const repo = ds.getRepository(Supplier);
    const supplier = await repo.findOne({ where: { id, tenantId, propertyId } });
    if (!supplier) throw new NotFoundException('Supplier not found');

    if (dto.name !== undefined) supplier.name = dto.name.trim();
    if (dto.supplierCode !== undefined) supplier.supplierCode = dto.supplierCode;
    if (dto.contactPerson !== undefined) supplier.contactPerson = dto.contactPerson;
    if (dto.email !== undefined) supplier.email = dto.email;
    if (dto.phone !== undefined) supplier.phone = dto.phone;
    if (dto.address !== undefined) supplier.address = dto.address;
    if (dto.paymentTerms !== undefined) supplier.paymentTerms = dto.paymentTerms;
    if (dto.taxNumber !== undefined) supplier.taxNumber = dto.taxNumber;
    if (dto.isActive !== undefined) supplier.isActive = Boolean(dto.isActive);

    return repo.save(supplier);
  }

  // ================= 8. INVENTORY REPORTS & ANALYTICS =================

  async getInventorySummaryStats(rawTenantId: string, rawPropertyId: string) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const invRepo = ds.getRepository(InventoryItem);
    const poRepo = ds.getRepository(PurchaseOrder);
    const grnRepo = ds.getRepository(GoodsReceivedNote);

    const stats = await invRepo
      .createQueryBuilder('item')
      .select([
        'COUNT(item.id) as totalItems',
        'COALESCE(SUM(item.currentStock * item.costPerUnit), 0) as totalValuation',
        'COALESCE(SUM(CASE WHEN item.mainCategory = "BAR" THEN item.currentStock * item.costPerUnit ELSE 0 END), 0) as barStockValue',
        'COALESCE(SUM(CASE WHEN item.mainCategory = "KITCHEN" THEN item.currentStock * item.costPerUnit ELSE 0 END), 0) as kitchenStockValue',
        'COALESCE(SUM(CASE WHEN item.mainCategory = "OPERATIONAL" THEN item.currentStock * item.costPerUnit ELSE 0 END), 0) as operationalStockValue',
        'COALESCE(SUM(CASE WHEN item.currentStock <= item.minStockLevel THEN 1 ELSE 0 END), 0) as lowStockCount',
      ])
      .where('item.tenantId = :tenantId', { tenantId })
      .andWhere('item.propertyId = :propertyId', { propertyId })
      .andWhere('item.isActive = :isActive', { isActive: true })
      .getRawOne();

    const pendingPOsCount = await poRepo.count({
      where: {
        tenantId,
        propertyId,
        status: In([
          PurchaseOrderStatus.PENDING_APPROVAL,
          PurchaseOrderStatus.APPROVED,
          PurchaseOrderStatus.PARTIALLY_RECEIVED,
        ]),
      },
    });

    const pendingGRNsCount = await poRepo.count({
      where: {
        tenantId,
        propertyId,
        status: In([
          PurchaseOrderStatus.APPROVED,
          PurchaseOrderStatus.PARTIALLY_RECEIVED,
        ]),
      },
    });

    const totalGRNsCount = await grnRepo.count({
      where: { tenantId, propertyId },
    });

    return {
      totalItems: Number(stats?.totalItems || 0),
      totalValuation: Number(Number(stats?.totalValuation || 0).toFixed(2)),
      barStockValue: Number(Number(stats?.barStockValue || 0).toFixed(2)),
      kitchenStockValue: Number(Number(stats?.kitchenStockValue || 0).toFixed(2)),
      operationalStockValue: Number(Number(stats?.operationalStockValue || 0).toFixed(2)),
      lowStockCount: Number(stats?.lowStockCount || 0),
      pendingPOsCount,
      pendingGRNsCount,
      totalGRNsCount,
    };
  }

  async getStockReport(rawTenantId: string, rawPropertyId: string, category?: string) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const qb = ds
      .getRepository(InventoryItem)
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.defaultSupplier', 'supplier')
      .where('item.tenantId = :tenantId', { tenantId })
      .andWhere('item.propertyId = :propertyId', { propertyId })
      .andWhere('item.isActive = :isActive', { isActive: true });

    if (category && category !== 'ALL') {
      qb.andWhere('item.mainCategory = :category', { category });
    }

    qb.orderBy('item.mainCategory', 'ASC').addOrderBy('item.name', 'ASC');
    const items = await qb.getMany();

    return items.map((i) => {
      const current = Number(i.currentStock);
      const min = Number(i.minStockLevel);
      const reorder = Number(i.reorderLevel);
      const cost = Number(i.costPerUnit);
      const val = Number((current * cost).toFixed(2));

      let stockStatus = 'IN_STOCK';
      if (current === 0) stockStatus = 'OUT_OF_STOCK';
      else if (current <= min) stockStatus = 'CRITICAL_LOW';
      else if (current <= reorder) stockStatus = 'REORDER_POINT';

      return {
        id: i.id,
        name: i.name,
        sku: i.sku,
        mainCategory: i.mainCategory,
        subcategory: i.subcategory,
        unit: i.unit,
        purchaseUnit: i.purchaseUnit,
        conversionFactor: Number(i.conversionFactor),
        currentStock: current,
        minStockLevel: min,
        reorderLevel: reorder,
        costPerUnit: cost,
        totalValuation: val,
        supplierName: i.defaultSupplier?.name || 'Unassigned',
        stockStatus,
        itemType: i.itemType,
      };
    });
  }

  async getValuationReport(rawTenantId: string, rawPropertyId: string) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const qb = ds
      .getRepository(InventoryItem)
      .createQueryBuilder('item')
      .select([
        'item.mainCategory as category',
        'item.subcategory as subcategory',
        'COUNT(item.id) as itemCount',
        'SUM(item.currentStock) as totalQuantity',
        'SUM(item.currentStock * item.costPerUnit) as valuation',
      ])
      .where('item.tenantId = :tenantId', { tenantId })
      .andWhere('item.propertyId = :propertyId', { propertyId })
      .andWhere('item.isActive = :isActive', { isActive: true })
      .groupBy('item.mainCategory')
      .addGroupBy('item.subcategory')
      .orderBy('valuation', 'DESC');

    const rows = await qb.getRawMany();
    return rows.map((r) => ({
      category: r.category,
      subcategory: r.subcategory || 'General',
      itemCount: Number(r.itemCount || 0),
      totalQuantity: Number(Number(r.totalQuantity || 0).toFixed(2)),
      valuation: Number(Number(r.valuation || 0).toFixed(2)),
    }));
  }

  async getLowStockReport(rawTenantId: string, rawPropertyId: string, category?: string) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const qb = ds
      .getRepository(InventoryItem)
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.defaultSupplier', 'supplier')
      .where('item.tenantId = :tenantId', { tenantId })
      .andWhere('item.propertyId = :propertyId', { propertyId })
      .andWhere('item.isActive = :isActive', { isActive: true })
      .andWhere('item.currentStock <= item.reorderLevel');

    if (category && category !== 'ALL') {
      qb.andWhere('item.mainCategory = :category', { category });
    }

    qb.orderBy('item.currentStock', 'ASC');
    const items = await qb.getMany();

    return items.map((i) => {
      const current = Number(i.currentStock);
      const reorder = Number(i.reorderLevel);
      const suggestedReorder = Math.max(reorder * 2 - current, reorder);

      return {
        id: i.id,
        name: i.name,
        sku: i.sku,
        mainCategory: i.mainCategory,
        unit: i.unit,
        purchaseUnit: i.purchaseUnit,
        conversionFactor: Number(i.conversionFactor),
        currentStock: current,
        minStockLevel: Number(i.minStockLevel),
        reorderLevel: reorder,
        suggestedReorderQuantity: Number(suggestedReorder.toFixed(2)),
        costPerUnit: Number(i.costPerUnit),
        supplier: i.defaultSupplier
          ? { id: i.defaultSupplier.id, name: i.defaultSupplier.name }
          : null,
      };
    });
  }

  async getDepartmentIssuanceReport(
    rawTenantId: string,
    rawPropertyId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const qb = ds
      .getRepository(OperationalStockIssuanceItem)
      .createQueryBuilder('ii')
      .innerJoin('ii.issuance', 'iss')
      .innerJoin('ii.inventoryItem', 'inv')
      .select([
        'iss.department as department',
        'COUNT(DISTINCT iss.id) as issuanceCount',
        'SUM(ii.quantity) as totalUnitsIssued',
        'SUM(ii.totalCost) as totalCost',
      ])
      .where('iss.tenantId = :tenantId', { tenantId })
      .andWhere('iss.propertyId = :propertyId', { propertyId })
      .andWhere('iss.status = :status', { status: IssuanceStatus.COMPLETED });

    if (startDate) {
      qb.andWhere('DATE(iss.issuanceDate) >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('DATE(iss.issuanceDate) <= :endDate', { endDate });
    }

    qb.groupBy('iss.department').orderBy('totalCost', 'DESC');
    const rows = await qb.getRawMany();

    return rows.map((r) => ({
      department: r.department,
      issuanceCount: Number(r.issuanceCount || 0),
      totalUnitsIssued: Number(Number(r.totalUnitsIssued || 0).toFixed(2)),
      totalCost: Number(Number(r.totalCost || 0).toFixed(2)),
    }));
  }
}
