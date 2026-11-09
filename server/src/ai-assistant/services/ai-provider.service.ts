import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ToolRegistryService } from './tool-registry.service';
import { MultilingualService, DetectedLanguage } from './multilingual.service';
import { KnowledgeBaseService, KnowledgeMatch } from './knowledge-base.service';

export interface ProposedAction {
  actionType: string;
  targetEntity: string;
  targetId?: string;
  parameters: any;
  previewSummary: string;
}

export interface AiProviderResponse {
  content: string;
  detectedLanguage: DetectedLanguage;
  providerId?: string;
  providerUsed?: string;
  modelUsed?: string;
  toolToExecute?: {
    name: string;
    parameters: any;
    isWrite: boolean;
  };
  proposedAction?: ProposedAction;
  suggestedFollowUps?: string[];
  matchedKnowledge?: KnowledgeMatch[];
}

@Injectable()
export class AiProviderService {
  private readonly defaultProvider: string;
  private readonly geminiApiKey?: string;
  private readonly geminiModel: string;
  private readonly openAiApiKey?: string;
  private readonly openAiModel: string;
  private readonly anthropicApiKey?: string;
  private readonly anthropicModel: string;
  private readonly deepseekApiKey?: string;
  private readonly deepseekBaseUrl: string;
  private readonly deepseekModel: string;
  private readonly groqApiKey?: string;
  private readonly groqModel: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly toolRegistry: ToolRegistryService,
    private readonly multilingualService: MultilingualService,
    private readonly knowledgeBaseService: KnowledgeBaseService,
  ) {
    this.defaultProvider = (this.configService.get<string>('AI_DEFAULT_PROVIDER') || 'auto').toLowerCase();
    this.geminiApiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      this.configService.get<string>('GOOGLE_API_KEY');
    this.geminiModel = this.configService.get<string>('GEMINI_MODEL') || 'gemini-3.5-flash';
    this.groqApiKey = this.configService.get<string>('GROQ_API_KEY');
    this.groqModel = this.configService.get<string>('GROQ_MODEL') || 'qwen/qwen3.8-27b';
    this.openAiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openAiModel = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';
    this.anthropicApiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.anthropicModel = this.configService.get<string>('ANTHROPIC_MODEL') || 'claude-3-5-sonnet-latest';
    this.deepseekApiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    this.deepseekBaseUrl = this.configService.get<string>('DEEPSEEK_BASE_URL') || 'https://api.deepseek.com';
    this.deepseekModel = this.configService.get<string>('DEEPSEEK_MODEL') || 'deepseek-chat';
  }

  /**
   * Return metadata about available AI models & provider configuration status
   */
  getAvailableModels() {
    return {
      defaultProvider: this.defaultProvider,
      models: [
        {
          id: 'gemini',
          name: 'Google Gemini',
          modelName: this.geminiModel,
          isConfigured: !!this.geminiApiKey,
          badge: 'Gemini 3.5 Flash',
          description: 'Official Google Gemini model with fast multilingual & multimodal capabilities.',
        },
        {
          id: 'groq',
          name: 'Groq Cloud',
          modelName: this.groqModel,
          isConfigured: !!this.groqApiKey,
          badge: 'Qwen 3.8 27B',
          description: 'Ultra-fast LPU inference hosting Qwen 3.8 27B model.',
        },
        {
          id: 'openai',
          name: 'OpenAI ChatGPT',
          modelName: this.openAiModel,
          isConfigured: !!this.openAiApiKey,
          badge: 'GPT-4o mini',
          description: 'High performance conversational model from OpenAI.',
        },
        {
          id: 'claude',
          name: 'Anthropic Claude',
          modelName: this.anthropicModel,
          isConfigured: !!this.anthropicApiKey,
          badge: 'Claude 3.5 Sonnet',
          description: 'Advanced nuance, structured reasoning, and deep analysis.',
        },
        {
          id: 'deepseek',
          name: 'DeepSeek',
          modelName: this.deepseekModel,
          isConfigured: !!this.deepseekApiKey,
          badge: 'DeepSeek-V3',
          description: 'High-speed reasoning and operations assistant.',
        },
        {
          id: 'internal',
          name: 'Hotel Ops Engine',
          modelName: 'Built-in Rule NLP',
          isConfigured: true,
          badge: 'Always Free / Offline',
          description: 'Deterministic instantaneous PMS, POS, and Channel Manager engine.',
        },
      ],
    };
  }

  /**
   * Primary entry point: process user message and determine tool / action / response
   */
  async processUserMessage(
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    userContext: {
      role: string;
      tenantId: string;
      propertyId: string;
      currentPage?: string;
      preferredProvider?: string;
      preferredModel?: string;
      allowedProviders?: string[];
    },
  ): Promise<AiProviderResponse> {
    const { detectedLanguage, normalizedText, intentHints, roomNumberMatch } =
      this.multilingualService.extractSemanticTokens(userMessage);

    // 1. Search knowledge base for SOPs / troubleshooting queries
    const knowledgeMatches = await this.knowledgeBaseService.searchKnowledgeBase(
      userMessage,
    );

    // 2. Run the built-in operations engine first. It detects actionable intents
    //    (live PMS / POS / inventory queries and write actions that need confirmation).
    //    External LLMs have no access to hotel tools, so these must never be routed to them.
    const internalResult = this.processWithInternalEngine(
      userMessage,
      normalizedText,
      detectedLanguage,
      intentHints,
      roomNumberMatch,
      knowledgeMatches,
      userContext,
    );
    const internalTagged: AiProviderResponse = {
      ...internalResult,
      providerId: 'internal',
      providerUsed: 'Hotel Ops Engine',
      modelUsed: 'builtin-rule-nlp',
    };

    if (internalResult.toolToExecute) {
      return internalTagged;
    }

    // 3. Conversational / general queries: use the selected external LLM (if entitled & configured)
    const candidateProviders = this.resolveProviderOrder(userContext?.preferredProvider).filter(
      (p) => !userContext?.allowedProviders || userContext.allowedProviders.includes(p),
    );
    for (const provider of candidateProviders) {
      try {
        let res: AiProviderResponse | null = null;
        // Only forward customModel if this provider matches the user's requested preferredProvider
        const customModel = userContext?.preferredProvider === provider ? userContext?.preferredModel : undefined;

        if (provider === 'gemini' && this.geminiApiKey) {
          res = await this.callGemini(userMessage, history, userContext, detectedLanguage, knowledgeMatches, customModel);
        } else if (provider === 'groq' && this.groqApiKey) {
          res = await this.callGroq(userMessage, history, userContext, detectedLanguage, knowledgeMatches, customModel);
        } else if (provider === 'openai' && this.openAiApiKey) {
          res = await this.callOpenAi(userMessage, history, userContext, detectedLanguage, knowledgeMatches, customModel);
        } else if (provider === 'claude' && this.anthropicApiKey) {
          res = await this.callAnthropic(userMessage, history, userContext, detectedLanguage, knowledgeMatches, customModel);
        } else if (provider === 'deepseek' && this.deepseekApiKey) {
          res = await this.callDeepSeek(userMessage, history, userContext, detectedLanguage, knowledgeMatches, customModel);
        }
        if (res) return { ...res, providerId: provider };
      } catch (err: any) {
        console.warn(`${provider} API call failed, trying next provider or falling back:`, err?.message);
      }
    }

    // 4. Built-in Operations NLP Engine (deterministic, instantaneous, offline-ready)
    return internalTagged;
  }

  /**
   * Advanced internal rule & semantic operations parser
   */
  private processWithInternalEngine(
    rawMessage: string,
    normalized: string,
    lang: DetectedLanguage,
    intents: string[],
    roomNumber: string | undefined,
    knowledgeMatches: KnowledgeMatch[],
    userContext: { role: string; currentPage?: string },
  ): AiProviderResponse {
    // ----------------------------------------------------
    // A. WRITE INTENTS (Require 2-step Action Confirmation)
    // ----------------------------------------------------

    // 1. Cleanliness update (e.g. "mark room 102 as clean", "room 101 clean karanna", "room 203 dirty")
    if (
      roomNumber &&
      (normalized.includes('clean') ||
        normalized.includes('dirty') ||
        normalized.includes('sudda') ||
        normalized.includes('pirisidu') ||
        normalized.includes('apirisidu') ||
        normalized.includes('inspect'))
    ) {
      let targetStatus = 'CLEAN';
      if (normalized.includes('dirty') || normalized.includes('apirisidu')) {
        targetStatus = 'DIRTY';
      } else if (normalized.includes('inspect')) {
        targetStatus = 'INSPECTED';
      } else if (normalized.includes('in cleaning') || normalized.includes('cleaning')) {
        targetStatus = 'IN_CLEANING';
      }

      const preview =
        lang === 'SI'
          ? `කාමර අංක #${roomNumber} හි තත්ත්වය '${targetStatus}' ලෙස වෙනස් කිරීම`
          : lang === 'SINGLISH'
          ? `Room #${roomNumber} eka '${targetStatus}' kiyala update kirima`
          : `Update Room #${roomNumber} cleanliness status to '${targetStatus}'`;

      return {
        content:
          lang === 'SI'
            ? `කාමර අංක **${roomNumber}** හි තත්ත්වය **${targetStatus}** ලෙස වෙනස් කිරීමට ඔබ කැමතිද? කරුණාකර තහවුරු කරන්න.`
            : lang === 'SINGLISH'
            ? `Room **${roomNumber}** eke cleanliness status eka **${targetStatus}** karannada? Karunakarala confirm karanna.`
            : `Would you like me to update the cleanliness status of **Room #${roomNumber}** to **${targetStatus}**? Please verify and confirm below.`,
        detectedLanguage: lang,
        toolToExecute: {
          name: 'update_room_cleanliness',
          parameters: { roomNumber, status: targetStatus },
          isWrite: true,
        },
        proposedAction: {
          actionType: 'UPDATE_ROOM_CLEANLINESS',
          targetEntity: 'room',
          targetId: roomNumber,
          parameters: { roomNumber, status: targetStatus },
          previewSummary: preview,
        },
        suggestedFollowUps: [
          `Confirm update for Room #${roomNumber}`,
          `Check status of Room #${roomNumber}`,
          'Show all dirty rooms',
        ],
      };
    }

    // 2. Check-out guest (e.g. "check out room 102", "checkout 101", "kamare 102 check out karanna")
    if (
      roomNumber &&
      (normalized.includes('check out') ||
        normalized.includes('checkout') ||
        normalized.includes('yanna') ||
        normalized.includes('check-out'))
    ) {
      const preview = `Check out guest from Room #${roomNumber}, settle folio, and mark room as DIRTY`;
      return {
        content:
          lang === 'SI'
            ? `කාමර අංක **${roomNumber}** හි අමුත්තා පිටවීම (Check-out) සිදු කිරීමට ඔබ කැමතිද? කරුණාකර තහවුරු කරන්න.`
            : lang === 'SINGLISH'
            ? `Room **#${roomNumber}** eka check-out karannada? Karunakarala confirm karanna.`
            : `Are you sure you want to proceed with checking out the guest currently in **Room #${roomNumber}**? This will verify folio settlement and mark the room as DIRTY.`,
        detectedLanguage: lang,
        toolToExecute: {
          name: 'check_out_guest',
          parameters: { roomNumber },
          isWrite: true,
        },
        proposedAction: {
          actionType: 'CHECK_OUT_GUEST',
          targetEntity: 'reservation',
          targetId: roomNumber,
          parameters: { roomNumber },
          previewSummary: preview,
        },
        suggestedFollowUps: [
          `View folio for Room #${roomNumber}`,
          'Show today departures',
          'Show available rooms',
        ],
      };
    }

    // 3. Trigger Channel Manager Sync (e.g. "sync channels", "sync with booking.com", "sync all ota")
    if (
      normalized.includes('sync') &&
      (normalized.includes('channel') ||
        normalized.includes('ota') ||
        normalized.includes('booking.com') ||
        normalized.includes('agoda') ||
        normalized.includes('expedia') ||
        normalized.includes('airbnb') ||
        normalized.includes('all'))
    ) {
      let code = 'ALL';
      if (normalized.includes('booking.com') || normalized.includes('booking')) code = 'BOOKING_COM';
      else if (normalized.includes('agoda')) code = 'AGODA';
      else if (normalized.includes('expedia')) code = 'EXPEDIA';
      else if (normalized.includes('airbnb')) code = 'AIRBNB';

      const preview = `Trigger 2-way rate and inventory push to external OTA channel: ${code}`;
      return {
        content: `I can synchronize live room rates, availability, and restriction rules to **${code}**. Do you want to proceed with this sync?`,
        detectedLanguage: lang,
        toolToExecute: {
          name: 'trigger_channel_sync',
          parameters: { channelCode: code },
          isWrite: true,
        },
        proposedAction: {
          actionType: 'TRIGGER_CHANNEL_SYNC',
          targetEntity: 'channel_sync',
          parameters: { channelCode: code },
          previewSummary: preview,
        },
        suggestedFollowUps: ['Check channel sync health', 'View channel connections'],
      };
    }

    // ----------------------------------------------------
    // B. READ INTENTS (Auto-execute & return rich operational data)
    // ----------------------------------------------------

    // 4. Room status inquiry (e.g. "what is the status of room 101", "room 204 kohomada", "is 301 vacant")
    if (
      roomNumber &&
      (normalized.includes('status') ||
        normalized.includes('kohomada') ||
        normalized.includes('balanna') ||
        normalized.includes('who is in') ||
        normalized.includes('available da') ||
        normalized.includes('clean da') ||
        intents.includes('room'))
    ) {
      return {
        content: `Checking the real-time operational status for **Room #${roomNumber}**...`,
        detectedLanguage: lang,
        toolToExecute: {
          name: 'get_room_status',
          parameters: { roomNumber },
          isWrite: false,
        },
        suggestedFollowUps: [
          `Mark Room #${roomNumber} as CLEAN`,
          `View folio for Room #${roomNumber}`,
          'Show available rooms',
        ],
      };
    }

    // 5. Available rooms inquiry (e.g. "which rooms are available", "empty rooms", "kamara available monawada")
    if (
      (normalized.includes('available') ||
        normalized.includes('free') ||
        normalized.includes('empty') ||
        normalized.includes('his') ||
        normalized.includes('puluwan')) &&
      (normalized.includes('room') ||
        normalized.includes('rooms') ||
        normalized.includes('kamara') ||
        normalized.includes('kamare'))
    ) {
      let cleanlinessFilter: string | undefined = undefined;
      if (normalized.includes('clean') || normalized.includes('pirisidu')) {
        cleanlinessFilter = 'CLEAN';
      }

      return {
        content: `Fetching currently vacant and ready-to-book rooms across your property...`,
        detectedLanguage: lang,
        toolToExecute: {
          name: 'get_available_rooms',
          parameters: { cleanlinessStatus: cleanlinessFilter },
          isWrite: false,
        },
        suggestedFollowUps: ['Show today arrivals', 'Show dirty rooms needing turnaround'],
      };
    }

    // 6. Today's Arrivals (e.g. "arrivals today", "who is arriving today", "ada enna inne kawda", "ada arrivals")
    if (
      normalized.includes('arrival') ||
      normalized.includes('arrivals') ||
      normalized.includes('check-in list') ||
      normalized.includes('ada ena') ||
      normalized.includes('enna inne')
    ) {
      return {
        content: `Retrieving today's scheduled guest arrivals and check-in reservations...`,
        detectedLanguage: lang,
        toolToExecute: {
          name: 'get_today_arrivals',
          parameters: {},
          isWrite: false,
        },
        suggestedFollowUps: ['Show available rooms for arrivals', 'Show today departures'],
      };
    }

    // 7. Today's Departures (e.g. "departures today", "who is leaving", "checkouts today", "ada yanna inne kawda")
    if (
      normalized.includes('departure') ||
      normalized.includes('departures') ||
      normalized.includes('check-out list') ||
      normalized.includes('leaving today') ||
      normalized.includes('ada yana') ||
      normalized.includes('yanna inne')
    ) {
      return {
        content: `Retrieving today's scheduled guest departures and check-out list...`,
        detectedLanguage: lang,
        toolToExecute: {
          name: 'get_today_departures',
          parameters: {},
          isWrite: false,
        },
        suggestedFollowUps: ['Show today arrivals', 'Show room cleanliness statuses'],
      };
    }

    // 8. Guest Folio & Bill inquiry (e.g. "folio for room 102", "bill for room 101", "room 204 folio eka kiyada")
    if (
      (normalized.includes('folio') ||
        normalized.includes('bill') ||
        normalized.includes('balance') ||
        normalized.includes('charges')) &&
      roomNumber
    ) {
      return {
        content: `Retrieving the active guest folio and outstanding balance for **Room #${roomNumber}**...`,
        detectedLanguage: lang,
        toolToExecute: {
          name: 'get_guest_folio',
          parameters: { roomNumber },
          isWrite: false,
        },
        suggestedFollowUps: [
          `Check out Room #${roomNumber}`,
          `Status of Room #${roomNumber}`,
        ],
      };
    }

    // 9. Low stock & Inventory inquiry (e.g. "low stock", "stock alerts", "badu iwarada", "adu stock")
    if (
      normalized.includes('low stock') ||
      normalized.includes('stock alert') ||
      normalized.includes('reorder') ||
      (normalized.includes('stock') && normalized.includes('adu')) ||
      (normalized.includes('badu') && (normalized.includes('iwarada') || normalized.includes('adu')))
    ) {
      return {
        content: `Querying inventory management system for items at or below minimum threshold...`,
        detectedLanguage: lang,
        toolToExecute: {
          name: 'get_low_stock_inventory',
          parameters: {},
          isWrite: false,
        },
        suggestedFollowUps: ['Show bar stock levels', 'Create purchase order for low stock'],
      };
    }

    // 10. Bar Liquor Stock levels (e.g. "bar stock", "whiskey stock", "vodka bottles", "liquor inventory")
    if (
      normalized.includes('bar') ||
      normalized.includes('liquor') ||
      normalized.includes('whiskey') ||
      normalized.includes('vodka') ||
      normalized.includes('gin') ||
      normalized.includes('beer') ||
      normalized.includes('shots') ||
      normalized.includes('bottles remaining')
    ) {
      return {
        content: `Checking bar and liquor inventory levels, including full bottle counts and open bottle milliliters...`,
        detectedLanguage: lang,
        toolToExecute: {
          name: 'get_bar_stock_levels',
          parameters: { search: undefined, lowStockOnly: false },
          isWrite: false,
        },
        suggestedFollowUps: ['Show low stock bar items', 'Show daily sales summary'],
      };
    }

    // 11. Daily Sales & Revenue (e.g. "daily sales", "revenue today", "ada labapu gana", "ada sales kiyada")
    if (
      normalized.includes('sale') ||
      normalized.includes('sales') ||
      normalized.includes('revenue') ||
      normalized.includes('ada labapu') ||
      normalized.includes('ada kiyada') ||
      normalized.includes('mudala')
    ) {
      return {
        content: `Compiling today's sales and revenue report across POS outlets and lodging...`,
        detectedLanguage: lang,
        toolToExecute: {
          name: 'get_daily_sales_summary',
          parameters: {},
          isWrite: false,
        },
        suggestedFollowUps: ['Show table occupancy status', 'Show today arrivals'],
      };
    }

    // 12. POS Tables Status (e.g. "dining tables", "table status", "tables occupied")
    if (
      normalized.includes('table') ||
      normalized.includes('tables') ||
      normalized.includes('restaurant occupancy')
    ) {
      return {
        content: `Fetching active restaurant dining table occupancy and seating status...`,
        detectedLanguage: lang,
        toolToExecute: {
          name: 'get_pos_tables_status',
          parameters: {},
          isWrite: false,
        },
        suggestedFollowUps: ['Show daily sales summary', 'Show bar stock levels'],
      };
    }

    // 13. Channel Manager Overview (e.g. "channel manager status", "ota connections", "booking.com sync")
    if (
      normalized.includes('channel') ||
      normalized.includes('ota') ||
      normalized.includes('booking.com') ||
      normalized.includes('agoda') ||
      normalized.includes('expedia') ||
      normalized.includes('airbnb')
    ) {
      return {
        content: `Checking online distribution channels, OTA sync health, and pending reservation feeds...`,
        detectedLanguage: lang,
        toolToExecute: {
          name: 'get_channel_sync_status',
          parameters: {},
          isWrite: false,
        },
        suggestedFollowUps: ['Trigger sync for all channels', 'Show today arrivals'],
      };
    }

    // 14. Hardware / Diagnostics (e.g. "printer not printing", "kot printer error", "cash drawer jam")
    if (
      normalized.includes('printer') ||
      normalized.includes('print') ||
      normalized.includes('cash drawer') ||
      normalized.includes('offline')
    ) {
      const hwType = normalized.includes('cash drawer') ? 'CASH_DRAWER' : 'PRINTER';
      return {
        content: `Diagnosing hardware connectivity and operation issue for **${hwType}**...`,
        detectedLanguage: lang,
        toolToExecute: {
          name: 'diagnose_hardware_issue',
          parameters: { hardwareType: hwType, symptom: rawMessage },
          isWrite: false,
        },
        suggestedFollowUps: [
          'How to run printer self-test',
          'How to check POS outlet settings',
        ],
      };
    }

    // ----------------------------------------------------
    // C. KNOWLEDGE BASE MATCH (SOPs, Guides, Troubleshooting)
    // ----------------------------------------------------
    if (knowledgeMatches.length > 0) {
      const topMatch = knowledgeMatches[0];
      let responseIntro = `Here is the operational guide from the hotel manual:`;
      if (lang === 'SI') {
        responseIntro = `හෝටල් මෙහෙයුම් අත්පොතෙහි සඳහන් තොරතුරු පහත පරිදි වේ:`;
      } else if (lang === 'SINGLISH') {
        responseIntro = `Ape hotel manual eke me gana thiyena thorathuru menna:`;
      }

      return {
        content: `### 📖 ${topMatch.title}\n\n${responseIntro}\n\n${topMatch.content}`,
        detectedLanguage: lang,
        matchedKnowledge: knowledgeMatches,
        suggestedFollowUps: [
          'Show available rooms',
          'Show today arrivals',
          'Check low stock items',
        ],
      };
    }

    // ----------------------------------------------------
    // D. GENERAL GREETING / DEFAULT ASSISTANCE
    // ----------------------------------------------------
    if (
      normalized.includes('hi') ||
      normalized.includes('hello') ||
      normalized.includes('suba udasanak') ||
      normalized.includes('ayubowan') ||
      normalized.includes('kohomada') ||
      normalized.includes('help')
    ) {
      if (lang === 'SI') {
        return {
          content: `ආයුබෝවන්! මම ඔබගේ **AI හෝටල් මෙහෙයුම් සහායකයා** වෙමි. 
මට ඔබට පහත දෑ සඳහා උදව් කළ හැකිය:
- 🛏️ **කාමර මෙහෙයුම්**: පවතින කාමර සෙවීම, කාමර තත්ත්වය පරීක්ෂා කිරීම සහ Cleanliness යාවත්කාලීන කිරීම.
- 📋 **වෙන්කිරීම්**: අද පැමිණීම් (Arrivals), පිටවීම් (Departures) සහ Folio බිල්පත් පරීක්ෂා කිරීම.
- 📦 **ඉන්වෙන්ටරි සහ බාර්**: අඩු තොග (Low Stock) අනතුරු ඇඟවීම් සහ මත්පැන් ප්‍රමාණයන්.
- 🌐 **චැනල් මැනේජර්**: Booking.com, Agoda සහ අනෙකුත් OTA නාලිකා සම්බන්ධතා සහ Sync කිරීම.
- 🖨️ **දෝෂ නිරාකරණය**: KOT මුද්‍රණ යන්ත්‍ර සහ දෘඩාංග දෝෂ.

ඔබට අවශ්‍ය කුමක්දැයි පවසන්න හෝ යතුරු ලියනය කරන්න!`,
          detectedLanguage: lang,
          suggestedFollowUps: [
            'පවතින කාමර පෙන්වන්න',
            'අද පැමිණීම් පෙන්වන්න',
            'අඩු තොග පරීක්ෂා කරන්න',
          ],
        };
      }

      if (lang === 'SINGLISH') {
        return {
          content: `Ayubowan! Mama oyaage **AI Hotel Operations Assistant**. 
Mata oyaata mehema udaw karanna puluwan:
- 🛏️ **Room Operations**: Available kamara balanna, room status check karanna, kamare clean karanna.
- 📋 **Front Desk**: Ada arrivals, departures, guest folio bills balanna.
- 📦 **Inventory & Bar**: Stock adu ewa, bar liquor levels balanna.
- 🌐 **Channel Manager**: Booking.com, Agoda OTA sync karanna.
- 🖨️ **Hardware Troubleshooting**: KOT printer weda nethnam troubleshoot karanna.

Oyaata monada dan karaganna ona?`,
          detectedLanguage: lang,
          suggestedFollowUps: [
            'Available rooms pennanna',
            'Ada arrivals monawada',
            'Low stock badu balanna',
          ],
        };
      }

      return {
        content: `Hello! I am your **AI Hotel Operations Assistant**. 
I can help you monitor and operate hotel systems across:
- 🛏️ **PMS & Housekeeping**: Check room status, find vacant rooms, update cleanliness (Clean, Dirty, Inspected).
- 📋 **Front Desk**: View today's arrivals & departures, inspect guest folios, handle check-in & check-out.
- 📦 **Inventory & Bar**: Monitor low stock alerts, view bar bottle counts & open milliliters, log wastage.
- 🌐 **Channel Manager**: Check OTA sync health (Booking.com, Agoda, Expedia, Airbnb) & trigger sync.
- 🖨️ **Diagnostics & SOPs**: Step-by-step troubleshooting for KOT receipt printers and hotel workflows.

How can I assist your operations today?`,
        detectedLanguage: lang,
        suggestedFollowUps: [
          'Show available rooms',
          'Show today arrivals',
          'Check low stock items',
          'Channel manager status',
        ],
      };
    }

    // Default Fallback
    return {
      content: `I understand your request regarding: "${rawMessage}". 

You can ask me to:
- **Query Data**: "Show available rooms", "Status of Room 101", "Today's arrivals", "Low stock items", "Daily sales summary".
- **Execute Operations**: "Mark Room 102 as CLEAN", "Check out Room 204", "Trigger Channel Sync".
- **Diagnose Hardware**: "Why is the KOT kitchen printer offline?".

Or try one of the quick actions below:`,
      detectedLanguage: lang,
      suggestedFollowUps: [
        'Show available rooms',
        'Show today arrivals',
        'Check low stock items',
        'Channel manager overview',
      ],
    };
  }

  /**
   * Gemini API integration (Google AI Studio)
   */
  private async callGemini(
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    userContext: any,
    lang: DetectedLanguage,
    knowledgeMatches: KnowledgeMatch[],
    customModel?: string,
  ): Promise<AiProviderResponse | null> {
    const apiKey = (this.geminiApiKey || '').trim();
    if (!apiKey) return null;

    try {
      let model = (customModel && customModel.startsWith('gemini'))
        ? customModel
        : this.geminiModel || 'gemini-3.5-flash';
      let url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const knowledgeContext = knowledgeMatches.length
        ? `\n\nOperational SOP Context from hotel manual:\n${knowledgeMatches.map((k) => `### ${k.title}\n${k.content}`).join('\n\n')}`
        : '';

      const systemPrompt = `You are the Hotel Operations AI Co-Pilot for our multi-tenant SaaS Hotel Management platform.
Property: ${userContext?.propertyId || 'Hotel'}, Staff Role: ${userContext?.role || 'STAFF'}, Screen: ${userContext?.currentPage || 'Dashboard'}.
Preferred Language: ${lang}. If the staff speaks in Sinhala or Singlish, reply fluently and respectfully in Sinhala or Singlish.
You assist with room management, arrivals/departures, check-ins, guest folio bills, housekeeping cleanliness, bar & inventory low stock alerts, channel manager sync, and POS/KOT printer troubleshooting.
Give structured, helpful, concise operational answers using markdown bolding and bullet points.${knowledgeContext}`;

      const contents = [
        ...history.slice(-6).map((h) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        })),
        {
          role: 'user',
          parts: [{ text: userMessage }],
        },
      ];

      let res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      });

      // If high-demand spike (503) or not found (404), attempt fallback to stable gemini-3.5-flash
      if (!res.ok && (res.status === 503 || res.status === 404) && model !== 'gemini-3.5-flash') {
        console.warn(`Gemini ${model} returned ${res.status}. Falling back to gemini-3.5-flash...`);
        model = 'gemini-3.5-flash';
        url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            },
          }),
        });
      }

      if (!res.ok) {
        const errText = await res.text();
        console.warn('Gemini generateContent non-200:', res.status, errText);
        return null;
      }

      const data: any = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!reply) return null;

      return {
        content: reply,
        detectedLanguage: lang,
        providerUsed: 'Google Gemini',
        modelUsed: model,
        matchedKnowledge: knowledgeMatches,
        suggestedFollowUps: [
          'Show available rooms',
          'Show today arrivals',
          'Check low stock items',
        ],
      };
    } catch (err: any) {
      console.warn('Gemini call failed:', err?.message);
      return null;
    }
  }

  /**
   * OpenAI API integration (ChatGPT)
   */
  private async callOpenAi(
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    userContext: any,
    lang: DetectedLanguage,
    knowledgeMatches: KnowledgeMatch[],
    customModel?: string,
  ): Promise<AiProviderResponse | null> {
    if (!this.openAiApiKey) return null;

    try {
      const model = customModel || this.openAiModel || 'gpt-4o-mini';
      const knowledgeContext = knowledgeMatches.length
        ? `\n\nOperational SOP Context:\n${knowledgeMatches.map((k) => `### ${k.title}\n${k.content}`).join('\n\n')}`
        : '';

      const systemPrompt = `You are the Hotel Operations AI Co-Pilot for a multi-tenant Hotel SaaS platform.
Staff Role: ${userContext?.role || 'STAFF'}, Screen: ${userContext?.currentPage || 'Dashboard'}, Lang: ${lang}.
Help staff operate PMS, Housekeeping, Inventory, and OTA Channels concisely.${knowledgeContext}`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
        { role: 'user', content: userMessage },
      ];

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openAiApiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
        }),
      });

      if (!res.ok) return null;
      const data: any = await res.json();
      const reply = data?.choices?.[0]?.message?.content;
      if (!reply) return null;

      return {
        content: reply,
        detectedLanguage: lang,
        providerUsed: 'OpenAI',
        modelUsed: model,
        matchedKnowledge: knowledgeMatches,
        suggestedFollowUps: ['Show available rooms', 'Show today arrivals'],
      };
    } catch {
      return null;
    }
  }

  /**
   * Anthropic Claude API integration
   */
  private async callAnthropic(
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    userContext: any,
    lang: DetectedLanguage,
    knowledgeMatches: KnowledgeMatch[],
    customModel?: string,
  ): Promise<AiProviderResponse | null> {
    if (!this.anthropicApiKey) return null;

    try {
      const model = customModel || this.anthropicModel || 'claude-3-5-sonnet-latest';
      const knowledgeContext = knowledgeMatches.length
        ? `\n\nHotel SOPs:\n${knowledgeMatches.map((k) => `### ${k.title}\n${k.content}`).join('\n\n')}`
        : '';

      const systemPrompt = `You are the Hotel Operations AI Assistant for a multi-tenant PMS platform.
Assist staff professionally in ${lang} with hotel operations.${knowledgeContext}`;

      const messages = [
        ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
        { role: 'user', content: userMessage },
      ];

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        }),
      });

      if (!res.ok) return null;
      const data: any = await res.json();
      const reply = data?.content?.[0]?.text;
      if (!reply) return null;

      return {
        content: reply,
        detectedLanguage: lang,
        providerUsed: 'Anthropic Claude',
        modelUsed: model,
        matchedKnowledge: knowledgeMatches,
        suggestedFollowUps: ['Show available rooms', 'Show today arrivals'],
      };
    } catch {
      return null;
    }
  }

  /**
   * DeepSeek API integration
   */
  private async callDeepSeek(
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    userContext: any,
    lang: DetectedLanguage,
    knowledgeMatches: KnowledgeMatch[],
    customModel?: string,
  ): Promise<AiProviderResponse | null> {
    if (!this.deepseekApiKey) return null;

    try {
      const model = customModel || this.deepseekModel || 'deepseek-chat';
      const knowledgeContext = knowledgeMatches.length
        ? `\n\nHotel SOP Context:\n${knowledgeMatches.map((k) => `### ${k.title}\n${k.content}`).join('\n\n')}`
        : '';

      const systemPrompt = `You are the Hotel Operations AI Assistant for a multi-tenant Hotel SaaS.
Assist staff in ${lang} with room operations, reservations, and inventory.${knowledgeContext}`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
        { role: 'user', content: userMessage },
      ];

      const res = await fetch(`${this.deepseekBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.deepseekApiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
        }),
      });

      if (!res.ok) return null;
      const data: any = await res.json();
      const reply = data?.choices?.[0]?.message?.content;
      if (!reply) return null;

      return {
        content: reply,
        detectedLanguage: lang,
        providerUsed: 'DeepSeek',
        modelUsed: model,
        matchedKnowledge: knowledgeMatches,
        suggestedFollowUps: ['Show available rooms', 'Show today arrivals'],
      };
    } catch {
      return null;
    }
  }

  /**
   * Groq Cloud API integration (Ultra-fast LPU inference: Llama 3.3 70B, Mixtral)
   */
  private async callGroq(
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    userContext: any,
    lang: DetectedLanguage,
    knowledgeMatches: KnowledgeMatch[],
    customModel?: string,
  ): Promise<AiProviderResponse | null> {
    const apiKey = (this.groqApiKey || '').trim();
    if (!apiKey) return null;

    try {
      const model = (customModel && (customModel.startsWith('qwen') || customModel.startsWith('openai') || customModel.startsWith('allam') || customModel.startsWith('meta-llama') || customModel.startsWith('llama')))
        ? customModel
        : this.groqModel || 'qwen/qwen3.8-27b';
      const knowledgeContext = knowledgeMatches.length
        ? `\n\nOperational SOP Context from hotel manual:\n${knowledgeMatches.map((k) => `### ${k.title}\n${k.content}`).join('\n\n')}`
        : '';

      const systemPrompt = `You are the Hotel Operations AI Assistant for a modern multi-tenant SaaS Hotel Management platform.
Property: ${userContext?.propertyId || 'Hotel'}, Staff Role: ${userContext?.role || 'STAFF'}, Screen: ${userContext?.currentPage || 'Dashboard'}.
Preferred Language: ${lang}. If staff speaks in Sinhala (සිංහල) or Singlish, answer fluently and politely in Sinhala or Singlish.
Assist with reservations, front-desk, room cleanliness, inventory alerts, OTA channels, and SOP troubleshooting.
Give structured, helpful, concise operational answers using markdown bolding and bullet points.${knowledgeContext}`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
        { role: 'user', content: userMessage },
      ];

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.6,
          max_tokens: 1024,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn('Groq API returned non-200:', res.status, errText);
        return null;
      }

      const data: any = await res.json();
      const reply = data?.choices?.[0]?.message?.content;
      if (!reply) return null;

      return {
        content: reply,
        detectedLanguage: lang,
        providerUsed: 'Groq Cloud',
        modelUsed: model,
        matchedKnowledge: knowledgeMatches,
        suggestedFollowUps: [
          'Show available rooms',
          'Show today arrivals',
          'Check low stock items',
        ],
      };
    } catch (err: any) {
      console.warn('Groq call failed:', err?.message);
      return null;
    }
  }

  /**
   * Resolve provider priority based on user selection or AI_DEFAULT_PROVIDER setting
   */
  private resolveProviderOrder(preferredProvider?: string): Array<'gemini' | 'groq' | 'openai' | 'claude' | 'deepseek'> {
    const target = (preferredProvider || this.defaultProvider || 'auto').toLowerCase();

    if (target === 'internal') return [];
    if (target === 'groq') return ['groq', 'gemini', 'openai', 'claude', 'deepseek'];
    if (target === 'gemini') return ['gemini', 'groq', 'openai', 'claude', 'deepseek'];
    if (target === 'openai' || target === 'gpt') return ['openai', 'groq', 'gemini', 'claude', 'deepseek'];
    if (target === 'claude' || target === 'anthropic') return ['claude', 'groq', 'gemini', 'openai', 'deepseek'];
    if (target === 'deepseek') return ['deepseek', 'groq', 'gemini', 'openai', 'claude'];

    // 'auto': prioritize any configured key in order of speed/cost
    return ['groq', 'gemini', 'openai', 'claude', 'deepseek'];
  }
}
