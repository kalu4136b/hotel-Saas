import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('ai_knowledge_documents')
@Index(['category'])
@Index(['tenantId', 'propertyId'])
export class AiKnowledgeDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId: string | null;

  @Column({ name: 'property_id', type: 'varchar', length: 36, nullable: true })
  propertyId: string | null;

  @Column({ type: 'varchar', length: 60 })
  category: string; // 'PMS', 'POS', 'HOUSEKEEPING', 'INVENTORY', 'BAR', 'CHANNEL_MANAGER', 'HARDWARE', 'SOP'

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'longtext' })
  content: string;

  @Column({ type: 'text', nullable: true })
  keywords: string | null; // Comma-separated or search tokens

  @Column({ type: 'varchar', length: 20, default: 'EN' })
  language: string; // 'EN', 'SI'

  @Column({ name: 'is_system', type: 'boolean', default: true })
  isSystem: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
