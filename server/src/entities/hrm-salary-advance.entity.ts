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
import { SalaryAdvanceStatus } from './hrm.enums';
import { HrmEmployee } from './hrm-employee.entity';

@Entity('hrm_salary_advances')
@Index(['tenantId', 'propertyId', 'status'])
@Index(['tenantId', 'propertyId', 'employeeId'])
export class HrmSalaryAdvance {
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

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  requestedAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  approvedAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  remainingAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  repaymentAmount: number;

  @Column({ type: 'date' })
  requestDate: string;

  @Column({ type: 'date', nullable: true })
  approvalDate: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  approvedBy: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({
    type: 'enum',
    enum: SalaryAdvanceStatus,
    default: SalaryAdvanceStatus.PENDING,
  })
  status: SalaryAdvanceStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

