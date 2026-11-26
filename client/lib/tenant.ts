import { useState, useEffect } from 'react';

export interface PublicTenantInfo {
  id: string;
  name: string;
  slug: string;
  status: string;
  subscriptionTier: string;
  propertyName?: string;
  currency?: string;
  timezone?: string;
  logoUrl?: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Extracts tenant slug from browser hostname or URL query param.
 * Examples:
 * - grandpalace.hotelia.tenura.tech -> "grandpalace"
 * - grandpalace.localhost:3000 -> "grandpalace"
 * - localhost:3000?tenant=grandpalace -> "grandpalace"
 * - app.hotelia.tenura.tech -> null (root portal)
 */
export function getTenantSlugFromHost(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Check query parameter override (?tenant=slug)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const tenantParam = urlParams.get('tenant');
    if (tenantParam && tenantParam.trim().length > 0) {
      return tenantParam.trim().toLowerCase();
    }
  } catch {
    // Ignore URL parse errors
  }

  // 2. Extract from hostname
  const host = window.location.hostname.toLowerCase();
  
  // Ignore IP addresses
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
    return null;
  }

  const parts = host.split('.');

  // Subdomain on localhost: e.g. "grandpalace.localhost"
  if (parts.length === 2 && parts[1] === 'localhost') {
    const sub = parts[0];
    if (sub !== 'www' && sub !== 'app' && sub !== 'api') {
      return sub;
    }
    return null;
  }

  // Subdomain on domain: e.g. "grandpalace.hotelia.tenura.tech"
  // Note: "hotelia.tenura.tech" itself is the platform root portal, NOT a tenant subdomain.
  if (host === 'hotelia.tenura.tech' || host.endsWith('.tenura.tech') && parts.length === 3 && parts[0] === 'hotelia') {
    return null;
  }

  if (parts.length >= 3) {
    const sub = parts[0];
    if (sub !== 'www' && sub !== 'app' && sub !== 'api' && sub !== 'admin' && sub !== 'hotelia') {
      return sub;
    }
  }

  return null;
}

/**
 * Fetches public tenant info by slug, with local caching in sessionStorage.
 */
export async function fetchPublicTenant(slug: string): Promise<PublicTenantInfo | null> {
  if (!slug) return null;
  const cleanSlug = slug.toLowerCase().trim();
  const cacheKey = `hotel_saas_pub_tenant_${cleanSlug}`;

  // Check sessionStorage cache
  if (typeof window !== 'undefined') {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/tenants/public/lookup?slug=${encodeURIComponent(cleanSlug)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.tenant) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(cacheKey, JSON.stringify(data.tenant));
      }
      return data.tenant as PublicTenantInfo;
    }
  } catch (err) {
    console.warn('Failed to load tenant public branding:', err);
  }

  return null;
}

/**
 * React hook that resolves the current tenant branding state for the client.
 */
export function useTenantBranding() {
  const [tenant, setTenant] = useState<PublicTenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    const detectedSlug = getTenantSlugFromHost();
    setSlug(detectedSlug);

    if (!detectedSlug) {
      setLoading(false);
      return;
    }

    fetchPublicTenant(detectedSlug)
      .then((info) => setTenant(info))
      .finally(() => setLoading(false));
  }, []);

  return {
    tenant,
    slug,
    loading,
    isCustomTenant: Boolean(tenant),
  };
}
