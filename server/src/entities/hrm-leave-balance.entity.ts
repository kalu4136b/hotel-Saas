import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { HrmEmployee } from './hrm-employee.entity';
import { HrmLeaveType } from './hrm-leave-type.entity';

@Entity('hrm_leave_balances')
@Index(['tenantId', 'propertyId'])
@Index(
  ['tenantId', 'propertyId', 'employeeId', 'leaveTypeId', 'leaveYear'],
  { unique: true },
)
export class HrmLeaveBalance {
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

  @ManyToOne(() => HrmEmployee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: HrmEmployee;

  @Column({ type: 'varchar', length: 36 })
  leaveTypeId: string;

  @ManyToOne(() => HrmLeaveType, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leaveTypeId' })
  leaveType: HrmLeaveType;

  @Column({ type: 'int' })
  leaveYear: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  allocatedDays: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  carriedForwardDays: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  accruedDays: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  usedDays: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  pendingDays: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  adjustedDays: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  availableDays: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

