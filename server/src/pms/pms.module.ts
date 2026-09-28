import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PmsService } from './pms.service';
import { PmsController } from './pms.controller';
import {
  RoomType,
  Room,
  Guest,
  Reservation,
  GuestFolio,
  FolioItem,
  FolioPayment,
  AuditLog,
  Property,
} from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RoomType,
      Room,
      Guest,
      Reservation,
      GuestFolio,
      FolioItem,
      FolioPayment,
      AuditLog,
      Property,
    ]),
  ],
  controllers: [PmsController],
  providers: [PmsService],
  exports: [PmsService],
})
export class PmsModule {}
