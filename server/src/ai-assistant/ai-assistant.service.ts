import { Injectable } from '@nestjs/common';
import { ConversationService } from './services/conversation.service';
import { AiProviderService } from './services/ai-provider.service';
import { ToolExecutorService, ToolExecutionUser } from './services/tool-executor.service';
import { MultilingualService } from './services/multilingual.service';

import { ChatRequestDto } from './dto/ai-assistant.dto';
export { ChatRequestDto };

export interface ChatResponseDto {
  conversationId: string;
  messageId: string;
  role: 'assistant';
  content: string;
  detectedLanguage: string;
  suggestedFollowUps?: string[];
  pendingAction?: {
    confirmationId: string;
    actionType: string;
    previewSummary: string;
    parameters: any;
    expiresAt: Date;
    confirmButtonText: string;
    cancelButtonText: string;
  };
  toolResult?: {
    toolName: string;
    success: boolean;
    data: any;
    summary: string;
  };
}

@Injectable()
export class AiAssistantService {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly aiProvider: AiProviderService,
    private readonly toolExecutor: ToolExecutorService,
    private readonly multilingualService: MultilingualService,
  ) {}

  /**
   * Main conversational pipeline
   */
  async handleChat(
    dto: ChatRequestDto,
    user: ToolExecutionUser,
  ): Promise<ChatResponseDto> {
    const rawMessage = (dto.message || '').trim();

    // 1. Get or create conversation session
    const conversation = await this.conversationService.getOrCreateConversation(
      user,
      dto.conversationId,
    );

    // 2. Persist user message
    const { detectedLanguage } = this.multilingualService.extractSemanticTokens(rawMessage);
    await this.conversationService.addMessage(
      conversation.id,
      'user',
      rawMessage,
      {
        detectedLanguage,
        inputModality: dto.inputModality || 'text',
      },
    );

    // 3. Load conversation history
    const historyMsgs = await this.conversationService.getConversationMessages(
      conversation.id,
      user,
    );
    const history = historyMsgs.slice(-8).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // 4. Process with AI Provider / Operations Engine
    const aiResult = await this.aiProvider.processUserMessage(rawMessage, history, {
      role: user.role,
      tenantId: user.tenantId,
      propertyId: user.propertyId,
      currentPage: dto.currentPage,
    });

    let assistantContent = aiResult.content;
    let pendingActionData: ChatResponseDto['pendingAction'] = undefined;
    let toolResultData: ChatResponseDto['toolResult'] = undefined;

    // 5. Check if a tool needs execution
    if (aiResult.toolToExecute) {
      const { name, parameters, isWrite } = aiResult.toolToExecute;

      if (isWrite && aiResult.proposedAction) {
        // WRITE OPERATION: Create pending action confirmation card (do not execute yet)
        const confirmation = await this.conversationService.createActionConfirmation(
          conversation.id,
          user,
          aiResult.proposedAction,
        );

        const btnLabels = this.multilingualService.formatConfirmationMessage(
          aiResult.detectedLanguage,
          aiResult.proposedAction.previewSummary,
          aiResult.proposedAction.actionType,
        );

        pendingActionData = {
          confirmationId: confirmation.id,
          actionType: confirmation.actionType,
          previewSummary: confirmation.previewSummary,
          parameters: confirmation.parameters,
          expiresAt: confirmation.expiresAt,
          confirmButtonText: btnLabels.confirmBtn,
          cancelButtonText: btnLabels.cancelBtn,
        };

        assistantContent += `\n\n> ⚠️ **${btnLabels.title}**\n> ${btnLabels.prompt}`;
      } else {
        // READ OPERATION: Auto-execute safely and inject results into conversation
        const result = await this.toolExecutor.executeTool(
          name,
          parameters,
          user,
          false,
        );

        toolResultData = {
          toolName: result.toolName,
          success: result.success,
          data: result.data,
          summary: result.summary,
        };

        // Format nice markdown table or list if data returned
        const formattedDataBlock = this.formatDataToMarkdown(name, result.data);
        if (formattedDataBlock) {
          assistantContent += `\n\n${formattedDataBlock}`;
        } else {
          assistantContent += `\n\n${result.summary}`;
        }
      }
    }

    // 6. Persist assistant message
    const savedAssistantMsg = await this.conversationService.addMessage(
      conversation.id,
      'assistant',
      assistantContent,
      {
        detectedLanguage: aiResult.detectedLanguage,
        inputModality: 'text',
        toolCalls: aiResult.toolToExecute,
        toolResults: toolResultData,
        actionConfirmationId: pendingActionData?.confirmationId,
      },
    );

    return {
      conversationId: conversation.id,
      messageId: savedAssistantMsg.id,
      role: 'assistant',
      content: assistantContent,
      detectedLanguage: aiResult.detectedLanguage,
      suggestedFollowUps: aiResult.suggestedFollowUps,
      pendingAction: pendingActionData,
      toolResult: toolResultData,
    };
  }

  /**
   * Confirm or reject pending action
   */
  async confirmAction(
    actionConfirmationId: string,
    user: ToolExecutionUser,
    decision: 'CONFIRM' | 'REJECT',
  ) {
    return this.conversationService.confirmAndExecuteAction(
      actionConfirmationId,
      user,
      decision,
    );
  }

  /**
   * Get suggestions contextual to user's current dashboard route
   */
  getContextualSuggestions(user: ToolExecutionUser, currentPage?: string): string[] {
    const page = (currentPage || '').toLowerCase();

    if (page.includes('pms') || page.includes('rooms') || page.includes('reservations')) {
      return [
        'Which rooms are available right now?',
        'Show today\'s scheduled arrivals',
        'Show today\'s departures',
        'Check status of Room 101',
      ];
    }

    if (page.includes('housekeeping')) {
      return [
        'Show all dirty rooms needing turnaround',
        'Mark Room 102 as CLEAN',
        'Show rooms currently in cleaning',
        'Priority rooms for today\'s arrivals',
      ];
    }

    if (page.includes('inventory')) {
      return [
        'Show items below minimum stock level',
        'Check housekeeping linen inventory',
        'Create a draft purchase order',
        'Show recent inventory transactions',
      ];
    }

    if (page.includes('bar')) {
      return [
        'Check liquor stock levels and open bottle ml',
        'Show low stock spirits below par level',
        'Log bar wastage for spillage',
        'Daily bar sales breakdown',
      ];
    }

    if (page.includes('channel-manager')) {
      return [
        'Check OTA channel synchronization health',
        'Trigger full sync for Booking.com & Agoda',
        'View recent OTA sync errors',
        'Show channel rate multipliers',
      ];
    }

    if (page.includes('pos')) {
      return [
        'Check restaurant dining table occupancy',
        'Why is the kitchen KOT printer not printing?',
        'How to charge a restaurant bill to guest room folio',
        'Daily restaurant sales summary',
      ];
    }

    // Default global suggestions
    return [
      'Which rooms are available right now?',
      'Show today\'s scheduled arrivals',
      'Show items below minimum stock level',
      'Check Channel Manager sync health',
    ];
  }

  /**
   * Format tool result JSON into clean, responsive GitHub-flavored markdown
   */
  private formatDataToMarkdown(toolName: string, data: any): string | null {
    if (!data) return null;

    if (toolName === 'get_available_rooms' && Array.isArray(data)) {
      if (data.length === 0) return '_No vacant rooms matching this criteria._';
      let md = '| Room | Floor | Room Type | Cleanliness |\n| :--- | :--- | :--- | :--- |\n';
      data.slice(0, 10).forEach((r) => {
        md += `| **${r.roomNumber}** | Floor ${r.floor} | ${r.roomType} | \`${r.cleanlinessStatus}\` |\n`;
      });
      if (data.length > 10) md += `\n_...and ${data.length - 10} more rooms._`;
      return md;
    }

    if (toolName === 'get_today_arrivals' && Array.isArray(data)) {
      if (data.length === 0) return '_No guest arrivals scheduled for today._';
      let md = '| Booking | Guest Name | Room Type | Assigned Room | Status |\n| :--- | :--- | :--- | :--- | :--- |\n';
      data.slice(0, 8).forEach((r) => {
        md += `| \`${r.reservationNumber}\` | **${r.guestName}** | ${r.roomType} | ${r.assignedRoom} | \`${r.status}\` |\n`;
      });
      return md;
    }

    if (toolName === 'get_today_departures' && Array.isArray(data)) {
      if (data.length === 0) return '_No guest departures scheduled for today._';
      let md = '| Booking | Guest Name | Room | Status |\n| :--- | :--- | :--- | :--- |\n';
      data.slice(0, 8).forEach((r) => {
        md += `| \`${r.reservationNumber}\` | **${r.guestName}** | Room ${r.roomNumber} | \`${r.status}\` |\n`;
      });
      return md;
    }

    if (toolName === 'get_low_stock_inventory' && Array.isArray(data)) {
      if (data.length === 0) return '✅ _All inventory items are currently above their minimum stock thresholds._';
      let md = '| Item Name | Category | Current Stock | Min Level | Supplier |\n| :--- | :--- | :--- | :--- | :--- |\n';
      data.slice(0, 8).forEach((i) => {
        md += `| **${i.name}** | ${i.mainCategory} | **${i.currentStock}** ${i.unit || 'units'} | ${i.minStockLevel} | ${i.supplier} |\n`;
      });
      return md;
    }

    if (toolName === 'get_bar_stock_levels' && Array.isArray(data)) {
      if (data.length === 0) return '_No bar items found._';
      let md = '| Brand / Liquor | Category | Full Bottles | Open Bottle (ml) | Total (L) | Low Stock |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n';
      data.slice(0, 8).forEach((b) => {
        md += `| **${b.name}** | ${b.category} | ${b.fullBottlesStock} bottles | ${b.currentBottleRemainingMl} ml | ${b.totalLiters}L | ${b.isLowStock ? '⚠️ Low' : 'OK'} |\n`;
      });
      return md;
    }

    if (toolName === 'get_daily_sales_summary' && Array.isArray(data)) {
      if (data.length === 0) return '_No sales recorded for this date range._';
      const today = data[0];
      return `**Sales Summary (${today.date})**:
- 🏷️ **Total Orders**: ${today.totalOrders}
- 💳 **Paid Orders**: ${today.paidOrders}
- 💵 **Gross Sales**: LKR ${today.grossSales.toLocaleString()}
- ✂️ **Discounts**: LKR ${today.totalDiscounts.toLocaleString()}
- 🏛️ **Taxes**: LKR ${today.totalTaxes.toLocaleString()}
- 📈 **Net Revenue**: **LKR ${today.netRevenue.toLocaleString()}**`;
    }

    if (toolName === 'get_channel_sync_status' && data) {
      const s = data.summary || data;
      return `**Channel Manager Overview**:
- 🌐 **Connected Channels**: ${s.connectedChannels ?? 0} / ${s.totalChannels ?? 5}
- ⚡ **Active Auto-Sync Channels**: ${s.activeChannels ?? 0}
- ⚠️ **Channels Requiring Attention**: ${s.channelsRequiringAttention ?? 0}
- ⏳ **Pending Sync Jobs**: ${s.pendingSyncJobs ?? s.pendingJobsCount ?? 0}
- ❌ **Failed Sync Attempts**: ${s.failedSyncAttempts ?? 0}
- 📅 **Total Channel Bookings**: ${s.totalChannelReservations ?? 0}`;
    }

    if (toolName === 'get_pos_tables_status' && Array.isArray(data)) {
      let md = '| Table | Capacity | Status | Outlet |\n| :--- | :--- | :--- | :--- |\n';
      data.slice(0, 10).forEach((t) => {
        md += `| **Table ${t.tableNumber}** | ${t.capacity} seats | \`${t.status}\` | ${t.outlet || 'Main'} |\n`;
      });
      return md;
    }

    if (toolName === 'diagnose_hardware_issue' && data?.recommendations) {
      let md = `**Troubleshooting Steps for ${data.hardwareType}**:\n`;
      data.recommendations.forEach((step: string, index: number) => {
        md += `${index + 1}. ${step}\n`;
      });
      return md;
    }

    return null;
  }
}
