export interface PermissionItem {
  id: string;
  label: string;
  category: 'POS & Dining' | 'PMS & Lodging' | 'Operations & Admin';
  description: string;
  route: string;
}

export const SYSTEM_PERMISSIONS: PermissionItem[] = [
  // POS & Dining
  {
    id: 'pos',
    label: 'POS Sales Terminal',
    category: 'POS & Dining',
    description: 'Process food & beverage orders, bill generation, and payments',
    route: '/dashboard/pos',
  },
  {
    id: 'orders',
    label: 'Orders & Bills',
    category: 'POS & Dining',
    description: 'View active tables, order history, receipts, and order statuses',
    route: '/dashboard/orders',
  },
  {
    id: 'tables',
    label: 'Dining Tables',
    category: 'POS & Dining',
    description: 'Manage table floor plans, seat counts, and seating assignments',
    route: '/dashboard/tables',
  },
  {
    id: 'menu',
    label: 'Menu & Products Catalog',
    category: 'POS & Dining',
    description: 'Manage dishes, menu categories, SKUs, and dish prices',
    route: '/dashboard/menu',
  },
  {
    id: 'kitchen',
    label: 'Kitchen Display (KDS)',
    category: 'POS & Dining',
    description: 'Kitchen ticketing system for kitchen prep and line cook staff',
    route: '/dashboard/kitchen',
  },
  {
    id: 'bar',
    label: 'Bar & Beverage Management',
    category: 'POS & Dining',
    description: 'Track bottle inventory, milliliters poured, pour sales, and bar spillage reports',
    route: '/dashboard/bar',
  },

  // PMS & Lodging
  {
    id: 'pms_hub',
    label: 'PMS Hub Overview',
    category: 'PMS & Lodging',
    description: 'Property management dashboard with occupancy and stay metrics',
    route: '/dashboard/pms',
  },
  {
    id: 'pms_rooms',
    label: 'Rooms & Inventory',
    category: 'PMS & Lodging',
    description: 'Room rack, pricing, room types, and room configuration',
    route: '/dashboard/pms/rooms',
  },
  {
    id: 'pms_housekeeping',
    label: 'Housekeeping Dispatch',
    category: 'PMS & Lodging',
    description: 'Live room cleanliness board, cleaning workflow, inspection, and maintenance',
    route: '/dashboard/pms/housekeeping',
  },
  {
    id: 'pms_reservations',
    label: 'Reservations & Stays',
    category: 'PMS & Lodging',
    description: 'Guest bookings, stay dates, check-ins, check-outs, and deposits',
    route: '/dashboard/pms/reservations',
  },
  {
    id: 'pms_front_desk',
    label: 'Front Desk Folios',
    category: 'PMS & Lodging',
    description: 'Guest billing folios, room charges, payments, and checkout folios',
    route: '/dashboard/pms/front-desk',
  },
  {
    id: 'channel_manager',
    label: 'Channel Manager (OTA)',
    category: 'PMS & Lodging',
    description: 'Manage OTA distribution channels (Booking.com, Agoda, Airbnb, Expedia, Tripadvisor, iCal)',
    route: '/dashboard/channel-manager',
  },

  // Operations & Admin
  {
    id: 'dashboard',
    label: 'Dashboard Overview',
    category: 'Operations & Admin',
    description: 'General hotel dashboard, daily revenue, and KPI summary',
    route: '/dashboard',
  },
  {
    id: 'inventory',
    label: 'Inventory & Stock Recipes',
    category: 'Operations & Admin',
    description: 'Stock balances, ingredient recipe deductions, and suppliers',
    route: '/dashboard/inventory',
  },
  {
    id: 'inventory_items',
    label: 'Inventory Item Management',
    category: 'Operations & Admin',
    description: 'Create, edit, and deactivate inventory items across Bar, Kitchen, and Operations',
    route: '/dashboard/inventory',
  },
  {
    id: 'purchase_orders',
    label: 'Purchase Order Management',
    category: 'Operations & Admin',
    description: 'Create, edit, approve, and cancel supplier purchase orders',
    route: '/dashboard/inventory',
  },
  {
    id: 'grn_receiving',
    label: 'Goods Received Notes (GRN)',
    category: 'Operations & Admin',
    description: 'Receive goods against purchase orders, accept/reject deliveries, and update stock',
    route: '/dashboard/inventory',
  },
  {
    id: 'operational_issuance',
    label: 'Operational Stock Issuance',
    category: 'Operations & Admin',
    description: 'Issue operational supplies and equipment to hotel departments',
    route: '/dashboard/inventory',
  },
  {
    id: 'stock_adjustments',
    label: 'Stock Adjustments & Audit',
    category: 'Operations & Admin',
    description: 'Perform stock adjustments, view stock movements, and audit inventory transactions',
    route: '/dashboard/inventory',
  },
  {
    id: 'reports',
    label: 'Financial Reports',
    category: 'Operations & Admin',
    description: 'Sales analytics, shift reconciliations, and audit reports',
    route: '/dashboard/reports',
  },
  {
    id: 'settings',
    label: 'Settings & Staff Admin',
    category: 'Operations & Admin',
    description: 'Property profile, tax rates, staff accounts, and RBAC controls',
    route: '/dashboard/settings',
  },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  TENANT_ADMIN: [
    'dashboard',
    'pos',
    'orders',
    'tables',
    'menu',
    'kitchen',
    'bar',
    'pms_hub',
    'pms_rooms',
    'pms_reservations',
    'pms_front_desk',
    'channel_manager',
    'inventory',
    'inventory_items',
    'purchase_orders',
    'grn_receiving',
    'operational_issuance',
    'stock_adjustments',
    'reports',
    'settings',
  ],
  MANAGER: [
    'dashboard',
    'pos',
    'orders',
    'tables',
    'menu',
    'kitchen',
    'bar',
    'pms_hub',
    'pms_rooms',
    'pms_housekeeping',
    'pms_reservations',
    'pms_front_desk',
    'channel_manager',
    'inventory',
    'inventory_items',
    'purchase_orders',
    'grn_receiving',
    'operational_issuance',
    'stock_adjustments',
    'reports',
  ],
  CASHIER: [
    'pos',
    'orders',
    'tables',
    'bar',
  ],
  KITCHEN: [
    'kitchen',
    'orders',
    'inventory',
  ],
};

export const ROUTE_PERMISSION_MAP: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/dashboard/pms': 'pms_hub',
  '/dashboard/pms/rooms': 'pms_rooms',
  '/dashboard/pms/housekeeping': 'pms_housekeeping',
  '/dashboard/pms/reservations': 'pms_reservations',
  '/dashboard/pms/front-desk': 'pms_front_desk',
  '/dashboard/channel-manager': 'channel_manager',
  '/dashboard/channel-manager/channels': 'channel_manager',
  '/dashboard/channel-manager/mappings': 'channel_manager',
  '/dashboard/channel-manager/pricing': 'channel_manager',
  '/dashboard/channel-manager/inventory': 'channel_manager',
  '/dashboard/channel-manager/reservations': 'channel_manager',
  '/dashboard/channel-manager/logs': 'channel_manager',
  '/dashboard/pos': 'pos',
  '/dashboard/kitchen': 'kitchen',
  '/dashboard/bar': 'bar',
  '/dashboard/orders': 'orders',
  '/dashboard/tables': 'tables',
  '/dashboard/menu': 'menu',
  '/dashboard/inventory': 'inventory',
  '/dashboard/reports': 'reports',
  '/dashboard/settings': 'settings',
};


export function getTenantModules(tenant?: any): string[] {
  let list: string[] = [];
  if (tenant && Array.isArray(tenant.modules) && tenant.modules.length > 0) {
    list = [...tenant.modules];
  } else if (typeof window !== 'undefined') {
    try {
      const raw =
        localStorage.getItem('hotel_saas_tenant') ||
        localStorage.getItem('tenant');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.modules) && parsed.modules.length > 0) {
          list = [...parsed.modules];
        }
      }
    } catch {
      // Ignore
    }
  }

  if (list.length === 0) {
    return SYSTEM_PERMISSIONS.map((p) => p.id);
  }

  // Ensure bar, inventory, and housekeeping are always included in active modules
  if (!list.includes('bar')) list.push('bar');
  if (!list.includes('inventory')) list.push('inventory');
  if (!list.includes('pms_housekeeping')) list.push('pms_housekeeping');

  return list;
}

export function getUserPermissions(user: any, tenantModules?: string[]): string[] {
  if (!user) return [];
  if (user.role === 'SUPER_ADMIN') {
    return SYSTEM_PERMISSIONS.map((p) => p.id);
  }

  const allowedByTenant = tenantModules || getTenantModules(user.tenant);

  let rawPerms: string[] = [];
  if (user.role === 'TENANT_ADMIN' || user.role === 'ADMIN') {
    rawPerms = allowedByTenant;
  } else if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    rawPerms = user.permissions;
  } else {
    rawPerms = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
  }

  // Intersect with what the tenant has actually purchased
  return rawPerms.filter((p) => allowedByTenant.includes(p));
}

export function isRoutePermitted(
  pathname: string,
  user: any,
  tenant?: any,
): boolean {
  if (!user) return true; // While loading
  if (user.role === 'SUPER_ADMIN') return true;

  const tenantModules = getTenantModules(tenant || user.tenant);
  const userPerms = getUserPermissions(user, tenantModules);

  // Exact match
  const required = ROUTE_PERMISSION_MAP[pathname];
  if (required) {
    if (!tenantModules.includes(required)) return false;
    return userPerms.includes(required);
  }

  // Prefix match (e.g. sub-pages under /dashboard/pms/...)
  for (const [route, perm] of Object.entries(ROUTE_PERMISSION_MAP)) {
    if (route !== '/dashboard' && pathname.startsWith(route)) {
      if (!tenantModules.includes(perm)) return false;
      return userPerms.includes(perm);
    }
  }

  return true;
}

export function getFirstAllowedRoute(user: any, tenant?: any): string {
  if (!user) return '/dashboard';
  if (user.role === 'SUPER_ADMIN') return '/admin';

  const tenantModules = getTenantModules(tenant || user.tenant);
  const userPerms = getUserPermissions(user, tenantModules);

  for (const item of SYSTEM_PERMISSIONS) {
    if (tenantModules.includes(item.id) && userPerms.includes(item.id)) {
      return item.route;
    }
  }
  return '/dashboard';
}

