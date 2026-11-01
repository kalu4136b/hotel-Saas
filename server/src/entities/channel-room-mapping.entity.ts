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
import { ChannelConnection } from './channel-connection.entity';
import { RoomType } from './room-type.entity';

@Entity('channel_room_mappings')
@Index(['connectionId', 'roomTypeId'], { unique: true })
@Index(['connectionId', 'externalRoomId'])
export class ChannelRoomMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'connection_id' })
  connectionId: string;

  @ManyToOne(() => ChannelConnection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'connection_id' })
  connection: ChannelConnection;

  @Column({ name: 'room_type_id' })
  roomTypeId: string;

  @ManyToOne(() => RoomType, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_type_id' })
  roomType: RoomType;

  @Column({ name: 'external_room_id', length: 150 })
  externalRoomId: string;

  @Column({ name: 'external_room_name', length: 180, default: '' })
  externalRoomName: string;

  @Column({ name: 'external_max_occupancy', type: 'int', default: 2 })
  externalMaxOccupancy: number;

  @Column({ name: 'sync_availability', type: 'boolean', default: true })
  syncAvailability: boolean;

  @Column({ name: 'sync_rates', type: 'boolean', default: true })
  syncRates: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
