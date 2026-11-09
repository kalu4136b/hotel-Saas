import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AiConversation,
  AiMessage,
  AiActionConfirmation,
  AiKnowledgeDocument,
  AiToolAuditLog,
  AiTenantEntitlement,
  AiUsageRecord,
  Room,
  Reservation,
  GuestFolio,
  InventoryItem,
  BarItem,
  ChannelConnection,
} from '../entities';
import { PmsModule } from '../pms/pms.module';
import { InventoryModule } from '../inventory/inventory.module';
import { BarModule } from '../bar/bar.module';
import { PosModule } from '../pos/pos.module';
import { ChannelManagerModule } from '../channel-manager/channel-manager.module';
import { ReportsModule } from '../reports/reports.module';

import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from './ai-assistant.service';
import { AiProviderService } from './services/ai-provider.service';
import { ToolRegistryService } from './services/tool-registry.service';
import { ToolExecutorService } from './services/tool-executor.service';
import { MultilingualService } from './services/multilingual.service';
import { KnowledgeBaseService } from './services/knowledge-base.service';
import { ConversationService } from './services/conversation.service';
import { AiEntitlementService } from './services/ai-entitlement.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiConversation,
      AiMessage,
      AiActionConfirmation,
      AiKnowledgeDocument,
      AiToolAuditLog,
      Room,
      Reservation,
      GuestFolio,
      InventoryItem,
      BarItem,
      ChannelConnection,
    ]),
    PmsModule,
    InventoryModule,
    BarModule,
    PosModule,
    ChannelManagerModule,
    ReportsModule,
  ],
  controllers: [AiAssistantController],
  providers: [
    AiAssistantService,
    AiProviderService,
    ToolRegistryService,
    ToolExecutorService,
    MultilingualService,
    KnowledgeBaseService,
    ConversationService,
    AiEntitlementService,
  ],
  exports: [AiAssistantService, AiEntitlementService],
})
export class AiAssistantModule {}
