import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import {
  PayrollStatus,
  PayrollItemType,
  PayrollPaymentMethod,
} from './hrm.enums';
import { HrmEmployee } from './hrm-employee.entity';

@Entity('hrm_payroll_runs')
@Index(['tenantId', 'propertyId'])
@Index(['tenantId', 'propertyId', 'payPeriodYear', 'payPeriodMonth'], {
  unique: true,
})
export class HrmPayrollRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  tenantId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  propertyId: string;

  @Column({ type: 'varchar', length: 50 })
  runCode: string;

  @Column({ type: 'int' })
  payPeriodMonth: number;

  @Column({ type: 'int' })
  payPeriodYear: number;

  @Column({ type: 'date' })
  periodStartDate: string;

  @Column({ type: 'date' })
  periodEndDate: string;

  @Column({
    type: 'enum',
    enum: PayrollStatus,
    default: PayrollStatus.DRAFT,
  })
  status: PayrollStatus;

  @Column({ type: 'int', default: 0 })
  employeeCount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalBasicSalary: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalAllowances: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalOvertime: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  serviceChargePoolTotal: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalGrossPay: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalDeductions: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalEmployeeEpf: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalEmployerEpf: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalEmployerEtf: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalNetPay: number;

  @Column({ type: 'varchar', length: 36, nullable: true })
  generatedBy: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  approvedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => HrmPayslip, (payslip) => payslip.payrollRun)
  payslips: HrmPayslip[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('hrm_payslips')
@Index(['tenantId', 'propertyId', 'payrollRunId'])
@Index(['tenantId', 'propertyId', 'employeeId'])
export class HrmPayslip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  tenantId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  propertyId: string;

  @Column({ type: 'varchar', length: 36 })
  payrollRunId: string;

  @ManyToOne(() => HrmPayrollRun, (run) => run.payslips, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'payrollRunId' })
  payrollRun: HrmPayrollRun;

  @Column({ type: 'varchar', length: 36 })
  employeeId: string;

  @ManyToOne(() => HrmEmployee, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'employeeId' })
  employee: HrmEmployee;

  @Column({ type: 'varchar', length: 60 })
  payslipNumber: string;

  @Column({ type: 'int' })
  payPeriodMonth: number;

  @Column({ type: 'int' })
  payPeriodYear: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 26 })
  workingDays: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 26 })
  presentDays: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  noPayDays: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  overtimeHours: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  basicSalary: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  allowancesTotal: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  overtimeAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  serviceChargeShare: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  grossPay: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  noPayDeduction: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  salaryAdvanceDeduction: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  employeeEpfAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  otherDeductions: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalDeductions: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  employerEpfAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  employerEtfAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  netPay: number;

  @Column({
    type: 'enum',
    enum: PayrollPaymentMethod,
    default: PayrollPaymentMethod.BANK_TRANSFER,
  })
  paymentMethod: PayrollPaymentMethod;

  @Column({
    type: 'enum',
    enum: PayrollStatus,
    default: PayrollStatus.DRAFT,
  })
  status: PayrollStatus;

  @OneToMany(() => HrmPayslipItem, (item) => item.payslip)
  items: HrmPayslipItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('hrm_payslip_items')
@Index(['tenantId', 'propertyId', 'payslipId'])
export class HrmPayslipItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  tenantId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  propertyId: string;

  @Column({ type: 'varchar', length: 36 })
  payslipId: string;

  @ManyToOne(() => HrmPayslip, (payslip) => payslip.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'payslipId' })
  payslip: HrmPayslip;

  @Column({
    type: 'enum',
    enum: PayrollItemType,
  })
  itemType: PayrollItemType;

  @Column({ type: 'varchar', length: 140 })
  label: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'boolean', default: false })
  isDeduction: boolean;

  @Column({ type: 'boolean', default: false })
  isEmployerContribution: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

