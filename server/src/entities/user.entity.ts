import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Property } from './property.entity';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  KITCHEN = 'KITCHEN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36, nullable: true })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Index()
  @Column({ type: 'varchar', length: 36, nullable: true })
  propertyId: string;

  @ManyToOne(() => Property, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @Index()
  @Column({ type: 'varchar', length: 150 })
  email: string;

  @Index()
  @Column({ type: 'varchar', length: 80 })
  username: string;

  @Column({ type: 'varchar', length: 150 })
  fullName: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CASHIER,
  })
  role: UserRole;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  permissions: string[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatarUrl: string;

  @Column({ type: 'datetime', nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
