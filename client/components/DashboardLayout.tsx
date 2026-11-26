'use client';

// Main application shell layout
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ChefHat,
  Receipt,
  Grid,
  MenuSquare,
  LogOut,
  Building2,
  Bell,
  Search,
  Plus,
  Coins,
  Menu,
  X,
  CheckCircle2,
  Clock,
  Sparkles,
  Settings,
  BedDouble,
  CalendarCheck,
  Key,
  Boxes,
  Wine,
  ShieldAlert,
  ShieldCheck,
  Globe,
  Star,
  ChevronLeft,
  PieChart,
  ArrowLeftRight,
  Users,
} from 'lucide-react';
import { authStorage, authApi, posApi } from '@/lib/api';
import {
  isRoutePermitted,
  getUserPermissions,
  getFirstAllowedRoute,
  getTenantModules,
} from '@/lib/permissions';
import AiAssistantDrawer from './AiAssistantDrawer';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [startingFloat, setStartingFloat] = useState('100.00');
  const [loadingShift, setLoadingShift] = useState(false);

  useEffect(() => {
    const token = authStorage.getTenantToken() || authStorage.getToken('tenant');
    if (!token) {
      // If only Super Admin is logged in, redirect to platform console
      if (authStorage.getAdminToken()) {
        router.replace('/admin');
        return;
      }
      router.push('/login');
      return;
    }

    const currentUser = authStorage.getTenantUser() || authStorage.getUser('tenant');
    const currentProperty = authStorage.getProperty();
    const currentTenant = authStorage.getTenant();
    setUser(currentUser);
    setProperty(currentProperty);
    setTenant(currentTenant);

    // Validate live session & refresh permissions/tenant status from server
    authApi
      .getMe()
      .then((profile) => {
        if (profile && currentUser) {
          const updatedUser = {
            ...currentUser,
            role: profile.role ?? currentUser.role,
            permissions: profile.permissions ?? (currentUser as any).permissions,
          };
          setUser(updatedUser);
          if (profile.tenant && currentTenant) {
            const updatedTenant = {
              ...currentTenant,
              status: profile.tenant.status ?? (currentTenant as any).status,
              plan: profile.tenant.plan ?? (currentTenant as any).plan,
              modules: profile.tenant.modules ?? (currentTenant as any).modules,
            };
            setTenant(updatedTenant);
          }
        }
      })
      .catch(() => {
        // 401 handler in apiFetch already clears session and redirects
      });

    // Fetch active shift
    if (currentUser?.role !== 'SUPER_ADMIN') {
      posApi
        .getCurrentShift()
        .then((shift) => setActiveShift(shift))
        .catch(() => {});
    }
  }, [router]);

  // Enforce route-level RBAC and module entitlements across all /dashboard routes
  useEffect(() => {
    if (user) {
      if (user.role === 'SUPER_ADMIN' && !authStorage.getTenantToken()) {
        router.replace('/admin');
        return;
      }
      if (pathname && !isRoutePermitted(pathname, user, tenant)) {
        const destination = getFirstAllowedRoute(user, tenant);
        if (destination !== pathname) {
          router.replace(destination);
        }
      }
    }
  }, [user, tenant, pathname, router]);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingShift(true);
    try {
      const shift = await posApi.openShift(Number(startingFloat) || 0);
      setActiveShift(shift);
      setShiftModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to open shift');
    } finally {
      setLoadingShift(false);
    }
  };

  const handleLogout = async () => {
    await authApi.logout('tenant');
    router.push('/login');
  };

  const [currentSearch, setCurrentSearch] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [favorites, setFavorites] = useState<string[]>([
    '/dashboard/pos',
    '/dashboard/pms/reservations',
    '/dashboard/pms/front-desk',
  ]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentSearch(window.location.search);
      try {
        const savedFavs = localStorage.getItem('hotel_saas_nav_favorites');
        if (savedFavs) {
          const parsed = JSON.parse(savedFavs);
          if (Array.isArray(parsed)) setFavorites(parsed);
        }
      } catch {
        // Ignore
      }
      const handleNavChange = (e: Event) => {
        const detail = (e as CustomEvent)?.detail;
        if (detail?.href) {
          const qIndex = detail.href.indexOf('?');
          setCurrentSearch(qIndex >= 0 ? detail.href.slice(qIndex) : '');
        } else {
          setCurrentSearch(window.location.search);
        }
      };
      window.addEventListener('hotel-nav-tab', handleNavChange);
      window.addEventListener('popstate', handleNavChange);
      return () => {
        window.removeEventListener('hotel-nav-tab', handleNavChange);
        window.removeEventListener('popstate', handleNavChange);
      };
    }
  }, [pathname]);

  const toggleFavorite = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(href)
        ? prev.filter((item) => item !== href)
        : [...prev, href];
      try {
        localStorage.setItem('hotel_saas_nav_favorites', JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  interface SubModuleItem {
    label: string;
    href: string;
    badge?: string;
    requiredPermission?: string;
  }

  interface MainModuleGroup {
    id: string;
    label: string;
    icon: any;
    href?: string;
    subModules?: SubModuleItem[];
  }

  const mainModules: MainModuleGroup[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Grid,
      href: '/dashboard',
    },
    {
      id: 'pms',
      label: 'Property & Lodging',
      icon: Building2,
      subModules: [
        { label: 'PMS Hub Overview', href: '/dashboard/pms', badge: 'Hub' },
        { label: 'Rooms & Inventory', href: '/dashboard/pms/rooms' },
        { label: 'Reservations & Stays', href: '/dashboard/pms/reservations' },
        { label: 'Front Desk Folios', href: '/dashboard/pms/front-desk' },
        { label: 'Housekeeping Station', href: '/dashboard/pms/housekeeping', badge: 'Live' },
      ],
    },
    {
      id: 'channel_manager',
      label: 'Channel Manager',
      icon: Globe,
      subModules: [
        { label: 'OTA Overview', href: '/dashboard/channel-manager', badge: 'OTA' },
        { label: 'Connected Channels', href: '/dashboard/channel-manager/channels' },
        { label: 'Room & Rate Mappings', href: '/dashboard/channel-manager/mappings' },
        { label: 'Pricing & Rate Rules', href: '/dashboard/channel-manager/pricing' },
        { label: 'Availability Calendar', href: '/dashboard/channel-manager/inventory' },
        { label: 'OTA Reservations', href: '/dashboard/channel-manager/reservations' },
        { label: 'Sync Activity Logs', href: '/dashboard/channel-manager/logs' },
      ],
    },
    {
      id: 'pos_operations',
      label: 'POS & Dining',
      icon: ArrowLeftRight,
      subModules: [
        { label: 'POS Sales Terminal', href: '/dashboard/pos', badge: 'POS' },
        { label: 'Orders & Bills', href: '/dashboard/orders' },
        { label: 'Dining Tables', href: '/dashboard/tables' },
        { label: 'Kitchen Display (KDS)', href: '/dashboard/kitchen', badge: 'KDS' },
        { label: 'Menu & Products', href: '/dashboard/menu' },
      ],
    },
    {
      id: 'bar_beverage',
      label: 'Bar & Beverage',
      icon: Wine,
      subModules: [
        { label: 'Speed Rail & Bottle Rack', href: '/dashboard/bar?tab=RACK', badge: 'Bar' },
        { label: 'Pour & Spillage Logs', href: '/dashboard/bar?tab=POURS' },
        { label: 'Stock Variance Reports', href: '/dashboard/bar?tab=STOCK_REPORTS' },
        { label: 'Bottle Adjustments', href: '/dashboard/bar?tab=ADJUSTMENTS' },
        { label: 'Bar Stock Ledger', href: '/dashboard/bar?tab=LEDGER' },
        { label: 'Beverage Analytics', href: '/dashboard/bar?tab=ANALYTICS' },
      ],
    },
    {
      id: 'inventory_warehouses',
      label: 'Inventory & Stores',
      icon: Boxes,
      subModules: [
        { label: 'Inventory Overview', href: '/dashboard/inventory?tab=OVERVIEW' },
        { label: 'Bar Stock', href: '/dashboard/inventory?tab=BAR', requiredPermission: 'inventory_items' },
        { label: 'Kitchen Stock', href: '/dashboard/inventory?tab=KITCHEN', requiredPermission: 'inventory_items' },
        { label: 'Operational Stock', href: '/dashboard/inventory?tab=OPERATIONAL', requiredPermission: 'inventory_items' },
        { label: 'Purchase Orders (PO)', href: '/dashboard/inventory?tab=PURCHASE_ORDERS', requiredPermission: 'purchase_orders' },
        { label: 'Goods Received (GRN)', href: '/dashboard/inventory?tab=GRN', requiredPermission: 'grn_receiving' },
        { label: 'Dept. Issuances', href: '/dashboard/inventory?tab=ISSUANCES', requiredPermission: 'operational_issuance' },
        { label: 'Stock Adjustments', href: '/dashboard/inventory?tab=MOVEMENTS', requiredPermission: 'stock_adjustments' },
        { label: 'Recipes & BOM', href: '/dashboard/inventory?tab=RECIPES', badge: 'BOM' },
        { label: 'Suppliers', href: '/dashboard/inventory?tab=SUPPLIERS' },
      ],
    },
    {
      id: 'hrm_payroll',
      label: 'HRM & Payroll',
      icon: Users,
      subModules: [
        { label: 'HRM Overview', href: '/dashboard/hrm?tab=OVERVIEW', badge: 'HR' },
        { label: 'Employees & Profiles', href: '/dashboard/hrm?tab=EMPLOYEES', requiredPermission: 'hrm_employees' },
        { label: 'Departments & Roles', href: '/dashboard/hrm?tab=DEPARTMENTS', requiredPermission: 'hrm_employees' },
        { label: 'Shift & Duty Roster', href: '/dashboard/hrm?tab=ROSTER', requiredPermission: 'hrm_roster' },
        { label: 'Attendance & Timesheets', href: '/dashboard/hrm?tab=ATTENDANCE', requiredPermission: 'hrm_attendance' },
        { label: 'Leave Management', href: '/dashboard/hrm?tab=LEAVES', requiredPermission: 'hrm_leaves' },
        { label: 'Salary Advances', href: '/dashboard/hrm?tab=ADVANCES', requiredPermission: 'hrm_payroll' },
        { label: 'Payroll & Payslips', href: '/dashboard/hrm?tab=PAYROLL', badge: 'EPF', requiredPermission: 'hrm_payroll' },
      ],
    },
    {
      id: 'financials',
      label: 'Financials & Reports',
      icon: PieChart,
      subModules: [
        { label: 'Daily Revenue Summary', href: '/dashboard/reports?tab=daily', badge: 'SQL' },
        { label: 'Payment Collections', href: '/dashboard/reports?tab=payments' },
        { label: 'Item Sales Breakdown', href: '/dashboard/reports?tab=items' },
        { label: 'Voids & Cancellations', href: '/dashboard/reports?tab=cancellations' },
        { label: 'Inventory Valuation', href: '/dashboard/inventory?tab=REPORTS' },
      ],
    },
    {
      id: 'settings_admin',
      label: 'Settings & Admin',
      icon: Settings,
      subModules: [
        { label: 'Property & Tax Profile', href: '/dashboard/settings?tab=property' },
        { label: 'Staff & Permissions', href: '/dashboard/settings?tab=staff' },
        { label: 'AI Co-Pilot Settings', href: '/dashboard/settings?tab=ai', requiredPermission: 'ai_manage_settings' },
        { label: 'Security Audit Logs', href: '/dashboard/settings?tab=audit' },
      ],
    },
  ];

  const isSubModuleActive = (href: string) => {
    const [targetPath, targetQuery] = href.split('?');
    if (pathname !== targetPath) return false;
    if (!targetQuery) {
      return !currentSearch || currentSearch === '';
    }
    const targetParams = new URLSearchParams(targetQuery);
    const currentParams = new URLSearchParams(currentSearch);
    const targetTab = targetParams.get('tab')?.toLowerCase();
    const currentTab = currentParams.get('tab')?.toLowerCase();
    if (!currentTab) {
      // Default tab match when no ?tab= is in URL yet
      return (
        (targetPath === '/dashboard/bar' && targetTab === 'rack') ||
        (targetPath === '/dashboard/inventory' && targetTab === 'overview') ||
        (targetPath === '/dashboard/hrm' && targetTab === 'overview') ||
        (targetPath === '/dashboard/reports' && targetTab === 'daily') ||
        (targetPath === '/dashboard/settings' && targetTab === 'property')
      );
    }
    return targetTab === currentTab;
  };

  // Automatically expand only the main module containing the current route
  useEffect(() => {
    for (const mod of mainModules) {
      if (mod.subModules?.some((sub) => pathname === sub.href.split('?')[0])) {
        setOpenGroups({ [mod.id]: true });
        return;
      }
    }
  }, [pathname]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ [id]: !prev[id] }));
  };

  const handleNavigate = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const qIndex = href.indexOf('?');
    setCurrentSearch(qIndex >= 0 ? href.slice(qIndex) : '');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hotel-nav-tab', { detail: { href } }));
    }
    router.push(href);
  };

  // Flatten all permitted sub-modules so Favorites can resolve labels & permissions
  const allPermittedSubModules: SubModuleItem[] = mainModules.flatMap((mod) =>
    (mod.subModules || []).filter((sub) =>
      isRoutePermitted(sub.href, user, tenant, sub.requiredPermission),
    ),
  );
  const favoriteSubModules = allPermittedSubModules.filter((sub) =>
    favorites.includes(sub.href),
  );

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-[#0F172A] font-sans">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* ================= SIDEBAR ================= */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-[260px] bg-white border-r border-[#E2E8F0] p-4 flex flex-col z-50 transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* User Profile Header matching template */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#F1F5F9] border border-[#EDF2F7] mb-5">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-[#00C48C] text-white font-bold flex items-center justify-center text-sm border-2 border-white shadow-xs">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00C48C] border-2 border-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-[#0F172A] truncate">
              {user?.fullName || 'Staff Member'}
            </div>
            <div className="text-[10.5px] text-[#64748B] truncate capitalize">
              {user?.role?.replace('_', ' ')?.toLowerCase() || 'Cashier'}
            </div>
          </div>
        </div>

        {/* Brand Section */}
        <div className="flex items-center gap-2.5 px-2 mb-5">
          <div className="w-8 h-8 rounded-xl bg-white border border-[#E2E8F0] p-1 flex items-center justify-center shadow-xs shrink-0">
            <img
              src="/hotelia-mark.png"
              alt="Hotelia"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-extrabold tracking-tight text-[#0F172A] truncate">
              {tenant?.name || 'Hotelia'}
            </div>
            <div className="text-[10px] font-semibold text-[#64748B] truncate">
              {property?.name || 'Hotel Command Center'}
            </div>
          </div>
        </div>

        {/* Platform Super Admin Console Banner */}
        {user?.role === 'SUPER_ADMIN' && (
          <div className="mb-4">
            <Link
              href="/admin"
              className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0F172A] text-white hover:bg-[#1E293B] transition shadow-xs border border-white/10"
            >
              <ShieldCheck className="w-4 h-4 text-[#00C48C] shrink-0" />
              <div className="flex-1 text-left min-w-0">
                <div className="text-[11px] font-bold leading-tight truncate">
                  Platform Manager
                </div>
                <div className="text-[9.5px] text-[#94A3B8] leading-tight truncate">
                  Manage Tenants & Modules
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Simplified Main Module & Drop-List Navigation */}
        <nav className="no-scrollbar space-y-1 flex-1 overflow-y-auto select-none">
          {/* Favorites Drop-List (matching reference top row) */}
          {favoriteSubModules.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => toggleGroup('favorites')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                  openGroups['favorites']
                    ? 'bg-[#F1F5F9] text-[#0F172A]'
                    : 'text-[#334155] hover:bg-[#F1F5F9]/80 hover:text-[#0F172A]'
                }`}
              >
                <Star className="w-[18px] h-[18px] shrink-0 text-[#475569] stroke-[1.75]" />
                <span className="flex-1 text-left truncate">Favorites</span>
                <ChevronLeft
                  className={`w-4 h-4 text-[#64748B] transition-transform duration-200 ${
                    openGroups['favorites'] ? '-rotate-90 text-[#0F172A]' : ''
                  }`}
                />
              </button>

              {openGroups['favorites'] && (
                <div className="mt-1 ml-5 pl-3 border-l border-[#E2E8F0] space-y-0.5 py-0.5">
                  {favoriteSubModules.map((sub) => {
                    const active = isSubModuleActive(sub.href);
                    return (
                      <a
                        key={`fav-${sub.href}`}
                        href={sub.href}
                        onClick={(e) => handleNavigate(e, sub.href)}
                        className={`group flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-all ${
                          active
                            ? 'bg-[#00C48C]/12 text-[#065F46] font-bold'
                            : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              active ? 'bg-[#00C48C]' : 'bg-[#CBD5E1] group-hover:bg-[#94A3B8]'
                            }`}
                          />
                          <span className="truncate">{sub.label}</span>
                        </div>
                        <span
                          role="button"
                          title="Remove from Favorites"
                          onClick={(e) => toggleFavorite(e, sub.href)}
                          className="opacity-70 hover:opacity-100 text-amber-500 p-0.5 rounded"
                        >
                          <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                        </span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Main Modules */}
          {mainModules.map((module) => {
            const Icon = module.icon;

            // Direct single-link module (e.g. Dashboard)
            if (module.href && !module.subModules) {
              if (!isRoutePermitted(module.href, user, tenant)) return null;
              const isActive = pathname === module.href;
              return (
                <a
                  key={module.id}
                  href={module.href}
                  onClick={(e) => handleNavigate(e, module.href!)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                    isActive
                      ? 'bg-[#00C48C] text-white font-semibold shadow-2xs'
                      : 'text-[#334155] hover:bg-[#F1F5F9]/80 hover:text-[#0F172A]'
                  }`}
                >
                  <Icon
                    className={`w-[18px] h-[18px] shrink-0 stroke-[1.75] ${
                      isActive ? 'text-white' : 'text-[#475569]'
                    }`}
                  />
                  <span className="flex-1 truncate">{module.label}</span>
                </a>
              );
            }

            // Filter permitted sub-modules for this main module
            const permittedSubs = (module.subModules || []).filter((sub) =>
              isRoutePermitted(sub.href, user, tenant, sub.requiredPermission),
            );
            if (permittedSubs.length === 0) return null;

            const hasActiveChild = permittedSubs.some((sub) =>
              isSubModuleActive(sub.href),
            );
            const isOpen = !!openGroups[module.id];

            return (
              <div key={module.id}>
                <button
                  type="button"
                  onClick={() => toggleGroup(module.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                    hasActiveChild
                      ? 'bg-[#ECFDF5] text-[#065F46] font-semibold'
                      : isOpen
                        ? 'bg-[#F1F5F9] text-[#0F172A]'
                        : 'text-[#334155] hover:bg-[#F1F5F9]/80 hover:text-[#0F172A]'
                  }`}
                >
                  <Icon
                    className={`w-[18px] h-[18px] shrink-0 stroke-[1.75] ${
                      hasActiveChild ? 'text-[#00C48C]' : 'text-[#475569]'
                    }`}
                  />
                  <span className="flex-1 text-left truncate">{module.label}</span>
                  <ChevronLeft
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                      hasActiveChild ? 'text-[#065F46]' : 'text-[#64748B]'
                    } ${isOpen ? '-rotate-90' : ''}`}
                  />
                </button>

                {/* Sub-Modules Drop List */}
                {isOpen && (
                  <div className="mt-1 ml-5 pl-3 border-l border-[#E2E8F0] space-y-0.5 py-0.5">
                    {permittedSubs.map((sub) => {
                      const active = isSubModuleActive(sub.href);
                      const isFav = favorites.includes(sub.href);
                      return (
                        <a
                          key={sub.href}
                          href={sub.href}
                          onClick={(e) => handleNavigate(e, sub.href)}
                          className={`group flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-all ${
                            active
                              ? 'bg-[#00C48C] text-white font-semibold shadow-2xs'
                              : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                active
                                  ? 'bg-white'
                                  : 'bg-[#CBD5E1] group-hover:bg-[#94A3B8]'
                              }`}
                            />
                            <span className="truncate">{sub.label}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {sub.badge && (
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                  active
                                    ? 'bg-white/20 text-white'
                                    : 'bg-[#ECFDF5] text-[#065F46]'
                                }`}
                              >
                                {sub.badge}
                              </span>
                            )}
                            <span
                              role="button"
                              title={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
                              onClick={(e) => toggleFavorite(e, sub.href)}
                              className={`p-0.5 rounded transition-opacity ${
                                isFav
                                  ? 'opacity-100'
                                  : 'opacity-0 group-hover:opacity-70 hover:!opacity-100'
                              }`}
                            >
                              <Star
                                className={`w-3 h-3 ${
                                  isFav
                                    ? active
                                      ? 'fill-white text-white'
                                      : 'fill-amber-400 text-amber-500'
                                    : active
                                      ? 'text-white/80'
                                      : 'text-[#94A3B8]'
                                }`}
                              />
                            </span>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Log Out */}
        <button
          onClick={handleLogout}
          className="mt-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* ================= MAIN CONTAINER ================= */}
      <div className="flex-1 lg:ml-[260px] flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white border-b border-[#E2E8F0] px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A]"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Active Property Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="w-2 h-2 rounded-full bg-[#00C48C]" />
              <span className="text-xs font-bold text-[#0F172A] truncate max-w-[200px] sm:max-w-none">
                {property?.name || 'Grand Azure Hotel & Resort'}
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white text-[#64748B] border border-[#E2E8F0]">
                {property?.currency || 'LKR'}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5">
            {isRoutePermitted('/dashboard/pos', user, tenant) && (
              <a
                href="/dashboard/pos"
                className="hidden sm:inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New POS Sale</span>
              </a>
            )}

            <button
              onClick={() =>
                alert('Notifications are active: kitchen orders and shifts.')
              }
              className="w-9 h-9 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] flex items-center justify-center text-[#64748B] transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#00C48C]" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {!isRoutePermitted(pathname, user, tenant) ? (
            <div className="bg-white rounded-3xl border border-[#E2E8F0] p-10 sm:p-14 text-center max-w-lg mx-auto mt-10 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-[#0F172A] tracking-tight mb-2">
                Access Restricted
              </h2>
              <p className="text-xs text-[#64748B] mb-2 leading-relaxed">
                This module is either not included in your hotel&apos;s active subscription package, or your staff account (<b>{user?.role?.replace('_', ' ') || 'Staff'}</b>) has not been granted permission.
              </p>
              <p className="text-[11px] text-[#94A3B8] mb-6">
                If you require access to this section, please ask your hotel administrator to update your permissions in <b>Settings & Staff</b>.
              </p>
              <a
                href={getFirstAllowedRoute(user)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold rounded-xl transition shadow-xs"
              >
                <span>Go to Your Assigned Workstation &rarr;</span>
              </a>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* ================= OPEN SHIFT MODAL ================= */}
      {shiftModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xl animate-fade-scale">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] text-[#00C48C] flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#0F172A]">
                  Open POS Cash Shift
                </h3>
              </div>
              <button
                onClick={() => setShiftModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#64748B] mb-5">
              Declare your opening cash float in the cash drawer to track daily
              sales and cash reconciliation accurately.
            </p>

            <form onSubmit={handleOpenShift} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Starting Cash Float (Rs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={startingFloat}
                  onChange={(e) => setStartingFloat(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold text-[#0F172A] focus:bg-white focus:border-[#00C48C] outline-none"
                  placeholder="10000.00"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShiftModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingShift}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {loadingShift ? 'Opening...' : 'Confirm & Open Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Embedded AI Operations Assistant Drawer & Floating Trigger */}
      <AiAssistantDrawer />
    </div>
  );
}
