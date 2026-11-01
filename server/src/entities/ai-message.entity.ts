import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AiConversation } from './ai-conversation.entity';

@Entity('ai_messages')
@Index(['conversationId', 'createdAt'])
export class AiMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id', type: 'varchar', length: 36 })
  conversationId: string;

  @ManyToOne(() => AiConversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: AiConversation;

  @Column({ type: 'varchar', length: 20 })
  role: 'user' | 'assistant' | 'system';

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'detected_language', type: 'varchar', length: 20, default: 'EN' })
  detectedLanguage: string; // 'EN', 'SI', 'SINGLISH'

  @Column({ name: 'input_modality', type: 'varchar', length: 20, default: 'text' })
  inputModality: string; // 'text', 'voice'

  @Column({ name: 'tool_calls', type: 'json', nullable: true })
  toolCalls: any | null;

  @Column({ name: 'tool_results', type: 'json', nullable: true })
  toolResults: any | null;

  @Column({ name: 'action_confirmation_id', type: 'varchar', length: 36, nullable: true })
  actionConfirmationId: string | null;

  @Column({ name: 'audio_url', type: 'varchar', length: 500, nullable: true })
  audioUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
