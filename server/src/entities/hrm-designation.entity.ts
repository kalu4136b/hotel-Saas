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
import { DepartmentStatus } from './hrm.enums';
import { HrmDepartment } from './hrm-department.entity';

@Entity('hrm_designations')
@Index(['tenantId', 'propertyId'])
@Index(['tenantId', 'propertyId', 'code'], { unique: true })
export class HrmDesignation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  tenantId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  propertyId: string;

  @Column({ type: 'varchar', length: 36 })
  departmentId: string;

  @ManyToOne(() => HrmDepartment, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'departmentId' })
  department: HrmDepartment;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 40 })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: DepartmentStatus,
    default: DepartmentStatus.ACTIVE,
  })
  status: DepartmentStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

