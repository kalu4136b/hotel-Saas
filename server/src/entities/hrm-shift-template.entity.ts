import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ShiftType } from './hrm.enums';

@Entity('hrm_shift_templates')
@Index(['tenantId', 'propertyId'])
export class HrmShiftTemplate {
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

  @Column({
    type: 'enum',
    enum: ShiftType,
    default: ShiftType.MORNING,
  })
  shiftType: ShiftType;

  @Column({ type: 'varchar', length: 10 })
  startTime: string;

  @Column({ type: 'varchar', length: 10 })
  endTime: string;

  @Column({ type: 'int', default: 30 })
  breakDurationMinutes: number;

  @Column({ type: 'int', default: 480 })
  expectedWorkingMinutes: number;

  @Column({ type: 'varchar', length: 25, default: '#00C48C' })
  color: string;

  @Column({ type: 'boolean', default: false })
  isOvernight: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

