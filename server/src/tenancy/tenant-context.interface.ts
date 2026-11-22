import { SubscriptionTier, TenantStatus } from '../entities/tenant.entity';

export type TenantStorageMode = 'SHARED' | 'DEDICATED';

export interface TenantPropertyConfig {
  id: string;
  name: string;
  code?: string;
  currency: string;
  timezone: string;
  defaultTaxRate: number;
  serviceChargeRate: number;
}

export interface TenantContext {
  tenantId: string;
  slug: string;
  name: string;
  status: TenantStatus;
  subscriptionTier: SubscriptionTier;
  subscriptionPlan: string;
  modules: string[];
  maxRooms?: number;
  maxStaff?: number;
  expiresAt?: string | null;
  storageMode: TenantStorageMode;

  // Selected or default property
  propertyId?: string;
  property?: TenantPropertyConfig;

  // Dedicated DB Connection info (when storageMode === 'DEDICATED')
  dbHost?: string;
  dbPort?: number;
  dbName?: string;
  dbUser?: string;
  dbPassword?: string;
}
