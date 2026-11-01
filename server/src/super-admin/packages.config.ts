export interface PlatformModuleInfo {
  id: string;
  label: string;
  category: 'POS & Dining' | 'PMS & Lodging' | 'Operations & Management';
  description: string;
}

export const PLATFORM_MODULES: PlatformModuleInfo[] = [
  // POS & Dining
  {
    id: 'pos',
    label: 'POS Register & Terminal',
    category: 'POS & Dining',
    description: 'High-speed touch screen checkout, quick sales, barcode scanning',
  },
  {
    id: 'orders',
    label: 'Live Orders & Billing',
    category: 'POS & Dining',
    description: 'Live order tracking, bill settlement, split payments, refunds',
  },
  {
    id: 'tables',
    label: 'Dining Tables & Floor Plan',
    category: 'POS & Dining',
    description: 'Interactive restaurant floor visualizer, table seating & transfers',
  },
  {
    id: 'menu',
    label: 'Menu & Product Catalog',
    category: 'POS & Dining',
    description: 'Dishes, beverages, categories, variants, and pricing rules',
  },
  {
    id: 'kitchen',
    label: 'Kitchen Display (KDS)',
    category: 'POS & Dining',
    description: 'Real-time kitchen order tickets (KOT) and chef prep tracking',
  },
  {
    id: 'bar',
    label: 'Bar & Beverage Management',
    category: 'POS & Dining',
    description:
      'Liquor stock, milliliter pour tracking, speed rail uncorking, spillage, and sales reports',
  },

  // PMS & Lodging
  {
    id: 'pms_hub',
    label: 'PMS Overview & Hub',
    category: 'PMS & Lodging',
    description: 'Hotel occupancy rates, RevPAR, ADR, and quick front-desk summary',
  },
  {
    id: 'pms_rooms',
    label: 'Rooms & Housekeeping',
    category: 'PMS & Lodging',
    description: 'Room inventory, room types, cleaning status, and maintenance',
  },
  {
    id: 'pms_reservations',
    label: 'Reservations & Stays',
    category: 'PMS & Lodging',
    description: 'Booking calendar, check-in, check-out, guest registration',
  },
  {
    id: 'pms_front_desk',
    label: 'Front Desk & Guest Folios',
    category: 'PMS & Lodging',
    description: 'Room charges, guest invoices, folios, and deposit collection',
  },

  // Operations & Management
  {
    id: 'inventory',
    label: 'Stock & Inventory Control',
    category: 'Operations & Management',
    description: 'Stock management, purchase orders, ingredient tracking, recipes',
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    category: 'Operations & Management',
    description: 'Financial reports, sales analytics, shift audits, and P&L',
  },
  {
    id: 'settings',
    label: 'Settings & Staff Access',
    category: 'Operations & Management',
    description: 'Hotel configuration, tax rates, staff roster, and user roles',
  },
  {
    id: 'dashboard',
    label: 'Executive Live Dashboard',
    category: 'Operations & Management',
    description: 'Real-time business performance, revenue cards, and today’s stats',
  },
];

export interface PricingPackageDefinition {
  id: string;
  name: string;
  badge: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  defaultModules: string[];
  maxProperties: number;
  maxRooms: number | null;
  maxStaff: number | null;
  popular?: boolean;
}

export const PRICING_PACKAGES: Record<string, PricingPackageDefinition> = {
  POS_STARTER: {
    id: 'POS_STARTER',
    name: 'POS Express & Dining',
    badge: 'Restaurant / Cafe',
    description:
      'Engineered for standalone cafes, restaurants, bars, and cloud kitchens.',
    monthlyPrice: 9500.0,
    annualPrice: 95000.0,
    defaultModules: [
      'pos',
      'orders',
      'tables',
      'menu',
      'kitchen',
      'bar',
      'reports',
      'settings',
      'dashboard',
    ],
    maxProperties: 1,
    maxRooms: 0,
    maxStaff: 5,
  },
  PMS_BOUTIQUE: {
    id: 'PMS_BOUTIQUE',
    name: 'Boutique Hotel & PMS',
    badge: 'Lodging / B&B',
    description:
      'Purpose-built for boutique hotels, motels, guest houses, and homestays.',
    monthlyPrice: 16000.0,
    annualPrice: 160000.0,
    defaultModules: [
      'pms_hub',
      'pms_rooms',
      'pms_reservations',
      'pms_front_desk',
      'reports',
      'settings',
      'dashboard',
    ],
    maxProperties: 1,
    maxRooms: 25,
    maxStaff: 8,
  },
  HOSPITALITY_PRO: {
    id: 'HOSPITALITY_PRO',
    name: 'Hospitality Pro (Full)',
    badge: 'Full Hotel & Dining',
    description:
      'Unified hotel lodging + in-house restaurant dining, room service, and stock management.',
    monthlyPrice: 29000.0,
    annualPrice: 290000.0,
    popular: true,
    defaultModules: [
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
      'dashboard',
    ],
    maxProperties: 2,
    maxRooms: 60,
    maxStaff: 20,
  },
  ENTERPRISE_SUITE: {
    id: 'ENTERPRISE_SUITE',
    name: 'Enterprise All-In-One',
    badge: 'Resorts & Chains',
    description:
      'Unlimited power for resorts, hotel chains, and multi-branch operations with VIP support.',
    monthlyPrice: 65000.0,
    annualPrice: 650000.0,
    defaultModules: [
      'pos',
      'orders',
      'tables',
      'menu',
      'kitchen',
      'pms_hub',
      'pms_rooms',
      'pms_reservations',
      'pms_front_desk',
      'inventory',
      'reports',
      'settings',
      'dashboard',
    ],
    maxProperties: 10,
    maxRooms: null,
    maxStaff: null,
  },
  CUSTOM: {
    id: 'CUSTOM',
    name: 'Custom Tailored Plan',
    badge: 'Bespoke Setup',
    description:
      'Hand-picked module matrix and custom operational quotas configured by company manager.',
    monthlyPrice: 0.0,
    annualPrice: 0.0,
    defaultModules: [
      'pos',
      'orders',
      'pms_hub',
      'pms_rooms',
      'pms_reservations',
      'reports',
      'settings',
      'dashboard',
    ],
    maxProperties: 1,
    maxRooms: 30,
    maxStaff: 10,
  },
};
