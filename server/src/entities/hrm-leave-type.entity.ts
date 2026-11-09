import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { LeaveType } from './hrm.enums';

@Entity('hrm_leave_types')
@Index(['tenantId', 'propertyId'])
@Index(['tenantId', 'propertyId', 'code'], { unique: true })
export class HrmLeaveType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  tenantId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  propertyId: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 40 })
  code: string;

  @Column({
    type: 'enum',
    enum: LeaveType,
    default: LeaveType.ANNUAL,
  })
  leaveType: LeaveType;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 14 })
  annualAllocation: number;

  @Column({ type: 'boolean', default: false })
  carryForwardAllowed: boolean;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  maximumCarryForward: number;

  @Column({ type: 'boolean', default: true })
  requiresApproval: boolean;

  @Column({ type: 'boolean', default: false })
  requiresDocument: boolean;

  @Column({ type: 'boolean', default: true })
  paidLeave: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

