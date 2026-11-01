import { Injectable } from '@nestjs/common';

export type DetectedLanguage = 'EN' | 'SI' | 'SINGLISH';

@Injectable()
export class MultilingualService {
  // Common Singlish hotel keywords mapped to standard English intents
  private readonly singlishKeywordMap: Record<string, string[]> = {
    room: ['kamare', 'kamara', 'room', 'room eka', 'rooms'],
    clean: ['clean', 'sudda', 'pirisidu', 'clean karanna', 'clean da', 'asu karanna'],
    dirty: ['dirty', 'apirisidu', 'kunu', 'asapiri'],
    occupied: ['occupied', 'informa', 'innawa', 'minissu inne'],
    available: ['available', 'puluwan', 'his', 'free', 'empty'],
    reservation: ['booking', 'reservation', 'resrvation', 'lebunada', 'danna', 'booking ekak'],
    arrivals: ['ada ena', 'arrivals', 'enna inne', 'ada enawa'],
    departures: ['ada yana', 'departures', 'yanna inne', 'check out'],
    inventory: ['badu', 'stock', 'inventory', 'ithuru', 'iwarada', 'adu'],
    bar: ['bar', 'beema', 'liquor', 'bottle', 'arrakku', 'whisky', 'beer'],
    printer: ['printer', 'kot printer', 'print wenne na', 'bill eka print na'],
    sync: ['sync', 'ota', 'booking.com', 'agoda', 'airbnb', 'update wenne na'],
    sales: ['sales', 'revenue', 'ada kiyada', 'ada labapu gana', 'mudala'],
  };

  /**
   * Detects the language of a message: Sinhala script, Singlish, or English
   */
  detectLanguage(text: string): DetectedLanguage {
    if (!text || typeof text !== 'string') return 'EN';

    // Check for Sinhala Unicode block: \u0D80 to \u0DFF
    const sinhalaRegex = /[\u0D80-\u0DFF]/;
    if (sinhalaRegex.test(text)) {
      return 'SI';
    }

    // Check for Singlish patterns (Romanized phonetic Sinhala)
    const lower = text.toLowerCase();
    const singlishPatterns = [
      /\b(kamare|kamara|pirisidu|karanna|danna|kohomada|monawada|inna|innawa|balanna|denna|puluwanda|kiyada|ada|heta|ehema|wage|nam|eka|oya|apita|badu|ithuru|iwarada|adu)\b/,
      /\b(mata|oyaata|ape|mehe|methana|monada|mokakda|thiyenawada|nathnam|kiyanna|pennanna)\b/,
    ];

    for (const pattern of singlishPatterns) {
      if (pattern.test(lower)) {
        return 'SINGLISH';
      }
    }

    return 'EN';
  }

  /**
   * Normalizes technical hotel terms into standardized English query tokens
   * while keeping original terminology intact.
   */
  extractSemanticTokens(text: string): {
    normalizedText: string;
    detectedLanguage: DetectedLanguage;
    intentHints: string[];
    roomNumberMatch?: string;
  } {
    const language = this.detectLanguage(text);
    let normalized = text.toLowerCase().trim();

    // Extract potential room numbers (e.g., "room 101", "102 kamare", "kamare 204")
    const roomMatch = normalized.match(/(?:room|kamare|kamara)?\s*#?([0-9]{3,4})/i);
    const roomNumberMatch = roomMatch ? roomMatch[1] : undefined;

    const intentHints: string[] = [];

    // Map keywords
    for (const [key, aliases] of Object.entries(this.singlishKeywordMap)) {
      if (aliases.some((alias) => normalized.includes(alias))) {
        intentHints.push(key);
      }
    }

    // Sinhala script intent matching
    if (language === 'SI') {
      if (normalized.includes('කාමර') || normalized.includes('කාමරය')) intentHints.push('room');
      if (normalized.includes('පිරිසිදු') || normalized.includes('ක්ලීන්')) intentHints.push('clean');
      if (normalized.includes('අපිරිසිදු')) intentHints.push('dirty');
      if (normalized.includes('පැමිණීම්') || normalized.includes('එන')) intentHints.push('arrivals');
      if (normalized.includes('පිටවීම්') || normalized.includes('යන')) intentHints.push('departures');
      if (normalized.includes('තොග') || normalized.includes('ඉන්වෙන්ටරි')) intentHints.push('inventory');
      if (normalized.includes('බාර්') || normalized.includes('බීම')) intentHints.push('bar');
      if (normalized.includes('විකුණුම්') || normalized.includes('ආදායම')) intentHints.push('sales');
      if (normalized.includes('වෙන්කිරීම්') || normalized.includes('බුකින්')) intentHints.push('reservation');
    }

    return {
      normalizedText: normalized,
      detectedLanguage: language,
      intentHints: Array.from(new Set(intentHints)),
      roomNumberMatch,
    };
  }

  /**
   * Localizes operational confirmation headers and notes according to detected language
   */
  formatConfirmationMessage(
    lang: DetectedLanguage,
    summary: string,
    actionType: string,
  ): { title: string; prompt: string; confirmBtn: string; cancelBtn: string } {
    if (lang === 'SI') {
      return {
        title: 'මෙහෙයුම් තහවුරු කිරීම අවශ්‍යයි',
        prompt: `කරුණාකර පහත ක්‍රියාව තහවුරු කරන්න: **${summary}**. ඔබ මෙම ක්‍රියාව සිදු කිරීමට කැමතිද?`,
        confirmBtn: 'තහවුරු කර ක්‍රියාත්මක කරන්න',
        cancelBtn: 'අවලංගු කරන්න',
      };
    }

    if (lang === 'SINGLISH') {
      return {
        title: 'Operation eka Confirm karanna',
        prompt: `Karunakarala me action eka confirm karanna: **${summary}**. Oyaata meka execute karannada ona?`,
        confirmBtn: 'Confirm & Execute',
        cancelBtn: 'Cancel',
      };
    }

    return {
      title: 'Action Confirmation Required',
      prompt: `Please verify and confirm the following action: **${summary}**. Do you want to proceed with this operation?`,
      confirmBtn: 'Confirm & Execute',
      cancelBtn: 'Cancel',
    };
  }
}
