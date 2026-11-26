import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiAssistantService } from './ai-assistant.service';
import {
  ChatRequestDto,
  ConfirmActionDto,
  SpeechToTextDto,
  TextToSpeechDto,
} from './dto/ai-assistant.dto';
import { ConversationService } from './services/conversation.service';
import { MultilingualService } from './services/multilingual.service';
import { KnowledgeBaseService } from './services/knowledge-base.service';
import { AiEntitlementService, isAiModuleEnabled } from './services/ai-entitlement.service';
import { hasPermission } from '../auth/permissions';

@Controller('api/ai')
@UseGuards(JwtAuthGuard)
export class AiAssistantController {
  constructor(
    private readonly aiAssistantService: AiAssistantService,
    private readonly conversationService: ConversationService,
    private readonly multilingualService: MultilingualService,
    private readonly knowledgeBaseService: KnowledgeBaseService,
    private readonly entitlementService: AiEntitlementService,
  ) {}

  /**
   * 0. Get available AI models and active provider status for the current user & tenant
   */
  @Get('models')
  async getModels(@Req() req: any) {
    const user = {
      id: req.user.id || req.user.sub,
      role: req.user.role || 'STAFF',
      permissions: req.user.permissions || null,
    };
    const result = await this.entitlementService.getAvailableModelsForUser(req.user.tenantId, user);
    return {
      ...result,
      moduleEnabled: isAiModuleEnabled(req.user.tenant?.modules),
    };
  }

  /**
   * 0.1 Get Tenant AI Subscription Configuration & Usage Quotas (Admin only)
   */
  @Get('tenant-config')
  async getTenantConfig(@Req() req: any) {
    const user = {
      role: req.user.role,
      permissions: req.user.permissions,
    };
    if (!hasPermission(user, 'ai_manage_settings') && !hasPermission(user, 'settings')) {
      throw new ForbiddenException('Access denied: You do not have permission to manage AI settings.');
    }
    return this.entitlementService.getTenantAdminConfig(req.user.tenantId);
  }

  /**
   * 0.2 Update Tenant AI Subscription Configuration (Admin only)
   */
  @Patch('tenant-config')
  async updateTenantConfig(@Body() body: any, @Req() req: any) {
    const user = {
      role: req.user.role,
      permissions: req.user.permissions,
    };
    if (!hasPermission(user, 'ai_manage_settings') && !hasPermission(user, 'settings')) {
      throw new ForbiddenException('Access denied: You do not have permission to manage AI settings.');
    }
    return this.entitlementService.updateTenantAdminConfig(req.user.tenantId, body);
  }

  /**
   * 1. Send chat message to AI assistant
   */
  @Post('chat')
  async chat(@Body() dto: ChatRequestDto, @Req() req: any) {
    if (!dto.message || !dto.message.trim()) {
      throw new BadRequestException('Message content cannot be empty.');
    }

    const user = {
      id: req.user.id || req.user.sub,
      tenantId: req.user.tenantId,
      propertyId: req.user.propertyId || req.user.property?.id,
      role: req.user.role || 'STAFF',
      permissions: req.user.permissions || null,
      tenantModules: req.user.tenant?.modules ?? null,
    };

    return this.aiAssistantService.handleChat(dto, user);
  }

  /**
   * 2. Confirm or reject pending action
   */
  @Post('confirm-action')
  async confirmAction(
    @Body() dto: ConfirmActionDto,
    @Req() req: any,
  ) {
    if (!dto.actionConfirmationId) {
      throw new BadRequestException('actionConfirmationId is required.');
    }
    if (!['CONFIRM', 'REJECT'].includes(dto.decision)) {
      throw new BadRequestException('Decision must be CONFIRM or REJECT.');
    }

    const user = {
      id: req.user.id || req.user.sub,
      tenantId: req.user.tenantId,
      propertyId: req.user.propertyId || req.user.property?.id,
      role: req.user.role || 'STAFF',
      permissions: req.user.permissions || null,
    };

    return this.aiAssistantService.confirmAction(
      dto.actionConfirmationId,
      user,
      dto.decision,
    );
  }

  /**
   * 3. Get user's conversation sessions
   */
  @Get('conversations')
  async getConversations(@Req() req: any) {
    const user = {
      id: req.user.id || req.user.sub,
      tenantId: req.user.tenantId,
      propertyId: req.user.propertyId || req.user.property?.id,
      role: req.user.role || 'STAFF',
      permissions: req.user.permissions || null,
    };
    return this.conversationService.getUserConversations(user);
  }

  /**
   * 4. Get messages for a specific conversation
   */
  @Get('conversations/:id/messages')
  async getMessages(@Param('id') conversationId: string, @Req() req: any) {
    const user = {
      id: req.user.id || req.user.sub,
      tenantId: req.user.tenantId,
      propertyId: req.user.propertyId || req.user.property?.id,
      role: req.user.role || 'STAFF',
      permissions: req.user.permissions || null,
    };
    return this.conversationService.getConversationMessages(conversationId, user);
  }

  /**
   * 5. Context-aware quick prompt suggestions
   */
  @Get('suggestions')
  async getSuggestions(@Query('currentPage') currentPage: string, @Req() req: any) {
    const user = {
      id: req.user.id || req.user.sub,
      tenantId: req.user.tenantId,
      propertyId: req.user.propertyId || req.user.property?.id,
      role: req.user.role || 'STAFF',
      permissions: req.user.permissions || null,
    };
    const suggestions = this.aiAssistantService.getContextualSuggestions(user, currentPage);
    return { suggestions };
  }

  /**
   * 6. Speech-to-text / Audio voice input helper
   */
  @Post('speech-to-text')
  async speechToText(@Body() body: SpeechToTextDto) {
    // If the browser already provides transcription via Web Speech API
    const text = (body.transcript || body.text || '').trim();
    const detected = this.multilingualService.detectLanguage(text);
    return {
      success: true,
      text,
      detectedLanguage: detected,
    };
  }

  /**
   * 7. Text-to-speech voice synthesis helper
   */
  @Post('text-to-speech')
  async textToSpeech(@Body() body: TextToSpeechDto) {
    const lang = body.language || this.multilingualService.detectLanguage(body.text);
    return {
      success: true,
      text: body.text,
      language: lang,
      voiceConfig: {
        voiceLang: lang === 'SI' ? 'si-LK' : 'en-US',
        pitch: 1.0,
        rate: 1.0,
      },
    };
  }
}
