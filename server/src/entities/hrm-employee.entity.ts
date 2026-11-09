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
import { EmploymentType, EmployeeStatus, Gender } from './hrm.enums';
import { HrmDepartment } from './hrm-department.entity';
import { HrmDesignation } from './hrm-designation.entity';

@Entity('hrm_employees')
@Index(['tenantId', 'propertyId'])
@Index(['tenantId', 'propertyId', 'employeeCode'], { unique: true })
@Index(['tenantId', 'propertyId', 'departmentId'])
export class HrmEmployee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  tenantId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  propertyId: string;

  @Column({ type: 'varchar', length: 50 })
  employeeCode: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 200 })
  fullName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  profileImage: string | null;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: string | null;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender: Gender | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  nationality: string | null;

  @Column({ type: 'text', nullable: true })
  nicNumber: string | null;

  @Column({ type: 'text', nullable: true })
  passportNumber: string | null;

  // CONTACT
  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  alternativePhone: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  emergencyContactName: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  emergencyContactRelationship: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  emergencyContactPhone: string | null;

  // EMPLOYMENT
  @Column({ type: 'varchar', length: 36 })
  departmentId: string;

  @ManyToOne(() => HrmDepartment, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'departmentId' })
  department: HrmDepartment;

  @Column({ type: 'varchar', length: 36 })
  designationId: string;

  @ManyToOne(() => HrmDesignation, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'designationId' })
  designation: HrmDesignation;

  @Column({
    type: 'enum',
    enum: EmploymentType,
    default: EmploymentType.FULL_TIME,
  })
  employmentType: EmploymentType;

  @Column({
    type: 'enum',
    enum: EmployeeStatus,
    default: EmployeeStatus.ACTIVE,
  })
  employeeStatus: EmployeeStatus;

  @Column({ type: 'date' })
  joinDate: string;

  @Column({ type: 'date', nullable: true })
  probationEndDate: string | null;

  @Column({ type: 'date', nullable: true })
  confirmationDate: string | null;

  @Column({ type: 'date', nullable: true })
  terminationDate: string | null;

  @Column({ type: 'date', nullable: true })
  resignationDate: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  reportingManagerId: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  basicSalary: number;

  @Column({ type: 'varchar', length: 10, default: 'LKR' })
  salaryCurrency: string;

  @Column({ type: 'boolean', default: true })
  payrollEligible: boolean;

  @Column({ type: 'boolean', default: true })
  serviceChargeEligible: boolean;

  @Column({ type: 'boolean', default: true })
  overtimeEligible: boolean;

  // BANKING
  @Column({ type: 'varchar', length: 120, nullable: true })
  bankName: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  bankBranch: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  bankAccountName: string | null;

  @Column({ type: 'text', nullable: true })
  bankAccountNumber: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  bankCode: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  branchCode: string | null;

  // ADDITIONAL
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

