import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PosModule } from './pos/pos.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { PmsModule } from './pms/pms.module';
import {
  Tenant,
  Property,
  User,
  POSOutlet,
  DiningTable,
  Category,
  Product,
  POSShift,
  Order,
  OrderItem,
  KOT,
  KOTItem,
  Bill,
  Payment,
  AuditLog,
  RoomType,
  Room,
  Guest,
  Reservation,
  GuestFolio,
  FolioItem,
  FolioPayment,
} from './entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'hotel_saas',
      entities: [
        Tenant,
        Property,
        User,
        POSOutlet,
        DiningTable,
        Category,
        Product,
        POSShift,
        Order,
        OrderItem,
        KOT,
        KOTItem,
        Bill,
        Payment,
        AuditLog,
        RoomType,
        Room,
        Guest,
        Reservation,
        GuestFolio,
        FolioItem,
        FolioPayment,
      ],
      synchronize: true,
      logging: ['error', 'warn'],
    }),
    AuthModule,
    DashboardModule,
    PosModule,
    ReportsModule,
    SettingsModule,
    PmsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
