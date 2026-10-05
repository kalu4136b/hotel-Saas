const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface UserSession {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  phone?: string;
  avatarUrl?: string;
}

export interface TenantSession {
  id: string;
  name: string;
  slug: string;
  subscriptionTier: string;
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

export const authStorage = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('hotel_saas_token');
  },
  setSession(data: AuthResponse) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('hotel_saas_token', data.accessToken);
    localStorage.setItem('hotel_saas_user', JSON.stringify(data.user));
    localStorage.setItem('hotel_saas_tenant', JSON.stringify(data.tenant));
    localStorage.setItem('hotel_saas_property', JSON.stringify(data.property));
  },
  getUser(): UserSession | null {
    if (typeof window === 'undefined') return null;
    const item = localStorage.getItem('hotel_saas_user');
    return item ? JSON.parse(item) : null;
  },
  getProperty(): PropertySession | null {
    if (typeof window === 'undefined') return null;
    const item = localStorage.getItem('hotel_saas_property');
    return item ? JSON.parse(item) : null;
  },
  setProperty(property: any) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('hotel_saas_property', JSON.stringify(property));
  },
  getTenant(): TenantSession | null {
    if (typeof window === 'undefined') return null;
    const item = localStorage.getItem('hotel_saas_tenant');
    return item ? JSON.parse(item) : null;
  },
  clearSession() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('hotel_saas_token');
    localStorage.removeItem('hotel_saas_user');
    localStorage.removeItem('hotel_saas_tenant');
    localStorage.removeItem('hotel_saas_property');
  },
};

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = authStorage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg =
      (Array.isArray(data.message) ? data.message.join(', ') : data.message) ||
      `HTTP error ${res.status}: ${res.statusText}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const authApi = {
  async register(body: {
    fullName: string;
    username: string;
    email: string;
    password: string;
    phone?: string;
    propertyName?: string;
    currency?: string;
  }): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    authStorage.setSession(response);
    return response;
  },

  async login(body: {
    usernameOrEmail: string;
    password: string;
  }): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    authStorage.setSession(response);
    return response;
  },

  async getMe() {
    return apiRequest('/api/auth/me', { method: 'GET' });
  },

  async logout() {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } finally {
      authStorage.clearSession();
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

  async getOrders(status?: string) {
    const query = status ? `?status=${status}` : '';
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
  async getItems(category?: string, search?: string, lowStock?: boolean) {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    if (lowStock) params.append('lowStock', 'true');
    const q = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/api/inventory/items${q}`, { method: 'GET' });
  },

  async getItem(id: string) {
    return apiRequest(`/api/inventory/items/${id}`, { method: 'GET' });
  },

  async createItem(data: {
    name: string;
    sku?: string;
    category: string;
    unit: string;
    currentStock?: number;
    minStockLevel?: number;
    costPerUnit?: number;
  }) {
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

  async adjustStock(
    id: string,
    data: {
      quantity: number;
      movementType: string;
      unitCost?: number;
      reason: string;
      referenceId?: string;
    },
  ) {
    return apiRequest(`/api/inventory/items/${id}/adjust`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMovements(itemId?: string) {
    const q = itemId ? `?itemId=${itemId}` : '';
    return apiRequest(`/api/inventory/movements${q}`, { method: 'GET' });
  },

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

  async getSuppliers() {
    return apiRequest('/api/inventory/suppliers', { method: 'GET' });
  },

  async createSupplier(data: {
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
  }) {
    return apiRequest('/api/inventory/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getPurchaseOrders(status?: string) {
    const q = status ? `?status=${status}` : '';
    return apiRequest(`/api/inventory/purchase-orders${q}`, { method: 'GET' });
  },

  async createPurchaseOrder(data: {
    supplierId: string;
    expectedDate?: string;
    notes?: string;
    items: Array<{
      inventoryItemId: string;
      quantityOrdered: number;
      unitCost: number;
    }>;
  }) {
    return apiRequest('/api/inventory/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async receivePurchaseOrder(id: string) {
    return apiRequest(`/api/inventory/purchase-orders/${id}/receive`, {
      method: 'POST',
    });
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
};

export const barApi = {
  async getItems(category?: string, search?: string, lowStock?: boolean) {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    if (lowStock) params.append('lowStock', 'true');
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
};



