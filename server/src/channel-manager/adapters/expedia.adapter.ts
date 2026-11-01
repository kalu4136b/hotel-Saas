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
export class ExpediaAdapter implements ChannelManagerProvider {
  readonly channelCode = 'EXPEDIA';
  readonly displayName = 'Expedia Partner Central';
  readonly capabilities: ChannelCapabilities = {
    supportsAvailabilityPush: true,
    supportsRatePush: true,
    supportsRestrictions: true,
    supportsReservationPull: true,
    supportsWebhooks: true,
    supportsDynamicPricing: true,
    requiresOfficialPartnerApproval: true,
    officialDocumentationUrl:
      'https://developer.expediapartnersolutions.com/',
  };

  validateCredentials(credentials: ChannelCredentials): ValidationResult {
    const errors: string[] = [];
    if (!credentials.hotelId?.trim()) {
      errors.push('Expedia Hotel ID is required');
    }
    if (!credentials.apiKey?.trim()) {
      errors.push('Expedia API Key is required');
    }
    if (!credentials.apiSecret?.trim()) {
      errors.push('Expedia API Secret is required');
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
      'https://services.expediapartnercentral.com/properties/v1';

    const start = Date.now();
    try {
      const response = await fetch(`${endpoint}/${credentials.hotelId}/rates`, {
        method: 'GET',
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString('base64'),
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
            'Expedia authentication failed: Ensure your API Key and Secret are active in Expedia Partner Central for Hotel ID ' +
            credentials.hotelId,
          requiresPartnerApproval: true,
        };
      }

      if (!response.ok) {
        return {
          healthy: false,
          latencyMs,
          message: `Expedia returned HTTP ${response.status}`,
        };
      }

      return {
        healthy: true,
        latencyMs,
        message: 'Successfully authenticated with Expedia Partner Central API',
        externalPropertyId: credentials.hotelId,
      };
    } catch (err: any) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        message: `Connection test failed: ${err.message}`,
        requiresPartnerApproval: true,
      };
    }
  }

  async syncAvailability(request: AvailabilitySyncRequest): Promise<SyncResult> {
    const { credentials, dailyAvailability, roomMappings } = request;
    const endpoint =
      credentials.endpointUrl ||
      'https://services.expediapartnercentral.com/properties/v1';

    const payload = {
      hotelId: request.externalPropertyId,
      availabilities: dailyAvailability.map((item) => {
        const mapping = roomMappings.find(
          (m) => m.internalRoomTypeId === item.internalRoomTypeId,
        );
        return {
          roomTypeId: mapping?.externalRoomId || item.internalRoomTypeId,
          date: item.date,
          inventory: item.availableRooms,
          closed: item.stopSell || false,
        };
      }),
    };

    try {
      const response = await fetch(
        `${endpoint}/${request.externalPropertyId}/availabilities`,
        {
          method: 'PUT',
          headers: {
            Authorization:
              'Basic ' +
              Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString('base64'),
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
          ? `Successfully synchronized availability with Expedia for ${dailyAvailability.length} entries`
          : `Expedia rejected availability update: ${responseText.slice(0, 150)}`,
        requestPayload: JSON.stringify(payload, null, 2),
        responsePayload: responseText,
        itemsProcessed: dailyAvailability.length,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Expedia dispatch error: ${err.message}`,
        requestPayload: JSON.stringify(payload, null, 2),
        responsePayload: err.message,
      };
    }
  }

  async syncRatesAndRestrictions(request: RateSyncRequest): Promise<SyncResult> {
    const { credentials, dailyRates } = request;
    const endpoint =
      credentials.endpointUrl ||
      'https://services.expediapartnercentral.com/properties/v1';

    const payload = {
      hotelId: request.externalPropertyId,
      rates: dailyRates.map((r) => ({
        roomTypeId: r.externalRoomId,
        ratePlanId: r.externalRatePlanId,
        date: r.date,
        amount: r.rate,
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
          method: 'PUT',
          headers: {
            Authorization:
              'Basic ' +
              Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString('base64'),
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
          ? `Successfully synchronized rates with Expedia for ${dailyRates.length} entries`
          : `Expedia rejected rates: ${responseText.slice(0, 150)}`,
        requestPayload: JSON.stringify(payload, null, 2),
        responsePayload: responseText,
        itemsProcessed: dailyRates.length,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Expedia rate dispatch error: ${err.message}`,
        requestPayload: JSON.stringify(payload, null, 2),
        responsePayload: err.message,
      };
    }
  }

  async processWebhook(payload: any, headers: Record<string, string>): Promise<WebhookProcessResult> {
    if (!payload?.bookingId && !payload?.reservationId) {
      return { handled: false, eventType: 'UNKNOWN', message: 'Missing Expedia booking reference' };
    }

    const bookingId = payload.bookingId || payload.reservationId;
    const isCancel = payload.status === 'CANCELLED' || payload.type === 'CANCELLATION';

    return {
      handled: true,
      eventType: isCancel ? 'CANCEL_RESERVATION' : 'CREATE_RESERVATION',
      externalReservationId: String(bookingId),
      actionRequired: isCancel ? 'CANCEL_RESERVATION' : 'CREATE_RESERVATION',
      reservationData: {
        externalId: String(bookingId),
        channelCode: 'EXPEDIA',
        guestName: payload.primaryGuestName || `${payload.guest?.firstName || ''} ${payload.guest?.lastName || ''}`.trim() || 'Expedia Guest',
        guestEmail: payload.guest?.email,
        guestPhone: payload.guest?.phone,
        checkInDate: payload.checkInDate || payload.stayDates?.checkIn,
        checkOutDate: payload.checkOutDate || payload.stayDates?.checkOut,
        externalRoomId: String(payload.roomTypeId || ''),
        adultsCount: Number(payload.guestCount?.adults) || 2,
        childrenCount: Number(payload.guestCount?.children) || 0,
        totalAmount: Number(payload.totalPricing?.amount) || 0,
        currency: payload.totalPricing?.currency || 'LKR',
        commissionAmount: Number(payload.totalPricing?.commission) || 0,
        status: isCancel ? 'CANCELLED' : 'CONFIRMED',
        specialRequests: payload.specialRequests,
        rawPayload: payload,
      },
      message: `Parsed Expedia booking ${bookingId}`,
    };
  }
}
