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
  WebhookProcessResult,
} from './base.adapter';

@Injectable()
export class AgodaAdapter implements ChannelManagerProvider {
  readonly channelCode = 'AGODA';
  readonly displayName = 'Agoda YCS';
  readonly capabilities: ChannelCapabilities = {
    supportsAvailabilityPush: true,
    supportsRatePush: true,
    supportsRestrictions: true,
    supportsReservationPull: true,
    supportsWebhooks: true,
    supportsDynamicPricing: true,
    requiresOfficialPartnerApproval: true,
    officialDocumentationUrl: 'https://ycs.agoda.com/',
  };

  validateCredentials(credentials: ChannelCredentials): ValidationResult {
    const errors: string[] = [];
    if (!credentials.hotelId?.trim()) {
      errors.push('Agoda Hotel / Property ID is required');
    }
    if (!credentials.apiKey?.trim()) {
      errors.push('Agoda YCS API Key or Partner Token is required');
    }
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async testConnection(credentials: ChannelCredentials): Promise<ConnectionHealthResult> {
    const validation = this.validateCredentials(credentials);
    if (!validation.valid) {
      return {
        healthy: false,
        latencyMs: 0,
        message: validation.errors?.join(', ') || 'Incomplete credentials',
        requiresPartnerApproval: true,
      };
    }

    const endpoint =
      credentials.endpointUrl ||
      'https://ycs.agoda.com/api/v1/properties';

    const start = Date.now();
    try {
      const response = await fetch(`${endpoint}/${credentials.hotelId}/status`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(7000),
      });

      const latencyMs = Date.now() - start;
      if (response.status === 401 || response.status === 403) {
        return {
          healthy: false,
          latencyMs,
          message:
            'Agoda YCS authentication rejected: Check your API Key and ensure Channel Manager connectivity is enabled in Agoda YCS for Hotel ID ' +
            credentials.hotelId,
          requiresPartnerApproval: true,
        };
      }

      if (!response.ok) {
        return {
          healthy: false,
          latencyMs,
          message: `Agoda YCS returned HTTP ${response.status}`,
        };
      }

      return {
        healthy: true,
        latencyMs,
        message: 'Successfully authenticated with Agoda YCS Connectivity API',
        externalPropertyId: credentials.hotelId,
      };
    } catch (err: any) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        message: `Connection test error: ${err.message}`,
        requiresPartnerApproval: true,
      };
    }
  }

  async syncAvailability(request: AvailabilitySyncRequest): Promise<SyncResult> {
    const { credentials, dailyAvailability, roomMappings } = request;
    const endpoint =
      credentials.endpointUrl ||
      'https://ycs.agoda.com/api/v1/properties';

    const payload = {
      hotelId: request.externalPropertyId,
      inventoryUpdates: dailyAvailability.map((item) => {
        const mapping = roomMappings.find(
          (m) => m.internalRoomTypeId === item.internalRoomTypeId,
        );
        return {
          roomId: mapping?.externalRoomId || item.internalRoomTypeId,
          date: item.date,
          allotment: item.availableRooms,
          closed: item.stopSell || false,
        };
      }),
    };

    try {
      const response = await fetch(
        `${endpoint}/${request.externalPropertyId}/inventory`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${credentials.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000),
        },
      );

      const responseText = await response.text();
      return {
        success: response.ok,
        httpStatusCode: response.status,
        message: response.ok
          ? `Successfully synchronized availability with Agoda YCS for ${dailyAvailability.length} entries`
          : `Agoda YCS rejected availability: ${responseText.slice(0, 150)}`,
        requestPayload: JSON.stringify(payload, null, 2),
        responsePayload: responseText,
        itemsProcessed: dailyAvailability.length,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Agoda dispatch failed: ${err.message}`,
        requestPayload: JSON.stringify(payload, null, 2),
        responsePayload: err.message,
      };
    }
  }

  async syncRatesAndRestrictions(request: RateSyncRequest): Promise<SyncResult> {
    const { credentials, dailyRates } = request;
    const endpoint =
      credentials.endpointUrl ||
      'https://ycs.agoda.com/api/v1/properties';

    const payload = {
      hotelId: request.externalPropertyId,
      rates: dailyRates.map((r) => ({
        roomId: r.externalRoomId,
        ratePlanId: r.externalRatePlanId,
        date: r.date,
        price: r.rate,
        currency: r.currency,
        minStay: r.minStay || 1,
        maxStay: r.maxStay || 30,
        closedToArrival: r.closedToArrival || false,
        closedToDeparture: r.closedToDeparture || false,
      })),
    };

    try {
      const response = await fetch(
        `${endpoint}/${request.externalPropertyId}/rates`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${credentials.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000),
        },
      );

      const responseText = await response.text();
      return {
        success: response.ok,
        httpStatusCode: response.status,
        message: response.ok
          ? `Successfully synchronized rates with Agoda for ${dailyRates.length} entries`
          : `Agoda rejected rates: ${responseText.slice(0, 150)}`,
        requestPayload: JSON.stringify(payload, null, 2),
        responsePayload: responseText,
        itemsProcessed: dailyRates.length,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Agoda rates dispatch failed: ${err.message}`,
        requestPayload: JSON.stringify(payload, null, 2),
        responsePayload: err.message,
      };
    }
  }

  async processWebhook(payload: any, headers: Record<string, string>): Promise<WebhookProcessResult> {
    if (!payload?.bookingId && !payload?.booking_reference) {
      return { handled: false, eventType: 'UNKNOWN', message: 'Missing Agoda booking reference' };
    }

    const bookingId = payload.bookingId || payload.booking_reference;
    const isCancel = payload.status === 'Cancelled' || payload.booking_status === 'CANCELLED';

    return {
      handled: true,
      eventType: isCancel ? 'CANCEL_RESERVATION' : 'CREATE_RESERVATION',
      externalReservationId: String(bookingId),
      actionRequired: isCancel ? 'CANCEL_RESERVATION' : 'CREATE_RESERVATION',
      reservationData: {
        externalId: String(bookingId),
        channelCode: 'AGODA',
        guestName: payload.lead_guest_name || `${payload.guest_first_name || ''} ${payload.guest_last_name || ''}`.trim() || 'Agoda Guest',
        guestEmail: payload.guest_email,
        guestPhone: payload.guest_phone,
        checkInDate: payload.check_in_date || payload.arrival_date,
        checkOutDate: payload.check_out_date || payload.departure_date,
        externalRoomId: String(payload.room_id || ''),
        adultsCount: Number(payload.occupancy?.adults) || 2,
        childrenCount: Number(payload.occupancy?.children) || 0,
        totalAmount: Number(payload.total_rate) || 0,
        currency: payload.currency || 'LKR',
        commissionAmount: Number(payload.commission) || 0,
        status: isCancel ? 'CANCELLED' : 'CONFIRMED',
        specialRequests: payload.special_request,
        rawPayload: payload,
      },
      message: `Parsed Agoda booking ${bookingId}`,
    };
  }
}
