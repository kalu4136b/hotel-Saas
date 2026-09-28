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
  }) {
    return apiRequest('/api/settings/users', {
      method: 'POST',
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
