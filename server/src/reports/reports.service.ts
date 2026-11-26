import { Injectable } from '@nestjs/common';
import { Order, OrderStatus } from '../entities/order.entity';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { TenantConnectionManager } from '../database/tenant-connection-manager.service';

@Injectable()
export class ReportsService {
  constructor(private readonly tenantConn: TenantConnectionManager) {}

  // 1. Daily Sales Summary Report
  async getDailySalesReport(
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
      .getRepository(Order)
      .createQueryBuilder('o')
      .select([
        'DATE(o.createdAt) as reportDate',
        'COUNT(o.id) as totalOrders',
        'COALESCE(SUM(CASE WHEN o.status = "PAID" THEN 1 ELSE 0 END), 0) as paidOrders',
        'COALESCE(SUM(CASE WHEN o.status = "PAID" THEN o.subtotal ELSE 0 END), 0) as grossSales',
        'COALESCE(SUM(CASE WHEN o.status = "PAID" THEN o.discountAmount ELSE 0 END), 0) as totalDiscounts',
        'COALESCE(SUM(CASE WHEN o.status = "PAID" THEN o.taxAmount ELSE 0 END), 0) as totalTaxes',
        'COALESCE(SUM(CASE WHEN o.status = "PAID" THEN o.totalAmount ELSE 0 END), 0) as netRevenue',
      ])
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.propertyId = :propertyId', { propertyId });

    if (startDate) {
      qb.andWhere('DATE(o.createdAt) >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('DATE(o.createdAt) <= :endDate', { endDate });
    }

    const rows = await qb
      .groupBy('DATE(o.createdAt)')
      .orderBy('reportDate', 'DESC')
      .getRawMany();

    return rows.map((r) => ({
      date: r.reportDate,
      totalOrders: Number(r.totalOrders || 0),
      paidOrders: Number(r.paidOrders || 0),
      grossSales: Number(r.grossSales || 0),
      totalDiscounts: Number(r.totalDiscounts || 0),
      totalTaxes: Number(r.totalTaxes || 0),
      netRevenue: Number(r.netRevenue || 0),
    }));
  }

  // 2. Payment Method Reconciliation Report
  async getPaymentMethodReport(
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
      .getRepository(Payment)
      .createQueryBuilder('p')
      .select([
        'p.paymentMethod as method',
        'COUNT(p.id) as transactionCount',
        'COALESCE(SUM(p.amountPaid), 0) as totalAmount',
        'COALESCE(SUM(p.changeGiven), 0) as totalChange',
      ])
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.propertyId = :propertyId', { propertyId })
      .andWhere('p.status = :status', { status: PaymentStatus.COMPLETED });

    if (startDate) {
      qb.andWhere('DATE(p.createdAt) >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('DATE(p.createdAt) <= :endDate', { endDate });
    }

    const rows = await qb
      .groupBy('p.paymentMethod')
      .orderBy('totalAmount', 'DESC')
      .getRawMany();

    return rows.map((r) => ({
      method: r.method,
      transactionCount: Number(r.transactionCount || 0),
      totalAmount: Number(r.totalAmount || 0),
      totalChange: Number(r.totalChange || 0),
    }));
  }

  // 3. Product & Category Item Sales Performance Report
  async getItemSalesReport(
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
      .createQueryBuilder()
      .select('oi.productName', 'productName')
      .addSelect('COALESCE(c.name, "Uncategorized")', 'categoryName')
      .addSelect('SUM(oi.quantity)', 'unitsSold')
      .addSelect('SUM(oi.totalAmount)', 'totalRevenue')
      .addSelect('AVG(oi.unitPrice)', 'avgPrice')
      .from('order_items', 'oi')
      .innerJoin('orders', 'o', 'o.id = oi.orderId')
      .leftJoin('products', 'p', 'p.id = oi.productId AND p.tenantId = o.tenantId')
      .leftJoin('categories', 'c', 'c.id = p.categoryId AND c.tenantId = o.tenantId')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.propertyId = :propertyId', { propertyId })
      .andWhere('o.status = :status', { status: OrderStatus.PAID });

    if (startDate) {
      qb.andWhere('DATE(o.createdAt) >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('DATE(o.createdAt) <= :endDate', { endDate });
    }

    const rows = await qb
      .groupBy('oi.productName')
      .addGroupBy('c.name')
      .orderBy('unitsSold', 'DESC')
      .getRawMany();

    return rows.map((r) => ({
      productName: r.productName,
      categoryName: r.categoryName,
      unitsSold: Number(r.unitsSold || 0),
      totalRevenue: Number(r.totalRevenue || 0),
      avgPrice: Number(r.avgPrice || 0),
    }));
  }

  // 4. Void & Cancellation Audit Report
  async getCancellationReport(
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
      .getRepository(Order)
      .createQueryBuilder('o')
      .select([
        'o.id as id',
        'o.orderNumber as orderNumber',
        'o.tableNumber as tableNumber',
        'o.totalAmount as totalAmount',
        'o.cancellationReason as reason',
        'o.createdAt as createdAt',
        'o.updatedAt as cancelledAt',
      ])
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.propertyId = :propertyId', { propertyId })
      .andWhere('o.status = :status', { status: OrderStatus.CANCELLED });

    if (startDate) {
      qb.andWhere('DATE(o.createdAt) >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('DATE(o.createdAt) <= :endDate', { endDate });
    }

    const rows = await qb.orderBy('o.updatedAt', 'DESC').getRawMany();

    return rows.map((r) => ({
      id: r.id,
      orderNumber: r.orderNumber,
      tableNumber: r.tableNumber || 'Walk-in',
      totalAmount: Number(r.totalAmount || 0),
      reason: r.reason || 'Not specified',
      createdAt: r.createdAt,
      cancelledAt: r.cancelledAt,
    }));
  }
}
