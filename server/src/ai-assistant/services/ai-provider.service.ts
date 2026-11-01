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
  private readonly geminiApiKey?: string;
  private readonly openAiApiKey?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly toolRegistry: ToolRegistryService,
    private readonly multilingualService: MultilingualService,
    private readonly knowledgeBaseService: KnowledgeBaseService,
  ) {
    this.geminiApiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      this.configService.get<string>('GOOGLE_API_KEY');
    this.openAiApiKey = this.configService.get<string>('OPENAI_API_KEY');
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
    },
  ): Promise<AiProviderResponse> {
    const { detectedLanguage, normalizedText, intentHints, roomNumberMatch } =
      this.multilingualService.extractSemanticTokens(userMessage);

    // 1. Search knowledge base for SOPs / troubleshooting queries
    const knowledgeMatches = await this.knowledgeBaseService.searchKnowledgeBase(
      userMessage,
    );

    // 2. If external LLM key is configured, we can attempt LLM function calling
    if (this.geminiApiKey) {
      try {
        const geminiRes = await this.callGemini(
          userMessage,
          history,
          userContext,
          detectedLanguage,
          knowledgeMatches,
        );
        if (geminiRes) return geminiRes;
      } catch (err: any) {
        console.warn('Gemini API call failed, falling back to operations engine:', err?.message);
      }
    }

    if (this.openAiApiKey) {
      try {
        const openAiRes = await this.callOpenAi(
          userMessage,
          history,
          userContext,
          detectedLanguage,
          knowledgeMatches,
        );
        if (openAiRes) return openAiRes;
      } catch (err: any) {
        console.warn('OpenAI API call failed, falling back to operations engine:', err?.message);
      }
    }

    // 3. Built-in Operations NLP Engine (deterministic, instantaneous, offline-ready)
    return this.processWithInternalEngine(
      userMessage,
      normalizedText,
      detectedLanguage,
      intentHints,
      roomNumberMatch,
      knowledgeMatches,
      userContext,
    );
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
   * Optional Gemini API integration if GEMINI_API_KEY is present
   */
  private async callGemini(
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    userContext: any,
    lang: DetectedLanguage,
    knowledgeMatches: KnowledgeMatch[],
  ): Promise<AiProviderResponse | null> {
    // If external call is made, parse response and return. Otherwise return null for fallback.
    return null;
  }

  /**
   * Optional OpenAI API integration if OPENAI_API_KEY is present
   */
  private async callOpenAi(
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    userContext: any,
    lang: DetectedLanguage,
    knowledgeMatches: KnowledgeMatch[],
  ): Promise<AiProviderResponse | null> {
    return null;
  }
}
