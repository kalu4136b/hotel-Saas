'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { settingsApi, aiAssistantApi, authStorage } from '@/lib/api';
import {
  Building2,
  Users,
  ShieldCheck,
  Save,
  Plus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Percent,
  Clock,
  UserCheck,
  UserX,
  X,
  Shield,
  Search,
  KeyRound,
  SlidersHorizontal,
  Check,
  Sparkles,
  Bot,
  Cpu,
} from 'lucide-react';
import {
  SYSTEM_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  getTenantModules,
  isPermissionAllowedByModules,
} from '@/lib/permissions';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'property' | 'staff' | 'audit' | 'ai'>('property');
  const [loading, setLoading] = useState(true);
  const [savingProperty, setSavingProperty] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const applyUrlTab = (searchStr?: string) => {
      const params = new URLSearchParams(searchStr ?? window.location.search);
      const tab = params.get('tab')?.toLowerCase() as any;
      const validTabs = ['property', 'staff', 'audit', 'ai'];
      if (tab && validTabs.includes(tab)) {
        setActiveTab(tab);
      }
    };
    applyUrlTab();
    const handleNavTab = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.href?.includes('?')) {
        applyUrlTab('?' + detail.href.split('?')[1]);
      }
    };
    window.addEventListener('hotel-nav-tab', handleNavTab);
    window.addEventListener('popstate', () => applyUrlTab());
    return () => {
      window.removeEventListener('hotel-nav-tab', handleNavTab);
    };
  }, []);

  // AI Settings State
  const [aiConfig, setAiConfig] = useState<any>(null);
  const [savingAiConfig, setSavingAiConfig] = useState(false);

  // Property Form State
  const [property, setProperty] = useState<any>({
    name: '',
    address: '',
    phone: '',
    email: '',
    currency: 'LKR',
    defaultTaxRate: 10,
    serviceChargeRate: 0,
  });

  // Staff State
  const [staffList, setStaffList] = useState<any[]>([]);
  const [addStaffModalOpen, setAddStaffModalOpen] = useState(false);
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    role: 'CASHIER' as 'MANAGER' | 'CASHIER' | 'KITCHEN',
    permissions: DEFAULT_ROLE_PERMISSIONS.CASHIER,
  });

  // Edit Staff Modal State
  const [editStaffModalOpen, setEditStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [updatingStaff, setUpdatingStaff] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditFilter, setAuditFilter] = useState('');

  const currentUser = authStorage.getUser();

  useEffect(() => {
    loadSettingsData();
  }, [activeTab]);

  const loadSettingsData = async () => {
    setLoading(true);
    setFeedbackMessage(null);
    try {
      if (activeTab === 'property') {
        const prop = await settingsApi.getProperty();
        setProperty(prop);
      } else if (activeTab === 'staff') {
        const users = await settingsApi.getUsers();
        setStaffList(users);
      } else if (activeTab === 'audit') {
        const logs = await settingsApi.getAuditLogs();
        setAuditLogs(logs);
      } else if (activeTab === 'ai') {
        const config = await aiAssistantApi.getTenantConfig();
        setAiConfig(config);
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to load configuration data from server',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiConfig) return;
    setSavingAiConfig(true);
    setFeedbackMessage(null);
    try {
      const activeIds = aiConfig.providers
        .filter((p: any) => p.isEnabled)
        .map((p: any) => p.id);
      const updated = await aiAssistantApi.updateTenantConfig({
        enabledProviders: activeIds,
        defaultProviderId: aiConfig.defaultProviderId,
        defaultModelId: aiConfig.defaultModelId,
      });
      setAiConfig(updated);
      setFeedbackMessage({
        type: 'success',
        text: 'AI Assistant models and entitlement settings updated successfully.',
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'Failed to save AI configuration.',
      });
    } finally {
      setSavingAiConfig(false);
    }
  };

  const handleUpdateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProperty(true);
    setFeedbackMessage(null);
    try {
      const updated = await settingsApi.updateProperty({
        name: property.name,
        address: property.address,
        phone: property.phone,
        email: property.email,
        currency: property.currency,
        defaultTaxRate: Number(property.defaultTaxRate) || 0,
        serviceChargeRate: Number(property.serviceChargeRate) || 0,
      });
      setProperty(updated);
      authStorage.setProperty(updated);
      setFeedbackMessage({
        type: 'success',
        text: 'Property settings updated successfully in database.',
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to update property settings',
      });
    } finally {
      setSavingProperty(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingStaff(true);
    setFeedbackMessage(null);
    try {
      await settingsApi.createUser(newStaff);
      setAddStaffModalOpen(false);
      setNewStaff({
        fullName: '',
        username: '',
        email: '',
        phone: '',
        password: '',
        role: 'CASHIER',
        permissions: DEFAULT_ROLE_PERMISSIONS.CASHIER,
      });
      setFeedbackMessage({
        type: 'success',
        text: `Staff user "${newStaff.username}" created successfully.`,
      });
      const users = await settingsApi.getUsers();
      setStaffList(users);
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to create staff member',
      });
    } finally {
      setCreatingStaff(false);
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setUpdatingStaff(true);
    setFeedbackMessage(null);
    try {
      await settingsApi.updateUser(editingStaff.id, {
        fullName: editingStaff.fullName,
        phone: editingStaff.phone,
        role: editingStaff.role,
        permissions: editingStaff.permissions,
        password: editingStaff.password ? editingStaff.password : undefined,
      });
      setEditStaffModalOpen(false);
      setEditingStaff(null);
      setFeedbackMessage({
        type: 'success',
        text: `Permissions & details for "${editingStaff.username}" updated successfully.`,
      });
      const users = await settingsApi.getUsers();
      setStaffList(users);
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to update staff permissions',
      });
    } finally {
      setUpdatingStaff(false);
    }
  };


  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await settingsApi.toggleUserStatus(userId, !currentStatus);
      setStaffList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: !currentStatus } : u))
      );
      setFeedbackMessage({
        type: 'success',
        text: `Staff status updated to ${!currentStatus ? 'Active' : 'Disabled'}.`,
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to update staff status',
      });
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (!auditFilter) return true;
    const q = auditFilter.toLowerCase();
    return (
      log.action?.toLowerCase().includes(q) ||
      log.entity?.toLowerCase().includes(q) ||
      log.details?.toLowerCase().includes(q) ||
      log.userId?.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
              Settings & Organization
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Manage your hotel property configuration, staff credentials, and security audit log.
            </p>
          </div>
          <button
            onClick={loadSettingsData}
            className="self-start sm:self-auto flex items-center gap-2 px-3 py-2 bg-white border border-[#E2E8F0] text-[#0F172A] text-xs font-semibold rounded-xl hover:bg-[#F8FAFC] transition shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#00C48C]' : ''}`} />
            <span>Reload</span>
          </button>
        </div>

        {/* Global Feedback Banner */}
        {feedbackMessage && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 text-xs font-medium ${
              feedbackMessage.type === 'success'
                ? 'bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46]'
                : 'bg-rose-50 border border-rose-200 text-rose-700'
            }`}
          >
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#00C48C]" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            )}
            <span className="flex-1">{feedbackMessage.text}</span>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-xs opacity-60 hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#E2E8F0] gap-2">
          <button
            onClick={() => setActiveTab('property')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition mb-[-2px] ${
              activeTab === 'property'
                ? 'border-[#00C48C] text-[#00C48C]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Property Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition mb-[-2px] ${
              activeTab === 'staff'
                ? 'border-[#00C48C] text-[#00C48C]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Staff Accounts</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition mb-[-2px] ${
              activeTab === 'audit'
                ? 'border-[#00C48C] text-[#00C48C]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Audit Trail</span>
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition mb-[-2px] ${
              activeTab === 'ai'
                ? 'border-[#00C48C] text-[#00C48C]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#00C48C]" />
            <span>AI Operations & Models</span>
          </button>
        </div>

        {/* TAB 4: AI Operations & Model Management */}
        {activeTab === 'ai' && (
          <div className="space-y-6 max-w-5xl">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#00C48C]" />
                  <span>AI Assistant & Model Access Management</span>
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Configure which AI providers, reasoning models, and quotas are active for your hotel organization.
                </p>
              </div>
            </div>

            {loading || !aiConfig ? (
              <div className="p-12 text-center text-xs text-[#94A3B8] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#00C48C]" />
                <span>Loading AI subscription entitlements...</span>
              </div>
            ) : (
              <form onSubmit={handleSaveAiConfig} className="space-y-6">
                {/* 1. Subscription & Usage Allowance Card */}
                <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] rounded-2xl p-6 text-white shadow-lg border border-[#334155]">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00C48C] to-[#10B981] flex items-center justify-center text-white shadow-md shadow-[#00C48C]/30">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#94A3B8] uppercase font-bold tracking-wider">Current AI Tier</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00C48C]/20 text-[#00C48C] border border-[#00C48C]/40">
                            {aiConfig.aiTier === 'TIER_3_ALL'
                              ? 'Tier 3 — All Models Suite'
                              : aiConfig.aiTier === 'TIER_2_SPECIFIC'
                              ? 'Tier 2 — Pro Models (Gemini & Groq)'
                              : 'Tier 1 — Basic AI Chat'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white mt-0.5">
                          {aiConfig.aiTier === 'TIER_3_ALL'
                            ? 'Multi-Model Enterprise Entitlement'
                            : aiConfig.aiTier === 'TIER_2_SPECIFIC'
                            ? 'Google Gemini & Groq Cloud LPU Access'
                            : 'Platform Default AI Operations'}
                        </h3>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-[#94A3B8] block">Billing Cycle Resets:</span>
                      <span className="text-xs font-mono font-semibold text-white">
                        {new Date(aiConfig.billingPeriodStart).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Quota Usage Meters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                    {/* Requests Meter */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-[#CBD5E1] font-medium">Monthly Requests Allowance</span>
                        <span className="font-mono font-bold text-[#00C48C]">
                          {aiConfig.requestsUsedThisMonth?.toLocaleString()} / {aiConfig.monthlyRequestLimit?.toLocaleString()} ({aiConfig.percentUsed}%)
                        </span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            aiConfig.percentUsed > 90
                              ? 'bg-rose-500'
                              : aiConfig.percentUsed > 75
                              ? 'bg-amber-400'
                              : 'bg-[#00C48C]'
                          }`}
                          style={{ width: `${Math.min(100, aiConfig.percentUsed)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[#94A3B8] mt-2 block">
                        {(aiConfig.monthlyRequestLimit - aiConfig.requestsUsedThisMonth)?.toLocaleString()} operations remaining this cycle
                      </span>
                    </div>

                    {/* Tokens Meter */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-[#CBD5E1] font-medium">Monthly Token Budget</span>
                        <span className="font-mono font-bold text-[#38BDF8]">
                          {aiConfig.tokensUsedThisMonth?.toLocaleString()} / {aiConfig.monthlyTokenLimit?.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-[#38BDF8] rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (aiConfig.tokensUsedThisMonth / (aiConfig.monthlyTokenLimit || 1)) * 100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-[#94A3B8] mt-2 block">
                        Server-managed platform tokens for fast inference
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Provider Matrix & Model Availability */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#F1F5F9]">
                    <div>
                      <h3 className="text-sm font-bold text-[#0F172A]">AI Engine & Model Permitted Registry</h3>
                      <p className="text-xs text-[#64748B]">
                        Enable or disable permitted AI models for your hotel staff. Coming Soon models cannot be activated yet.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiConfig.providers?.map((p: any) => (
                      <div
                        key={p.id}
                        className={`rounded-xl border p-4.5 transition-all flex flex-col justify-between ${
                          p.isComingSoon
                            ? 'bg-[#F8FAFC]/80 border-[#E2E8F0] opacity-80'
                            : !p.isSubscribed
                            ? 'bg-slate-50/50 border-[#E2E8F0]'
                            : p.isEnabled
                            ? 'bg-emerald-50/30 border-emerald-200 shadow-xs'
                            : 'bg-white border-[#CBD5E1]'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${
                                  p.isComingSoon
                                    ? 'bg-slate-200 text-slate-500'
                                    : p.id === 'internal'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-emerald-100 text-[#00A877]'
                                }`}
                              >
                                {p.id === 'internal' ? <Cpu className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-[#0F172A]">{p.name}</h4>
                                <span className="text-[10px] text-[#64748B] block font-mono">{p.modelId}</span>
                              </div>
                            </div>

                            {/* Badge */}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                p.isComingSoon
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : !p.isSubscribed
                                  ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                  : p.isEnabled
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {p.badge}
                            </span>
                          </div>

                          <p className="text-xs text-[#64748B] leading-relaxed mb-4">
                            {p.description}
                          </p>
                        </div>

                        {/* Controls / State */}
                        <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
                          {p.isComingSoon ? (
                            <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                              Coming Soon • Model integration in progress
                            </span>
                          ) : !p.isSubscribed ? (
                            <span className="text-[11px] text-[#64748B] italic">
                              Requires plan upgrade to {p.minTier}
                            </span>
                          ) : p.id === 'internal' ? (
                            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                              Core Platform Engine • Always Enabled
                            </span>
                          ) : (
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={!!p.isEnabled}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  const updated = aiConfig.providers.map((item: any) =>
                                    item.id === p.id ? { ...item, isEnabled: checked } : item
                                  );
                                  const nextDefaultProviderId =
                                    !checked && aiConfig.defaultProviderId === p.id
                                      ? 'internal'
                                      : aiConfig.defaultProviderId;
                                  const nextDefaultModelId =
                                    !checked && aiConfig.defaultProviderId === p.id
                                      ? 'builtin-rule-nlp'
                                      : aiConfig.defaultModelId;
                                  setAiConfig({
                                    ...aiConfig,
                                    providers: updated,
                                    defaultProviderId: nextDefaultProviderId,
                                    defaultModelId: nextDefaultModelId,
                                  });
                                }}
                                className="w-4 h-4 text-[#00C48C] rounded border-[#CBD5E1] focus:ring-[#00C48C]"
                              />
                              <span className="text-xs font-semibold text-[#334155]">
                                {p.isEnabled ? 'Enabled for Hotel Staff' : 'Disabled'}
                              </span>
                            </label>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Default AI Engine Selector & Staff Access Notice */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Default Model */}
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5">
                    <h3 className="text-xs font-bold text-[#0F172A] mb-1">Hotel Default AI Model</h3>
                    <p className="text-[11px] text-[#64748B] mb-3">
                      This model is selected automatically whenever a staff member opens the AI assistant.
                    </p>

                    <select
                      value={aiConfig.defaultModelId}
                      onChange={(e) => {
                        const selectedModel = aiConfig.providers.find((p: any) => p.modelId === e.target.value);
                        setAiConfig({
                          ...aiConfig,
                          defaultModelId: e.target.value,
                          defaultProviderId: selectedModel?.id || 'internal',
                        });
                      }}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-semibold text-[#0F172A] focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    >
                      {aiConfig.providers
                        ?.filter((p: any) => p.isSubscribed && !p.isComingSoon && p.isEnabled)
                        .map((p: any) => (
                          <option key={p.modelId} value={p.modelId}>
                            {p.name} ({p.badge})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Staff RBAC Notice */}
                  <div className="bg-emerald-50/50 rounded-2xl border border-emerald-200 shadow-xs p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 mb-1">
                        <ShieldCheck className="w-4 h-4 text-[#00C48C]" />
                        <span>Role-Based AI Access (RBAC)</span>
                      </div>
                      <p className="text-[11px] text-emerald-800 leading-relaxed">
                        Control individual staff access using permissions in the <strong>Staff Accounts</strong> tab:
                      </p>
                      <ul className="text-[10px] text-emerald-800 mt-2 space-y-1 list-disc list-inside">
                        <li><strong>ai_view:</strong> Access the AI Assistant drawer.</li>
                        <li><strong>ai_chat:</strong> Run operational chat commands.</li>
                        <li><strong>ai_model_select:</strong> Allow staff to switch between permitted models.</li>
                      </ul>
                    </div>

                    <div className="mt-3 text-right">
                      <button
                        type="button"
                        onClick={() => setActiveTab('staff')}
                        className="text-[11px] font-bold text-[#00A877] hover:underline"
                      >
                        Manage Staff Roles &rarr;
                      </button>
                    </div>
                  </div>
                </div>

                {/* Save Changes CTA */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={savingAiConfig}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white font-bold text-xs transition shadow-sm disabled:opacity-50"
                  >
                    {savingAiConfig ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving Configuration...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save AI Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
        {activeTab === 'property' && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-6 max-w-4xl">
            <div className="flex items-center justify-between pb-5 border-b border-[#F1F5F9] mb-6">
              <div>
                <h2 className="text-sm font-bold text-[#0F172A]">Property & Billing Parameters</h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  These values directly configure POS receipt headers, currency formatting, and tax calculations.
                </p>
              </div>
              <span className="text-[11px] font-mono bg-[#F1F5F9] px-2.5 py-1 rounded-md text-[#475569] font-medium">
                ID: {property?.id?.slice(0, 8)}...
              </span>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center items-center text-xs text-[#64748B] gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#00C48C]" />
                <span>Fetching property configuration...</span>
              </div>
            ) : (
              <form onSubmit={handleUpdateProperty} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1.5">
                      Hotel / Business Name
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={property?.name || ''}
                        onChange={(e) => setProperty({ ...property, name: e.target.value })}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#00C48C] transition"
                        placeholder="e.g. Novotel Grand Resort"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1.5">
                      Contact Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={property?.email || ''}
                        onChange={(e) => setProperty({ ...property, email: e.target.value })}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#00C48C] transition"
                        placeholder="contact@hotel.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1.5">
                      Contact Phone
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={property?.phone || ''}
                        onChange={(e) => setProperty({ ...property, phone: e.target.value })}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#00C48C] transition"
                        placeholder="+1 555-0199"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1.5">
                      Base Currency Code
                    </label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={property?.currency || 'LKR'}
                        onChange={(e) => setProperty({ ...property, currency: e.target.value.toUpperCase() })}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-mono font-bold focus:bg-white focus:outline-none focus:border-[#00C48C] transition uppercase"
                        placeholder="LKR"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-[#334155] mb-1.5">
                      Physical Address
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
                      <textarea
                        rows={2}
                        value={property?.address || ''}
                        onChange={(e) => setProperty({ ...property, address: e.target.value })}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#00C48C] transition"
                        placeholder="123 Luxury Avenue, Phuket City 83000"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#F1F5F9]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-4">
                    Taxes & Service Surcharges
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1.5">
                        Default Tax Rate (%)
                      </label>
                      <div className="relative">
                        <Percent className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          required
                          value={property?.defaultTaxRate ?? 10}
                          onChange={(e) => setProperty({ ...property, defaultTaxRate: e.target.value })}
                          className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-mono font-semibold focus:bg-white focus:outline-none focus:border-[#00C48C] transition"
                        />
                      </div>
                      <p className="text-[10.5px] text-[#64748B] mt-1">
                        Applied automatically to all billable POS orders.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1.5">
                        Service Charge Rate (%)
                      </label>
                      <div className="relative">
                        <Percent className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          required
                          value={property?.serviceChargeRate ?? 0}
                          onChange={(e) => setProperty({ ...property, serviceChargeRate: e.target.value })}
                          className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-mono font-semibold focus:bg-white focus:outline-none focus:border-[#00C48C] transition"
                        />
                      </div>
                      <p className="text-[10.5px] text-[#64748B] mt-1">
                        Optional hospitality service charge.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProperty}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#00C48C] hover:bg-[#00B07D] text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingProperty ? 'Saving Changes...' : 'Save Configuration'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: Staff Management */}
        {activeTab === 'staff' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#0F172A]">Employee & Cashier Directory</h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Manage login credentials and role-based permissions across POS and KDS stations.
                </p>
              </div>
              <button
                onClick={() => setAddStaffModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-[#00C48C] hover:bg-[#00B07D] text-white text-xs font-bold rounded-xl transition shadow-xs self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Staff Member</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-[#64748B] uppercase font-bold text-[10px] tracking-wider border-b border-[#E2E8F0]">
                    <tr>
                      <th className="px-5 py-3.5">User</th>
                      <th className="px-5 py-3.5">Username</th>
                      <th className="px-5 py-3.5">Assigned Role</th>
                      <th className="px-5 py-3.5">Allowed Access Modules</th>
                      <th className="px-5 py-3.5">Account Status</th>
                      <th className="px-5 py-3.5">Created Date</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] font-medium text-[#334155]">
                    {staffList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center text-[#94A3B8]">
                          {loading ? 'Loading staff roster...' : 'No staff accounts found.'}
                        </td>
                      </tr>
                    ) : (
                      staffList.map((member) => {
                        const isSelf = member.id === currentUser?.id;
                        const perms: string[] =
                          member.permissions && member.permissions.length > 0
                            ? member.permissions
                            : DEFAULT_ROLE_PERMISSIONS[member.role] || [];

                        return (
                          <tr key={member.id} className="hover:bg-[#F8FAFC] transition">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-[#00C48C]/10 text-[#00C48C] font-bold flex items-center justify-center text-xs">
                                  {member.fullName?.charAt(0) || 'U'}
                                </div>
                                <div>
                                  <div className="font-bold text-[#0F172A] flex items-center gap-2">
                                    {member.fullName}
                                    {isSelf && (
                                      <span className="text-[9px] bg-[#ECFDF5] text-[#065F46] font-bold px-1.5 py-0.5 rounded">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-[#64748B]">{member.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 font-mono text-[11px] font-semibold text-[#0F172A]">
                              @{member.username}
                            </td>
                            <td className="px-5 py-3.5">
                              <span
                                className={`text-[10.5px] px-2 py-0.5 rounded-md font-bold uppercase ${
                                  member.role === 'ADMIN' || member.role === 'TENANT_ADMIN'
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : member.role === 'MANAGER'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : member.role === 'KITCHEN'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                                }`}
                              >
                                {member.role}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 max-w-xs">
                              {member.role === 'TENANT_ADMIN' || member.role === 'ADMIN' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                                  Full System Access (All Modules)
                                </span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {perms.map((permId) => {
                                    const pItem = SYSTEM_PERMISSIONS.find((p) => p.id === permId);
                                    return (
                                      <span
                                        key={permId}
                                        className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1]"
                                        title={pItem?.description}
                                      >
                                        {pItem?.label || permId}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <span
                                className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                  member.isActive
                                    ? 'bg-[#ECFDF5] text-[#065F46]'
                                    : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    member.isActive ? 'bg-[#00C48C]' : 'bg-rose-500'
                                  }`}
                                />
                                {member.isActive ? 'Active' : 'Disabled'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-[#64748B] text-[11px]">
                              {member.createdAt
                                ? new Date(member.createdAt).toLocaleDateString()
                                : '—'}
                            </td>
                            <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-1.5">
                              {isSelf ? (
                                <span className="text-[11px] text-[#94A3B8] italic">
                                  Current User
                                </span>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingStaff({
                                        ...member,
                                        permissions: perms,
                                      });
                                      setEditStaffModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold text-[#0F172A] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition inline-flex items-center gap-1"
                                  >
                                    <KeyRound className="w-3 h-3 text-[#00C48C]" />
                                    <span>Edit Access</span>
                                  </button>
                                  <button
                                    onClick={() => handleToggleStatus(member.id, member.isActive)}
                                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition ${
                                      member.isActive
                                        ? 'text-rose-600 hover:bg-rose-50'
                                        : 'text-[#00C48C] hover:bg-[#ECFDF5]'
                                    }`}
                                  >
                                    {member.isActive ? 'Deactivate' : 'Activate'}
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Audit Trail */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#0F172A]">Security Audit Logs</h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Immutable record of significant system events, user creation, and configuration updates.
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={auditFilter}
                  onChange={(e) => setAuditFilter(e.target.value)}
                  placeholder="Filter logs by action or user..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#CBD5E1] rounded-xl text-xs focus:outline-none focus:border-[#00C48C]"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-[#64748B] uppercase font-bold text-[10px] tracking-wider border-b border-[#E2E8F0]">
                    <tr>
                      <th className="px-5 py-3.5">Timestamp</th>
                      <th className="px-5 py-3.5">Action</th>
                      <th className="px-5 py-3.5">Target Entity</th>
                      <th className="px-5 py-3.5">User / Actor</th>
                      <th className="px-5 py-3.5">Payload Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] font-medium text-[#334155]">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-[#94A3B8]">
                          {loading ? 'Reading audit trail...' : 'No audit records match criteria.'}
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#F8FAFC] transition">
                          <td className="px-5 py-3 text-[11px] font-mono text-[#64748B] whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="px-5 py-3">
                            <span className="font-mono text-[11px] font-bold text-[#0F172A] bg-[#F1F5F9] px-2 py-0.5 rounded">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-[11px]">
                            <span className="font-semibold text-[#0F172A]">{log.entity}</span>
                            {log.entityId && (
                              <span className="text-[#94A3B8] font-mono text-[10px] ml-1">
                                #{log.entityId.slice(0, 8)}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 font-mono text-[11px] text-[#475569]">
                            {log.userId ? log.userId.slice(0, 10) + '...' : 'System'}
                          </td>
                          <td className="px-5 py-3 font-mono text-[10.5px] text-[#64748B] max-w-xs truncate">
                            {log.details || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add New Staff Member */}
        {addStaffModalOpen && (
          <div className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9] mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#00C48C]/10 text-[#00C48C] flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">Add New Staff Account</h3>
                    <p className="text-[11px] text-[#64748B]">Create credentials with tailored module permissions.</p>
                  </div>
                </div>
                <button
                  onClick={() => setAddStaffModalOpen(false)}
                  className="text-[#94A3B8] hover:text-[#0F172A] p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateStaff} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newStaff.fullName}
                    onChange={(e) => setNewStaff({ ...newStaff, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    placeholder="e.g. David Beckham"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Username</label>
                    <input
                      type="text"
                      required
                      value={newStaff.username}
                      onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:border-[#00C48C]"
                      placeholder="david_cashier"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Role Preset</label>
                    <select
                      value={newStaff.role}
                      onChange={(e: any) => {
                        const role = e.target.value;
                        setNewStaff({
                          ...newStaff,
                          role,
                          permissions: DEFAULT_ROLE_PERMISSIONS[role] || [],
                        });
                      }}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    >
                      <option value="CASHIER">CASHIER (POS & Tables)</option>
                      <option value="KITCHEN">KITCHEN (KDS Station)</option>
                      <option value="MANAGER">MANAGER (Operations Lead)</option>
                    </select>
                  </div>
                </div>

                {/* RBAC Custom Permissions Grid */}
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#0F172A] block">
                        Assigned Module Permissions
                      </span>
                      <span className="text-[10px] text-[#64748B]">
                        Select only the relevant modules this staff member can access.
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() =>
                          setNewStaff((prev) => ({
                            ...prev,
                            permissions: DEFAULT_ROLE_PERMISSIONS[prev.role] || [],
                          }))
                        }
                        className="px-2 py-0.5 rounded bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-[#F1F5F9] font-bold"
                      >
                        Role Default
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setNewStaff((prev) => ({
                            ...prev,
                            permissions: SYSTEM_PERMISSIONS.map((p) => p.id),
                          }))
                        }
                        className="px-2 py-0.5 rounded bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-[#F1F5F9] font-bold"
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewStaff((prev) => ({ ...prev, permissions: [] }))}
                        className="px-2 py-0.5 rounded bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-[#F1F5F9] font-bold"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {(['POS & Dining', 'PMS & Lodging', 'Operations & Admin', 'AI Assistant'] as const).map(
                      (cat) => {
                        const tenantModules = getTenantModules();
                        const catPerms = SYSTEM_PERMISSIONS.filter(
                          (p) => p.category === cat && isPermissionAllowedByModules(p, tenantModules),
                        );
                        if (catPerms.length === 0) return null;
                        return (
                          <div key={cat} className="space-y-1">
                            <span className="text-[9.5px] font-black uppercase tracking-wider text-[#94A3B8] flex items-center gap-1 px-1">
                              {cat === 'AI Assistant' && <Sparkles className="w-2.5 h-2.5 text-[#00C48C]" />}
                              <span>{cat}</span>
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {catPerms.map((perm) => {
                                const isSelected = newStaff.permissions.includes(perm.id);
                                return (
                                  <label
                                    key={perm.id}
                                    className={`flex items-start gap-2 p-2 rounded-xl border text-left cursor-pointer transition ${
                                      isSelected
                                        ? 'bg-white border-[#00C48C] shadow-2xs'
                                        : 'bg-white/60 border-[#E2E8F0] hover:bg-white text-[#64748B]'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setNewStaff((prev) => ({
                                            ...prev,
                                            permissions: [...prev.permissions, perm.id],
                                          }));
                                        } else {
                                          setNewStaff((prev) => ({
                                            ...prev,
                                            permissions: prev.permissions.filter(
                                              (x) => x !== perm.id,
                                            ),
                                          }));
                                        }
                                      }}
                                      className="mt-0.5 accent-[#00C48C] rounded"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[11px] font-bold text-[#0F172A] leading-tight">
                                        {perm.label}
                                      </div>
                                      <div className="text-[9.5px] text-[#64748B] leading-tight truncate">
                                        {perm.description}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#00C48C]"
                      placeholder="staff@hotel.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Phone (Optional)</label>
                    <input
                      type="text"
                      value={newStaff.phone}
                      onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#00C48C]"
                      placeholder="+1 555-0142"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Temporary Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newStaff.password}
                    onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    placeholder="Minimum 6 characters"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#F1F5F9]">
                  <button
                    type="button"
                    onClick={() => setAddStaffModalOpen(false)}
                    className="px-4 py-2 border border-[#E2E8F0] text-xs font-semibold rounded-xl text-[#64748B] hover:bg-[#F8FAFC]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingStaff}
                    className="px-4 py-2 bg-[#00C48C] hover:bg-[#00B07D] text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-50"
                  >
                    {creatingStaff ? 'Creating...' : 'Create Staff User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Staff Member Permissions */}
        {editStaffModalOpen && editingStaff && (
          <div className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9] mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#00C48C]/10 text-[#00C48C] flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">
                      Edit Staff Access: @{editingStaff.username}
                    </h3>
                    <p className="text-[11px] text-[#64748B]">
                      Customize allowed modules and workstation permissions for {editingStaff.fullName}.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEditStaffModalOpen(false);
                    setEditingStaff(null);
                  }}
                  className="text-[#94A3B8] hover:text-[#0F172A] p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateStaff} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={editingStaff.fullName || ''}
                      onChange={(e) =>
                        setEditingStaff({ ...editingStaff, fullName: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Role Preset</label>
                    <select
                      value={editingStaff.role}
                      onChange={(e: any) => {
                        const role = e.target.value;
                        setEditingStaff({
                          ...editingStaff,
                          role,
                          permissions: DEFAULT_ROLE_PERMISSIONS[role] || [],
                        });
                      }}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    >
                      <option value="CASHIER">CASHIER (POS & Tables)</option>
                      <option value="KITCHEN">KITCHEN (KDS Station)</option>
                      <option value="MANAGER">MANAGER (Operations Lead)</option>
                    </select>
                  </div>
                </div>

                {/* Permissions Checkbox Grid */}
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#0F172A] block">
                        Allowed Station Permissions
                      </span>
                      <span className="text-[10px] text-[#64748B]">
                        Staff member will only see and access these checked modules.
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingStaff((prev: any) => ({
                            ...prev,
                            permissions: DEFAULT_ROLE_PERMISSIONS[prev.role] || [],
                          }))
                        }
                        className="px-2 py-0.5 rounded bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-[#F1F5F9] font-bold"
                      >
                        Role Default
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingStaff((prev: any) => ({
                            ...prev,
                            permissions: SYSTEM_PERMISSIONS.map((p) => p.id),
                          }))
                        }
                        className="px-2 py-0.5 rounded bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-[#F1F5F9] font-bold"
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingStaff((prev: any) => ({ ...prev, permissions: [] }))
                        }
                        className="px-2 py-0.5 rounded bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-[#F1F5F9] font-bold"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {(['POS & Dining', 'PMS & Lodging', 'Operations & Admin', 'AI Assistant'] as const).map(
                      (cat) => {
                        const tenantModules = getTenantModules();
                        const catPerms = SYSTEM_PERMISSIONS.filter(
                          (p) => p.category === cat && isPermissionAllowedByModules(p, tenantModules),
                        );
                        if (catPerms.length === 0) return null;
                        return (
                          <div key={cat} className="space-y-1">
                            <span className="text-[9.5px] font-black uppercase tracking-wider text-[#94A3B8] flex items-center gap-1 px-1">
                              {cat === 'AI Assistant' && <Sparkles className="w-2.5 h-2.5 text-[#00C48C]" />}
                              <span>{cat}</span>
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {catPerms.map((perm) => {
                                const isSelected = (editingStaff.permissions || []).includes(
                                  perm.id,
                                );
                                return (
                                  <label
                                    key={perm.id}
                                    className={`flex items-start gap-2 p-2 rounded-xl border text-left cursor-pointer transition ${
                                      isSelected
                                        ? 'bg-white border-[#00C48C] shadow-2xs'
                                        : 'bg-white/60 border-[#E2E8F0] hover:bg-white text-[#64748B]'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        const current = editingStaff.permissions || [];
                                        if (e.target.checked) {
                                          setEditingStaff((prev: any) => ({
                                            ...prev,
                                            permissions: [...current, perm.id],
                                          }));
                                        } else {
                                          setEditingStaff((prev: any) => ({
                                            ...prev,
                                            permissions: current.filter((x: string) => x !== perm.id),
                                          }));
                                        }
                                      }}
                                      className="mt-0.5 accent-[#00C48C] rounded"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[11px] font-bold text-[#0F172A] leading-tight">
                                        {perm.label}
                                      </div>
                                      <div className="text-[9.5px] text-[#64748B] leading-tight truncate">
                                        {perm.description}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Phone</label>
                    <input
                      type="text"
                      value={editingStaff.phone || ''}
                      onChange={(e) =>
                        setEditingStaff({ ...editingStaff, phone: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">
                      Reset Password (Optional)
                    </label>
                    <input
                      type="password"
                      placeholder="Leave blank to keep current"
                      value={editingStaff.password || ''}
                      onChange={(e) =>
                        setEditingStaff({ ...editingStaff, password: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    />
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#F1F5F9]">
                  <button
                    type="button"
                    onClick={() => {
                      setEditStaffModalOpen(false);
                      setEditingStaff(null);
                    }}
                    className="px-4 py-2 border border-[#E2E8F0] text-xs font-semibold rounded-xl text-[#64748B] hover:bg-[#F8FAFC]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingStaff}
                    className="px-4 py-2 bg-[#00C48C] hover:bg-[#00B07D] text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-50"
                  >
                    {updatingStaff ? 'Saving...' : 'Save Permissions'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
