import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { BarItem, BarCategory } from '../entities/bar-item.entity';
import { BarPourLog, PourType } from '../entities/bar-pour-log.entity';

export class CreateBarItemDto {
  name: string;
  category: BarCategory;
  brand?: string;
  bottleSizeMl?: number;
  fullBottlesStock?: number;
  currentBottleRemainingMl?: number;
  standardPourMl?: number;
  costPerBottle?: number;
  pricePerPour?: number;
  pricePerBottle?: number;
  parLevelBottles?: number;
}

export class QuickPourDto {
  barItemId: string;
  millilitersPoured: number;
  servingsCount?: number;
  pourType?: PourType;
  unitPriceOverride?: number;
  bartenderName?: string;
  notes?: string;
}

export class LogWastageDto {
  barItemId: string;
  millilitersWasted: number;
  bottlesWasted?: number;
  bartenderName?: string;
  reason: string;
}

export class RestockBarItemDto {
  bottlesCount: number;
  costPerBottle?: number;
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
}
