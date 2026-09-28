import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Category } from '../entities/category.entity';
import { Product } from '../entities/product.entity';
import { DiningTable, TableStatus } from '../entities/dining-table.entity';
import { POSShift, ShiftStatus } from '../entities/pos-shift.entity';
import { Order, OrderStatus, OrderType } from '../entities/order.entity';
import { OrderItem, OrderItemStatus } from '../entities/order-item.entity';
import { KOT } from '../entities/kot.entity';
import { KOTStatus } from '../entities/kot-status.enum';
import { KOTItem } from '../entities/kot-item.entity';
import { Bill, BillStatus } from '../entities/bill.entity';
import { Payment, PaymentMethod, PaymentStatus } from '../entities/payment.entity';
import { Property } from '../entities/property.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { Reservation, ReservationStatus } from '../entities/reservation.entity';
import { GuestFolio, FolioStatus } from '../entities/guest-folio.entity';
import { FolioItem, FolioChargeType } from '../entities/folio-item.entity';
import { Room } from '../entities/room.entity';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class PosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // ================= MASTER DATA =================
  async getCategories(tenantId: string, propertyId: string) {
    return this.dataSource.getRepository(Category).find({
      where: { tenantId, propertyId, isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async getProducts(tenantId: string, propertyId: string, categoryId?: string) {
    const where: any = { tenantId, propertyId, isActive: true };
    if (categoryId) {
      where.categoryId = categoryId;
    }

    return this.dataSource.getRepository(Product).find({
      where,
      relations: { category: true },
      order: { name: 'ASC' },
    });
  }

  async getTables(tenantId: string, propertyId: string) {
    return this.dataSource.getRepository(DiningTable).find({
      where: { tenantId, propertyId, isActive: true },
      order: { tableNumber: 'ASC' },
    });
  }

  // 1. Create Dining Table
  async createTable(
    tenantId: string,
    propertyId: string,
    dto: { tableNumber: string; capacity?: number },
  ) {
    const tableRepo = this.dataSource.getRepository(DiningTable);
    const existing = await tableRepo.findOne({
      where: { propertyId, tableNumber: dto.tableNumber.trim(), isActive: true },
    });
    if (existing) {
      throw new ConflictException(`Table ${dto.tableNumber} already exists`);
    }

    const table = tableRepo.create({
      tenantId,
      propertyId,
      tableNumber: dto.tableNumber.trim(),
      capacity: Number(dto.capacity) || 4,
      status: TableStatus.AVAILABLE,
      isActive: true,
    });
    return tableRepo.save(table);
  }

  // 2. Delete Dining Table
  async deleteTable(tenantId: string, propertyId: string, tableId: string) {
    const tableRepo = this.dataSource.getRepository(DiningTable);
    const table = await tableRepo.findOne({
      where: { id: tableId, tenantId, propertyId },
    });
    if (!table) throw new NotFoundException('Table not found');
    if (table.status !== TableStatus.AVAILABLE) {
      throw new BadRequestException('Cannot delete an occupied or billed table');
    }

    table.isActive = false;
    await tableRepo.save(table);
    return { success: true, id: table.id };
  }

  // 3. Create Category
  async createCategory(
    tenantId: string,
    propertyId: string,
    dto: { name: string; description?: string; sortOrder?: number },
  ) {
    const catRepo = this.dataSource.getRepository(Category);
    const count = await catRepo.count({ where: { propertyId } });
    const category = catRepo.create({
      tenantId,
      propertyId,
      name: dto.name.trim(),
      description: dto.description || undefined,
      sortOrder: Number(dto.sortOrder) || count + 1,
      isActive: true,
    });
    return catRepo.save(category);
  }

  // 4. Create Product / Menu Dish
  async createProduct(
    tenantId: string,
    propertyId: string,
    dto: {
      name: string;
      sku?: string;
      categoryId: string;
      price: number;
      taxRate?: number;
      description?: string;
    },
  ) {
    const prodRepo = this.dataSource.getRepository(Product);
    const count = await prodRepo.count({ where: { propertyId } });
    const sku = dto.sku?.trim() || `DSH-${(100 + count + 1).toString()}`;

    const product = prodRepo.create({
      tenantId,
      propertyId,
      categoryId: dto.categoryId,
      name: dto.name.trim(),
      sku,
      price: Number(dto.price) || 0,
      taxRate: dto.taxRate !== undefined ? Number(dto.taxRate) : 10.0,
      description: dto.description || undefined,
      isActive: true,
    });
    return prodRepo.save(product);
  }

  // 5. Update Product (Toggle Availability or Edit Price)
  async updateProduct(
    tenantId: string,
    propertyId: string,
    productId: string,
    dto: {
      name?: string;
      price?: number;
      isActive?: boolean;
      description?: string;
    },
  ) {
    const prodRepo = this.dataSource.getRepository(Product);
    const product = await prodRepo.findOne({
      where: { id: productId, tenantId, propertyId },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (dto.name !== undefined) product.name = dto.name.trim();
    if (dto.price !== undefined) product.price = Number(dto.price);
    if (dto.isActive !== undefined) product.isActive = Boolean(dto.isActive);
    if (dto.description !== undefined) product.description = dto.description;

    return prodRepo.save(product);
  }

  // 6. Delete Product
  async deleteProduct(tenantId: string, propertyId: string, productId: string) {
    const prodRepo = this.dataSource.getRepository(Product);
    const product = await prodRepo.findOne({
      where: { id: productId, tenantId, propertyId },
    });
    if (!product) throw new NotFoundException('Product not found');

    product.isActive = false;
    await prodRepo.save(product);
    return { success: true, id: product.id };
  }

  // ================= SHIFTS =================
  async getCurrentShift(userId: string, tenantId: string) {
    return this.dataSource.getRepository(POSShift).findOne({
      where: { userId, tenantId, status: ShiftStatus.OPEN },
      order: { openedAt: 'DESC' },
    });
  }

  async openShift(
    userId: string,
    tenantId: string,
    propertyId: string,
    startingFloat: number,
    notes?: string,
  ) {
    const shiftRepo = this.dataSource.getRepository(POSShift);
    const existing = await shiftRepo.findOne({
      where: { userId, tenantId, status: ShiftStatus.OPEN },
    });

    if (existing) {
      throw new BadRequestException('You already have an active open shift');
    }

    const shift = shiftRepo.create({
      userId,
      tenantId,
      propertyId,
      startingFloat: Number(startingFloat) || 0,
      expectedCash: Number(startingFloat) || 0,
      openedAt: new Date(),
      status: ShiftStatus.OPEN,
      notes: notes || undefined,
    });

    return shiftRepo.save(shift);
  }

  async closeShift(
    shiftId: string,
    userId: string,
    tenantId: string,
    actualCashCount: number,
    notes?: string,
  ) {
    const shiftRepo = this.dataSource.getRepository(POSShift);
    const shift = await shiftRepo.findOne({
      where: { id: shiftId, tenantId, status: ShiftStatus.OPEN },
    });

    if (!shift) {
      throw new NotFoundException('Open shift not found');
    }

    // Calculate cash sales processed during this shift
    const cashSalesRaw = await this.dataSource
      .getRepository(Payment)
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amountPaid), 0)', 'totalCash')
      .where('p.shiftId = :shiftId', { shiftId })
      .andWhere('p.paymentMethod = :method', { method: PaymentMethod.CASH })
      .andWhere('p.status = :status', { status: PaymentStatus.COMPLETED })
      .getRawOne();

    const cashSales = Number(cashSalesRaw?.totalCash || 0);
    const expectedCash = Number(shift.startingFloat) + cashSales;
    const actual = Number(actualCashCount);
    const variance = actual - expectedCash;

    shift.closedAt = new Date();
    shift.status = ShiftStatus.CLOSED;
    shift.expectedCash = expectedCash;
    shift.actualCashCount = actual;
    shift.cashVariance = variance;
    if (notes) shift.notes = `${shift.notes ? `${shift.notes} | ` : ''}${notes}`;

    return shiftRepo.save(shift);
  }

  // ================= ORDERS =================
  async getOrders(tenantId: string, propertyId: string, status?: OrderStatus) {
    const where: any = { tenantId, propertyId };
    if (status) where.status = status;

    return this.dataSource.getRepository(Order).find({
      where,
      relations: { items: true },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async getOrder(orderId: string, tenantId: string) {
    const order = await this.dataSource.getRepository(Order).findOne({
      where: { id: orderId, tenantId },
      relations: { items: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async createOrder(
    dto: {
      orderType: OrderType;
      tableId?: string;
      customerName?: string;
      guestCount?: number;
      notes?: string;
      items: Array<{ productId: string; quantity: number; notes?: string }>;
    },
    userId: string,
    tenantId: string,
    propertyId: string,
  ) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Fetch Property tax configuration
      const property = await queryRunner.manager.findOne(Property, {
        where: { id: propertyId, tenantId },
      });
      const taxRate = Number(property?.defaultTaxRate || 10.0);
      const serviceRate = Number(property?.serviceChargeRate || 0.0);

      // 2. Resolve Table if Dine-in
      let tableNumber: string | undefined = undefined;
      if (dto.orderType === OrderType.DINE_IN && dto.tableId) {
        const table = await queryRunner.manager.findOne(DiningTable, {
          where: { id: dto.tableId, tenantId },
        });
        if (!table) throw new NotFoundException('Selected dining table not found');
        if (table.status === TableStatus.OCCUPIED) {
          throw new BadRequestException(`Table ${table.tableNumber} is currently occupied`);
        }
        tableNumber = table.tableNumber;
      }

      // 3. Resolve shift if active
      const activeShift = await queryRunner.manager.findOne(POSShift, {
        where: { userId, tenantId, status: ShiftStatus.OPEN },
      });

      // 4. Resolve Products & Prices from DB (Enforcing Backend Pricing Authority)
      const productIds = dto.items.map((i) => i.productId);
      const products = await queryRunner.manager.find(Product, {
        where: productIds.map((id) => ({ id, tenantId, isActive: true })),
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      let subtotal = 0;
      const orderItemsToSave: OrderItem[] = [];

      for (const itemInput of dto.items) {
        const prod = productMap.get(itemInput.productId);
        if (!prod) {
          throw new BadRequestException(`Product with ID ${itemInput.productId} not found or inactive`);
        }

        const qty = Math.max(1, Number(itemInput.quantity) || 1);
        const itemUnitPrice = Number(prod.price);
        const itemSubtotal = itemUnitPrice * qty;
        subtotal += itemSubtotal;

        const orderItem = queryRunner.manager.create(OrderItem, {
          productId: prod.id,
          productName: prod.name,
          unitPrice: itemUnitPrice,
          quantity: qty,
          subtotal: itemSubtotal,
          discountAmount: 0,
          totalAmount: itemSubtotal,
          notes: itemInput.notes || undefined,
          status: OrderItemStatus.PENDING,
        });

        orderItemsToSave.push(orderItem);
      }

      // 5. Compute Financial Totals on Backend
      const taxAmount = Number(((subtotal * taxRate) / 100).toFixed(2));
      const serviceAmount = Number(((subtotal * serviceRate) / 100).toFixed(2));
      const totalAmount = Number((subtotal + taxAmount + serviceAmount).toFixed(2));

      // Generate human-friendly order number e.g. ORD-2026-1049
      const orderCount = await queryRunner.manager.count(Order, { where: { tenantId } });
      const orderNumber = `ORD-${String(orderCount + 1).padStart(4, '0')}`;

      // 6. Save Order Header
      const order = queryRunner.manager.create(Order, {
        orderNumber,
        tenantId,
        propertyId,
        shiftId: activeShift ? activeShift.id : undefined,
        tableId: dto.tableId || undefined,
        tableNumber,
        createdByUserId: userId,
        orderType: dto.orderType,
        status: OrderStatus.OPEN,
        customerName: dto.customerName || undefined,
        guestCount: dto.guestCount || 1,
        subtotal,
        discountAmount: 0,
        taxAmount,
        serviceChargeAmount: serviceAmount,
        totalAmount,
        notes: dto.notes || undefined,
      });

      const savedOrder = await queryRunner.manager.save(order);

      // Attach and Save Order Items
      for (const item of orderItemsToSave) {
        item.orderId = savedOrder.id;
        await queryRunner.manager.save(item);
      }

      // 7. Update Table status to OCCUPIED if dine-in
      if (dto.orderType === OrderType.DINE_IN && dto.tableId) {
        await queryRunner.manager.update(DiningTable, dto.tableId, {
          status: TableStatus.OCCUPIED,
          currentOrderId: savedOrder.id,
        });
      }

      await queryRunner.commitTransaction();

      savedOrder.items = orderItemsToSave;
      return savedOrder;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ================= KOT (KITCHEN DISPATCH) =================
  async sendToKitchen(orderId: string, tenantId: string, propertyId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId, tenantId },
        relations: { items: true },
      });

      if (!order) throw new NotFoundException('Order not found');
      if (order.status === OrderStatus.PAID || order.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('Cannot send settled or cancelled orders to kitchen');
      }

      // Check pending items to send
      const pendingItems = order.items.filter(
        (i) => i.status === OrderItemStatus.PENDING || i.status === OrderItemStatus.SENT_TO_KITCHEN,
      );

      if (pendingItems.length === 0) {
        throw new BadRequestException('All items have already been dispatched to the kitchen');
      }

      const kotCount = await queryRunner.manager.count(KOT, { where: { tenantId } });
      const kotNumber = `KOT-${String(kotCount + 1).padStart(4, '0')}`;

      const kot = queryRunner.manager.create(KOT, {
        kotNumber,
        tenantId,
        propertyId,
        orderId: order.id,
        tableNumber: order.tableNumber || (order.orderType === OrderType.TAKEAWAY ? 'Takeaway' : 'Walk-in'),
        status: KOTStatus.PENDING,
        notes: order.notes || undefined,
      });

      const savedKot = await queryRunner.manager.save(kot);

      const kotItems: KOTItem[] = [];
      for (const item of pendingItems) {
        const kotItem = queryRunner.manager.create(KOTItem, {
          kotId: savedKot.id,
          orderItemId: item.id,
          productName: item.productName,
          quantity: item.quantity,
          notes: item.notes || undefined,
          status: KOTStatus.PENDING,
        });
        kotItems.push(await queryRunner.manager.save(kotItem));

        // Mark item as sent
        item.status = OrderItemStatus.SENT_TO_KITCHEN;
        await queryRunner.manager.save(item);
      }

      // Update Order Status
      order.status = OrderStatus.KOT_SENT;
      await queryRunner.manager.save(order);

      await queryRunner.commitTransaction();

      savedKot.items = kotItems;
      try {
        this.eventsGateway.notifyNewKot(propertyId, savedKot);
      } catch (err) {
        console.error('Failed to dispatch websocket event for new KOT:', err);
      }
      return savedKot;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getKitchenKots(tenantId: string, propertyId: string) {
    return this.dataSource.getRepository(KOT).find({
      where: {
        tenantId,
        propertyId,
      },
      relations: { items: true },
      order: { createdAt: 'DESC' },
      take: 30,
    });
  }

  async updateKotStatus(kotId: string, status: KOTStatus, tenantId: string) {
    const kotRepo = this.dataSource.getRepository(KOT);
    const kot = await kotRepo.findOne({
      where: { id: kotId, tenantId },
      relations: { items: true },
    });

    if (!kot) throw new NotFoundException('KOT not found');

    kot.status = status;
    const saved = await kotRepo.save(kot);

    // Update associated order status accordingly
    const orderRepo = this.dataSource.getRepository(Order);
    const order = await orderRepo.findOne({ where: { id: kot.orderId } });
    if (order && order.status !== OrderStatus.BILLED && order.status !== OrderStatus.PAID) {
      if (status === KOTStatus.IN_PREPARATION) {
        order.status = OrderStatus.IN_PREPARATION;
      } else if (status === KOTStatus.READY) {
        order.status = OrderStatus.READY;
      }
      await orderRepo.save(order);
    }

    try {
      this.eventsGateway.notifyKotStatusUpdate(saved.propertyId, saved);
    } catch (err) {
      console.error('Failed to dispatch websocket event for KOT status update:', err);
    }

    return saved;
  }

  // ================= BILLING & PAYMENTS =================
  async generateBill(orderId: string, userId: string, tenantId: string, propertyId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId, tenantId },
        relations: { items: true },
      });

      if (!order) throw new NotFoundException('Order not found');
      if (order.status === OrderStatus.PAID) {
        throw new BadRequestException('This order has already been paid in full');
      }

      // Check if bill already exists
      let bill = await queryRunner.manager.findOne(Bill, {
        where: { orderId: order.id, tenantId },
      });

      if (!bill) {
        const billCount = await queryRunner.manager.count(Bill, { where: { tenantId } });
        const billNumber = `INV-${String(billCount + 1).padStart(5, '0')}`;

        bill = queryRunner.manager.create(Bill, {
          billNumber,
          tenantId,
          propertyId,
          orderId: order.id,
          subtotal: order.subtotal,
          discountAmount: order.discountAmount,
          taxAmount: order.taxAmount,
          serviceChargeAmount: order.serviceChargeAmount,
          grandTotal: order.totalAmount,
          generatedByUserId: userId,
          status: BillStatus.UNPAID,
        });

        bill = await queryRunner.manager.save(bill);
      }

      // Lock Order status to BILLED
      order.status = OrderStatus.BILLED;
      await queryRunner.manager.save(order);

      // If dine-in, update table status to BILLED
      if (order.tableId) {
        await queryRunner.manager.update(DiningTable, order.tableId, {
          status: TableStatus.BILLED,
        });
      }

      await queryRunner.commitTransaction();
      return bill;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async settlePayment(
    orderId: string,
    dto: {
      paymentMethod: PaymentMethod;
      amountPaid: number;
      cardLast4?: string;
      transactionRef?: string;
      roomId?: string;
    },
    userId: string,
    tenantId: string,
    propertyId: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId, tenantId },
        relations: { items: true },
      });

      if (!order) throw new NotFoundException('Order not found');
      if (order.status === OrderStatus.PAID) {
        throw new BadRequestException('This order is already settled and paid');
      }

      const activeShift = await queryRunner.manager.findOne(POSShift, {
        where: { userId, tenantId, status: ShiftStatus.OPEN },
      });

      // Ensure bill exists or generate one
      let bill = await queryRunner.manager.findOne(Bill, {
        where: { orderId: order.id, tenantId },
      });

      if (!bill) {
        const billCount = await queryRunner.manager.count(Bill, { where: { tenantId } });
        bill = queryRunner.manager.create(Bill, {
          billNumber: `INV-${String(billCount + 1).padStart(5, '0')}`,
          tenantId,
          propertyId,
          orderId: order.id,
          subtotal: order.subtotal,
          discountAmount: order.discountAmount,
          taxAmount: order.taxAmount,
          serviceChargeAmount: order.serviceChargeAmount,
          grandTotal: order.totalAmount,
          generatedByUserId: userId,
          status: BillStatus.PAID,
        });
        bill = await queryRunner.manager.save(bill);
      } else {
        bill.status = BillStatus.PAID;
        await queryRunner.manager.save(bill);
      }

      const totalDue = Number(order.totalAmount);
      const paid = Number(dto.amountPaid);

      if (dto.paymentMethod === PaymentMethod.CASH && paid < totalDue) {
        throw new BadRequestException(`Amount tendered ($${paid}) is less than total due ($${totalDue})`);
      }

      const changeGiven = dto.paymentMethod === PaymentMethod.CASH ? Number((paid - totalDue).toFixed(2)) : 0;
      let transactionRef = dto.transactionRef;

      // Handle Charge to Room Folio
      if (dto.paymentMethod === PaymentMethod.ROOM_CHARGE) {
        if (!dto.roomId) {
          throw new BadRequestException('Please select an active guest room to charge this order to.');
        }

        const reservation = await queryRunner.manager.findOne(Reservation, {
          where: {
            propertyId,
            roomId: dto.roomId,
            status: ReservationStatus.CHECKED_IN,
          },
          relations: { guest: true, room: true },
        });

        if (!reservation) {
          throw new BadRequestException('No active checked-in guest found in the selected room.');
        }

        const folio = await queryRunner.manager.findOne(GuestFolio, {
          where: { reservationId: reservation.id, status: FolioStatus.OPEN },
        });

        if (!folio) {
          throw new BadRequestException(`No open folio exists for Room ${reservation.room?.roomNumber || dto.roomId}.`);
        }

        // Post charge to folio items
        const folioItem = queryRunner.manager.create(FolioItem, {
          folioId: folio.id,
          chargeType: FolioChargeType.RESTAURANT_POS,
          description: `Restaurant Order #${order.orderNumber} (${order.tableNumber ? 'Table ' + order.tableNumber : 'Takeaway'})`,
          amount: totalDue,
          referenceId: order.orderNumber,
        });
        await queryRunner.manager.save(folioItem);

        // Update folio totals
        folio.totalCharges = Number((Number(folio.totalCharges) + totalDue).toFixed(2));
        folio.balanceDue = Number((Number(folio.balanceDue) + totalDue).toFixed(2));
        await queryRunner.manager.save(folio);

        transactionRef = `Folio #${folio.id.substring(0, 8).toUpperCase()} - Room ${reservation.room?.roomNumber || ''} (${reservation.guest?.fullName || 'Guest'})`;
      }

      const paymentCount = await queryRunner.manager.count(Payment, { where: { tenantId } });
      const receiptNumber = `RCP-${String(paymentCount + 1).padStart(5, '0')}`;

      const payment = queryRunner.manager.create(Payment, {
        receiptNumber,
        tenantId,
        propertyId,
        orderId: order.id,
        billId: bill.id,
        shiftId: activeShift ? activeShift.id : undefined,
        paymentMethod: dto.paymentMethod,
        amountPaid: totalDue,
        changeGiven,
        cardLast4: dto.cardLast4 || undefined,
        transactionRef,
        roomId: dto.roomId || undefined,
        processedByUserId: userId,
        status: PaymentStatus.COMPLETED,
      });

      const savedPayment = await queryRunner.manager.save(payment);

      // Settle Order
      order.status = OrderStatus.PAID;
      await queryRunner.manager.save(order);

      // Release Table back to AVAILABLE
      if (order.tableId) {
        await queryRunner.manager.update(DiningTable, order.tableId, {
          status: TableStatus.AVAILABLE,
          currentOrderId: () => 'NULL',
        });
      }

      // Audit Log Entry
      const audit = queryRunner.manager.create(AuditLog, {
        tenantId,
        propertyId,
        userId,
        action: 'ORDER_PAID',
        entity: 'Payment',
        entityId: savedPayment.id,
        details: JSON.stringify({
          orderNumber: order.orderNumber,
          receiptNumber: savedPayment.receiptNumber,
          amount: totalDue,
          method: dto.paymentMethod,
        }),
      });
      await queryRunner.manager.save(audit);

      await queryRunner.commitTransaction();

      if (dto.paymentMethod === PaymentMethod.ROOM_CHARGE) {
        try {
          this.eventsGateway.notifyFolioUpdate(propertyId, {
            orderNumber: order.orderNumber,
            amount: totalDue,
            roomId: dto.roomId,
          });
        } catch (err) {
          console.error('Failed to dispatch websocket event for folio charge:', err);
        }
      }

      return {
        payment: savedPayment,
        order,
        bill,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ================= CANCELLATIONS =================
  async cancelOrder(orderId: string, reason: string, userId: string, tenantId: string) {
    const orderRepo = this.dataSource.getRepository(Order);
    const order = await orderRepo.findOne({ where: { id: orderId, tenantId } });

    if (!order) throw new NotFoundException('Order not found');
    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException('Paid orders cannot be cancelled');
    }

    order.status = OrderStatus.CANCELLED;
    order.cancellationReason = reason;
    order.cancelledByUserId = userId;
    await orderRepo.save(order);

    // Release Table
    if (order.tableId) {
      await this.dataSource.getRepository(DiningTable).update(order.tableId, {
        status: TableStatus.AVAILABLE,
        currentOrderId: () => 'NULL',
      });
    }

    return order;
  }
}
