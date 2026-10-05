import { UserRole } from '../entities/user.entity';

export interface PermissionDefinition {
  id: string;
  label: string;
  category: string;
  description: string;
}

export const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
  // Food & Beverage / POS
  {
    id: 'pos',
    label: 'POS Sales Terminal',
    category: 'POS & Dining',
    description: 'Process food & beverage orders, bill generation, and payments',
  },
  {
    id: 'orders',
    label: 'Orders & Bills',
    category: 'POS & Dining',
    description: 'View active tables, order history, receipts, and order statuses',
  },
  {
    id: 'tables',
    label: 'Dining Tables',
    category: 'POS & Dining',
    description: 'Manage table floor plans, seat counts, and seating assignments',
  },
  {
    id: 'menu',
    label: 'Menu & Products Catalog',
    category: 'POS & Dining',
    description: 'Manage dishes, menu categories, SKUs, and dish prices',
  },
  {
    id: 'kitchen',
    label: 'Kitchen Display (KDS)',
    category: 'POS & Dining',
    description: 'Kitchen ticketing system for kitchen prep and line cook staff',
  },
  {
    id: 'bar',
    label: 'Bar & Beverage Management',
    category: 'POS & Dining',
    description: 'Track bottle inventory, milliliters poured, pour sales, and bar spillage reports',
  },

  // Property Management (PMS)
  {
    id: 'pms_hub',
    label: 'PMS Hub Overview',
    category: 'PMS & Lodging',
    description: 'Property management dashboard with occupancy and stay metrics',
  },
  {
    id: 'pms_rooms',
    label: 'Rooms & Housekeeping',
    category: 'PMS & Lodging',
    description: 'Room rack, cleaning statuses, maintenance, and room inventory',
  },
  {
    id: 'pms_reservations',
    label: 'Reservations & Stays',
    category: 'PMS & Lodging',
    description: 'Guest bookings, stay dates, check-ins, check-outs, and deposits',
  },
  {
    id: 'pms_front_desk',
    label: 'Front Desk Folios',
    category: 'PMS & Lodging',
    description: 'Guest billing folios, room charges, payments, and checkout folios',
  },

  // Back-office & Management
  {
    id: 'dashboard',
    label: 'Dashboard Overview',
    category: 'Analytics & Admin',
    description: 'General hotel dashboard, daily revenue, and KPI summary',
  },
  {
    id: 'inventory',
    label: 'Inventory & Stock Recipes',
    category: 'Analytics & Admin',
    description: 'Stock balances, ingredient recipe deductions, and suppliers',
  },
  {
    id: 'reports',
    label: 'Financial Reports',
    category: 'Analytics & Admin',
    description: 'Sales analytics, shift reconciliations, and audit reports',
  },
  {
    id: 'settings',
    label: 'Settings & Staff Admin',
    category: 'Analytics & Admin',
    description: 'Property profile, tax rates, staff accounts, and RBAC controls',
  },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  [UserRole.TENANT_ADMIN]: [
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
    'inventory',
    'reports',
    'settings',
  ],
  [UserRole.MANAGER]: [
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
    'inventory',
    'reports',
  ],
  [UserRole.CASHIER]: [
    'pos',
    'orders',
    'tables',
    'bar',
  ],
  [UserRole.KITCHEN]: [
    'kitchen',
    'orders',
  ],
};

export function resolveUserPermissions(user: { role: UserRole; permissions?: string[] | null }): string[] {
  if (user.role === UserRole.TENANT_ADMIN) {
    return DEFAULT_ROLE_PERMISSIONS[UserRole.TENANT_ADMIN];
  }
  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions;
  }
  return DEFAULT_ROLE_PERMISSIONS[user.role] || [];
}
