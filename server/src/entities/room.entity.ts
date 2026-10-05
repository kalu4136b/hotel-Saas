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
import { RoomType } from './room-type.entity';

export enum RoomStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  MAINTENANCE = 'MAINTENANCE',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
}

export enum CleanlinessStatus {
  CLEAN = 'CLEAN',
  DIRTY = 'DIRTY',
  IN_CLEANING = 'IN_CLEANING',
  INSPECTED = 'INSPECTED',
}

@Entity('rooms')
@Index(['tenantId', 'propertyId'])
@Index(['propertyId', 'roomNumber'], { unique: true })
export class Room {
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

  @Column({ name: 'room_type_id' })
  roomTypeId: string;

  @ManyToOne(() => RoomType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'room_type_id' })
  roomType: RoomType;

  @Column({ name: 'room_number', length: 20 })
  roomNumber: string;

  @Column({ type: 'int', default: 1 })
  floor: number;

  @Column({
    type: 'enum',
    enum: RoomStatus,
    default: RoomStatus.AVAILABLE,
  })
  status: RoomStatus;

  @Column({
    name: 'cleanliness_status',
    type: 'enum',
    enum: CleanlinessStatus,
    default: CleanlinessStatus.CLEAN,
  })
  cleanlinessStatus: CleanlinessStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
