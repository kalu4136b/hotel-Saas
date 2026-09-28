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

@Entity('room_types')
@Index(['tenantId', 'propertyId'])
export class RoomType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'property_id' })
  propertyId: string;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 50, nullable: true })
  code: string;

  @Column({
    name: 'base_price_per_night',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 150.0,
  })
  basePricePerNight: number;

  @Column({ name: 'max_occupancy', type: 'int', default: 2 })
  maxOccupancy: number;

  @Column({ name: 'bed_type', length: 50, default: 'King Bed' })
  bedType: string;

  @Column({ type: 'text', nullable: true })
  amenities: string; // JSON string array or comma separated e.g. "Ocean View, Balcony, Jacuzzi, Free WiFi"

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
