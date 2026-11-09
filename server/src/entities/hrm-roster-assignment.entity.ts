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
import { HrmDepartment } from './hrm-department.entity';
import { HrmShiftTemplate } from './hrm-shift-template.entity';

@Entity('hrm_roster_assignments')
@Index(['tenantId', 'propertyId', 'dutyDate'])
@Index(['tenantId', 'propertyId', 'employeeId', 'dutyDate'])
export class HrmRosterAssignment {
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
  departmentId: string;

  @ManyToOne(() => HrmDepartment, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'departmentId' })
  department: HrmDepartment;

  @Column({ type: 'varchar', length: 36 })
  shiftTemplateId: string;

  @ManyToOne(() => HrmShiftTemplate, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'shiftTemplateId' })
  shiftTemplate: HrmShiftTemplate;

  @Column({ type: 'date' })
  dutyDate: string;

  @Column({ type: 'datetime' })
  startDateTime: Date;

  @Column({ type: 'datetime' })
  endDateTime: Date;

  @Column({ type: 'varchar', length: 30, default: 'SCHEDULED' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  assignedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

