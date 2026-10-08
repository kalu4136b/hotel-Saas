import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { Payment, PaymentMethod, PaymentStatus } from '../entities/payment.entity';
import { DiningTable, TableStatus } from '../entities/dining-table.entity';
import { KOT, KOTStatus } from '../entities/kot.entity';
import { Product } from '../entities/product.entity';

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async getStats(tenantId: string, propertyId: string) {
    if (!tenantId) {
      return {
        revenue: { todayTotal: 0, cashSales: 0, cardSales: 0, transactionCount: 0 },
        orders: { todayTotal: 0, completed: 0, active: 0, cancelled: 0 },
        tables: { total: 0, occupied: 0, billed: 0, available: 0, occupancyRate: 0 },
        kitchen: { activeKots: 0 },
      };
    }

    const orderRepo = this.dataSource.getRepository(Order);
    const paymentRepo = this.dataSource.getRepository(Payment);
    const tableRepo = this.dataSource.getRepository(DiningTable);
    const kotRepo = this.dataSource.getRepository(KOT);

    // 1. Live Payments Today (Real SQL Aggregation)
    const paymentStats = await paymentRepo
      .createQueryBuilder('p')
      .select([
        'COALESCE(SUM(p.amountPaid), 0) as totalRevenue',
        'COALESCE(SUM(CASE WHEN p.paymentMethod = "CASH" THEN p.amountPaid ELSE 0 END), 0) as cashSales',
        'COALESCE(SUM(CASE WHEN p.paymentMethod = "CARD" THEN p.amountPaid ELSE 0 END), 0) as cardSales',
        'COUNT(p.id) as paymentCount',
      ])
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.propertyId = :propertyId', { propertyId })
      .andWhere('p.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('DATE(p.createdAt) = CURDATE()')
      .getRawOne();

    // 2. Orders Today (Real SQL Aggregation)
    const orderStats = await orderRepo
      .createQueryBuilder('o')
      .select([
        'COUNT(o.id) as todayOrders',
        'COALESCE(SUM(CASE WHEN o.status = "PAID" THEN 1 ELSE 0 END), 0) as completedOrders',
        'COALESCE(SUM(CASE WHEN o.status NOT IN ("PAID", "CANCELLED") THEN 1 ELSE 0 END), 0) as activeOrders',
        'COALESCE(SUM(CASE WHEN o.status = "CANCELLED" THEN 1 ELSE 0 END), 0) as cancelledOrders',
      ])
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.propertyId = :propertyId', { propertyId })
      .andWhere('DATE(o.createdAt) = CURDATE()')
      .getRawOne();

    // 3. Table Occupancy Counts (Real Live Counts)
    const tableStats = await tableRepo
      .createQueryBuilder('t')
      .select([
        'COUNT(t.id) as totalTables',
        'COALESCE(SUM(CASE WHEN t.status = "OCCUPIED" THEN 1 ELSE 0 END), 0) as occupiedTables',
        'COALESCE(SUM(CASE WHEN t.status = "BILLED" THEN 1 ELSE 0 END), 0) as billedTables',
        'COALESCE(SUM(CASE WHEN t.status = "AVAILABLE" THEN 1 ELSE 0 END), 0) as availableTables',
      ])
      .where('t.tenantId = :tenantId', { tenantId })
      .andWhere('t.propertyId = :propertyId', { propertyId })
      .andWhere('t.isActive = true')
      .getRawOne();

    // 4. Active Kitchen Orders (Real KOT Count)
    const activeKots = await kotRepo
      .createQueryBuilder('k')
      .where('k.tenantId = :tenantId', { tenantId })
      .andWhere('k.propertyId = :propertyId', { propertyId })
      .andWhere('k.status IN (:...statuses)', {
        statuses: [KOTStatus.PENDING, KOTStatus.IN_PREPARATION],
      })
      .getCount();

    return {
      revenue: {
        todayTotal: Number(paymentStats?.totalRevenue || 0),
        cashSales: Number(paymentStats?.cashSales || 0),
        cardSales: Number(paymentStats?.cardSales || 0),
        transactionCount: Number(paymentStats?.paymentCount || 0),
      },
      orders: {
        todayTotal: Number(orderStats?.todayOrders || 0),
        completed: Number(orderStats?.completedOrders || 0),
        active: Number(orderStats?.activeOrders || 0),
        cancelled: Number(orderStats?.cancelledOrders || 0),
      },
      tables: {
        total: Number(tableStats?.totalTables || 0),
        occupied: Number(tableStats?.occupiedTables || 0),
        billed: Number(tableStats?.billedTables || 0),
        available: Number(tableStats?.availableTables || 0),
        occupancyRate:
          tableStats?.totalTables > 0
            ? Math.round(
                ((Number(tableStats?.occupiedTables) + Number(tableStats?.billedTables)) /
                  Number(tableStats?.totalTables)) *
                  100,
              )
            : 0,
      },
      kitchen: {
        activeKots,
      },
    };
  }

  async getRecentOrders(tenantId: string, propertyId: string) {
    if (!tenantId) return [];

    const orders = await this.dataSource.getRepository(Order).find({
      where: { tenantId, propertyId },
      relations: { items: true },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return orders;
  }

  async getTopProducts(tenantId: string, propertyId: string) {
    if (!tenantId) return [];

    const topProducts = await this.dataSource
      .createQueryBuilder()
      .select('oi.productName', 'name')
      .addSelect('SUM(oi.quantity)', 'unitsSold')
      .addSelect('SUM(oi.totalAmount)', 'revenue')
      .from('order_items', 'oi')
      .innerJoin('orders', 'o', 'o.id = oi.orderId')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.propertyId = :propertyId', { propertyId })
      .andWhere('o.status = :status', { status: OrderStatus.PAID })
      .groupBy('oi.productName')
      .orderBy('unitsSold', 'DESC')
      .limit(5)
      .getRawMany();

    return topProducts.map((p) => ({
      name: p.name,
      unitsSold: Number(p.unitsSold || 0),
      revenue: Number(p.revenue || 0),
    }));
  }

  async getLiveTables(tenantId: string, propertyId: string) {
    if (!tenantId) return [];

    return this.dataSource.getRepository(DiningTable).find({
      where: { tenantId, propertyId, isActive: true },
      order: { tableNumber: 'ASC' },
    });
  }
}
