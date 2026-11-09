import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { LeaveBalanceTransactionType } from './hrm.enums';

@Entity('hrm_leave_balance_transactions')
@Index(['tenantId', 'propertyId', 'employeeId'])
@Index(['tenantId', 'propertyId', 'leaveBalanceId'])
export class HrmLeaveBalanceTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  tenantId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  propertyId: string;

  @Column({ type: 'varchar', length: 36 })
  employeeId: string;

  @Column({ type: 'varchar', length: 36 })
  leaveBalanceId: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  leaveRequestId: string | null;

  @Column({
    type: 'enum',
    enum: LeaveBalanceTransactionType,
  })
  transactionType: LeaveBalanceTransactionType;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  days: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

