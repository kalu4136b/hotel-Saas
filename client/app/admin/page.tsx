'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  ShieldCheck,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Users,
  BedDouble,
  DollarSign,
  Package,
  Layers,
  Settings,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Key,
  Calendar,
  LogOut,
  ExternalLink,
  ChevronRight,
  Eye,
  Sliders,
  Clock,
  Sparkles,
  Lock,
  X,
  CreditCard,
  Hash,
} from 'lucide-react';
import { superAdminApi, authStorage } from '@/lib/api';

interface PlatformOverview {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  mrr: number;
  totalUsers: number;
  totalProperties: number;
  totalRooms: number;
  totalOrders: number;
}

interface TenantItem {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  subscriptionTier: string;
  subscriptionPlan: string;
  planPrice: number;
  billingCycle: 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
  modules: string[];
  maxRooms: number | null;
  maxStaff: number | null;
  expiresAt: string | null;
  createdAt: string;
  userCount: number;
  propertyCount: number;
  roomCount: number;
  admin: {
    id: string;
    fullName: string;
    username: string;
    email: string;
    phone: string | null;
    lastLoginAt: string | null;
  } | null;
  properties: any[];
}

export default function SuperAdminPortalPage() {
  const router = useRouter();

  // Authentication State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Data State
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [packagesConfig, setPackagesConfig] = useState<any>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Feedback Notification
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Onboard Tenant Modal State
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [onboardForm, setOnboardForm] = useState({
    name: '',
    propertyName: '',
    currency: 'USD',
    subscriptionPlan: 'HOSPITALITY_PRO',
    billingCycle: 'MONTHLY' as 'MONTHLY' | 'ANNUAL' | 'LIFETIME',
    planPrice: 89.0,
    maxRooms: 60,
    maxStaff: 20,
    modules: [
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
    adminFullName: '',
    adminUsername: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
  });

  // Manage Tenant Modal State
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [managingTenant, setManagingTenant] = useState<TenantItem | null>(null);
  const [activeTab, setActiveTab] = useState<'modules' | 'subscription' | 'security'>('modules');
  const [savingChanges, setSavingChanges] = useState(false);

  // Tenant Edit Buffers
  const [editModules, setEditModules] = useState<string[]>([]);
  const [editSub, setEditSub] = useState({
    subscriptionPlan: 'CUSTOM',
    status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED' | 'PENDING',
    planPrice: 0,
    billingCycle: 'MONTHLY' as 'MONTHLY' | 'ANNUAL' | 'LIFETIME',
    maxRooms: 50,
    maxStaff: 10,
    expiresAt: '',
  });
  const [resetPasswordVal, setResetPasswordVal] = useState('');

  // 1. Initial Auth Check & Data Load
  useEffect(() => {
    const user = authStorage.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
      return;
    }
    setCurrentUser(user);
    setAuthChecked(true);
    loadPlatformData();
  }, []);

  const loadPlatformData = async () => {
    setLoading(true);
    try {
      const [ovData, tenantsData, pkgData] = await Promise.all([
        superAdminApi.getOverview(),
        superAdminApi.getTenants({
          search: searchQuery || undefined,
          plan: selectedPlan !== 'ALL' ? selectedPlan : undefined,
          status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        }),
        superAdminApi.getPackages(),
      ]);
      setOverview(ovData);
      setTenants(tenantsData);
      setPackagesConfig(pkgData);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to load platform data',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = async () => {
    setLoading(true);
    try {
      const data = await superAdminApi.getTenants({
        search: searchQuery || undefined,
        plan: selectedPlan !== 'ALL' ? selectedPlan : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
      });
      setTenants(data);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to filter tenants',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPackageForOnboard = (pkgId: string) => {
    if (!packagesConfig?.packages?.[pkgId]) return;
    const pkg = packagesConfig.packages[pkgId];
    setOnboardForm((prev) => ({
      ...prev,
      subscriptionPlan: pkgId,
      modules: [...pkg.defaultModules],
      planPrice: prev.billingCycle === 'ANNUAL' ? pkg.annualPrice : pkg.monthlyPrice,
      maxRooms: pkg.maxRooms ?? 100,
      maxStaff: pkg.maxStaff ?? 50,
    }));
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingTenant(true);
    setFeedback(null);
    try {
      await superAdminApi.createTenant({
        name: onboardForm.name,
        propertyName: onboardForm.propertyName || `${onboardForm.name} Main Resort`,
        currency: onboardForm.currency,
        subscriptionPlan: onboardForm.subscriptionPlan,
        modules: onboardForm.modules,
        planPrice: Number(onboardForm.planPrice) || 0,
        billingCycle: onboardForm.billingCycle,
        maxRooms: Number(onboardForm.maxRooms) || undefined,
        maxStaff: Number(onboardForm.maxStaff) || undefined,
        adminFullName: onboardForm.adminFullName,
        adminUsername: onboardForm.adminUsername,
        adminEmail: onboardForm.adminEmail,
        adminPhone: onboardForm.adminPhone || undefined,
        adminPassword: onboardForm.adminPassword,
      });

      setOnboardModalOpen(false);
      setFeedback({
        type: 'success',
        text: `Customer Tenant "${onboardForm.name}" created and provisioned successfully!`,
      });
      loadPlatformData();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to onboard tenant',
      });
    } finally {
      setCreatingTenant(false);
    }
  };

  const handleOpenManageModal = (t: TenantItem) => {
    setManagingTenant(t);
    setEditModules(t.modules || []);
    setEditSub({
      subscriptionPlan: t.subscriptionPlan || 'CUSTOM',
      status: t.status,
      planPrice: t.planPrice || 0,
      billingCycle: t.billingCycle || 'MONTHLY',
      maxRooms: t.maxRooms ?? 50,
      maxStaff: t.maxStaff ?? 15,
      expiresAt: t.expiresAt ? t.expiresAt.substring(0, 10) : '',
    });
    setResetPasswordVal('');
    setActiveTab('modules');
    setManageModalOpen(true);
  };

  const handleSaveModules = async () => {
    if (!managingTenant) return;
    setSavingChanges(true);
    try {
      await superAdminApi.updateModules(managingTenant.id, editModules);
      setFeedback({
        type: 'success',
        text: `Modules for "${managingTenant.name}" updated successfully.`,
      });
      setManageModalOpen(false);
      loadPlatformData();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to save modules',
      });
    } finally {
      setSavingChanges(false);
    }
  };

  const handleSaveSubscription = async () => {
    if (!managingTenant) return;
    setSavingChanges(true);
    try {
      await superAdminApi.updateSubscription(managingTenant.id, {
        subscriptionPlan: editSub.subscriptionPlan,
        status: editSub.status,
        planPrice: Number(editSub.planPrice),
        billingCycle: editSub.billingCycle,
        maxRooms: Number(editSub.maxRooms),
        maxStaff: Number(editSub.maxStaff),
        expiresAt: editSub.expiresAt ? new Date(editSub.expiresAt).toISOString() : null,
      });
      setFeedback({
        type: 'success',
        text: `Subscription & quotas for "${managingTenant.name}" updated.`,
      });
      setManageModalOpen(false);
      loadPlatformData();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to save subscription',
      });
    } finally {
      setSavingChanges(false);
    }
  };

  const handleResetPassword = async () => {
    if (!managingTenant || !resetPasswordVal) return;
    setSavingChanges(true);
    try {
      const res = await superAdminApi.resetPassword(managingTenant.id, resetPasswordVal);
      setFeedback({
        type: 'success',
        text: res.message || 'Password reset successfully.',
      });
      setResetPasswordVal('');
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to reset admin password',
      });
    } finally {
      setSavingChanges(false);
    }
  };

  const handleToggleStatusQuick = async (t: TenantItem) => {
    const nextStatus = t.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await superAdminApi.updateSubscription(t.id, { status: nextStatus });
      setFeedback({
        type: 'success',
        text: `Tenant "${t.name}" status updated to ${nextStatus}.`,
      });
      setTenants((prev) =>
        prev.map((item) => (item.id === t.id ? { ...item, status: nextStatus } : item)),
      );
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to update tenant status',
      });
    }
  };

  const handleLogout = () => {
    authStorage.clearSession();
    router.push('/login');
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-[#64748B] text-sm font-semibold">
        Verifying Super Admin Authorization...
      </div>
    );
  }

  const allModulesList: any[] = packagesConfig?.modules || [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased">
      {/* Top Executive Navigation Bar */}
      <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-40 px-6 lg:px-10 py-3.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#00C48C] text-white flex items-center justify-center shadow-xs font-bold">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-[#0F172A]">
                ninth<span className="text-[#00C48C]">.</span>hotel
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                Platform Tenant Manager
              </span>
            </div>
            <p className="text-[11px] text-[#64748B]">
              Company Provisioning & Multi-Tenant Entitlement Console
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs">
            <span className="w-2 h-2 rounded-full bg-[#00C48C] animate-pulse" />
            <span className="text-[#334155] font-semibold">Logged in as Super Admin</span>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            title="Switch to Hotel Dashboard"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#00C48C]" />
            <span>Hotel Console</span>
          </button>

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition border border-rose-200"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container Full Width */}
      <main className="w-full px-6 lg:px-10 py-6 space-y-6">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-semibold animate-in fade-in duration-150 ${
              feedback.type === 'success'
                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#00C48C]" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="opacity-70 hover:opacity-100 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Hero & Platform Overview KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#ECFDF5] text-[#00C48C] flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-[#64748B]">
                Total Hotel Clients
              </div>
              <div className="text-2xl font-bold text-[#0F172A] mono mt-0.5">
                {overview?.totalTenants ?? '—'}
              </div>
              <div className="text-[11px] text-[#64748B] mt-1 flex items-center gap-1.5">
                <span className="font-semibold text-emerald-700">
                  {overview?.activeTenants ?? 0} Active
                </span>
                <span>•</span>
                <span className="font-semibold text-rose-600">
                  {overview?.suspendedTenants ?? 0} Suspended
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#F0F9FF] text-[#0284C7] flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-[#64748B]">
                Active Monthly MRR
              </div>
              <div className="text-2xl font-bold text-[#0F172A] mono mt-0.5">
                ${overview?.mrr ? overview.mrr.toLocaleString() : '0.00'}
              </div>
              <div className="text-[11px] text-[#64748B] mt-1">
                Recurring subscription revenue
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
              <BedDouble className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-[#64748B]">
                Managed Rooms
              </div>
              <div className="text-2xl font-bold text-[#0F172A] mono mt-0.5">
                {overview?.totalRooms ?? 0}
              </div>
              <div className="text-[11px] text-[#64748B] mt-1">
                Across {overview?.totalProperties ?? 0} properties
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-[#64748B]">
                Total Staff & Users
              </div>
              <div className="text-2xl font-bold text-[#0F172A] mono mt-0.5">
                {overview?.totalUsers ?? 0}
              </div>
              <div className="text-[11px] text-[#64748B] mt-1">
                Admins, Managers & Cashiers
              </div>
            </div>
          </div>
        </div>

        {/* Directory Header & Onboard Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
              <span>Customer Tenants Directory</span>
              <span className="text-xs font-semibold text-[#64748B] bg-white px-2.5 py-0.5 rounded-lg border border-[#E2E8F0]">
                {tenants.length} customer hotels
              </span>
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Manage hotel client subscriptions, customize provisioned modules, and manage access.
            </p>
          </div>

          <button
            onClick={() => setOnboardModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#00C48C] hover:bg-[#00B07D] text-white font-bold text-xs rounded-xl shadow-xs transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-3" />
            <span>Onboard New Hotel / Tenant</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 bg-white border border-[#E2E8F0] rounded-2xl shadow-xs flex flex-wrap items-center gap-3 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search hotel name, slug, or admin email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
              className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] placeholder-[#94A3B8] text-xs focus:bg-white focus:outline-none focus:border-[#00C48C]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#64748B] text-[11px] font-bold">Package:</span>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] text-xs font-semibold focus:outline-none focus:border-[#00C48C]"
            >
              <option value="ALL">All Packages</option>
              <option value="POS_STARTER">POS Express</option>
              <option value="PMS_BOUTIQUE">Boutique PMS</option>
              <option value="HOSPITALITY_PRO">Hospitality Pro</option>
              <option value="ENTERPRISE_SUITE">Enterprise Suite</option>
              <option value="CUSTOM">Custom Plan</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#64748B] text-[11px] font-bold">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] text-xs font-semibold focus:outline-none focus:border-[#00C48C]"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          <button
            onClick={handleApplyFilters}
            className="px-3.5 py-2 bg-[#F8FAFC] hover:bg-[#E2E8F0] text-[#0F172A] border border-[#CBD5E1] rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
          </button>

          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedPlan('ALL');
              setSelectedStatus('ALL');
              loadPlatformData();
            }}
            className="p-2 bg-[#F8FAFC] hover:bg-[#E2E8F0] text-[#64748B] border border-[#CBD5E1] rounded-xl transition"
            title="Refresh All"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tenants Table */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#64748B] uppercase font-bold text-[10px] tracking-wider border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-5 py-3.5">Customer Hotel</th>
                  <th className="px-5 py-3.5">Admin Contact</th>
                  <th className="px-5 py-3.5">Package Plan</th>
                  <th className="px-5 py-3.5">Provisioned Modules</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Capacity</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] font-medium text-[#334155]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-[#94A3B8]">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#00C48C]" />
                        <span>Loading platform customer tenants...</span>
                      </div>
                    </td>
                  </tr>
                ) : tenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-[#94A3B8]">
                      No hotel tenants match the selected filters.
                    </td>
                  </tr>
                ) : (
                  tenants.map((t) => {
                    const planBadgeColor =
                      t.subscriptionPlan === 'ENTERPRISE_SUITE'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : t.subscriptionPlan === 'HOSPITALITY_PRO'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : t.subscriptionPlan === 'PMS_BOUTIQUE'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : t.subscriptionPlan === 'POS_STARTER'
                        ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                        : 'bg-slate-100 text-slate-700 border-slate-200';

                    return (
                      <tr key={t.id} className="hover:bg-[#F8FAFC] transition">
                        {/* Hotel Info */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-[#00C48C]/10 text-[#00C48C] font-bold flex items-center justify-center text-xs border border-[#00C48C]/20">
                              {t.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-[#0F172A] text-xs">{t.name}</div>
                              <div className="text-[10.5px] font-mono text-[#64748B]">
                                /{t.slug}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Admin Contact */}
                        <td className="px-5 py-3.5">
                          {t.admin ? (
                            <div>
                              <div className="font-semibold text-[#0F172A]">
                                {t.admin.fullName}
                              </div>
                              <div className="text-[10.5px] text-[#64748B]">
                                {t.admin.email}
                              </div>
                              <div className="text-[9.5px] text-[#94A3B8]">
                                @{t.admin.username}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[#94A3B8] italic">No admin assigned</span>
                          )}
                        </td>

                        {/* Subscription Package */}
                        <td className="px-5 py-3.5">
                          <div className="space-y-1">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase ${planBadgeColor}`}
                            >
                              {t.subscriptionPlan.replace('_', ' ')}
                            </span>
                            <div className="text-[10.5px] text-[#64748B]">
                              ${t.planPrice || 0}{' '}
                              <span className="text-[9px] text-[#94A3B8]">
                                /{t.billingCycle.toLowerCase()}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Provisioned Modules */}
                        <td className="px-5 py-3.5 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {(t.modules || []).slice(0, 5).map((m) => (
                              <span
                                key={m}
                                className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-[#F1F5F9] border border-[#CBD5E1] text-[#0F172A]"
                              >
                                {m}
                              </span>
                            ))}
                            {(t.modules || []).length > 5 && (
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                                +{(t.modules || []).length - 5} more
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => handleToggleStatusQuick(t)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold transition border ${
                              t.status === 'ACTIVE'
                                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46] hover:bg-[#D1FAE5]'
                                : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                            }`}
                            title="Click to toggle status"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                t.status === 'ACTIVE' ? 'bg-[#00C48C]' : 'bg-rose-500'
                              }`}
                            />
                            <span>{t.status}</span>
                          </button>
                        </td>

                        {/* Capacity Stats */}
                        <td className="px-5 py-3.5 text-[#64748B] text-[11px]">
                          <div>
                            <span className="text-[#0F172A] font-bold">{t.userCount}</span> staff
                          </div>
                          <div>
                            <span className="text-[#0F172A] font-bold">{t.roomCount}</span> rooms
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleOpenManageModal(t)}
                            className="px-3 py-1.5 rounded-xl bg-[#F8FAFC] hover:bg-[#E2E8F0] text-[#0F172A] font-bold text-xs transition inline-flex items-center gap-1.5 border border-[#CBD5E1]"
                          >
                            <Sliders className="w-3.5 h-3.5 text-[#00C48C]" />
                            <span>Manage & Provision</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: ONBOARD NEW CUSTOMER HOTEL WIZARD                                */}
      {/* ========================================================================= */}
      {onboardModalOpen && (
        <div className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl shadow-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#00C48C] flex items-center justify-center">
                  <Plus className="w-5 h-5 stroke-3" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A]">
                    Onboard New Customer Hotel
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Initialize customer environment, pricing tier, and module entitlements.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOnboardModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-5">
              {/* Step 1: Customer Identity */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-[#00C48C] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#ECFDF5] text-[#065F46] flex items-center justify-center text-[10px] font-bold">
                    1
                  </span>
                  <span>Hotel & Property Identity</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[#334155] font-bold mb-1">
                      Hotel / Business Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Grand Horizon Palace"
                      value={onboardForm.name}
                      onChange={(e) =>
                        setOnboardForm({ ...onboardForm, name: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#334155] font-bold mb-1">
                      Primary Property / Branch Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Downtown Branch"
                      value={onboardForm.propertyName}
                      onChange={(e) =>
                        setOnboardForm({ ...onboardForm, propertyName: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[#334155] font-bold mb-1">Currency</label>
                    <select
                      value={onboardForm.currency}
                      onChange={(e) =>
                        setOnboardForm({ ...onboardForm, currency: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] font-semibold focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="LKR">LKR (Rs)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="AED">AED (د.إ)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#334155] font-bold mb-1">
                      Billing Cycle
                    </label>
                    <select
                      value={onboardForm.billingCycle}
                      onChange={(e: any) =>
                        setOnboardForm({ ...onboardForm, billingCycle: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] font-semibold focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="ANNUAL">Annual (1 Year)</option>
                      <option value="LIFETIME">Lifetime Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#334155] font-bold mb-1">
                      Subscription Fee ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={onboardForm.planPrice}
                      onChange={(e) =>
                        setOnboardForm({
                          ...onboardForm,
                          planPrice: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Pricing Package Preset */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-black uppercase tracking-wider text-[#00C48C] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#ECFDF5] text-[#065F46] flex items-center justify-center text-[10px] font-bold">
                    2
                  </span>
                  <span>Select Pricing Package</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {[
                    {
                      id: 'POS_STARTER',
                      name: 'POS Express',
                      price: '$29/mo',
                      badge: 'Dining Only',
                      desc: 'Restaurant, Cafe, KDS',
                    },
                    {
                      id: 'PMS_BOUTIQUE',
                      name: 'Boutique PMS',
                      price: '$49/mo',
                      badge: 'Lodging Only',
                      desc: 'Rooms, Stays, Folios',
                    },
                    {
                      id: 'HOSPITALITY_PRO',
                      name: 'Hospitality Pro',
                      price: '$89/mo',
                      badge: 'Hotel + Dining',
                      desc: 'Full Suite + Stock',
                    },
                    {
                      id: 'ENTERPRISE_SUITE',
                      name: 'Enterprise',
                      price: '$199/mo',
                      badge: 'Resort / Chains',
                      desc: 'Unlimited power',
                    },
                  ].map((pkg) => {
                    const isSelected = onboardForm.subscriptionPlan === pkg.id;
                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => handleSelectPackageForOnboard(pkg.id)}
                        className={`p-3 rounded-2xl border text-left transition ${
                          isSelected
                            ? 'bg-[#ECFDF5] border-[#00C48C] text-[#0F172A] shadow-xs ring-2 ring-[#00C48C]/20'
                            : 'bg-[#F8FAFC] border-[#E2E8F0] hover:bg-white text-[#64748B]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-[#0F172A]">
                            {pkg.name}
                          </span>
                          <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-white border border-[#CBD5E1] text-[#0F172A] font-bold">
                            {pkg.price}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#64748B] leading-tight">
                          {pkg.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Granular Module Switchboard */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black uppercase tracking-wider text-[#00C48C] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#ECFDF5] text-[#065F46] flex items-center justify-center text-[10px] font-bold">
                      3
                    </span>
                    <span>Provisioned Modules Switchboard</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() =>
                        setOnboardForm((prev) => ({
                          ...prev,
                          modules: allModulesList.map((m) => m.id),
                        }))
                      }
                      className="px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] font-bold hover:bg-[#E2E8F0]"
                    >
                      All Modules
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setOnboardForm((prev) => ({ ...prev, modules: [] }))
                      }
                      className="px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] font-bold hover:bg-[#E2E8F0]"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl max-h-56 overflow-y-auto space-y-3">
                  {(['POS & Dining', 'PMS & Lodging', 'Operations & Management'] as const).map(
                    (cat) => {
                      const catModules = allModulesList.filter((m) => m.category === cat);
                      return (
                        <div key={cat} className="space-y-1.5">
                          <div className="text-[10px] font-black uppercase tracking-wider text-[#64748B] px-1">
                            {cat}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {catModules.map((mod) => {
                              const checked = onboardForm.modules.includes(mod.id);
                              return (
                                <label
                                  key={mod.id}
                                  className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition text-xs ${
                                    checked
                                      ? 'bg-white border-[#00C48C] text-[#0F172A] shadow-2xs'
                                      : 'bg-white/60 border-[#E2E8F0] text-[#64748B] hover:bg-white hover:text-[#0F172A]'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setOnboardForm((prev) => ({
                                          ...prev,
                                          modules: [...prev.modules, mod.id],
                                        }));
                                      } else {
                                        setOnboardForm((prev) => ({
                                          ...prev,
                                          modules: prev.modules.filter((m) => m !== mod.id),
                                        }));
                                      }
                                    }}
                                    className="mt-0.5 accent-[#00C48C] rounded"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[11px] font-bold leading-tight">
                                      {mod.label}
                                    </div>
                                    <div className="text-[9.5px] text-[#64748B] truncate">
                                      {mod.description}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>

              {/* Step 4: Admin Credentials */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-black uppercase tracking-wider text-[#00C48C] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#ECFDF5] text-[#065F46] flex items-center justify-center text-[10px] font-bold">
                    4
                  </span>
                  <span>Hotel Administrator Credentials</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[#334155] font-bold mb-1">
                      Admin Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. David Miller"
                      value={onboardForm.adminFullName}
                      onChange={(e) =>
                        setOnboardForm({ ...onboardForm, adminFullName: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#334155] font-bold mb-1">
                      Admin Username *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. david_admin"
                      value={onboardForm.adminUsername}
                      onChange={(e) =>
                        setOnboardForm({ ...onboardForm, adminUsername: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] placeholder-[#94A3B8] font-mono focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#334155] font-bold mb-1">
                      Admin Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. admin@grandhorizon.com"
                      value={onboardForm.adminEmail}
                      onChange={(e) =>
                        setOnboardForm({ ...onboardForm, adminEmail: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#334155] font-bold mb-1">
                      Initial Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Min 6 characters"
                      value={onboardForm.adminPassword}
                      onChange={(e) =>
                        setOnboardForm({ ...onboardForm, adminPassword: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-[#F1F5F9] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOnboardModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTenant}
                  className="px-6 py-2.5 rounded-xl bg-[#00C48C] hover:bg-[#00B07D] text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
                >
                  {creatingTenant ? 'Provisioning Tenant...' : 'Deploy & Onboard Hotel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: MANAGE PROVISIONING & SUBSCRIPTION MODAL                         */}
      {/* ========================================================================= */}
      {manageModalOpen && managingTenant && (
        <div className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#00C48C] flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A]">
                    Manage Tenant: {managingTenant.name}
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Tenant ID: <span className="font-mono text-[#0F172A]">{managingTenant.id}</span> · Slug:{' '}
                    <span className="font-mono text-[#0F172A]">{managingTenant.slug}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setManageModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-2 text-xs">
              <button
                onClick={() => setActiveTab('modules')}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'modules'
                    ? 'bg-[#00C48C] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Modules Switchboard</span>
              </button>

              <button
                onClick={() => setActiveTab('subscription')}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'subscription'
                    ? 'bg-[#00C48C] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Plan & Quotas</span>
              </button>

              <button
                onClick={() => setActiveTab('security')}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'security'
                    ? 'bg-[#00C48C] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Reset Admin Password</span>
              </button>
            </div>

            {/* TAB 1: MODULES SWITCHBOARD */}
            {activeTab === 'modules' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#64748B]">
                    Toggle modules on or off for this customer. Disabled modules are immediately hidden and locked across this hotel tenant.
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setEditModules(allModulesList.map((m) => m.id))}
                      className="px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] font-bold hover:bg-[#E2E8F0]"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditModules([])}
                      className="px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] font-bold hover:bg-[#E2E8F0]"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl max-h-72 overflow-y-auto space-y-3">
                  {(['POS & Dining', 'PMS & Lodging', 'Operations & Management'] as const).map(
                    (cat) => {
                      const catModules = allModulesList.filter((m) => m.category === cat);
                      return (
                        <div key={cat} className="space-y-1.5">
                          <div className="text-[10px] font-black uppercase tracking-wider text-[#64748B] px-1">
                            {cat}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {catModules.map((mod) => {
                              const checked = editModules.includes(mod.id);
                              return (
                                <label
                                  key={mod.id}
                                  className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition text-xs ${
                                    checked
                                      ? 'bg-white border-[#00C48C] text-[#0F172A] shadow-2xs'
                                      : 'bg-white/60 border-[#E2E8F0] text-[#64748B] hover:bg-white hover:text-[#0F172A]'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setEditModules((prev) => [...prev, mod.id]);
                                      } else {
                                        setEditModules((prev) =>
                                          prev.filter((m) => m !== mod.id),
                                        );
                                      }
                                    }}
                                    className="mt-0.5 accent-[#00C48C] rounded"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[11px] font-bold leading-tight">
                                      {mod.label}
                                    </div>
                                    <div className="text-[9.5px] text-[#64748B] truncate">
                                      {mod.description}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setManageModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveModules}
                    disabled={savingChanges}
                    className="px-5 py-2 rounded-xl bg-[#00C48C] hover:bg-[#00B07D] text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
                  >
                    {savingChanges ? 'Saving Modules...' : 'Save Provisioned Modules'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: PLAN & QUOTAS */}
            {activeTab === 'subscription' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#334155] font-bold mb-1">
                      Subscription Plan
                    </label>
                    <select
                      value={editSub.subscriptionPlan}
                      onChange={(e) =>
                        setEditSub({ ...editSub, subscriptionPlan: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] font-semibold focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    >
                      <option value="POS_STARTER">POS Express & Dining ($29/mo)</option>
                      <option value="PMS_BOUTIQUE">Boutique Hotel & PMS ($49/mo)</option>
                      <option value="HOSPITALITY_PRO">Hospitality Pro ($89/mo)</option>
                      <option value="ENTERPRISE_SUITE">Enterprise All-In-One ($199/mo)</option>
                      <option value="CUSTOM">Custom Tailored Plan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#334155] font-bold mb-1">
                      Account Status
                    </label>
                    <select
                      value={editSub.status}
                      onChange={(e: any) =>
                        setEditSub({ ...editSub, status: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] font-semibold focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    >
                      <option value="ACTIVE">ACTIVE (Access Allowed)</option>
                      <option value="SUSPENDED">SUSPENDED (Access Blocked)</option>
                      <option value="PENDING">PENDING (Awaiting Activation)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#334155] font-bold mb-1">
                      Subscription Fee ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editSub.planPrice}
                      onChange={(e) =>
                        setEditSub({
                          ...editSub,
                          planPrice: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#334155] font-bold mb-1">
                      Billing Cycle
                    </label>
                    <select
                      value={editSub.billingCycle}
                      onChange={(e: any) =>
                        setEditSub({ ...editSub, billingCycle: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] font-semibold focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="ANNUAL">Annual</option>
                      <option value="LIFETIME">Lifetime</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#334155] font-bold mb-1">
                      Max Rooms Quota
                    </label>
                    <input
                      type="number"
                      value={editSub.maxRooms}
                      onChange={(e) =>
                        setEditSub({
                          ...editSub,
                          maxRooms: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#334155] font-bold mb-1">
                      Max Staff Quota
                    </label>
                    <input
                      type="number"
                      value={editSub.maxStaff}
                      onChange={(e) =>
                        setEditSub({
                          ...editSub,
                          maxStaff: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#F1F5F9]">
                  <button
                    onClick={() => setManageModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSubscription}
                    disabled={savingChanges}
                    className="px-5 py-2 rounded-xl bg-[#00C48C] hover:bg-[#00B07D] text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
                  >
                    {savingChanges ? 'Saving Plan...' : 'Save Plan & Quotas'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: RESET ADMIN PASSWORD */}
            {activeTab === 'security' && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                    <span>Customer Support Password Reset</span>
                  </div>
                  <div>
                    If the client administrator lost access to their hotel account, you can reset their password here immediately.
                  </div>
                </div>

                <div>
                  <label className="block text-[#334155] font-bold mb-1">
                    New Temporary Password for @{managingTenant.admin?.username || 'admin'}
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password (min 6 characters)"
                    value={resetPasswordVal}
                    onChange={(e) => setResetPasswordVal(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:border-[#00C48C]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={handleResetPassword}
                    disabled={savingChanges || resetPasswordVal.length < 6}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
                  >
                    {savingChanges ? 'Resetting...' : 'Reset Admin Password'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
