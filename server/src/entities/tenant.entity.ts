import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

export enum SubscriptionTier {
  STARTER = 'STARTER',
  BUSINESS = 'BUSINESS',
  LUXURY = 'LUXURY',
  ENTERPRISE = 'ENTERPRISE',
}

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.ACTIVE,
  })
  status: TenantStatus;

  @Column({
    type: 'enum',
    enum: SubscriptionTier,
    default: SubscriptionTier.STARTER,
  })
  subscriptionTier: SubscriptionTier;

  @Column({ type: 'simple-json', nullable: true })
  modules: string[];

  @Column({ type: 'varchar', length: 50, default: 'CUSTOM' })
  subscriptionPlan: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  planPrice: number;

  @Column({ type: 'varchar', length: 20, default: 'MONTHLY' })
  billingCycle: 'MONTHLY' | 'ANNUAL' | 'LIFETIME';

  @Column({ type: 'int', nullable: true })
  maxRooms: number;

  @Column({ type: 'int', nullable: true })
  maxStaff: number;

  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'SHARED',
  })
  storageMode: 'SHARED' | 'DEDICATED';

  @Column({ type: 'varchar', length: 150, nullable: true })
  dbHost: string | null;

  @Column({ type: 'int', default: 3306 })
  dbPort: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  dbDatabaseName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  dbUsername: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  dbPassword: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
