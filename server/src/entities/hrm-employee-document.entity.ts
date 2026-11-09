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
import { EmployeeDocumentType } from './hrm.enums';
import { HrmEmployee } from './hrm-employee.entity';

@Entity('hrm_employee_documents')
@Index(['tenantId', 'propertyId'])
@Index(['tenantId', 'propertyId', 'employeeId'])
export class HrmEmployeeDocument {
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

  @Column({
    type: 'enum',
    enum: EmployeeDocumentType,
    default: EmployeeDocumentType.OTHER,
  })
  documentType: EmployeeDocumentType;

  @Column({ type: 'varchar', length: 160 })
  title: string;

  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @Column({ type: 'varchar', length: 500 })
  fileUrl: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ type: 'int', default: 0 })
  fileSize: number;

  @Column({ type: 'date', nullable: true })
  expiryDate: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  uploadedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

