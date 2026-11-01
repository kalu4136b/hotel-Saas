export interface ChannelCredentials {
  apiKey?: string;
  apiSecret?: string;
  hotelId?: string;
  username?: string;
  password?: string;
  endpointUrl?: string;
  icalImportUrl?: string;
  [key: string]: any;
}

export interface ChannelCapabilities {
  supportsAvailabilityPush: boolean;
  supportsRatePush: boolean;
  supportsRestrictions: boolean;
  supportsReservationPull: boolean;
  supportsWebhooks: boolean;
  supportsDynamicPricing: boolean;
  requiresOfficialPartnerApproval: boolean;
  officialDocumentationUrl?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface ConnectionHealthResult {
  healthy: boolean;
  latencyMs: number;
  message: string;
  externalPropertyId?: string;
  propertyName?: string;
  requiresPartnerApproval?: boolean;
}

export interface ExternalProperty {
  id: string;
  name: string;
  currency: string;
  city?: string;
}

export interface ExternalRoomType {
  id: string;
  name: string;
  maxOccupancy?: number;
  description?: string;
}

export interface ExternalRatePlan {
  id: string;
  name: string;
  mealPlan?: string;
  cancellationPolicy?: string;
}

export interface AvailabilitySyncRequest {
  propertyId: string;
  externalPropertyId: string;
  credentials: ChannelCredentials;
  roomMappings: Array<{
    internalRoomTypeId: string;
    externalRoomId: string;
  }>;
  dailyAvailability: Array<{
    date: string;
    internalRoomTypeId: string;
    availableRooms: number;
    stopSell?: boolean;
  }>;
}

export interface RateSyncRequest {
  propertyId: string;
  externalPropertyId: string;
  credentials: ChannelCredentials;
  ratePlanMappings: Array<{
    internalRatePlanCode: string;
    externalRatePlanId: string;
  }>;
  dailyRates: Array<{
    date: string;
    internalRoomTypeId: string;
    externalRoomId: string;
    externalRatePlanId: string;
    rate: number;
    currency: string;
    minStay?: number;
    maxStay?: number;
    closedToArrival?: boolean;
    closedToDeparture?: boolean;
  }>;
}

export interface SyncResult {
  success: boolean;
  httpStatusCode?: number;
  message: string;
  requestPayload?: string;
  responsePayload?: string;
  itemsProcessed?: number;
}

export interface ExternalReservation {
  externalId: string;
  channelCode: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  checkInDate: string;
  checkOutDate: string;
  roomTypeId?: string;
  externalRoomId?: string;
  externalRatePlanId?: string;
  adultsCount: number;
  childrenCount: number;
  totalAmount: number;
  currency: string;
  commissionAmount?: number;
  status: string; // 'CONFIRMED', 'CANCELLED', 'MODIFIED'
  specialRequests?: string;
  rawPayload: any;
}

export interface WebhookProcessResult {
  handled: boolean;
  eventType: string;
  externalReservationId?: string;
  actionRequired?: 'CREATE_RESERVATION' | 'CANCEL_RESERVATION' | 'MODIFY_RESERVATION' | 'IGNORE';
  reservationData?: ExternalReservation;
  message?: string;
}

export interface ChannelManagerProvider {
  readonly channelCode: string;
  readonly displayName: string;
  readonly capabilities: ChannelCapabilities;

  validateCredentials(credentials: ChannelCredentials): ValidationResult;
  testConnection(credentials: ChannelCredentials): Promise<ConnectionHealthResult>;

  fetchExternalProperties?(credentials: ChannelCredentials): Promise<ExternalProperty[]>;
  fetchExternalRoomTypes?(credentials: ChannelCredentials, propertyId: string): Promise<ExternalRoomType[]>;
  fetchExternalRatePlans?(credentials: ChannelCredentials, propertyId: string): Promise<ExternalRatePlan[]>;

  syncAvailability(request: AvailabilitySyncRequest): Promise<SyncResult>;
  syncRatesAndRestrictions(request: RateSyncRequest): Promise<SyncResult>;

  fetchNewReservations?(credentials: ChannelCredentials, propertyId: string): Promise<ExternalReservation[]>;
  processWebhook?(payload: any, headers: Record<string, string>): Promise<WebhookProcessResult>;
}
