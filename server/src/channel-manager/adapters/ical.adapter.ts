import { Injectable } from '@nestjs/common';
import {
  ChannelManagerProvider,
  ChannelCapabilities,
  ChannelCredentials,
  ValidationResult,
  ConnectionHealthResult,
  AvailabilitySyncRequest,
  RateSyncRequest,
  SyncResult,
  ExternalReservation,
} from './base.adapter';

@Injectable()
export class ICalAdapter implements ChannelManagerProvider {
  readonly channelCode = 'ICAL';
  readonly displayName = 'Universal 2-Way iCal / Calendar Sync';
  readonly capabilities: ChannelCapabilities = {
    supportsAvailabilityPush: true,
    supportsRatePush: false, // iCal standard only syncs date availability blocks, not monetary pricing
    supportsRestrictions: false,
    supportsReservationPull: true,
    supportsWebhooks: false, // Feed polling based
    supportsDynamicPricing: false,
    requiresOfficialPartnerApproval: false,
    officialDocumentationUrl: 'https://en.wikipedia.org/wiki/ICalendar',
  };

  validateCredentials(credentials: ChannelCredentials): ValidationResult {
    const errors: string[] = [];
    if (credentials.icalImportUrl && !credentials.icalImportUrl.startsWith('http')) {
      errors.push('iCal import URL must be a valid HTTP or HTTPS calendar link');
    }
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async testConnection(credentials: ChannelCredentials): Promise<ConnectionHealthResult> {
    const start = Date.now();
    if (!credentials.icalImportUrl) {
      return {
        healthy: true,
        latencyMs: 1,
        message: 'iCal outbound feed generator is active. (Inbound feed optional)',
      };
    }

    try {
      const response = await fetch(credentials.icalImportUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'HotelSaaS-ChannelManager/1.0' },
        signal: AbortSignal.timeout(6000),
      });

      const latencyMs = Date.now() - start;
      if (!response.ok) {
        return {
          healthy: false,
          latencyMs,
          message: `Calendar server responded with HTTP status ${response.status}`,
        };
      }

      const text = await response.text();
      if (!text.includes('BEGIN:VCALENDAR')) {
        return {
          healthy: false,
          latencyMs,
          message: 'Target URL does not return a valid iCalendar (RFC 5545) stream',
        };
      }

      return {
        healthy: true,
        latencyMs,
        message: 'Successfully connected and verified external iCal calendar feed',
      };
    } catch (err: any) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        message: `Failed to fetch external calendar: ${err.message}`,
      };
    }
  }

  async syncAvailability(request: AvailabilitySyncRequest): Promise<SyncResult> {
    // iCal outbound sync is exposed as a live GET endpoint that dynamically generates
    // RFC 5545 VCALENDAR content whenever external OTAs poll our feed.
    return {
      success: true,
      message: `Outbound iCal calendar feed updated with ${request.dailyAvailability.length} date entries`,
      itemsProcessed: request.dailyAvailability.length,
      requestPayload: JSON.stringify({ datesCount: request.dailyAvailability.length }),
      responsePayload: JSON.stringify({ status: 'FEED_READY' }),
    };
  }

  async syncRatesAndRestrictions(request: RateSyncRequest): Promise<SyncResult> {
    return {
      success: true,
      message: 'iCal standard operates on calendar availability. Rates are maintained internally.',
      itemsProcessed: 0,
    };
  }

  /**
   * Fetch events from external iCal calendar URL and parse them into reservation objects
   */
  async fetchNewReservations(
    credentials: ChannelCredentials,
    propertyId: string,
  ): Promise<ExternalReservation[]> {
    if (!credentials.icalImportUrl) return [];

    try {
      const response = await fetch(credentials.icalImportUrl, {
        headers: { 'User-Agent': 'HotelSaaS-ChannelManager/1.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return [];

      const text = await response.text();
      return this.parseIcsToReservations(text);
    } catch (err) {
      console.error('Failed to parse inbound iCal reservations:', err);
      return [];
    }
  }

  /**
   * Generates standard RFC 5545 iCalendar format from internal reservations
   */
  generateIcsFeed(
    propertyName: string,
    roomTypeName: string,
    reservations: Array<{
      id: string;
      reservationNumber: string;
      checkInDate: string;
      checkOutDate: string;
      guestName?: string;
    }>,
  ): string {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Hotel SaaS//Channel Manager iCal Feed//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${propertyName} - ${roomTypeName}`,
      'X-WR-TIMEZONE:UTC',
    ];

    for (const res of reservations) {
      const dtStart = res.checkInDate.replace(/-/g, '');
      const dtEnd = res.checkOutDate.replace(/-/g, '');
      lines.push(
        'BEGIN:VEVENT',
        `UID:${res.id}@hotelsaas.com`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        `SUMMARY:Reserved - ${res.reservationNumber}`,
        `DESCRIPTION:Guest Stay booked via Hotel SaaS (${res.guestName || 'Confidential'})`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
      );
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  /**
   * Simple RFC 5545 parser extracting VEVENT components
   */
  private parseIcsToReservations(icsText: string): ExternalReservation[] {
    const reservations: ExternalReservation[] = [];
    const eventBlocks = icsText.split('BEGIN:VEVENT');

    for (let i = 1; i < eventBlocks.length; i++) {
      const block = eventBlocks[i].split('END:VEVENT')[0];
      const getField = (prefix: string) => {
        const line = block.split(/\r?\n/).find((l) => l.startsWith(prefix));
        return line ? line.substring(prefix.length).trim() : '';
      };

      const uid = getField('UID:') || `ical-${Date.now()}-${i}`;
      const summary = getField('SUMMARY:') || 'External Booking (iCal)';
      let dtStartRaw = getField('DTSTART;VALUE=DATE:') || getField('DTSTART:');
      let dtEndRaw = getField('DTEND;VALUE=DATE:') || getField('DTEND:');

      if (!dtStartRaw || !dtEndRaw) continue;

      // Format YYYYMMDD to YYYY-MM-DD
      const formatIcsDate = (raw: string) => {
        const clean = raw.replace(/\D/g, '').slice(0, 8);
        if (clean.length === 8) {
          return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
        }
        return '';
      };

      const checkInDate = formatIcsDate(dtStartRaw);
      const checkOutDate = formatIcsDate(dtEndRaw);

      if (!checkInDate || !checkOutDate) continue;

      reservations.push({
        externalId: uid,
        channelCode: 'ICAL',
        guestName: summary.replace(/Reserved|Booking|Reservation/gi, '').trim() || 'iCal Guest',
        checkInDate,
        checkOutDate,
        adultsCount: 2,
        childrenCount: 0,
        totalAmount: 0,
        currency: 'LKR',
        status: 'CONFIRMED',
        rawPayload: { uid, summary, dtStartRaw, dtEndRaw },
      });
    }

    return reservations;
  }
}
