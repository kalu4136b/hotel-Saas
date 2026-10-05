import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import {
  Tenant,
  Property,
  User,
  POSOutlet,
  Room,
  Order,
  AuditLog,
} from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      Property,
      User,
      POSOutlet,
      Room,
      Order,
      AuditLog,
    ]),
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}
