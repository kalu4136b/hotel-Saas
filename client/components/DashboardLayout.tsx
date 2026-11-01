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
} from 'lucide-react';
import { authStorage, authApi, posApi } from '@/lib/api';
import {
  isRoutePermitted,
  getUserPermissions,
  getFirstAllowedRoute,
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

    // Fetch active shift
    if (currentUser?.role !== 'SUPER_ADMIN') {
      posApi
        .getCurrentShift()
        .then((shift) => setActiveShift(shift))
        .catch(() => {});
    }
  }, [router]);

  // If staff user without dashboard overview lands on /dashboard, redirect to their first allowed station
  useEffect(() => {
    if (user) {
      if (user.role === 'SUPER_ADMIN' && !authStorage.getTenantToken()) {
        router.replace('/admin');
        return;
      }
      if (pathname === '/dashboard' && !isRoutePermitted('/dashboard', user, tenant)) {
        const destination = getFirstAllowedRoute(user, tenant);
        router.push(destination);
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

  const navItems = [
    {
      label: 'Dashboard Overview',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'PMS Hub Overview',
      href: '/dashboard/pms',
      icon: Building2,
      badge: 'PMS',
    },
    {
      label: 'Rooms & Inventory',
      href: '/dashboard/pms/rooms',
      icon: BedDouble,
    },
    {
      label: 'Housekeeping Station',
      href: '/dashboard/pms/housekeeping',
      icon: Sparkles,
      badge: 'Live',
    },
    {
      label: 'Reservations & Stays',
      href: '/dashboard/pms/reservations',
      icon: CalendarCheck,
    },
    {
      label: 'Front Desk Folios',
      href: '/dashboard/pms/front-desk',
      icon: Key,
      badge: 'PMS',
    },
    {
      label: 'Channel Manager (OTA)',
      href: '/dashboard/channel-manager',
      icon: Globe,
      badge: 'OTA',
    },
    {
      label: 'POS Sales Terminal',
      href: '/dashboard/pos',
      icon: UtensilsCrossed,
      badge: 'Terminal',
    },
    {
      label: 'Kitchen Display (KDS)',
      href: '/dashboard/kitchen',
      icon: ChefHat,
    },
    {
      label: 'Orders & Bills',
      href: '/dashboard/orders',
      icon: Receipt,
    },
    {
      label: 'Dining Tables',
      href: '/dashboard/tables',
      icon: Grid,
    },
    {
      label: 'Bar & Beverage',
      href: '/dashboard/bar',
      icon: Wine,
      badge: 'Bar',
    },
    {
      label: 'Menu & Products',
      href: '/dashboard/menu',
      icon: MenuSquare,
    },
    {
      label: 'Inventory & Recipes',
      href: '/dashboard/inventory',
      icon: Boxes,
      badge: 'BOM',
    },
    {
      label: 'Financial Reports',
      href: '/dashboard/reports',
      icon: Receipt,
      badge: 'SQL',
    },
    {
      label: 'Settings & Staff',
      href: '/dashboard/settings',
      icon: Settings,
    },
  ];

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
          <div className="w-8 h-8 rounded-xl bg-[#00C48C] text-white flex items-center justify-center shadow-xs">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-extrabold tracking-tight text-[#0F172A]">
            ninth<span className="text-[#00C48C]">.</span>hotel
          </span>
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

        {/* Navigation Section */}
        <div className="text-[10px] font-bold tracking-wider uppercase text-[#94A3B8] px-2 mb-2">
          Core Operations
        </div>
        <nav className="space-y-1 flex-1 overflow-y-auto pr-1">
          {navItems
            .filter((item) => isRoutePermitted(item.href, user, tenant))
            .map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#00C48C] text-white shadow-xs'
                    : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#64748B]'}`}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[9.5px] px-1.5 py-0.5 rounded-md font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-[#ECFDF5] text-[#065F46]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        {/* Shift Card Status */}
        <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] my-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider">
              Shift Drawer
            </span>
            <span
              className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                activeShift
                  ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {activeShift ? 'Open' : 'Closed'}
            </span>
          </div>
          {activeShift ? (
            <div className="text-xs text-[#0F172A] font-semibold">
              Float: ${Number(activeShift.startingFloat).toFixed(2)}
            </div>
          ) : (
            <button
              onClick={() => setShiftModalOpen(true)}
              className="w-full mt-1.5 py-1.5 px-2 rounded-lg bg-[#00C48C] hover:bg-[#00A877] text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Open Cash Shift</span>
            </button>
          )}
        </div>

        {/* Log Out */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
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
