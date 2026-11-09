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
import { LeaveRequestStatus } from './hrm.enums';
import { HrmEmployee } from './hrm-employee.entity';
import { HrmLeaveType } from './hrm-leave-type.entity';

@Entity('hrm_leave_requests')
@Index(['tenantId', 'propertyId', 'status'])
@Index(['tenantId', 'propertyId', 'employeeId'])
export class HrmLeaveRequest {
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

  @ManyToOne(() => HrmLeaveType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'leaveTypeId' })
  leaveType: HrmLeaveType;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 1 })
  totalDays: number;

  @Column({ type: 'boolean', default: false })
  isHalfDay: boolean;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  attachmentUrl: string | null;

  @Column({
    type: 'enum',
    enum: LeaveRequestStatus,
    default: LeaveRequestStatus.PENDING,
  })
  status: LeaveRequestStatus;

  @Column({ type: 'timestamp', nullable: true })
  requestedAt: Date | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  approvedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

