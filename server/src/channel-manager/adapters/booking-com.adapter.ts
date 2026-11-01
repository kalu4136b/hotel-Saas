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
  WebhookProcessResult,
} from './base.adapter';

@Injectable()
export class BookingComAdapter implements ChannelManagerProvider {
  readonly channelCode = 'BOOKING_COM';
  readonly displayName = 'Booking.com';
  readonly capabilities: ChannelCapabilities = {
    supportsAvailabilityPush: true,
    supportsRatePush: true,
    supportsRestrictions: true,
    supportsReservationPull: true,
    supportsWebhooks: true,
    supportsDynamicPricing: true,
    requiresOfficialPartnerApproval: true,
    officialDocumentationUrl:
      'https://connectivity.booking.com/partner-portal',
  };

  validateCredentials(credentials: ChannelCredentials): ValidationResult {
    const errors: string[] = [];
    if (!credentials.hotelId?.trim()) {
      errors.push('Booking.com Hotel ID (Numeric) is required');
    }
    if (!credentials.username?.trim()) {
      errors.push('Booking.com Machine Account Username is required');
    }
    if (!credentials.password?.trim()) {
      errors.push('Booking.com Machine Account Password is required');
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
      'https://supply-xml.booking.com/hotels/xml/availability';

    const start = Date.now();
    try {
      // Dispatch probe request to Booking.com supply XML endpoint
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          Authorization:
            'Basic ' +
            Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64'),
        },
        body: `<OTA_PingRQ xmlns="http://www.opentravel.org/OTA/2003/05" TimeStamp="${new Date().toISOString()}"><EchoData>HotelSaaS-Ping</EchoData></OTA_PingRQ>`,
        signal: AbortSignal.timeout(7000),
      });

      const latencyMs = Date.now() - start;
      const responseText = await response.text();

      if (response.status === 401 || response.status === 403) {
        return {
          healthy: false,
          latencyMs,
          message:
            'Booking.com authentication rejected: Verify Machine Account credentials and ensure Channel Manager provider status is authorized for Hotel ID ' +
            credentials.hotelId,
          requiresPartnerApproval: true,
        };
      }

      if (!response.ok) {
        return {
          healthy: false,
          latencyMs,
          message: `Booking.com returned HTTP ${response.status}: ${responseText.slice(0, 150)}`,
        };
      }

      return {
        healthy: true,
        latencyMs,
        message: 'Successfully verified connection with Booking.com Connectivity Partner Gateway',
        externalPropertyId: credentials.hotelId,
      };
    } catch (err: any) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        message: `Connection attempt failed: ${err.message}. Ensure your machine account IP is whitelisted in Booking.com Connectivity Portal.`,
        requiresPartnerApproval: true,
      };
    }
  }

  async syncAvailability(request: AvailabilitySyncRequest): Promise<SyncResult> {
    const { credentials, dailyAvailability, roomMappings } = request;
    const endpoint =
      credentials.endpointUrl ||
      'https://supply-xml.booking.com/hotels/xml/availability';

    // Construct OTA_HotelAvailNotifRQ XML specification
    const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelAvailNotifRQ xmlns="http://www.opentravel.org/OTA/2003/05" TimeStamp="${new Date().toISOString()}" Target="Production" Version="1.003">
  <AvailStatusMessages HotelCode="${request.externalPropertyId}">
    ${dailyAvailability
      .map((item) => {
        const mapping = roomMappings.find(
          (m) => m.internalRoomTypeId === item.internalRoomTypeId,
        );
        const externalRoomId = mapping?.externalRoomId || item.internalRoomTypeId;
        return `
    <AvailStatusMessage BookingLimit="${item.availableRooms}">
      <StatusApplicationControl Start="${item.date}" End="${item.date}" InvCode="${externalRoomId}" ${
          item.stopSell ? 'Restriction="Master" Status="Close"' : 'Status="Open"'
        }/>
    </AvailStatusMessage>`;
      })
      .join('\n')}
  </AvailStatusMessages>
</OTA_HotelAvailNotifRQ>`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          Authorization:
            'Basic ' +
            Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64'),
        },
        body: xmlPayload,
        signal: AbortSignal.timeout(10000),
      });

      const responseText = await response.text();
      const success = response.ok && !responseText.includes('<Errors>');

      return {
        success,
        httpStatusCode: response.status,
        message: success
          ? `Successfully synchronized availability with Booking.com for ${dailyAvailability.length} date entries`
          : 'Booking.com returned rejection response during availability notification',
        requestPayload: xmlPayload,
        responsePayload: responseText,
        itemsProcessed: dailyAvailability.length,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to dispatch availability to Booking.com: ${err.message}`,
        requestPayload: xmlPayload,
        responsePayload: err.message,
      };
    }
  }

  async syncRatesAndRestrictions(request: RateSyncRequest): Promise<SyncResult> {
    const { credentials, dailyRates } = request;
    const endpoint =
      credentials.endpointUrl ||
      'https://supply-xml.booking.com/hotels/xml/rates';

    const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelRateAmountNotifRQ xmlns="http://www.opentravel.org/OTA/2003/05" TimeStamp="${new Date().toISOString()}" Target="Production" Version="1.003">
  <RateAmountMessages HotelCode="${request.externalPropertyId}">
    ${dailyRates
      .map(
        (r) => `
    <RateAmountMessage>
      <StatusApplicationControl Start="${r.date}" End="${r.date}" InvCode="${r.externalRoomId}" RatePlanCode="${r.externalRatePlanId}"/>
      <Rates>
        <Rate CurrencyCode="${r.currency}">
          <BaseByGuestAmts>
            <BaseByGuestAmt AmountAfterTax="${r.rate.toFixed(2)}"/>
          </BaseByGuestAmts>
        </Rate>
      </Rates>
    </RateAmountMessage>`,
      )
      .join('\n')}
  </RateAmountMessages>
</OTA_HotelRateAmountNotifRQ>`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          Authorization:
            'Basic ' +
            Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64'),
        },
        body: xmlPayload,
        signal: AbortSignal.timeout(10000),
      });

      const responseText = await response.text();
      const success = response.ok && !responseText.includes('<Errors>');

      return {
        success,
        httpStatusCode: response.status,
        message: success
          ? `Successfully synchronized rates with Booking.com for ${dailyRates.length} entries`
          : 'Booking.com returned rejection response during rate notification',
        requestPayload: xmlPayload,
        responsePayload: responseText,
        itemsProcessed: dailyRates.length,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to dispatch rates to Booking.com: ${err.message}`,
        requestPayload: xmlPayload,
        responsePayload: err.message,
      };
    }
  }

  async processWebhook(payload: any, headers: Record<string, string>): Promise<WebhookProcessResult> {
    // Booking.com push reservation webhook format parser
    if (!payload) {
      return { handled: false, eventType: 'UNKNOWN', message: 'Empty payload' };
    }

    const reservation = payload.reservation || payload;
    const externalId = reservation.id || reservation.reservation_id || reservation.booking_id;
    if (!externalId) {
      return { handled: false, eventType: 'UNKNOWN', message: 'No reservation identifier found' };
    }

    const action = reservation.status === 'cancelled' ? 'CANCEL_RESERVATION' : 'CREATE_RESERVATION';

    return {
      handled: true,
      eventType: action,
      externalReservationId: String(externalId),
      actionRequired: action,
      reservationData: {
        externalId: String(externalId),
        channelCode: 'BOOKING_COM',
        guestName: `${reservation.customer?.first_name || ''} ${reservation.customer?.last_name || ''}`.trim() || 'Booking.com Guest',
        guestEmail: reservation.customer?.email,
        guestPhone: reservation.customer?.telephone,
        checkInDate: reservation.arrival_date || reservation.checkin,
        checkOutDate: reservation.departure_date || reservation.checkout,
        externalRoomId: String(reservation.room?.id || reservation.room_id || ''),
        adultsCount: Number(reservation.number_of_guests) || 2,
        childrenCount: Number(reservation.number_of_children) || 0,
        totalAmount: Number(reservation.total_price) || 0,
        currency: reservation.currency || 'LKR',
        commissionAmount: Number(reservation.commission_amount) || 0,
        status: reservation.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED',
        specialRequests: reservation.remarks || reservation.special_requests,
        rawPayload: payload,
      },
      message: `Parsed Booking.com reservation notification ${externalId}`,
    };
  }
}
