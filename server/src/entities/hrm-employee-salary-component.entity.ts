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
import { HrmSalaryComponent } from './hrm-salary-component.entity';

@Entity('hrm_employee_salary_components')
@Index(['tenantId', 'propertyId', 'employeeId'])
export class HrmEmployeeSalaryComponent {
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
  salaryComponentId: string;

  @ManyToOne(() => HrmSalaryComponent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'salaryComponentId' })
  salaryComponent: HrmSalaryComponent;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'varchar', length: 30, default: 'FIXED' })
  calculationMethod: string;

  @Column({ type: 'date' })
  effectiveFrom: string;

  @Column({ type: 'date', nullable: true })
  effectiveTo: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

