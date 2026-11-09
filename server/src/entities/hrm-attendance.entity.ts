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
import { AttendanceStatus, AttendanceSource } from './hrm.enums';
import { HrmEmployee } from './hrm-employee.entity';

@Entity('hrm_attendance')
@Index(['tenantId', 'propertyId', 'attendanceDate'])
@Index(['tenantId', 'propertyId', 'employeeId', 'attendanceDate'])
export class HrmAttendance {
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

  @Column({ type: 'varchar', length: 36, nullable: true })
  rosterAssignmentId: string | null;

  @Column({ type: 'date' })
  attendanceDate: string;

  @Column({ type: 'datetime', nullable: true })
  checkIn: Date | null;

  @Column({ type: 'datetime', nullable: true })
  checkOut: Date | null;

  @Column({ type: 'datetime', nullable: true })
  scheduledStart: Date | null;

  @Column({ type: 'datetime', nullable: true })
  scheduledEnd: Date | null;

  @Column({ type: 'int', default: 0 })
  workedMinutes: number;

  @Column({ type: 'int', default: 0 })
  breakMinutes: number;

  @Column({ type: 'int', default: 0 })
  lateMinutes: number;

  @Column({ type: 'int', default: 0 })
  overtimeMinutes: number;

  @Column({
    type: 'enum',
    enum: AttendanceStatus,
    default: AttendanceStatus.PRESENT,
  })
  status: AttendanceStatus;

  @Column({
    type: 'enum',
    enum: AttendanceSource,
    default: AttendanceSource.MANUAL,
  })
  source: AttendanceSource;

  @Column({ type: 'boolean', default: false })
  isRegularized: boolean;

  @Column({ type: 'text', nullable: true })
  regularizationReason: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  regularizedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  regularizedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

