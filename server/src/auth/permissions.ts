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
    id: 'inventory_items',
    label: 'Inventory Item Management',
    category: 'Analytics & Admin',
    description: 'Create, edit, and deactivate inventory items across Bar, Kitchen, and Operations',
  },
  {
    id: 'purchase_orders',
    label: 'Purchase Order Management',
    category: 'Analytics & Admin',
    description: 'Create, edit, approve, and cancel supplier purchase orders',
  },
  {
    id: 'grn_receiving',
    label: 'Goods Received Notes (GRN)',
    category: 'Analytics & Admin',
    description: 'Receive goods against purchase orders, accept/reject deliveries, and update stock',
  },
  {
    id: 'operational_issuance',
    label: 'Operational Stock Issuance',
    category: 'Analytics & Admin',
    description: 'Issue operational supplies and equipment to hotel departments',
  },
  {
    id: 'stock_adjustments',
    label: 'Stock Adjustments & Audit',
    category: 'Analytics & Admin',
    description: 'Perform stock adjustments, view stock movements, and audit inventory transactions',
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

  // Human Resource Management (HRM & Payroll)
  {
    id: 'hrm',
    label: 'HRM & Payroll Hub',
    category: 'HRM & Payroll',
    description: 'Complete hotel HR overview, departments, staff profiles, roster, attendance, leaves, and payroll',
  },
  {
    id: 'hrm_employees',
    label: 'Employees & Departments',
    category: 'HRM & Payroll',
    description: 'Manage employee profiles, departments, designations, and staff documents',
  },
  {
    id: 'hrm_roster',
    label: 'Shift & Duty Roster',
    category: 'HRM & Payroll',
    description: 'Configure hotel shift templates and publish weekly/daily duty rosters',
  },
  {
    id: 'hrm_attendance',
    label: 'Attendance & Timesheets',
    category: 'HRM & Payroll',
    description: 'Record daily attendance check-in/out, track overtime, and regularize timesheets',
  },
  {
    id: 'hrm_leaves',
    label: 'Leave Management',
    category: 'HRM & Payroll',
    description: 'Manage employee leave balances, leave requests, and approval workflows',
  },
  {
    id: 'hrm_payroll',
    label: 'Payroll, EPF/ETF & Service Charge',
    category: 'HRM & Payroll',
    description: 'Process monthly payroll, salary advances, 10% service charge pool, EPF/ETF, and payslips',
  },

  // AI Assistant & Operations
  {
    id: 'ai_view',
    label: 'View AI Assistant',
    category: 'AI Assistant',
    description: 'Access the floating AI assistant co-pilot drawer and review data queries',
  },
  {
    id: 'ai_chat',
    label: 'Execute AI Chat',
    category: 'AI Assistant',
    description: 'Send messages, run operational queries, and execute guided hotel actions',
  },
  {
    id: 'ai_model_select',
    label: 'Switch AI Models',
    category: 'AI Assistant',
    description: 'Choose between permitted external AI models (e.g. Gemini) and internal engine',
  },
  {
    id: 'ai_voice',
    label: 'Use Voice Assistant',
    category: 'AI Assistant',
    description: 'Dictate voice commands and listen to AI audio speech readouts',
  },
  {
    id: 'ai_manage_settings',
    label: 'Manage AI Settings & Models',
    category: 'AI Assistant',
    description: 'Configure hotel AI provider activations, default models, and view usage allowances',
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
    'inventory_items',
    'purchase_orders',
    'grn_receiving',
    'operational_issuance',
    'stock_adjustments',
    'reports',
    'settings',
    'hrm',
    'hrm_employees',
    'hrm_roster',
    'hrm_attendance',
    'hrm_leaves',
    'hrm_payroll',
    'ai_view',
    'ai_chat',
    'ai_model_select',
    'ai_voice',
    'ai_manage_settings',
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
    'inventory_items',
    'purchase_orders',
    'grn_receiving',
    'operational_issuance',
    'stock_adjustments',
    'reports',
    'hrm',
    'hrm_employees',
    'hrm_roster',
    'hrm_attendance',
    'hrm_leaves',
    'hrm_payroll',
    'ai_view',
    'ai_chat',
    'ai_model_select',
    'ai_voice',
  ],
  [UserRole.CASHIER]: [
    'pos',
    'orders',
    'tables',
    'bar',
    'ai_view',
    'ai_chat',
    'ai_voice',
  ],
  [UserRole.KITCHEN]: [
    'kitchen',
    'orders',
    'inventory',
  ],
};

export function resolveUserPermissions(user: { role: UserRole | string; permissions?: string[] | null }): string[] {
  if (user.role === UserRole.TENANT_ADMIN || user.role === 'TENANT_ADMIN') {
    return DEFAULT_ROLE_PERMISSIONS[UserRole.TENANT_ADMIN];
  }
  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions;
  }
  return DEFAULT_ROLE_PERMISSIONS[user.role as UserRole] || [];
}

const INVENTORY_SUB_PERMISSIONS = new Set([
  'inventory',
  'inventory_items',
  'suppliers',
  'purchase_orders',
  'grn',
  'grn_receiving',
  'operational_issuance',
  'stock_adjustments',
]);

const HRM_SUB_PERMISSIONS = new Set([
  'hrm',
  'hrm_employees',
  'hrm_roster',
  'hrm_attendance',
  'hrm_leaves',
  'hrm_payroll',
]);

export function hasPermission(
  user: { role: UserRole | string; permissions?: string[] | null },
  permission: string,
): boolean {
  if (!user) return false;
  if (
    user.role === UserRole.SUPER_ADMIN ||
    user.role === 'SUPER_ADMIN' ||
    user.role === UserRole.TENANT_ADMIN ||
    user.role === 'TENANT_ADMIN'
  ) {
    return true;
  }
  const userPerms = resolveUserPermissions(user);
  if (userPerms.includes(permission)) return true;
  if (INVENTORY_SUB_PERMISSIONS.has(permission) && userPerms.includes('inventory')) {
    return true;
  }
  if (HRM_SUB_PERMISSIONS.has(permission) && userPerms.includes('hrm')) {
    return true;
  }
  return false;
}
