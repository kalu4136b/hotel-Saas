import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  AiConversation,
  AiMessage,
  AiActionConfirmation,
} from '../../entities';
import { ToolExecutorService, ToolExecutionUser } from './tool-executor.service';
import { ProposedAction } from './ai-provider.service';

@Injectable()
export class ConversationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly toolExecutor: ToolExecutorService,
  ) {}

  /**
   * Get or create active conversation for a user
   */
  async getOrCreateConversation(
    user: ToolExecutionUser,
    conversationId?: string,
  ): Promise<AiConversation> {
    const repo = this.dataSource.getRepository(AiConversation);

    if (conversationId) {
      const existing = await repo.findOne({
        where: { id: conversationId, tenantId: user.tenantId, propertyId: user.propertyId },
      });
      if (existing) return existing;
    }

    // Create new conversation
    const newConv = repo.create({
      tenantId: user.tenantId,
      propertyId: user.propertyId,
      userId: user.id,
      title: 'Operational Assistant Session',
      detectedLanguage: 'EN',
      preferredLanguage: 'AUTO',
    });

    return repo.save(newConv);
  }

  /**
   * List user's conversations
   */
  async getUserConversations(user: ToolExecutionUser): Promise<AiConversation[]> {
    return this.dataSource.getRepository(AiConversation).find({
      where: { tenantId: user.tenantId, propertyId: user.propertyId, userId: user.id },
      order: { updatedAt: 'DESC' },
      take: 20,
    });
  }

  /**
   * Get messages for a conversation
   */
  async getConversationMessages(
    conversationId: string,
    user: ToolExecutionUser,
  ): Promise<AiMessage[]> {
    return this.dataSource.getRepository(AiMessage).find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
      take: 50,
    });
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    options?: {
      detectedLanguage?: string;
      inputModality?: string;
      toolCalls?: any;
      toolResults?: any;
      actionConfirmationId?: string;
      audioUrl?: string;
    },
  ): Promise<AiMessage> {
    const msgRepo = this.dataSource.getRepository(AiMessage);
    const msg = msgRepo.create({
      conversationId,
      role,
      content,
      detectedLanguage: options?.detectedLanguage || 'EN',
      inputModality: options?.inputModality || 'text',
      toolCalls: options?.toolCalls || null,
      toolResults: options?.toolResults || null,
      actionConfirmationId: options?.actionConfirmationId || null,
      audioUrl: options?.audioUrl || null,
    });

    const saved = await msgRepo.save(msg);

    // Update conversation lastMessageAt
    await this.dataSource
      .getRepository(AiConversation)
      .update(conversationId, { lastMessageAt: new Date(), updatedAt: new Date() });

    return saved;
  }

  /**
   * Create pending action confirmation card
   */
  async createActionConfirmation(
    conversationId: string,
    user: ToolExecutionUser,
    action: ProposedAction,
  ): Promise<AiActionConfirmation> {
    const repo = this.dataSource.getRepository(AiActionConfirmation);

    // Expiry: 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const confirmation = repo.create({
      conversationId,
      tenantId: user.tenantId,
      propertyId: user.propertyId,
      userId: user.id,
      actionType: action.actionType,
      targetEntity: action.targetEntity,
      targetId: action.targetId || null,
      parameters: action.parameters,
      status: 'PENDING',
      previewSummary: action.previewSummary,
      expiresAt,
    });

    return repo.save(confirmation);
  }

  /**
   * Confirm and execute pending action
   */
  async confirmAndExecuteAction(
    actionConfirmationId: string,
    user: ToolExecutionUser,
    decision: 'CONFIRM' | 'REJECT',
  ): Promise<{
    confirmation: AiActionConfirmation;
    executionResult?: any;
    message: string;
  }> {
    const repo = this.dataSource.getRepository(AiActionConfirmation);
    const confirmation = await repo.findOne({
      where: { id: actionConfirmationId, tenantId: user.tenantId, propertyId: user.propertyId },
    });

    if (!confirmation) {
      throw new NotFoundException('Action confirmation not found.');
    }

    if (confirmation.status !== 'PENDING') {
      throw new BadRequestException(
        `Action is already in status '${confirmation.status}' and cannot be processed again.`,
      );
    }

    if (new Date() > new Date(confirmation.expiresAt)) {
      confirmation.status = 'EXPIRED';
      await repo.save(confirmation);
      throw new BadRequestException('Action confirmation has expired. Please request the action again.');
    }

    if (decision === 'REJECT') {
      confirmation.status = 'REJECTED';
      confirmation.updatedAt = new Date();
      await repo.save(confirmation);
      return {
        confirmation,
        message: 'Operation was cancelled by user.',
      };
    }

    // Execute the action
    confirmation.status = 'CONFIRMED';
    confirmation.confirmedAt = new Date();
    await repo.save(confirmation);

    // Map actionType to toolName
    const toolMap: Record<string, string> = {
      UPDATE_ROOM_CLEANLINESS: 'update_room_cleanliness',
      UPDATE_ROOM_OCCUPANCY: 'update_room_occupancy',
      CHECK_OUT_GUEST: 'check_out_guest',
      CHECK_IN_GUEST: 'check_in_guest',
      CREATE_RESERVATION: 'create_reservation',
      POST_FOLIO_CHARGE: 'post_folio_charge',
      POST_FOLIO_PAYMENT: 'post_folio_payment',
      CREATE_PURCHASE_ORDER: 'create_purchase_order',
      LOG_BAR_WASTAGE: 'log_bar_wastage',
      TRIGGER_CHANNEL_SYNC: 'trigger_channel_sync',
    };

    const toolName = toolMap[confirmation.actionType] || confirmation.actionType.toLowerCase();

    const result = await this.toolExecutor.executeTool(
      toolName,
      confirmation.parameters,
      user,
      true, // isConfirmed
    );

    if (result.success) {
      confirmation.status = 'EXECUTED';
      confirmation.executionResult = result.data;
    } else {
      confirmation.status = 'FAILED';
      confirmation.errorMessage = result.error || 'Execution failed';
    }

    confirmation.updatedAt = new Date();
    await repo.save(confirmation);

    // Add confirmation execution result message to the conversation
    await this.addMessage(
      confirmation.conversationId,
      'assistant',
      result.success
        ? `✅ **Action Executed Successfully**: ${result.summary}`
        : `❌ **Action Failed**: ${result.error}`,
      {
        toolCalls: { toolName, parameters: confirmation.parameters },
        toolResults: result,
      },
    );

    return {
      confirmation,
      executionResult: result.data,
      message: result.summary,
    };
  }
}
