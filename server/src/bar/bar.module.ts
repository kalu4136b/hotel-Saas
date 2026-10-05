import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BarController } from './bar.controller';
import { BarService } from './bar.service';
import { BarItem, BarPourLog } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([BarItem, BarPourLog])],
  controllers: [BarController],
  providers: [BarService],
  exports: [BarService],
})
export class BarModule {}
