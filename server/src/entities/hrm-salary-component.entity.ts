import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { PayrollItemType } from './hrm.enums';

@Entity('hrm_salary_components')
@Index(['tenantId', 'propertyId'])
@Index(['tenantId', 'propertyId', 'code'], { unique: true })
export class HrmSalaryComponent {
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

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({
    type: 'enum',
    enum: PayrollItemType,
    default: PayrollItemType.ALLOWANCE,
  })
  itemType: PayrollItemType;

  @Column({ type: 'varchar', length: 30, default: 'FIXED' })
  calculationMethod: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  defaultAmount: number;

  @Column({ type: 'boolean', default: true })
  isTaxable: boolean;

  @Column({ type: 'boolean', default: true })
  isRecurring: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

