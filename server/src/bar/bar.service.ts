import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BarItem, BarCategory } from '../entities/bar-item.entity';
import { BarPourLog, PourType } from '../entities/bar-pour-log.entity';
import {
  BarStockAdjustment,
  BarAdjustmentType,
} from '../entities/bar-stock-adjustment.entity';

export class CreateBarItemDto {
  @IsNotEmpty({ message: 'Liquor name is required' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'Category is required' })
  @IsEnum(BarCategory)
  category: BarCategory;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bottleSizeMl?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  fullBottlesStock?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  currentBottleRemainingMl?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  standardPourMl?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  costPerBottle?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pricePerPour?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pricePerBottle?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  parLevelBottles?: number;
}

export class QuickPourDto {
  @IsNotEmpty({ message: 'Bar item ID is required' })
  @IsString()
  barItemId: string;

  @IsNotEmpty({ message: 'Milliliters poured is required' })
  @IsNumber()
  @Type(() => Number)
  millilitersPoured: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  servingsCount?: number;

  @IsOptional()
  @IsEnum(PourType)
  pourType?: PourType;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  unitPriceOverride?: number;

  @IsOptional()
  @IsString()
  bartenderName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class LogWastageDto {
  @IsNotEmpty({ message: 'Bar item ID is required' })
  @IsString()
  barItemId: string;

  @IsNotEmpty({ message: 'Milliliters wasted is required' })
  @IsNumber()
  @Type(() => Number)
  millilitersWasted: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bottlesWasted?: number;

  @IsOptional()
  @IsString()
  bartenderName?: string;

  @IsNotEmpty({ message: 'Reason for wastage is required' })
  @IsString()
  reason: string;
}

export class RestockBarItemDto {
  @IsNotEmpty({ message: 'Bottles count is required' })
  @IsNumber()
  @Type(() => Number)
  bottlesCount: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  costPerBottle?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBarItemDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(BarCategory)
  category?: BarCategory;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bottleSizeMl?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  fullBottlesStock?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  currentBottleRemainingMl?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  standardPourMl?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  costPerBottle?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pricePerPour?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pricePerBottle?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  parLevelBottles?: number;
}

export class AdjustBarStockDto {
  @IsNotEmpty({ message: 'Bar item ID is required' })
  @IsString()
  barItemId: string;

  @IsNotEmpty({ message: 'Adjustment type is required' })
  @IsEnum(BarAdjustmentType)
  adjustmentType: BarAdjustmentType;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  newFullBottles?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  newOpenMl?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  fullBottlesDelta?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  openMlDelta?: number;

  @IsOptional()
  @IsString()
  adjustedBy?: string;

  @IsNotEmpty({ message: 'Reason for adjustment is required' })
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkStocktakeItemDto {
  @IsNotEmpty()
  @IsString()
  barItemId: string;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  actualFullBottles: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  actualOpenMl: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkStocktakeAuditDto {
  @IsNotEmpty()
  counts: BulkStocktakeItemDto[];

  @IsOptional()
  @IsString()
  auditedBy?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

@Injectable()
export class BarService {
  constructor(private readonly dataSource: DataSource) {}

  async getItems(
    tenantId: string,
    propertyId: string,
    filters?: { category?: string; search?: string; lowStock?: boolean },
  ) {
    const repo = this.dataSource.getRepository(BarItem);
    const qb = repo
      .createQueryBuilder('item')
      .where('item.tenantId = :tenantId', { tenantId })
      .andWhere('item.propertyId = :propertyId', { propertyId })
      .andWhere('item.isActive = true')
      .orderBy('item.category', 'ASC')
      .addOrderBy('item.name', 'ASC');

    if (filters?.category && filters.category !== 'ALL') {
      qb.andWhere('item.category = :category', { category: filters.category });
    }

    if (filters?.search) {
      const q = `%${filters.search.toLowerCase()}%`;
      qb.andWhere('(LOWER(item.name) LIKE :q OR LOWER(item.brand) LIKE :q)', { q });
    }

    const items = await qb.getMany();

    const results = items.map((item) => {
      const fullBottles = Number(item.fullBottlesStock) || 0;
      const bottleSize = Number(item.bottleSizeMl) || 750;
      const openMl = Number(item.currentBottleRemainingMl) || 0;
      const totalMl = fullBottles * bottleSize + openMl;
      const isLowStock = fullBottles <= (Number(item.parLevelBottles) || 2);

      return {
        ...item,
        fullBottlesStock: fullBottles,
        currentBottleRemainingMl: openMl,
        totalRemainingMl: totalMl,
        totalLiters: Math.round((totalMl / 1000) * 100) / 100,
        estimatedTotalShots: Math.floor(
          totalMl / (Number(item.standardPourMl) || 30),
        ),
        isLowStock,
      };
    });

    if (filters?.lowStock) {
      return results.filter((i) => i.isLowStock);
    }

    return results;
  }

  async getItem(tenantId: string, propertyId: string, id: string) {
    const item = await this.dataSource.getRepository(BarItem).findOne({
      where: { id, tenantId, propertyId, isActive: true },
    });
    if (!item) {
      throw new NotFoundException(`Bar item with ID ${id} not found`);
    }
    return item;
  }

  async createItem(
    tenantId: string,
    propertyId: string,
    dto: CreateBarItemDto,
  ) {
    const repo = this.dataSource.getRepository(BarItem);
    const bottleSize = Number(dto.bottleSizeMl) || 750;
    const initialBottles = Number(dto.fullBottlesStock) || 0;

    let openMl = Number(dto.currentBottleRemainingMl);
    let fullStock = initialBottles;

    // If remaining open bottle ml not specified and bottles > 0, auto-uncork 1st bottle on speed rail
    if (isNaN(openMl) || openMl <= 0) {
      if (initialBottles > 0) {
        fullStock = initialBottles - 1;
        openMl = bottleSize;
      } else {
        openMl = 0;
      }
    }

    const item = repo.create({
      tenantId,
      propertyId,
      name: dto.name.trim(),
      category: dto.category || BarCategory.WHISKEY,
      brand: dto.brand?.trim() || undefined,
      bottleSizeMl: bottleSize,
      fullBottlesStock: fullStock,
      currentBottleRemainingMl: openMl,
      standardPourMl: Number(dto.standardPourMl) || 30,
      costPerBottle: Number(dto.costPerBottle) || 0.0,
      pricePerPour: Number(dto.pricePerPour) || 0.0,
      pricePerBottle: Number(dto.pricePerBottle) || 0.0,
      parLevelBottles: Number(dto.parLevelBottles) || 2,
      isActive: true,
    });

    return repo.save(item);
  }

  async updateItem(
    tenantId: string,
    propertyId: string,
    id: string,
    dto: Partial<CreateBarItemDto>,
  ) {
    const repo = this.dataSource.getRepository(BarItem);
    const item = await this.getItem(tenantId, propertyId, id);

    if (dto.name !== undefined) item.name = dto.name.trim();
    if (dto.category !== undefined) item.category = dto.category;
    if (dto.brand !== undefined) item.brand = dto.brand.trim();
    if (dto.bottleSizeMl !== undefined) item.bottleSizeMl = Number(dto.bottleSizeMl);
    if (dto.fullBottlesStock !== undefined) item.fullBottlesStock = Number(dto.fullBottlesStock);
    if (dto.currentBottleRemainingMl !== undefined)
      item.currentBottleRemainingMl = Number(dto.currentBottleRemainingMl);
    if (dto.standardPourMl !== undefined)
      item.standardPourMl = Number(dto.standardPourMl);
    if (dto.costPerBottle !== undefined)
      item.costPerBottle = Number(dto.costPerBottle);
    if (dto.pricePerPour !== undefined)
      item.pricePerPour = Number(dto.pricePerPour);
    if (dto.pricePerBottle !== undefined)
      item.pricePerBottle = Number(dto.pricePerBottle);
    if (dto.parLevelBottles !== undefined)
      item.parLevelBottles = Number(dto.parLevelBottles);

    return repo.save(item);
  }

  async deleteItem(tenantId: string, propertyId: string, id: string) {
    const repo = this.dataSource.getRepository(BarItem);
    const item = await this.getItem(tenantId, propertyId, id);
    item.isActive = false;
    await repo.save(item);
    return { success: true, message: `Bar item "${item.name}" deactivated.` };
  }

  async quickPour(
    tenantId: string,
    propertyId: string,
    dto: QuickPourDto,
  ) {
    const itemRepo = this.dataSource.getRepository(BarItem);
    const logRepo = this.dataSource.getRepository(BarPourLog);

    const item = await this.getItem(tenantId, propertyId, dto.barItemId);
    const pourMl = Number(dto.millilitersPoured);
    if (isNaN(pourMl) || pourMl <= 0) {
      throw new BadRequestException('Milliliters poured must be greater than 0');
    }

    const bottleSize = Number(item.bottleSizeMl) || 750;
    let currentOpenMl = Number(item.currentBottleRemainingMl) || 0;
    let fullStock = Number(item.fullBottlesStock) || 0;

    const totalAvailableMl = fullStock * bottleSize + currentOpenMl;
    if (totalAvailableMl < pourMl) {
      throw new BadRequestException(
        `Insufficient stock for "${item.name}". Total available volume is ${totalAvailableMl}ml.`,
      );
    }

    // Deduct volume logic
    if (currentOpenMl >= pourMl) {
      currentOpenMl -= pourMl;
    } else {
      const deficit = pourMl - currentOpenMl;
      const bottlesNeeded = Math.ceil(deficit / bottleSize);
      fullStock -= bottlesNeeded;
      currentOpenMl = currentOpenMl + bottlesNeeded * bottleSize - pourMl;
    }

    item.currentBottleRemainingMl = Math.round(currentOpenMl * 100) / 100;
    item.fullBottlesStock = fullStock;
    await itemRepo.save(item);

    // Cost & Sale calculation
    const costPerMl = (Number(item.costPerBottle) || 0) / bottleSize;
    const costAmount = Math.round(costPerMl * pourMl * 100) / 100;

    const pourType = dto.pourType || PourType.SALE;
    const servings = Number(dto.servingsCount) || 1;

    let saleAmount = 0;
    if (pourType === PourType.SALE) {
      if (dto.unitPriceOverride !== undefined) {
        saleAmount = Number(dto.unitPriceOverride);
      } else {
        saleAmount = (Number(item.pricePerPour) || 0) * servings;
      }
    }

    const log = logRepo.create({
      tenantId,
      propertyId,
      barItemId: item.id,
      barItemName: item.name,
      category: item.category,
      pourType,
      millilitersPoured: pourMl,
      servingsCount: servings,
      totalSaleAmount: saleAmount,
      costAmount,
      bartenderName: dto.bartenderName || 'Bartender',
      notes: dto.notes || undefined,
    });

    const savedLog = await logRepo.save(log);

    return {
      success: true,
      item,
      log: savedLog,
      message: `Poured ${pourMl}ml of ${item.name} (${pourType}). Remaining open bottle: ${item.currentBottleRemainingMl}ml.`,
    };
  }

  async logWastage(
    tenantId: string,
    propertyId: string,
    dto: LogWastageDto,
  ) {
    const item = await this.getItem(tenantId, propertyId, dto.barItemId);
    const bottleSize = Number(item.bottleSizeMl) || 750;

    let totalWastedMl = Number(dto.millilitersWasted) || 0;
    if (dto.bottlesWasted && dto.bottlesWasted > 0) {
      totalWastedMl += Number(dto.bottlesWasted) * bottleSize;
    }

    if (totalWastedMl <= 0) {
      throw new BadRequestException('Please specify wasted milliliters or bottles');
    }

    return this.quickPour(tenantId, propertyId, {
      barItemId: dto.barItemId,
      millilitersPoured: totalWastedMl,
      servingsCount: 1,
      pourType: PourType.WASTAGE,
      unitPriceOverride: 0,
      bartenderName: dto.bartenderName || 'Bartender',
      notes: `Wastage / Spillage: ${dto.reason}`,
    });
  }

  async restockBottles(
    tenantId: string,
    propertyId: string,
    id: string,
    dto: RestockBarItemDto,
  ) {
    const repo = this.dataSource.getRepository(BarItem);
    const item = await this.getItem(tenantId, propertyId, id);

    const qty = Number(dto.bottlesCount);
    if (isNaN(qty) || qty <= 0) {
      throw new BadRequestException('Restock bottle count must be greater than 0');
    }

    item.fullBottlesStock = (Number(item.fullBottlesStock) || 0) + qty;
    if (dto.costPerBottle !== undefined && dto.costPerBottle > 0) {
      item.costPerBottle = Number(dto.costPerBottle);
    }

    await repo.save(item);
    return {
      success: true,
      item,
      message: `Added ${qty} bottles to ${item.name}. Total cellar stock: ${item.fullBottlesStock} bottles.`,
    };
  }

  async openBottle(tenantId: string, propertyId: string, id: string) {
    const repo = this.dataSource.getRepository(BarItem);
    const item = await this.getItem(tenantId, propertyId, id);

    const fullStock = Number(item.fullBottlesStock) || 0;
    if (fullStock <= 0) {
      throw new BadRequestException(
        `No unopened bottles of "${item.name}" in cellar stock.`,
      );
    }

    const bottleSize = Number(item.bottleSizeMl) || 750;
    item.fullBottlesStock = fullStock - 1;
    item.currentBottleRemainingMl =
      (Number(item.currentBottleRemainingMl) || 0) + bottleSize;

    await repo.save(item);
    return {
      success: true,
      item,
      message: `Opened 1 bottle (${bottleSize}ml) of ${item.name}. Current volume on speed rail: ${item.currentBottleRemainingMl}ml.`,
    };
  }

  async getPourLogs(
    tenantId: string,
    propertyId: string,
    filters?: {
      pourType?: string;
      category?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      limit?: number;
    },
  ) {
    const logRepo = this.dataSource.getRepository(BarPourLog);
    const qb = logRepo
      .createQueryBuilder('log')
      .where('log.tenantId = :tenantId', { tenantId })
      .andWhere('log.propertyId = :propertyId', { propertyId })
      .orderBy('log.createdAt', 'DESC');

    if (filters?.pourType && filters.pourType !== 'ALL') {
      qb.andWhere('log.pourType = :pourType', { pourType: filters.pourType });
    }

    if (filters?.category && filters.category !== 'ALL') {
      qb.andWhere('log.category = :category', { category: filters.category });
    }

    if (filters?.startDate) {
      qb.andWhere('log.createdAt >= :startDate', {
        startDate: new Date(filters.startDate),
      });
    }

    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('log.createdAt <= :endDate', { endDate: end });
    }

    if (filters?.search) {
      const q = `%${filters.search.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(log.barItemName) LIKE :q OR LOWER(log.bartenderName) LIKE :q OR LOWER(log.notes) LIKE :q)',
        { q },
      );
    }

    if (filters?.limit) {
      qb.take(filters.limit);
    } else {
      qb.take(100);
    }

    return qb.getMany();
  }

  async getBarAnalyticsReport(
    tenantId: string,
    propertyId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const logRepo = this.dataSource.getRepository(BarPourLog);
    const qb = logRepo
      .createQueryBuilder('log')
      .where('log.tenantId = :tenantId', { tenantId })
      .andWhere('log.propertyId = :propertyId', { propertyId });

    if (startDate) {
      qb.andWhere('log.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    } else {
      // Default: today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      qb.andWhere('log.createdAt >= :today', { today });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('log.createdAt <= :endDate', { endDate: end });
    }

    const logs = await qb.orderBy('log.createdAt', 'DESC').getMany();

    let totalSales = 0;
    let totalPouredMl = 0;
    let salesVolumeMl = 0;
    let wastageVolumeMl = 0;
    let wastageCost = 0;
    let totalServings = 0;

    const categoryMap: Record<
      string,
      { category: string; volumeMl: number; servings: number; sales: number }
    > = {};

    const itemMap: Record<
      string,
      {
        id: string;
        name: string;
        category: string;
        volumeMl: number;
        servings: number;
        sales: number;
      }
    > = {};

    for (const log of logs) {
      const ml = Number(log.millilitersPoured) || 0;
      const amount = Number(log.totalSaleAmount) || 0;
      const cost = Number(log.costAmount) || 0;
      const s = Number(log.servingsCount) || 1;

      totalPouredMl += ml;

      if (log.pourType === PourType.SALE) {
        totalSales += amount;
        salesVolumeMl += ml;
        totalServings += s;
      } else if (log.pourType === PourType.WASTAGE) {
        wastageVolumeMl += ml;
        wastageCost += cost;
      }

      // Category breakdown
      const cat = log.category || 'OTHER';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { category: cat, volumeMl: 0, servings: 0, sales: 0 };
      }
      categoryMap[cat].volumeMl += ml;
      if (log.pourType === PourType.SALE) {
        categoryMap[cat].sales += amount;
        categoryMap[cat].servings += s;
      }

      // Beverage breakdown
      const bId = log.barItemId || log.barItemName;
      if (!itemMap[bId]) {
        itemMap[bId] = {
          id: bId,
          name: log.barItemName,
          category: log.category,
          volumeMl: 0,
          servings: 0,
          sales: 0,
        };
      }
      itemMap[bId].volumeMl += ml;
      if (log.pourType === PourType.SALE) {
        itemMap[bId].sales += amount;
        itemMap[bId].servings += s;
      }
    }

    const topBeverages = Object.values(itemMap).sort(
      (a, b) => b.volumeMl - a.volumeMl,
    );

    return {
      summary: {
        totalSales: Math.round(totalSales * 100) / 100,
        totalPouredMl: Math.round(totalPouredMl * 100) / 100,
        totalLiters: Math.round((totalPouredMl / 1000) * 100) / 100,
        salesVolumeMl: Math.round(salesVolumeMl * 100) / 100,
        salesLiters: Math.round((salesVolumeMl / 1000) * 100) / 100,
        wastageVolumeMl: Math.round(wastageVolumeMl * 100) / 100,
        wastageCost: Math.round(wastageCost * 100) / 100,
        totalServings,
        logCount: logs.length,
      },
      categoryBreakdown: Object.values(categoryMap).sort(
        (a, b) => b.sales - a.sales,
      ),
      topBeverages,
      logs,
    };
  }

  // ================= STOCK ADJUSTMENT & AUDIT =================
  async adjustStock(
    tenantId: string,
    propertyId: string,
    dto: AdjustBarStockDto,
  ) {
    const itemRepo = this.dataSource.getRepository(BarItem);
    const adjRepo = this.dataSource.getRepository(BarStockAdjustment);

    const item = await this.getItem(tenantId, propertyId, dto.barItemId);
    const bottleSize = Number(item.bottleSizeMl) || 750;

    const prevFull = Number(item.fullBottlesStock) || 0;
    const prevOpen = Number(item.currentBottleRemainingMl) || 0;

    let targetFull = prevFull;
    if (dto.newFullBottles !== undefined) {
      targetFull = Math.max(0, Number(dto.newFullBottles));
    } else if (dto.fullBottlesDelta !== undefined) {
      targetFull = Math.max(0, prevFull + Number(dto.fullBottlesDelta));
    }

    let targetOpen = prevOpen;
    if (dto.newOpenMl !== undefined) {
      targetOpen = Math.max(0, Number(dto.newOpenMl));
    } else if (dto.openMlDelta !== undefined) {
      targetOpen = Math.max(0, prevOpen + Number(dto.openMlDelta));
    }

    // Clamp open ml to bottle size
    if (targetOpen > bottleSize) {
      const extraBottles = Math.floor(targetOpen / bottleSize);
      targetFull += extraBottles;
      targetOpen = targetOpen % bottleSize;
    }

    const fullDelta = targetFull - prevFull;
    const openDelta = Math.round((targetOpen - prevOpen) * 100) / 100;
    const netVolumeDeltaMl =
      Math.round((fullDelta * bottleSize + openDelta) * 100) / 100;

    const costPerMl = (Number(item.costPerBottle) || 0) / bottleSize;
    const costImpact = Math.round(netVolumeDeltaMl * costPerMl * 100) / 100;

    item.fullBottlesStock = targetFull;
    item.currentBottleRemainingMl = targetOpen;
    const updatedItem = await itemRepo.save(item);

    const adjustment = adjRepo.create({
      tenantId,
      propertyId,
      barItemId: item.id,
      barItemName: item.name,
      category: item.category,
      adjustmentType: dto.adjustmentType || BarAdjustmentType.CORRECTION,
      previousFullBottles: prevFull,
      newFullBottles: targetFull,
      fullBottlesDelta: fullDelta,
      previousOpenMl: prevOpen,
      newOpenMl: targetOpen,
      openMlDelta: openDelta,
      netVolumeDeltaMl,
      costImpact,
      adjustedBy: dto.adjustedBy || 'Bar Manager',
      reason: dto.reason || 'Stock balance adjustment',
      notes: dto.notes || undefined,
    });

    const savedAdjustment = await adjRepo.save(adjustment);

    return {
      success: true,
      item: updatedItem,
      adjustment: savedAdjustment,
      message: `Adjusted ${item.name}: Net volume delta ${netVolumeDeltaMl > 0 ? '+' : ''}${netVolumeDeltaMl}ml, Cost impact ${costImpact >= 0 ? '+$' : '-$'}${Math.abs(costImpact)}.`,
    };
  }

  async bulkStocktakeAudit(
    tenantId: string,
    propertyId: string,
    dto: BulkStocktakeAuditDto,
  ) {
    const results: any[] = [];
    let variancesCount = 0;
    let totalCostImpact = 0;

    for (const count of dto.counts) {
      const item = await this.getItem(tenantId, propertyId, count.barItemId);
      const prevFull = Number(item.fullBottlesStock) || 0;
      const prevOpen = Number(item.currentBottleRemainingMl) || 0;

      const fullDiff = count.actualFullBottles - prevFull;
      const openDiff = count.actualOpenMl - prevOpen;

      if (fullDiff !== 0 || Math.abs(openDiff) > 0.01) {
        variancesCount++;
        const adjResult = await this.adjustStock(tenantId, propertyId, {
          barItemId: item.id,
          adjustmentType: BarAdjustmentType.PHYSICAL_AUDIT,
          newFullBottles: count.actualFullBottles,
          newOpenMl: count.actualOpenMl,
          adjustedBy: dto.auditedBy || 'Audit Staff',
          reason: 'Physical inventory stocktake reconciliation',
          notes: count.notes || dto.notes,
        });
        totalCostImpact += Number(adjResult.adjustment.costImpact) || 0;
        results.push(adjResult.adjustment);
      }
    }

    return {
      success: true,
      auditedCount: dto.counts.length,
      variancesCount,
      totalNetCostImpact: Math.round(totalCostImpact * 100) / 100,
      adjustments: results,
      message: `Stocktake completed: ${dto.counts.length} items checked, ${variancesCount} variances reconciled with net financial impact of ${totalCostImpact >= 0 ? '+$' : '-$'}${Math.abs(totalCostImpact)}.`,
    };
  }

  async getStockAdjustments(
    tenantId: string,
    propertyId: string,
    filters?: {
      adjustmentType?: string;
      barItemId?: string;
      category?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      limit?: number;
    },
  ) {
    const adjRepo = this.dataSource.getRepository(BarStockAdjustment);
    const qb = adjRepo
      .createQueryBuilder('adj')
      .where('adj.tenantId = :tenantId', { tenantId })
      .andWhere('adj.propertyId = :propertyId', { propertyId })
      .orderBy('adj.createdAt', 'DESC');

    if (filters?.adjustmentType && filters.adjustmentType !== 'ALL') {
      qb.andWhere('adj.adjustmentType = :adjustmentType', {
        adjustmentType: filters.adjustmentType,
      });
    }

    if (filters?.barItemId) {
      qb.andWhere('adj.barItemId = :barItemId', {
        barItemId: filters.barItemId,
      });
    }

    if (filters?.category && filters.category !== 'ALL') {
      qb.andWhere('adj.category = :category', { category: filters.category });
    }

    if (filters?.startDate) {
      qb.andWhere('adj.createdAt >= :startDate', {
        startDate: new Date(filters.startDate),
      });
    }

    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('adj.createdAt <= :endDate', { endDate: end });
    }

    if (filters?.search) {
      const q = `%${filters.search.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(adj.barItemName) LIKE :q OR LOWER(adj.adjustedBy) LIKE :q OR LOWER(adj.reason) LIKE :q)',
        { q },
      );
    }

    if (filters?.limit) {
      qb.take(filters.limit);
    } else {
      qb.take(100);
    }

    return qb.getMany();
  }

  // ================= STOCK VALUATION REPORT =================
  async getBarStockValuationReport(
    tenantId: string,
    propertyId: string,
    category?: string,
  ) {
    const items = await this.getItems(tenantId, propertyId, {
      category: category && category !== 'ALL' ? category : undefined,
    });

    let totalInventoryCostValue = 0;
    let totalCellarCostValue = 0;
    let totalOpenCostValue = 0;
    let totalPotentialRetailValue = 0;
    let totalLitersOnHand = 0;
    let totalFullBottles = 0;
    let lowStockCount = 0;
    let totalReorderEstimatedCost = 0;

    const categorySummaryMap: Record<
      string,
      {
        category: string;
        itemCount: number;
        bottles: number;
        liters: number;
        costValue: number;
        potentialRetail: number;
      }
    > = {};

    const detailedItems = items.map((item) => {
      const fullBottles = Number(item.fullBottlesStock) || 0;
      const bottleSize = Number(item.bottleSizeMl) || 750;
      const openMl = Number(item.currentBottleRemainingMl) || 0;
      const totalMl = fullBottles * bottleSize + openMl;
      const totalLiters = Math.round((totalMl / 1000) * 100) / 100;

      const costPerBottle = Number(item.costPerBottle) || 0;
      const cellarCost = Math.round(fullBottles * costPerBottle * 100) / 100;
      const openCost =
        Math.round((openMl / bottleSize) * costPerBottle * 100) / 100;
      const totalCost = Math.round((cellarCost + openCost) * 100) / 100;

      const standardPour = Number(item.standardPourMl) || 30;
      const totalShots = Math.floor(totalMl / standardPour);
      const pricePerPour = Number(item.pricePerPour) || 0;
      const potentialRetail = Math.round(totalShots * pricePerPour * 100) / 100;

      const potentialProfit =
        Math.round((potentialRetail - totalCost) * 100) / 100;
      const marginPercent =
        potentialRetail > 0
          ? Math.round(
              ((potentialRetail - totalCost) / potentialRetail) * 1000,
            ) / 10
          : 0;

      const parLevel = Number(item.parLevelBottles) || 2;
      const isLowStock = fullBottles <= parLevel;
      const reorderSuggestedBottles = isLowStock
        ? Math.max(0, Math.ceil(parLevel * 1.5) - fullBottles)
        : 0;
      const reorderCost =
        Math.round(reorderSuggestedBottles * costPerBottle * 100) / 100;

      totalInventoryCostValue += totalCost;
      totalCellarCostValue += cellarCost;
      totalOpenCostValue += openCost;
      totalPotentialRetailValue += potentialRetail;
      totalLitersOnHand += totalLiters;
      totalFullBottles += fullBottles;
      if (isLowStock) {
        lowStockCount++;
        totalReorderEstimatedCost += reorderCost;
      }

      // Group by category
      const cat = item.category || 'OTHER';
      if (!categorySummaryMap[cat]) {
        categorySummaryMap[cat] = {
          category: cat,
          itemCount: 0,
          bottles: 0,
          liters: 0,
          costValue: 0,
          potentialRetail: 0,
        };
      }
      categorySummaryMap[cat].itemCount++;
      categorySummaryMap[cat].bottles += fullBottles;
      categorySummaryMap[cat].liters =
        Math.round((categorySummaryMap[cat].liters + totalLiters) * 100) / 100;
      categorySummaryMap[cat].costValue =
        Math.round((categorySummaryMap[cat].costValue + totalCost) * 100) / 100;
      categorySummaryMap[cat].potentialRetail =
        Math.round(
          (categorySummaryMap[cat].potentialRetail + potentialRetail) * 100,
        ) / 100;

      return {
        ...item,
        cellarCostValue: cellarCost,
        openBottleCostValue: openCost,
        totalCostValue: totalCost,
        potentialRetailValue: potentialRetail,
        potentialGrossProfit: potentialProfit,
        marginPercent,
        reorderSuggestedBottles,
        reorderCost,
      };
    });

    const totalPotentialProfit =
      Math.round((totalPotentialRetailValue - totalInventoryCostValue) * 100) /
      100;
    const overallMargin =
      totalPotentialRetailValue > 0
        ? Math.round(
            (totalPotentialProfit / totalPotentialRetailValue) * 1000,
          ) / 10
        : 0;

    return {
      summary: {
        totalInventoryCostValue: Math.round(totalInventoryCostValue * 100) / 100,
        totalCellarCostValue: Math.round(totalCellarCostValue * 100) / 100,
        totalOpenCostValue: Math.round(totalOpenCostValue * 100) / 100,
        totalPotentialRetailValue:
          Math.round(totalPotentialRetailValue * 100) / 100,
        totalPotentialGrossProfit: totalPotentialProfit,
        overallMarginPercent: overallMargin,
        totalLitersOnHand: Math.round(totalLitersOnHand * 100) / 100,
        totalFullBottles,
        totalItemsCount: items.length,
        lowStockCount,
        totalReorderEstimatedCost:
          Math.round(totalReorderEstimatedCost * 100) / 100,
      },
      categoryBreakdown: Object.values(categorySummaryMap).sort(
        (a, b) => b.costValue - a.costValue,
      ),
      items: detailedItems,
    };
  }

  // ================= DEPLETION VELOCITY & RUNWAY REPORT =================
  async getBarDepletionRunwayReport(
    tenantId: string,
    propertyId: string,
    daysPeriod: number = 30,
  ) {
    const periodDays = Math.max(1, Math.min(365, Number(daysPeriod) || 30));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const [items, logs] = await Promise.all([
      this.getItems(tenantId, propertyId),
      this.getPourLogs(tenantId, propertyId, {
        startDate: startDate.toISOString(),
        limit: 5000,
      }),
    ]);

    const consumptionMap: Record<
      string,
      { totalPouredMl: number; servings: number; salesAmount: number }
    > = {};

    for (const log of logs) {
      const bId = log.barItemId;
      if (!bId) continue;
      if (!consumptionMap[bId]) {
        consumptionMap[bId] = { totalPouredMl: 0, servings: 0, salesAmount: 0 };
      }
      consumptionMap[bId].totalPouredMl += Number(log.millilitersPoured) || 0;
      consumptionMap[bId].servings += Number(log.servingsCount) || 1;
      consumptionMap[bId].salesAmount += Number(log.totalSaleAmount) || 0;
    }

    const reportItems = items.map((item) => {
      const stats = consumptionMap[item.id] || {
        totalPouredMl: 0,
        servings: 0,
        salesAmount: 0,
      };
      const bottleSize = Number(item.bottleSizeMl) || 750;
      const totalAvailableMl = Number(item.totalRemainingMl) || 0;

      const dailyBurnRateMl =
        Math.round((stats.totalPouredMl / periodDays) * 100) / 100;
      const dailyBurnBottles =
        Math.round((dailyBurnRateMl / bottleSize) * 100) / 100;

      let daysRemaining: number | null = null;
      let status: 'CRITICAL' | 'LOW' | 'HEALTHY' | 'DORMANT' = 'HEALTHY';

      if (dailyBurnRateMl > 0) {
        daysRemaining =
          Math.round((totalAvailableMl / dailyBurnRateMl) * 10) / 10;
        if (daysRemaining <= 3) {
          status = 'CRITICAL';
        } else if (daysRemaining <= 7) {
          status = 'LOW';
        } else {
          status = 'HEALTHY';
        }
      } else {
        status = 'DORMANT';
      }

      const par = Number(item.parLevelBottles) || 2;
      const fullStock = Number(item.fullBottlesStock) || 0;
      const reorderRecommendation =
        fullStock <= par ? Math.max(0, Math.ceil(par * 1.5) - fullStock) : 0;

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        brand: item.brand,
        bottleSizeMl: bottleSize,
        fullBottlesStock: fullStock,
        totalRemainingMl: totalAvailableMl,
        totalLiters: item.totalLiters,
        periodDays,
        totalPouredInPeriodMl: stats.totalPouredMl,
        servingsInPeriod: stats.servings,
        salesInPeriod: stats.salesAmount,
        dailyBurnRateMl,
        dailyBurnBottles,
        daysRemaining,
        runwayStatus: status,
        parLevelBottles: par,
        reorderRecommendation,
      };
    });

    return {
      periodDays,
      totalItemsTracked: reportItems.length,
      criticalItemsCount: reportItems.filter(
        (i) => i.runwayStatus === 'CRITICAL',
      ).length,
      lowRunwayItemsCount: reportItems.filter((i) => i.runwayStatus === 'LOW')
        .length,
      items: reportItems.sort((a, b) => {
        if (a.daysRemaining === null) return 1;
        if (b.daysRemaining === null) return -1;
        return a.daysRemaining - b.daysRemaining;
      }),
    };
  }

  // ================= SHRINKAGE & LOSS REPORT =================
  async getBarShrinkageReport(
    tenantId: string,
    propertyId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const [wastageLogs, negativeAdjustments] = await Promise.all([
      this.getPourLogs(tenantId, propertyId, {
        pourType: PourType.WASTAGE,
        startDate,
        endDate,
        limit: 1000,
      }),
      this.dataSource
        .getRepository(BarStockAdjustment)
        .createQueryBuilder('adj')
        .where('adj.tenantId = :tenantId', { tenantId })
        .andWhere('adj.propertyId = :propertyId', { propertyId })
        .andWhere('adj.netVolumeDeltaMl < 0')
        .orderBy('adj.createdAt', 'DESC')
        .getMany(),
    ]);

    let totalShrinkageVolumeMl = 0;
    let totalShrinkageCost = 0;
    let breakageCost = 0;
    let breakageMl = 0;
    let spillageCost = 0;
    let spillageMl = 0;
    let expiryCost = 0;
    let expiryMl = 0;
    let auditShortageCost = 0;
    let auditShortageMl = 0;

    const incidents: any[] = [];

    // From Wastage Pour Logs (spills, bar waste)
    for (const log of wastageLogs) {
      const ml = Number(log.millilitersPoured) || 0;
      const cost = Number(log.costAmount) || 0;
      totalShrinkageVolumeMl += ml;
      totalShrinkageCost += cost;
      spillageMl += ml;
      spillageCost += cost;

      incidents.push({
        id: log.id,
        source: 'WASTAGE_LOG',
        type: 'SPILLAGE_WASTAGE',
        itemName: log.barItemName,
        category: log.category,
        volumeMl: ml,
        costImpact: cost,
        responsiblePerson: log.bartenderName,
        reason: log.notes || 'Spillage / Bar wastage',
        timestamp: log.createdAt,
      });
    }

    // From Negative Stock Adjustments (breakages, spoilage, physical audits)
    for (const adj of negativeAdjustments) {
      const absMl = Math.abs(Number(adj.netVolumeDeltaMl) || 0);
      const absCost = Math.abs(Number(adj.costImpact) || 0);
      totalShrinkageVolumeMl += absMl;
      totalShrinkageCost += absCost;

      if (adj.adjustmentType === BarAdjustmentType.BREAKAGE) {
        breakageMl += absMl;
        breakageCost += absCost;
      } else if (adj.adjustmentType === BarAdjustmentType.EXPIRY_SPOILAGE) {
        expiryMl += absMl;
        expiryCost += absCost;
      } else {
        auditShortageMl += absMl;
        auditShortageCost += absCost;
      }

      incidents.push({
        id: adj.id,
        source: 'STOCK_ADJUSTMENT',
        type: adj.adjustmentType,
        itemName: adj.barItemName,
        category: adj.category,
        volumeMl: absMl,
        costImpact: absCost,
        responsiblePerson: adj.adjustedBy,
        reason: adj.reason + (adj.notes ? ` (${adj.notes})` : ''),
        timestamp: adj.createdAt,
      });
    }

    incidents.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return {
      summary: {
        totalShrinkageVolumeMl: Math.round(totalShrinkageVolumeMl * 100) / 100,
        totalShrinkageLiters:
          Math.round((totalShrinkageVolumeMl / 1000) * 100) / 100,
        totalShrinkageCost: Math.round(totalShrinkageCost * 100) / 100,
        breakageCost: Math.round(breakageCost * 100) / 100,
        breakageMl: Math.round(breakageMl * 100) / 100,
        spillageCost: Math.round(spillageCost * 100) / 100,
        spillageMl: Math.round(spillageMl * 100) / 100,
        expiryCost: Math.round(expiryCost * 100) / 100,
        expiryMl: Math.round(expiryMl * 100) / 100,
        auditShortageCost: Math.round(auditShortageCost * 100) / 100,
        auditShortageMl: Math.round(auditShortageMl * 100) / 100,
        incidentCount: incidents.length,
      },
      incidents,
    };
  }

  // ================= UNIFIED BAR LEDGER =================
  async getUnifiedStockLedger(
    tenantId: string,
    propertyId: string,
    barItemId?: string,
    limit: number = 100,
  ) {
    const [logs, adjustments] = await Promise.all([
      this.getPourLogs(tenantId, propertyId, {
        limit: 500,
        ...(barItemId ? { search: barItemId } : {}),
      }),
      this.getStockAdjustments(tenantId, propertyId, {
        barItemId,
        limit: 500,
      }),
    ]);

    const events: any[] = [];

    for (const log of logs) {
      if (barItemId && log.barItemId !== barItemId) continue;
      events.push({
        id: log.id,
        source: 'POUR_LOG',
        eventType: log.pourType,
        barItemId: log.barItemId,
        barItemName: log.barItemName,
        category: log.category,
        volumeDeltaMl: -Math.abs(Number(log.millilitersPoured) || 0),
        costImpact: Number(log.costAmount) || 0,
        revenueAmount: Number(log.totalSaleAmount) || 0,
        servings: Number(log.servingsCount) || 1,
        performer: log.bartenderName,
        reason: log.notes || `Pour: ${log.pourType}`,
        timestamp: log.createdAt,
      });
    }

    for (const adj of adjustments) {
      events.push({
        id: adj.id,
        source: 'STOCK_ADJUSTMENT',
        eventType: adj.adjustmentType,
        barItemId: adj.barItemId,
        barItemName: adj.barItemName,
        category: adj.category,
        volumeDeltaMl: Number(adj.netVolumeDeltaMl) || 0,
        costImpact: Number(adj.costImpact) || 0,
        revenueAmount: 0,
        servings: 0,
        performer: adj.adjustedBy,
        reason: adj.reason + (adj.notes ? ` (${adj.notes})` : ''),
        timestamp: adj.createdAt,
      });
    }

    events.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return events.slice(0, limit);
  }
}
