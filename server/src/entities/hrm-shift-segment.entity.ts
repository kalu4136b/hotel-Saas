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
import { HrmShiftTemplate } from './hrm-shift-template.entity';

@Entity('hrm_shift_segments')
@Index(['tenantId', 'propertyId', 'shiftTemplateId'])
export class HrmShiftSegment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  tenantId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  propertyId: string;

  @Column({ type: 'varchar', length: 36 })
  shiftTemplateId: string;

  @ManyToOne(() => HrmShiftTemplate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shiftTemplateId' })
  shiftTemplate: HrmShiftTemplate;

  @Column({ type: 'int', default: 1 })
  sequence: number;

  @Column({ type: 'varchar', length: 10 })
  startTime: string;

  @Column({ type: 'varchar', length: 10 })
  endTime: string;

  @Column({ type: 'int', default: 0 })
  breakDurationMinutes: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

