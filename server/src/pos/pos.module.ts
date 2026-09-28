import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';
import { Category } from '../entities/category.entity';
import { Product } from '../entities/product.entity';
import { DiningTable } from '../entities/dining-table.entity';
import { POSShift } from '../entities/pos-shift.entity';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { KOT } from '../entities/kot.entity';
import { KOTItem } from '../entities/kot-item.entity';
import { Bill } from '../entities/bill.entity';
import { Payment } from '../entities/payment.entity';
import { Property } from '../entities/property.entity';
import { AuditLog } from '../entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      Product,
      DiningTable,
      POSShift,
      Order,
      OrderItem,
      KOT,
      KOTItem,
      Bill,
      Payment,
      Property,
      AuditLog,
    ]),
  ],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}
