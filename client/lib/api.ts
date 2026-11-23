const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

import { getTenantSlugFromHost } from './tenant';

export interface UserSession {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  phone?: string;
  avatarUrl?: string;
  permissions?: string[];
}

export interface TenantSession {
  id: string;
  name: string;
  slug: string;
  subscriptionTier: string;
  status?: string;
  plan?: string;
  modules?: string[];
}

export interface PropertySession {
  id: string;
  name: string;
  currency: string;
  defaultTaxRate: number;
}

export interface AuthResponse {
  accessToken: string;
  user: UserSession;
  tenant: TenantSession;
  property: PropertySession;
}

const getStorageItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(key) || localStorage.getItem(key);
};

const removeStorageItem = (key: string) => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(key);
  localStorage.removeItem(key);
};

export const authStorage = {
  // Scoped Token Resolution:
  // If requesting a Super Admin endpoint or on /admin, prioritize admin token.
  // If requesting a Tenant endpoint or on /dashboard, prioritize tenant token.
  getToken(forScope?: 'admin' | 'tenant'): string | null {
    if (typeof window === 'undefined') return null;

    if (forScope === 'admin') {
      return (
        getStorageItem('hotel_saas_admin_token') ||
        getStorageItem('hotel_saas_token')
      );
    }
    if (forScope === 'tenant') {
      return (
        getStorageItem('hotel_saas_tenant_token') ||
        getStorageItem('hotel_saas_token')
      );
    }

    // Auto-detect based on current URL path if in browser
    const path = window.location.pathname;
    if (path.startsWith('/admin')) {
      return (
        getStorageItem('hotel_saas_admin_token') ||
        getStorageItem('hotel_saas_token')
      );
    }
    if (path.startsWith('/dashboard')) {
      return (
        getStorageItem('hotel_saas_tenant_token') ||
        getStorageItem('hotel_saas_token')
      );
    }

    return (
      getStorageItem('hotel_saas_tenant_token') ||
      getStorageItem('hotel_saas_admin_token') ||
      getStorageItem('hotel_saas_token')
    );
  },

  setSession(data: AuthResponse, rememberMe = true) {
    if (typeof window === 'undefined') return;
    const store = rememberMe ? localStorage : sessionStorage;

    if (data.user?.role === 'SUPER_ADMIN') {
      removeStorageItem('hotel_saas_admin_token');
      removeStorageItem('hotel_saas_admin_user');
      store.setItem('hotel_saas_admin_token', data.accessToken);
      store.setItem('hotel_saas_admin_user', JSON.stringify(data.user));
    } else {
      removeStorageItem('hotel_saas_tenant_token');
      removeStorageItem('hotel_saas_tenant_user');
      removeStorageItem('hotel_saas_tenant_tenant');
      removeStorageItem('hotel_saas_tenant_property');
      store.setItem('hotel_saas_tenant_token', data.accessToken);
      store.setItem('hotel_saas_tenant_user', JSON.stringify(data.user));
      if (data.tenant) {
        store.setItem('hotel_saas_tenant_tenant', JSON.stringify(data.tenant));
      }
      if (data.property) {
        store.setItem('hotel_saas_tenant_property', JSON.stringify(data.property));
      }
    }

    removeStorageItem('hotel_saas_token');
    removeStorageItem('hotel_saas_user');
    removeStorageItem('hotel_saas_tenant');
    removeStorageItem('hotel_saas_property');
    store.setItem('hotel_saas_token', data.accessToken);
    store.setItem('hotel_saas_user', JSON.stringify(data.user));
    store.setItem('hotel_saas_tenant', JSON.stringify(data.tenant));
    store.setItem('hotel_saas_property', JSON.stringify(data.property));
  },

  getUser(forScope?: 'admin' | 'tenant'): UserSession | null {
    if (typeof window === 'undefined') return null;

    if (forScope === 'admin') {
      const item = getStorageItem('hotel_saas_admin_user');
      if (item) return JSON.parse(item);
    }
    if (forScope === 'tenant') {
      const item = getStorageItem('hotel_saas_tenant_user');
      if (item) return JSON.parse(item);
    }

    // Auto-detect scope by path
    const path = window.location.pathname;
    if (path.startsWith('/admin')) {
      const item = getStorageItem('hotel_saas_admin_user');
      if (item) return JSON.parse(item);
    }
    if (path.startsWith('/dashboard')) {
      const item = getStorageItem('hotel_saas_tenant_user');
      if (item) return JSON.parse(item);
    }

    const item =
      getStorageItem('hotel_saas_user') ||
      getStorageItem('hotel_saas_tenant_user') ||
      getStorageItem('hotel_saas_admin_user');
    return item ? JSON.parse(item) : null;
  },

  getAdminUser(): UserSession | null {
    if (typeof window === 'undefined') return null;
    const item = getStorageItem('hotel_saas_admin_user');
    return item ? JSON.parse(item) : null;
  },

  getTenantUser(): UserSession | null {
    if (typeof window === 'undefined') return null;
    const item = getStorageItem('hotel_saas_tenant_user');
    return item ? JSON.parse(item) : null;
  },

  getAdminToken(): string | null {
    if (typeof window === 'undefined') return null;
    return getStorageItem('hotel_saas_admin_token');
  },

  getTenantToken(): string | null {
    if (typeof window === 'undefined') return null;
    return getStorageItem('hotel_saas_tenant_token');
  },

  getProperty(): PropertySession | null {
    if (typeof window === 'undefined') return null;
    const item =
      getStorageItem('hotel_saas_tenant_property') ||
      getStorageItem('hotel_saas_property');
    return item ? JSON.parse(item) : null;
  },

  setProperty(property: any) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('hotel_saas_tenant_property', JSON.stringify(property));
    localStorage.setItem('hotel_saas_property', JSON.stringify(property));
  },

  getTenant(): TenantSession | null {
    if (typeof window === 'undefined') return null;
    const item =
      getStorageItem('hotel_saas_tenant_tenant') ||
      getStorageItem('hotel_saas_tenant');
    return item ? JSON.parse(item) : null;
  },

  clearAdminSession() {
    if (typeof window === 'undefined') return;
    removeStorageItem('hotel_saas_admin_token');
    removeStorageItem('hotel_saas_admin_user');
    removeStorageItem('hotel_saas_token');
    removeStorageItem('hotel_saas_user');
  },

  clearTenantSession() {
    if (typeof window === 'undefined') return;
    removeStorageItem('hotel_saas_tenant_token');
    removeStorageItem('hotel_saas_tenant_user');
    removeStorageItem('hotel_saas_tenant_tenant');
    removeStorageItem('hotel_saas_tenant_property');
    removeStorageItem('hotel_saas_token');
    removeStorageItem('hotel_saas_user');
    removeStorageItem('hotel_saas_tenant');
    removeStorageItem('hotel_saas_property');
  },

  clearSession() {
    if (typeof window === 'undefined') return;
    [
      'hotel_saas_token',
      'hotel_saas_user',
      'hotel_saas_tenant',
      'hotel_saas_property',
      'hotel_saas_admin_token',
      'hotel_saas_admin_user',
      'hotel_saas_tenant_token',
      'hotel_saas_tenant_user',
      'hotel_saas_tenant_tenant',
      'hotel_saas_tenant_property',
    ].forEach(removeStorageItem);
  },
};

export function formatCurrency(
  amount: number | string | undefined | null,
  currency?: string
): string {
  const num = Number(amount) || 0;
  let propCurrency = 'LKR';
  try {
    propCurrency = authStorage.getProperty()?.currency || 'LKR';
  } catch (e) {
    propCurrency = 'LKR';
  }
  const curr = currency || propCurrency || 'LKR';
  const formatted = num.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (curr === 'LKR') {
    return `Rs. ${formatted}`;
  }
  return `${curr} ${formatted}`;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const isSuperAdminCall = endpoint.startsWith('/api/super-admin');
  const token = isSuperAdminCall
    ? authStorage.getAdminToken() || authStorage.getToken('admin')
    : authStorage.getTenantToken() || authStorage.getToken('tenant');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Attach tenant slug if detected from host/subdomain or active tenant session
  const activeTenantSlug =
    (typeof window !== 'undefined' ? getTenantSlugFromHost() : null) ||
    authStorage.getTenant()?.slug;

  if (activeTenantSlug && !headers['X-Tenant-Slug']) {
    headers['X-Tenant-Slug'] = activeTenantSlug;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // If unauthorized and not the login endpoint itself, clean up the stale session
    if (res.status === 401 && !endpoint.includes('/api/auth/login')) {
      if (isSuperAdminCall) {
        authStorage.clearAdminSession();
      } else {
        authStorage.clearTenantSession();
      }
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    const errorMsg =
      (Array.isArray(data.message) ? data.message.join(', ') : data.message) ||
      `HTTP error ${res.status}: ${res.statusText}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const authApi = {
  async login(body: {
    usernameOrEmail: string;
    password: string;
    rememberMe?: boolean;
  }): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    authStorage.setSession(response, body.rememberMe ?? true);
    return response;
  },

  async getMe() {
    return apiRequest('/api/auth/me', { method: 'GET' });
  },

  async logout(scope?: 'admin' | 'tenant') {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network / token errors on logout
    } finally {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hotel-saas-logout'));
      }
      if (scope === 'admin') {
        authStorage.clearAdminSession();
      } else if (scope === 'tenant') {
        authStorage.clearTenantSession();
      } else {
        authStorage.clearSession();
      }
    }
  },
};

export const dashboardApi = {
  async getStats() {
    return apiRequest('/api/dashboard/stats', { method: 'GET' });
  },

  async getRecentOrders() {
    return apiRequest('/api/dashboard/recent-orders', { method: 'GET' });
  },

  async getTopProducts() {
    return apiRequest('/api/dashboard/top-products', { method: 'GET' });
  },

  async getLiveTables() {
    return apiRequest('/api/dashboard/live-tables', { method: 'GET' });
  },
};

export const posApi = {
  async getCategories() {
    return apiRequest('/api/pos/categories', { method: 'GET' });
  },

  async createCategory(data: { name: string; description?: string; sortOrder?: number }) {
    return apiRequest('/api/pos/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getProducts(categoryId?: string) {
    const query = categoryId ? `?categoryId=${categoryId}` : '';
    return apiRequest(`/api/pos/products${query}`, { method: 'GET' });
  },

  async createProduct(data: {
    name: string;
    sku?: string;
    categoryId: string;
    price: number;
    taxRate?: number;
    description?: string;
  }) {
    return apiRequest('/api/pos/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateProduct(
    id: string,
    data: {
      name?: string;
      price?: number;
      isActive?: boolean;
      description?: string;
    },
  ) {
    return apiRequest(`/api/pos/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteProduct(id: string) {
    return apiRequest(`/api/pos/products/${id}`, { method: 'DELETE' });
  },

  async getTables() {
    return apiRequest('/api/pos/tables', { method: 'GET' });
  },

  async createTable(data: { tableNumber: string; capacity?: number }) {
    return apiRequest('/api/pos/tables', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteTable(id: string) {
    return apiRequest(`/api/pos/tables/${id}`, { method: 'DELETE' });
  },

  async getTableActiveOrder(tableId: string) {
    return apiRequest(`/api/pos/tables/${tableId}/active-order`, { method: 'GET' });
  },

  async getCurrentShift() {
    return apiRequest('/api/pos/shifts/current', { method: 'GET' });
  },

  async openShift(startingFloat: number, notes?: string) {
    return apiRequest('/api/pos/shifts/open', {
      method: 'POST',
      body: JSON.stringify({ startingFloat, notes }),
    });
  },

  async closeShift(shiftId: string, actualCashCount: number, notes?: string) {
    return apiRequest('/api/pos/shifts/close', {
      method: 'POST',
      body: JSON.stringify({ shiftId, actualCashCount, notes }),
    });
  },

  async getOrders(status?: string, tableId?: string) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (tableId) params.append('tableId', tableId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/api/pos/orders${query}`, { method: 'GET' });
  },

  async getOrder(id: string) {
    return apiRequest(`/api/pos/orders/${id}`, { method: 'GET' });
  },

  async createOrder(data: {
    orderType: 'DINE_IN' | 'TAKEAWAY';
    tableId?: string;
    customerName?: string;
    guestCount?: number;
    notes?: string;
    items: Array<{ productId: string; quantity: number; notes?: string }>;
  }) {
    return apiRequest('/api/pos/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async sendToKitchen(orderId: string) {
    return apiRequest(`/api/pos/orders/${orderId}/kot`, {
      method: 'POST',
    });
  },

  async getKitchenKots() {
    return apiRequest('/api/pos/kitchen/kots', { method: 'GET' });
  },

  async updateKotStatus(kotId: string, status: string) {
    return apiRequest(`/api/pos/kitchen/kots/${kotId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async generateBill(orderId: string) {
    return apiRequest(`/api/pos/orders/${orderId}/bill`, {
      method: 'POST',
    });
  },

  async settlePayment(
    orderId: string,
    data: {
      paymentMethod: 'CASH' | 'CARD' | 'ROOM_CHARGE';
      amountPaid: number;
      cardLast4?: string;
      transactionRef?: string;
      roomId?: string;
    },
  ) {
    return apiRequest(`/api/pos/orders/${orderId}/payment`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async cancelOrder(orderId: string, reason: string) {
    return apiRequest(`/api/pos/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};

export const reportsApi = {
  async getDailySales(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/api/reports/daily-sales${query}`, { method: 'GET' });
  },

  async getPayments(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/api/reports/payments${query}`, { method: 'GET' });
  },

  async getItemSales(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/api/reports/item-sales${query}`, { method: 'GET' });
  },

  async getCancellations(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/api/reports/cancellations${query}`, { method: 'GET' });
  },
};

export const settingsApi = {
  async getProperty() {
    return apiRequest('/api/settings/property', { method: 'GET' });
  },

  async updateProperty(data: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    currency?: string;
    defaultTaxRate?: number;
    serviceChargeRate?: number;
  }) {
    return apiRequest('/api/settings/property', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getPermissionsMeta() {
    return apiRequest('/api/settings/permissions-meta', { method: 'GET' });
  },

  async getUsers() {
    return apiRequest('/api/settings/users', { method: 'GET' });
  },

  async createUser(data: {
    fullName: string;
    username: string;
    email: string;
    phone?: string;
    password: string;
    role: 'MANAGER' | 'CASHIER' | 'KITCHEN';
    permissions?: string[];
  }) {
    return apiRequest('/api/settings/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateUser(userId: string, data: {
    fullName?: string;
    phone?: string;
    role?: 'MANAGER' | 'CASHIER' | 'KITCHEN';
    permissions?: string[];
    password?: string;
  }) {
    return apiRequest(`/api/settings/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async toggleUserStatus(userId: string, isActive: boolean) {
    return apiRequest(`/api/settings/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },

  async getAuditLogs() {
    return apiRequest('/api/settings/audit-logs', { method: 'GET' });
  },
};

export const pmsApi = {
  async getRoomTypes() {
    return apiRequest('/api/pms/room-types', { method: 'GET' });
  },

  async createRoomType(data: {
    name: string;
    code?: string;
    basePricePerNight: number;
    maxOccupancy?: number;
    bedType?: string;
    amenities?: string;
    description?: string;
  }) {
    return apiRequest('/api/pms/room-types', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getRooms() {
    return apiRequest('/api/pms/rooms', { method: 'GET' });
  },

  async createRoom(data: {
    roomTypeId: string;
    roomNumber: string;
    floor?: number;
    notes?: string;
  }) {
    return apiRequest('/api/pms/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCleanliness(roomId: string, status: string) {
    return apiRequest(`/api/pms/rooms/${roomId}/cleanliness`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async bulkUpdateCleanliness(roomIds: string[], status: string) {
    return apiRequest('/api/pms/rooms/bulk-cleanliness', {
      method: 'POST',
      body: JSON.stringify({ roomIds, status }),
    });
  },

  async updateRoomNotes(roomId: string, notes: string) {
    return apiRequest(`/api/pms/rooms/${roomId}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    });
  },

  async updateOccupancy(roomId: string, status: string) {
    return apiRequest(`/api/pms/rooms/${roomId}/occupancy`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async getGuests() {
    return apiRequest('/api/pms/guests', { method: 'GET' });
  },

  async createGuest(data: {
    fullName: string;
    email?: string;
    phone?: string;
    passportOrId?: string;
    nationality?: string;
    vipLevel?: string;
    notes?: string;
  }) {
    return apiRequest('/api/pms/guests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getReservations(status?: string, search?: string) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/api/pms/reservations${query}`, { method: 'GET' });
  },

  async createReservation(data: {
    guestName: string;
    guestEmail?: string;
    guestPhone?: string;
    passportOrId?: string;
    nationality?: string;
    roomTypeId: string;
    roomId?: string;
    checkInDate: string;
    checkOutDate: string;
    adultsCount?: number;
    childrenCount?: number;
    depositPaid?: number;
    source?: string;
    specialRequests?: string;
  }) {
    return apiRequest('/api/pms/reservations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async checkIn(reservationId: string, roomId?: string) {
    return apiRequest(`/api/pms/reservations/${reservationId}/check-in`, {
      method: 'POST',
      body: JSON.stringify({ roomId }),
    });
  },

  async checkOut(reservationId: string) {
    return apiRequest(`/api/pms/reservations/${reservationId}/check-out`, {
      method: 'POST',
    });
  },

  async getFolio(reservationId: string) {
    return apiRequest(`/api/pms/folios/${reservationId}`, { method: 'GET' });
  },

  async postFolioCharge(
    reservationId: string,
    data: {
      chargeType: string;
      description: string;
      amount: number;
      referenceId?: string;
    },
  ) {
    return apiRequest(`/api/pms/folios/${reservationId}/charges`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async postFolioPayment(
    reservationId: string,
    data: {
      paymentMethod: string;
      amount: number;
      receiptNumber?: string;
    },
  ) {
    return apiRequest(`/api/pms/folios/${reservationId}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export const inventoryApi = {
  // Items
  async getItems(
    category?: string,
    search?: string,
    lowStock?: boolean,
    itemType?: string,
    subcategory?: string,
  ) {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (subcategory) params.append('subcategory', subcategory);
    if (search) params.append('search', search);
    if (lowStock) params.append('lowStock', 'true');
    if (itemType) params.append('itemType', itemType);
    const q = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/api/inventory/items${q}`, { method: 'GET' });
  },

  async getItem(id: string) {
    return apiRequest(`/api/inventory/items/${id}`, { method: 'GET' });
  },

  async createItem(data: any) {
    return apiRequest('/api/inventory/items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateItem(id: string, data: any) {
    return apiRequest(`/api/inventory/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteItem(id: string) {
    return apiRequest(`/api/inventory/items/${id}`, {
      method: 'DELETE',
    });
  },

  async adjustStock(
    id: string,
    data: {
      quantity: number;
      movementType?: string;
      unitCost?: number;
      reason: string;
      referenceId?: string;
      department?: string;
    },
  ) {
    return apiRequest(`/api/inventory/items/${id}/adjust`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Purchase Orders (PO)
  async getPurchaseOrders(params?: {
    status?: string;
    category?: string;
    supplierId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.append('status', params.status);
    if (params?.category) qs.append('category', params.category);
    if (params?.supplierId) qs.append('supplierId', params.supplierId);
    if (params?.search) qs.append('search', params.search);
    if (params?.startDate) qs.append('startDate', params.startDate);
    if (params?.endDate) qs.append('endDate', params.endDate);
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return apiRequest(`/api/inventory/purchase-orders${q}`, { method: 'GET' });
  },

  async getPurchaseOrder(id: string) {
    return apiRequest(`/api/inventory/purchase-orders/${id}`, { method: 'GET' });
  },

  async createPurchaseOrder(data: any) {
    return apiRequest('/api/inventory/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updatePurchaseOrder(id: string, data: any) {
    return apiRequest(`/api/inventory/purchase-orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async approvePurchaseOrder(id: string) {
    return apiRequest(`/api/inventory/purchase-orders/${id}/approve`, {
      method: 'POST',
    });
  },

  async cancelPurchaseOrder(id: string, reason?: string) {
    return apiRequest(`/api/inventory/purchase-orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async receivePurchaseOrder(id: string) {
    return apiRequest(`/api/inventory/purchase-orders/${id}/receive`, {
      method: 'POST',
    });
  },

  // Goods Received Notes (GRN)
  async getGRNs(params?: {
    poId?: string;
    supplierId?: string;
    category?: string;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const qs = new URLSearchParams();
    if (params?.poId) qs.append('poId', params.poId);
    if (params?.supplierId) qs.append('supplierId', params.supplierId);
    if (params?.category) qs.append('category', params.category);
    if (params?.status) qs.append('status', params.status);
    if (params?.search) qs.append('search', params.search);
    if (params?.startDate) qs.append('startDate', params.startDate);
    if (params?.endDate) qs.append('endDate', params.endDate);
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return apiRequest(`/api/inventory/grns${q}`, { method: 'GET' });
  },

  async getGRN(id: string) {
    return apiRequest(`/api/inventory/grns/${id}`, { method: 'GET' });
  },

  async createGRN(data: {
    purchaseOrderId: string;
    deliveryNoteNumber?: string;
    receivedDate?: string;
    notes?: string;
    items: Array<{
      purchaseOrderItemId?: string;
      inventoryItemId: string;
      quantityReceiving: number;
      quantityAccepted: number;
      quantityRejected?: number;
      rejectionReason?: string;
      unitCost: number;
      batchNumber?: string;
      expiryDate?: string;
    }>;
  }) {
    return apiRequest('/api/inventory/grns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Operational Issuance
  async getIssuances(params?: {
    department?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const qs = new URLSearchParams();
    if (params?.department) qs.append('department', params.department);
    if (params?.search) qs.append('search', params.search);
    if (params?.startDate) qs.append('startDate', params.startDate);
    if (params?.endDate) qs.append('endDate', params.endDate);
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return apiRequest(`/api/inventory/issuances${q}`, { method: 'GET' });
  },

  async getIssuance(id: string) {
    return apiRequest(`/api/inventory/issuances/${id}`, { method: 'GET' });
  },

  async createIssuance(data: {
    department: string;
    receivedByName: string;
    notes?: string;
    items: Array<{
      inventoryItemId: string;
      quantity: number;
      purpose?: string;
      assetTag?: string;
      serialNumber?: string;
    }>;
  }) {
    return apiRequest('/api/inventory/issuances', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Stock Movements Audit
  async getMovements(params?: {
    itemId?: string;
    category?: string;
    movementType?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const qs = new URLSearchParams();
    if (params?.itemId) qs.append('itemId', params.itemId);
    if (params?.category) qs.append('category', params.category);
    if (params?.movementType) qs.append('movementType', params.movementType);
    if (params?.startDate) qs.append('startDate', params.startDate);
    if (params?.endDate) qs.append('endDate', params.endDate);
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return apiRequest(`/api/inventory/movements${q}`, { method: 'GET' });
  },

  // Recipe (BOM)
  async getRecipe(productId: string) {
    return apiRequest(`/api/inventory/recipes/${productId}`, { method: 'GET' });
  },

  async saveRecipe(
    productId: string,
    items: Array<{ inventoryItemId: string; quantityRequired: number }>,
  ) {
    return apiRequest(`/api/inventory/recipes/${productId}`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },

  // Suppliers
  async getSuppliers() {
    return apiRequest('/api/inventory/suppliers', { method: 'GET' });
  },

  async createSupplier(data: {
    name: string;
    supplierCode?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    paymentTerms?: string;
    taxNumber?: string;
  }) {
    return apiRequest('/api/inventory/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSupplier(id: string, data: any) {
    return apiRequest(`/api/inventory/suppliers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Reports
  async getSummaryStats() {
    return apiRequest('/api/inventory/reports/summary', { method: 'GET' });
  },

  async getStockReport(category?: string) {
    const q = category ? `?category=${category}` : '';
    return apiRequest(`/api/inventory/reports/stock${q}`, { method: 'GET' });
  },

  async getValuationReport() {
    return apiRequest('/api/inventory/reports/valuation', { method: 'GET' });
  },

  async getLowStockReport(category?: string) {
    const q = category ? `?category=${category}` : '';
    return apiRequest(`/api/inventory/reports/low-stock${q}`, { method: 'GET' });
  },

  async getDepartmentIssuanceReport(params?: { startDate?: string; endDate?: string }) {
    const qs = new URLSearchParams();
    if (params?.startDate) qs.append('startDate', params.startDate);
    if (params?.endDate) qs.append('endDate', params.endDate);
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return apiRequest(`/api/inventory/reports/department-issuance${q}`, { method: 'GET' });
  },
};

export const superAdminApi = {
  async getPackages() {
    return apiRequest('/api/super-admin/packages', { method: 'GET' });
  },

  async getOverview() {
    return apiRequest('/api/super-admin/overview', { method: 'GET' });
  },

  async getTenants(params?: { search?: string; status?: string; plan?: string }) {
    const qs = new URLSearchParams();
    if (params?.search) qs.append('search', params.search);
    if (params?.status) qs.append('status', params.status);
    if (params?.plan) qs.append('plan', params.plan);
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return apiRequest(`/api/super-admin/tenants${q}`, { method: 'GET' });
  },

  async getTenant(id: string) {
    return apiRequest(`/api/super-admin/tenants/${id}`, { method: 'GET' });
  },

  async createTenant(data: {
    name: string;
    slug?: string;
    subscriptionPlan: string;
    modules?: string[];
    planPrice?: number;
    billingCycle?: 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
    maxRooms?: number;
    maxStaff?: number;
    propertyName?: string;
    currency?: string;
    adminFullName: string;
    adminUsername: string;
    adminEmail: string;
    adminPhone?: string;
    adminPassword: string;
    storageMode?: 'SHARED' | 'DEDICATED';
    dbHost?: string;
    dbPort?: number;
    dbDatabaseName?: string;
    dbUsername?: string;
    dbPassword?: string;
  }) {
    return apiRequest('/api/super-admin/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateModules(id: string, modules: string[]) {
    return apiRequest(`/api/super-admin/tenants/${id}/modules`, {
      method: 'PATCH',
      body: JSON.stringify({ modules }),
    });
  },

  async updateSubscription(
    id: string,
    data: {
      subscriptionPlan?: string;
      status?: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
      planPrice?: number;
      billingCycle?: 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
      maxRooms?: number;
      maxStaff?: number;
      expiresAt?: string | null;
    },
  ) {
    return apiRequest(`/api/super-admin/tenants/${id}/subscription`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async resetPassword(id: string, newPassword: string) {
    return apiRequest(`/api/super-admin/tenants/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },

  async getTenantDomains(id: string) {
    return apiRequest<{
      tenantId: string;
      tenantSlug: string;
      defaultSubdomain: string;
      domains: Array<{
        id: string;
        tenantId: string;
        domain: string;
        isPrimary: boolean;
        isVerified: boolean;
        createdAt: string;
      }>;
    }>(`/api/super-admin/tenants/${id}/domains`, {
      method: 'GET',
    });
  },

  async addTenantDomain(id: string, domain: string, isPrimary = false) {
    return apiRequest(`/api/super-admin/tenants/${id}/domains`, {
      method: 'POST',
      body: JSON.stringify({ domain, isPrimary }),
    });
  },

  async deleteTenantDomain(id: string, domainId: string) {
    return apiRequest(`/api/super-admin/tenants/${id}/domains/${domainId}`, {
      method: 'DELETE',
    });
  },

  async setPrimaryDomain(id: string, domainId: string) {
    return apiRequest(`/api/super-admin/tenants/${id}/domains/${domainId}/primary`, {
      method: 'PUT',
    });
  },

  async getTenantDatabase(id: string) {
    return apiRequest<{
      tenantId: string;
      storageMode: 'SHARED' | 'DEDICATED';
      dbHost: string | null;
      dbPort: number | null;
      dbDatabaseName: string | null;
      dbUsername: string | null;
      isDedicated: boolean;
      resolvedDatabase: string;
      status: 'ONLINE' | 'ERROR';
      tableCount?: number;
      error?: string;
    }>(`/api/super-admin/tenants/${id}/database`, {
      method: 'GET',
    });
  },

  async provisionDedicatedDatabase(id: string, options?: { dbName?: string }) {
    return apiRequest<{
      success: boolean;
      message: string;
      databaseName: string;
      tenant: any;
    }>(`/api/super-admin/tenants/${id}/database/provision`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
  },

  async syncTenantDatabaseSchema(id: string) {
    return apiRequest<{
      success: boolean;
      message: string;
      tableCount: number;
    }>(`/api/super-admin/tenants/${id}/database/sync-schema`, {
      method: 'POST',
    });
  },
};

export const barApi = {
  async getItems(
    categoryOrParams?: string | { category?: string; search?: string; lowStock?: boolean },
    search?: string,
    lowStock?: boolean,
  ) {
    const params = new URLSearchParams();
    if (typeof categoryOrParams === 'object' && categoryOrParams !== null) {
      if (categoryOrParams.category && categoryOrParams.category !== 'ALL') {
        params.append('category', categoryOrParams.category);
      }
      if (categoryOrParams.search) params.append('search', categoryOrParams.search);
      if (categoryOrParams.lowStock) params.append('lowStock', 'true');
    } else {
      if (categoryOrParams && categoryOrParams !== 'ALL') params.append('category', categoryOrParams);
      if (search) params.append('search', search);
      if (lowStock) params.append('lowStock', 'true');
    }
    const q = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/api/bar/items${q}`, { method: 'GET' });
  },

  async getItem(id: string) {
    return apiRequest(`/api/bar/items/${id}`, { method: 'GET' });
  },

  async createItem(data: {
    name: string;
    category: string;
    brand?: string;
    bottleSizeMl?: number;
    fullBottlesStock?: number;
    currentBottleRemainingMl?: number;
    standardPourMl?: number;
    costPerBottle?: number;
    pricePerPour?: number;
    pricePerBottle?: number;
    parLevelBottles?: number;
  }) {
    return apiRequest('/api/bar/items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateItem(id: string, data: any) {
    return apiRequest(`/api/bar/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteItem(id: string) {
    return apiRequest(`/api/bar/items/${id}`, { method: 'DELETE' });
  },

  async quickPour(data: {
    barItemId: string;
    millilitersPoured: number;
    servingsCount?: number;
    pourType?: string;
    unitPriceOverride?: number;
    bartenderName?: string;
    notes?: string;
  }) {
    return apiRequest('/api/bar/pour', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async logWastage(data: {
    barItemId: string;
    millilitersWasted: number;
    bottlesWasted?: number;
    bartenderName?: string;
    reason: string;
  }) {
    return apiRequest('/api/bar/wastage', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async restockBottles(
    id: string,
    data: { bottlesCount: number; costPerBottle?: number; notes?: string },
  ) {
    return apiRequest(`/api/bar/items/${id}/restock`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async openBottle(id: string) {
    return apiRequest(`/api/bar/items/${id}/open-bottle`, { method: 'POST' });
  },

  async getLogs(params?: {
    pourType?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    limit?: number;
  }) {
    const qs = new URLSearchParams();
    if (params?.pourType) qs.append('pourType', params.pourType);
    if (params?.category) qs.append('category', params.category);
    if (params?.startDate) qs.append('startDate', params.startDate);
    if (params?.endDate) qs.append('endDate', params.endDate);
    if (params?.search) qs.append('search', params.search);
    if (params?.limit) qs.append('limit', params.limit.toString());
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return apiRequest(`/api/bar/logs${q}`, { method: 'GET' });
  },

  async getAnalytics(startDate?: string, endDate?: string) {
    const qs = new URLSearchParams();
    if (startDate) qs.append('startDate', startDate);
    if (endDate) qs.append('endDate', endDate);
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return apiRequest(`/api/bar/analytics${q}`, { method: 'GET' });
  },

  async adjustStock(data: {
    barItemId: string;
    adjustmentType: string;
    newFullBottles?: number;
    newOpenMl?: number;
    fullBottlesDelta?: number;
    openMlDelta?: number;
    adjustedBy?: string;
    reason: string;
    notes?: string;
  }) {
    return apiRequest('/api/bar/adjustments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async bulkStocktake(data: {
    counts: Array<{
      barItemId: string;
      actualFullBottles: number;
      actualOpenMl: number;
      notes?: string;
    }>;
    auditedBy?: string;
    notes?: string;
  }) {
    return apiRequest('/api/bar/stocktake', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getAdjustments(params?: {
    adjustmentType?: string;
    barItemId?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    limit?: number;
  }) {
    const qs = new URLSearchParams();
    if (params?.adjustmentType)
      qs.append('adjustmentType', params.adjustmentType);
    if (params?.barItemId) qs.append('barItemId', params.barItemId);
    if (params?.category) qs.append('category', params.category);
    if (params?.startDate) qs.append('startDate', params.startDate);
    if (params?.endDate) qs.append('endDate', params.endDate);
    if (params?.search) qs.append('search', params.search);
    if (params?.limit) qs.append('limit', params.limit.toString());
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return apiRequest(`/api/bar/adjustments${q}`, { method: 'GET' });
  },

  async getValuationReport(params?: { category?: string }) {
    const qs = new URLSearchParams();
    if (params?.category) qs.append('category', params.category);
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return apiRequest(`/api/bar/reports/valuation${q}`, { method: 'GET' });
  },

  async getRunwayReport(params?: { daysPeriod?: number }) {
    const qs = new URLSearchParams();
    if (params?.daysPeriod)
      qs.append('daysPeriod', params.daysPeriod.toString());
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return apiRequest(`/api/bar/reports/runway${q}`, { method: 'GET' });
  },

  async getShrinkageReport(params?: { startDate?: string; endDate?: string }) {
    const qs = new URLSearchParams();
    if (params?.startDate) qs.append('startDate', params.startDate);
    if (params?.endDate) qs.append('endDate', params.endDate);
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return apiRequest(`/api/bar/reports/shrinkage${q}`, { method: 'GET' });
  },

  async getLedger(params?: { barItemId?: string; limit?: number }) {
    const qs = new URLSearchParams();
    if (params?.barItemId) qs.append('barItemId', params.barItemId);
    if (params?.limit) qs.append('limit', params.limit.toString());
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return apiRequest(`/api/bar/ledger${q}`, { method: 'GET' });
  },
};

export const channelManagerApi = {
  async getDashboard() {
    return apiRequest('/api/channel-manager/dashboard', { method: 'GET' });
  },

  async getConnections() {
    return apiRequest('/api/channel-manager/connections', { method: 'GET' });
  },

  async getConnection(channelCode: string) {
    return apiRequest(`/api/channel-manager/connections/${channelCode}`, {
      method: 'GET',
    });
  },

  async updateConnection(channelCode: string, data: any) {
    return apiRequest(`/api/channel-manager/connections/${channelCode}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async testConnection(channelCode: string) {
    return apiRequest(`/api/channel-manager/connections/${channelCode}/test`, {
      method: 'POST',
    });
  },

  async disconnectChannel(channelCode: string) {
    return apiRequest(
      `/api/channel-manager/connections/${channelCode}/disconnect`,
      { method: 'POST' },
    );
  },

  async reconnectChannel(channelCode: string) {
    return apiRequest(
      `/api/channel-manager/connections/${channelCode}/reconnect`,
      { method: 'POST' },
    );
  },

  async getRoomMappings(connectionId: string) {
    return apiRequest(
      `/api/channel-manager/connections/${connectionId}/room-mappings`,
      { method: 'GET' },
    );
  },

  async saveRoomMapping(connectionId: string, data: any) {
    return apiRequest(
      `/api/channel-manager/connections/${connectionId}/room-mappings`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  },

  async deleteRoomMapping(connectionId: string, mappingId: string) {
    return apiRequest(
      `/api/channel-manager/connections/${connectionId}/room-mappings/${mappingId}`,
      { method: 'DELETE' },
    );
  },

  async autoSuggestRooms(connectionId: string) {
    return apiRequest(
      `/api/channel-manager/connections/${connectionId}/auto-suggest-rooms`,
      { method: 'GET' },
    );
  },

  async getRatePlanMappings(connectionId: string) {
    return apiRequest(
      `/api/channel-manager/connections/${connectionId}/rate-plan-mappings`,
      { method: 'GET' },
    );
  },

  async saveRatePlanMapping(connectionId: string, data: any) {
    return apiRequest(
      `/api/channel-manager/connections/${connectionId}/rate-plan-mappings`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  },

  async deleteRatePlanMapping(connectionId: string, mappingId: string) {
    return apiRequest(
      `/api/channel-manager/connections/${connectionId}/rate-plan-mappings/${mappingId}`,
      { method: 'DELETE' },
    );
  },

  async getPricingRules(connectionId: string) {
    return apiRequest(
      `/api/channel-manager/connections/${connectionId}/pricing-rules`,
      { method: 'GET' },
    );
  },

  async savePricingRule(connectionId: string, data: any) {
    return apiRequest(
      `/api/channel-manager/connections/${connectionId}/pricing-rules`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  },

  async deletePricingRule(connectionId: string, ruleId: string) {
    return apiRequest(
      `/api/channel-manager/connections/${connectionId}/pricing-rules/${ruleId}`,
      { method: 'DELETE' },
    );
  },

  async getAvailabilityGrid(days?: number) {
    const q = days ? `?days=${days}` : '';
    return apiRequest(`/api/channel-manager/availability-grid${q}`, {
      method: 'GET',
    });
  },

  async triggerSync(channelCode: string, jobType?: string) {
    return apiRequest(`/api/channel-manager/connections/${channelCode}/sync`, {
      method: 'POST',
      body: JSON.stringify({ jobType }),
    });
  },

  async getReservations(channelCode?: string, search?: string) {
    const qs = new URLSearchParams();
    if (channelCode) qs.append('channelCode', channelCode);
    if (search) qs.append('search', search);
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return apiRequest(`/api/channel-manager/reservations${q}`, {
      method: 'GET',
    });
  },

  async getLogs(limit?: number) {
    const q = limit ? `?limit=${limit}` : '';
    return apiRequest(`/api/channel-manager/logs${q}`, { method: 'GET' });
  },

  async retryJob(jobId: string) {
    return apiRequest(`/api/channel-manager/logs/${jobId}/retry`, {
      method: 'POST',
    });
  },
};

export const aiAssistantApi = {
  async getModels() {
    return apiRequest('/api/ai/models', {
      method: 'GET',
    });
  },

  async sendMessage(data: {
    message: string;
    conversationId?: string;
    inputModality?: 'text' | 'voice';
    currentPage?: string;
    provider?: string;
    model?: string;
  }) {
    return apiRequest('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async confirmAction(actionConfirmationId: string, decision: 'CONFIRM' | 'REJECT') {
    return apiRequest('/api/ai/confirm-action', {
      method: 'POST',
      body: JSON.stringify({ actionConfirmationId, decision }),
    });
  },

  async getConversations() {
    return apiRequest('/api/ai/conversations', {
      method: 'GET',
    });
  },

  async getMessages(conversationId: string) {
    return apiRequest(`/api/ai/conversations/${conversationId}/messages`, {
      method: 'GET',
    });
  },

  async getSuggestions(currentPage?: string) {
    const q = currentPage ? `?currentPage=${encodeURIComponent(currentPage)}` : '';
    return apiRequest(`/api/ai/suggestions${q}`, {
      method: 'GET',
    });
  },

  async getTenantConfig() {
    return apiRequest('/api/ai/tenant-config', {
      method: 'GET',
    });
  },

  async updateTenantConfig(data: {
    enabledProviders?: string[];
    defaultProviderId?: string;
    defaultModelId?: string;
  }) {
    return apiRequest('/api/ai/tenant-config', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

export const hrmApi = {
  async getOverview() {
    return apiRequest('/api/hrm/overview', { method: 'GET' });
  },

  async seedDefaults() {
    return apiRequest('/api/hrm/seed-defaults', { method: 'POST' });
  },

  // Departments & Designations
  async getDepartments() {
    return apiRequest('/api/hrm/departments', { method: 'GET' });
  },

  async createDepartment(data: any) {
    return apiRequest('/api/hrm/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateDepartment(id: string, data: any) {
    return apiRequest(`/api/hrm/departments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteDepartment(id: string) {
    return apiRequest(`/api/hrm/departments/${id}`, {
      method: 'DELETE',
    });
  },

  async getDesignations() {
    return apiRequest('/api/hrm/designations', { method: 'GET' });
  },

  async createDesignation(data: any) {
    return apiRequest('/api/hrm/designations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Employees & Documents
  async getEmployees(params?: {
    departmentId?: string;
    status?: string;
    search?: string;
  }) {
    const q = new URLSearchParams();
    if (params?.departmentId) q.set('departmentId', params.departmentId);
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiRequest(`/api/hrm/employees${qs}`, { method: 'GET' });
  },

  async getEmployeeById(id: string) {
    return apiRequest(`/api/hrm/employees/${id}`, { method: 'GET' });
  },

  async createEmployee(data: any) {
    return apiRequest('/api/hrm/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateEmployee(id: string, data: any) {
    return apiRequest(`/api/hrm/employees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async addEmployeeDocument(employeeId: string, data: any) {
    return apiRequest(`/api/hrm/employees/${employeeId}/documents`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Shifts & Roster
  async getShifts() {
    return apiRequest('/api/hrm/shifts', { method: 'GET' });
  },

  async createShift(data: any) {
    return apiRequest('/api/hrm/shifts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getRoster(params?: {
    startDate?: string;
    endDate?: string;
    departmentId?: string;
  }) {
    const q = new URLSearchParams();
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.departmentId) q.set('departmentId', params.departmentId);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiRequest(`/api/hrm/roster${qs}`, { method: 'GET' });
  },

  async createRosterAssignment(data: any) {
    return apiRequest('/api/hrm/roster', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async publishRoster(startDate: string, endDate: string) {
    return apiRequest('/api/hrm/roster/publish', {
      method: 'POST',
      body: JSON.stringify({ startDate, endDate }),
    });
  },

  async deleteRosterAssignment(id: string) {
    return apiRequest(`/api/hrm/roster/${id}`, {
      method: 'DELETE',
    });
  },

  // Attendance & Timesheets
  async getAttendance(params?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    employeeId?: string;
  }) {
    const q = new URLSearchParams();
    if (params?.date) q.set('date', params.date);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.employeeId) q.set('employeeId', params.employeeId);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiRequest(`/api/hrm/attendance${qs}`, { method: 'GET' });
  },

  async recordAttendance(data: any) {
    return apiRequest('/api/hrm/attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async regularizeAttendance(id: string, data: any) {
    return apiRequest(`/api/hrm/attendance/${id}/regularize`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Leaves
  async getLeaveTypes() {
    return apiRequest('/api/hrm/leave-types', { method: 'GET' });
  },

  async getLeaveBalances(employeeId?: string, year?: number) {
    const q = new URLSearchParams();
    if (employeeId) q.set('employeeId', employeeId);
    if (year) q.set('year', String(year));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiRequest(`/api/hrm/leave-balances${qs}`, { method: 'GET' });
  },

  async getLeaveRequests(params?: { status?: string; employeeId?: string }) {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.employeeId) q.set('employeeId', params.employeeId);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiRequest(`/api/hrm/leave-requests${qs}`, { method: 'GET' });
  },

  async createLeaveRequest(data: any) {
    return apiRequest('/api/hrm/leave-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateLeaveRequestStatus(
    id: string,
    data: { status: string; rejectionReason?: string },
  ) {
    return apiRequest(`/api/hrm/leave-requests/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Salary Advances & Components
  async getSalaryComponents() {
    return apiRequest('/api/hrm/salary-components', { method: 'GET' });
  },

  async assignEmployeeSalaryComponent(data: any) {
    return apiRequest('/api/hrm/employee-salary-components', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getSalaryAdvances(params?: { status?: string; employeeId?: string }) {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.employeeId) q.set('employeeId', params.employeeId);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiRequest(`/api/hrm/salary-advances${qs}`, { method: 'GET' });
  },

  async createSalaryAdvance(data: any) {
    return apiRequest('/api/hrm/salary-advances', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSalaryAdvanceStatus(
    id: string,
    data: {
      status: string;
      approvedAmount?: number;
      repaymentAmount?: number;
    },
  ) {
    return apiRequest(`/api/hrm/salary-advances/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Payroll Settings, Runs & Payslips
  async getPayrollSettings() {
    return apiRequest('/api/hrm/payroll-settings', { method: 'GET' });
  },

  async updatePayrollSettings(data: any) {
    return apiRequest('/api/hrm/payroll-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getPayrollRuns() {
    return apiRequest('/api/hrm/payroll-runs', { method: 'GET' });
  },

  async generatePayrollRun(data: {
    payPeriodMonth: number;
    payPeriodYear: number;
    manualServiceChargePool?: number;
    notes?: string;
  }) {
    return apiRequest('/api/hrm/payroll-runs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updatePayrollRunStatus(id: string, status: string) {
    return apiRequest(`/api/hrm/payroll-runs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async getPayslipById(id: string) {
    return apiRequest(`/api/hrm/payslips/${id}`, { method: 'GET' });
  },
};





