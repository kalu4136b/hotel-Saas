import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  InventoryItem,
  RecipeItem,
  StockMovement,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  Product,
} from '../entities';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryItem,
      RecipeItem,
      StockMovement,
      Supplier,
      PurchaseOrder,
      PurchaseOrderItem,
      Product,
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
