import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ServiceChargeDistributionMethod } from './hrm.enums';

@Entity('hrm_payroll_settings')
@Index(['tenantId', 'propertyId'], { unique: true })
export class HrmPayrollSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  tenantId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  propertyId: string;

  @Column({ type: 'varchar', length: 10, default: 'LKR' })
  currency: string;

  @Column({ type: 'varchar', length: 30, default: 'MONTHLY' })
  payrollFrequency: string;

  @Column({ type: 'int', default: 25 })
  payrollCutoffDay: number;

  @Column({ type: 'int', default: 28 })
  payrollPaymentDay: number;

  @Column({ type: 'int', default: 26 })
  standardWorkingDaysPerMonth: number;

  @Column({ type: 'int', default: 8 })
  standardWorkingHoursPerDay: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.5 })
  overtimeMultiplier: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 2.0 })
  holidayOvertimeMultiplier: number;

  @Column({ type: 'int', default: 15 })
  lateGracePeriodMinutes: number;

  @Column({ type: 'boolean', default: false })
  lateDeductionEnabled: boolean;

  @Column({ type: 'varchar', length: 40, default: 'WORKING_DAYS' })
  noPayDeductionMethod: string;

  @Column({ type: 'boolean', default: true })
  serviceChargeEnabled: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10.0 })
  serviceChargePoolPercentage: number;

  @Column({
    type: 'enum',
    enum: ServiceChargeDistributionMethod,
    default: ServiceChargeDistributionMethod.EQUAL,
  })
  serviceChargeDistributionMethod: ServiceChargeDistributionMethod;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 8.0 })
  employeeEpfPercentage: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 12.0 })
  employerEpfPercentage: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 3.0 })
  employerEtfPercentage: number;

  @Column({ type: 'int', default: 2 })
  roundingPrecision: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

