import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import {
  InventoryItem,
  InventoryCategory,
  InventoryUnit,
  RecipeItem,
  StockMovement,
  StockMovementType,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
} from '../entities';

@Injectable()
export class InventoryService {
  constructor(private readonly dataSource: DataSource) {}

  // ================= INVENTORY ITEMS =================
  async getItems(
    tenantId: string,
    propertyId: string,
    category?: string,
    search?: string,
    lowStockOnly?: boolean,
  ) {
    const qb = this.dataSource
      .getRepository(InventoryItem)
      .createQueryBuilder('item')
      .where('item.tenantId = :tenantId', { tenantId })
      .andWhere('item.propertyId = :propertyId', { propertyId })
      .andWhere('item.isActive = :isActive', { isActive: true });

    if (category) {
      qb.andWhere('item.category = :category', { category });
    }

    if (search) {
      qb.andWhere('(LOWER(item.name) LIKE :q OR LOWER(item.sku) LIKE :q)', {
        q: `%${search.toLowerCase()}%`,
      });
    }

    if (lowStockOnly) {
      qb.andWhere('item.currentStock <= item.minStockLevel');
    }

    qb.orderBy('item.name', 'ASC');
    return qb.getMany();
  }

  async getItem(tenantId: string, propertyId: string, id: string) {
    const item = await this.dataSource.getRepository(InventoryItem).findOne({
      where: { id, tenantId, propertyId },
    });
    if (!item) throw new NotFoundException('Inventory item not found');
    return item;
  }

  async createItem(
    tenantId: string,
    propertyId: string,
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
    const repo = this.dataSource.getRepository(InventoryItem);
    const item = repo.create({
      tenantId,
      propertyId,
      name: dto.name,
      sku: dto.sku || `SKU-${Date.now().toString().slice(-6)}`,
      category: dto.category || InventoryCategory.DRY_GOODS,
      unit: dto.unit || InventoryUnit.PCS,
      currentStock: dto.currentStock ? Number(dto.currentStock) : 0,
      minStockLevel: dto.minStockLevel ? Number(dto.minStockLevel) : 5,
      costPerUnit: dto.costPerUnit ? Number(dto.costPerUnit) : 0,
    });
    return repo.save(item);
  }

  async updateItem(
    tenantId: string,
    propertyId: string,
    id: string,
    dto: Partial<InventoryItem>,
  ) {
    const repo = this.dataSource.getRepository(InventoryItem);
    const item = await repo.findOne({ where: { id, tenantId, propertyId } });
    if (!item) throw new NotFoundException('Inventory item not found');

    if (dto.name !== undefined) item.name = dto.name;
    if (dto.sku !== undefined) item.sku = dto.sku;
    if (dto.category !== undefined) item.category = dto.category;
    if (dto.unit !== undefined) item.unit = dto.unit;
    if (dto.minStockLevel !== undefined) item.minStockLevel = Number(dto.minStockLevel);
    if (dto.costPerUnit !== undefined) item.costPerUnit = Number(dto.costPerUnit);
    if (dto.isActive !== undefined) item.isActive = dto.isActive;

    return repo.save(item);
  }

  async adjustStock(
    tenantId: string,
    propertyId: string,
    itemId: string,
    userId: string,
    dto: {
      quantity: number; // positive to add, negative to deduct
      movementType: StockMovementType;
      unitCost?: number;
      reason: string;
      referenceId?: string;
    },
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const item = await queryRunner.manager.getRepository(InventoryItem).findOne({
        where: { id: itemId, tenantId, propertyId },
      });
      if (!item) throw new NotFoundException('Inventory item not found');

      const qty = Number(dto.quantity);
      item.currentStock = Number(item.currentStock) + qty;
      if (item.currentStock < 0) {
        throw new BadRequestException(
          `Insufficient stock for ${item.name}. Available: ${item.currentStock - qty}, Requested reduction: ${Math.abs(qty)}`,
        );
      }

      await queryRunner.manager.getRepository(InventoryItem).save(item);

      const movement = queryRunner.manager.getRepository(StockMovement).create({
        tenantId,
        propertyId,
        inventoryItemId: item.id,
        movementType: dto.movementType || StockMovementType.MANUAL_ADJUSTMENT,
        quantity: qty,
        unitCost: dto.unitCost !== undefined ? Number(dto.unitCost) : Number(item.costPerUnit),
        referenceId: dto.referenceId,
        reason: dto.reason || 'Manual stock adjustment',
        createdById: userId,
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

  async getStockMovements(tenantId: string, propertyId: string, itemId?: string) {
    const qb = this.dataSource
      .getRepository(StockMovement)
      .createQueryBuilder('sm')
      .leftJoinAndSelect('sm.inventoryItem', 'item')
      .where('sm.tenantId = :tenantId', { tenantId })
      .andWhere('sm.propertyId = :propertyId', { propertyId });

    if (itemId) {
      qb.andWhere('sm.inventoryItemId = :itemId', { itemId });
    }

    qb.orderBy('sm.createdAt', 'DESC').take(100);
    return qb.getMany();
  }

  // ================= RECIPE (BOM) MANAGEMENT =================
  async getRecipe(tenantId: string, propertyId: string, productId: string) {
    return this.dataSource.getRepository(RecipeItem).find({
      where: { tenantId, propertyId, productId },
      relations: { inventoryItem: true },
      order: { createdAt: 'ASC' },
    });
  }

  async saveRecipe(
    tenantId: string,
    propertyId: string,
    productId: string,
    items: Array<{ inventoryItemId: string; quantityRequired: number }>,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const recipeRepo = queryRunner.manager.getRepository(RecipeItem);
      // Delete existing recipe for this product
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

  // Deduct inventory when POS dishes/drinks are sold
  async deductIngredientsForOrder(
    tenantId: string,
    propertyId: string,
    orderItems: Array<{ productId: string; quantity: number }>,
    orderReference: string,
  ) {
    const productIds = orderItems.map((oi) => oi.productId);
    if (productIds.length === 0) return;

    const recipes = await this.dataSource.getRepository(RecipeItem).find({
      where: { tenantId, propertyId, productId: In(productIds) },
      relations: { inventoryItem: true },
    });

    if (recipes.length === 0) return; // No recipe BOM defined for these items

    for (const orderItem of orderItems) {
      const productRecipes = recipes.filter((r) => r.productId === orderItem.productId);
      for (const recipe of productRecipes) {
        const totalDeduction = Number(recipe.quantityRequired) * Number(orderItem.quantity);
        try {
          await this.adjustStock(tenantId, propertyId, recipe.inventoryItemId, 'SYSTEM', {
            quantity: -totalDeduction,
            movementType: StockMovementType.RECIPE_DEDUCTION,
            unitCost: recipe.inventoryItem?.costPerUnit,
            reason: `POS Order ${orderReference}`,
            referenceId: orderReference,
          });
        } catch (e: any) {
          console.warn(`[Inventory] Recipe stock deduction skipped: ${e?.message}`);
        }
      }
    }
  }

  // ================= SUPPLIERS =================
  async getSuppliers(tenantId: string, propertyId: string) {
    return this.dataSource.getRepository(Supplier).find({
      where: { tenantId, propertyId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async createSupplier(
    tenantId: string,
    propertyId: string,
    dto: {
      name: string;
      contactPerson?: string;
      email?: string;
      phone?: string;
      address?: string;
    },
  ) {
    const repo = this.dataSource.getRepository(Supplier);
    const supplier = repo.create({
      tenantId,
      propertyId,
      ...dto,
    });
    return repo.save(supplier);
  }

  // ================= PURCHASE ORDERS (PO) =================
  async getPurchaseOrders(tenantId: string, propertyId: string, status?: string) {
    const qb = this.dataSource
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

    qb.orderBy('po.createdAt', 'DESC');
    return qb.getMany();
  }

  async createPurchaseOrder(
    tenantId: string,
    propertyId: string,
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const poCount = await queryRunner.manager.getRepository(PurchaseOrder).count({
        where: { tenantId, propertyId },
      });
      const poNumber = `PO-${new Date().getFullYear()}-${String(poCount + 1).padStart(4, '0')}`;

      let totalAmount = 0;
      const poItems = dto.items.map((i) => {
        const qty = Number(i.quantityOrdered);
        const cost = Number(i.unitCost);
        const lineTotal = Number((qty * cost).toFixed(2));
        totalAmount += lineTotal;

        return queryRunner.manager.getRepository(PurchaseOrderItem).create({
          inventoryItemId: i.inventoryItemId,
          quantityOrdered: qty,
          quantityReceived: 0,
          unitCost: cost,
          totalCost: lineTotal,
        });
      });

      const po = queryRunner.manager.getRepository(PurchaseOrder).create({
        tenantId,
        propertyId,
        supplierId: dto.supplierId,
        poNumber,
        status: PurchaseOrderStatus.ORDERED,
        totalAmount: Number(totalAmount.toFixed(2)),
        notes: dto.notes,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
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

  async receivePurchaseOrder(tenantId: string, propertyId: string, poId: string, userId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const po = await queryRunner.manager.getRepository(PurchaseOrder).findOne({
        where: { id: poId, tenantId, propertyId },
        relations: { items: { inventoryItem: true } },
      });
      if (!po) throw new NotFoundException('Purchase Order not found');
      if (po.status === PurchaseOrderStatus.RECEIVED) {
        throw new BadRequestException('Purchase Order already received and stocked');
      }

      po.status = PurchaseOrderStatus.RECEIVED;
      po.receivedAt = new Date();

      // Receive items and increment inventory
      for (const item of po.items) {
        item.quantityReceived = item.quantityOrdered;
        await queryRunner.manager.getRepository(PurchaseOrderItem).save(item);

        const inv = item.inventoryItem;
        if (inv) {
          inv.currentStock = Number(inv.currentStock) + Number(item.quantityReceived);
          inv.costPerUnit = Number(item.unitCost); // Update latest cost
          await queryRunner.manager.getRepository(InventoryItem).save(inv);

          // Record stock movement
          const movement = queryRunner.manager.getRepository(StockMovement).create({
            tenantId,
            propertyId,
            inventoryItemId: inv.id,
            movementType: StockMovementType.PURCHASE_RECEIPT,
            quantity: Number(item.quantityReceived),
            unitCost: Number(item.unitCost),
            referenceId: po.poNumber,
            reason: `Received Purchase Order ${po.poNumber}`,
            createdById: userId,
          });
          await queryRunner.manager.getRepository(StockMovement).save(movement);
        }
      }

      await queryRunner.manager.getRepository(PurchaseOrder).save(po);
      await queryRunner.commitTransaction();
      return po;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
