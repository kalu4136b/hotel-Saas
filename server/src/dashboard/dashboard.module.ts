import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Order } from '../entities/order.entity';
import { Payment } from '../entities/payment.entity';
import { DiningTable } from '../entities/dining-table.entity';
import { KOT } from '../entities/kot.entity';
import { Product } from '../entities/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Payment, DiningTable, KOT, Product])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
