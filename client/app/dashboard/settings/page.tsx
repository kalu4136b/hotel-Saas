'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { settingsApi, authStorage } from '@/lib/api';
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
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'property' | 'staff' | 'audit'>('property');
  const [loading, setLoading] = useState(true);
  const [savingProperty, setSavingProperty] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Property Form State
  const [property, setProperty] = useState<any>({
    name: '',
    address: '',
    phone: '',
    email: '',
    currency: 'USD',
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
  });

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
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition -mb-[2px] ${
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
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition -mb-[2px] ${
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
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition -mb-[2px] ${
              activeTab === 'audit'
                ? 'border-[#00C48C] text-[#00C48C]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Audit Trail</span>
          </button>
        </div>

        {/* TAB 1: Property Settings */}
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
                        value={property?.currency || 'USD'}
                        onChange={(e) => setProperty({ ...property, currency: e.target.value.toUpperCase() })}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-mono font-bold focus:bg-white focus:outline-none focus:border-[#00C48C] transition uppercase"
                        placeholder="USD"
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
                      <th className="px-5 py-3.5">Account Status</th>
                      <th className="px-5 py-3.5">Created Date</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] font-medium text-[#334155]">
                    {staffList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-[#94A3B8]">
                          {loading ? 'Loading staff roster...' : 'No staff accounts found.'}
                        </td>
                      </tr>
                    ) : (
                      staffList.map((member) => {
                        const isSelf = member.id === currentUser?.id;
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
                                  member.role === 'ADMIN'
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
                            <td className="px-5 py-3.5 text-right">
                              {isSelf ? (
                                <span className="text-[11px] text-[#94A3B8] italic">
                                  Current User
                                </span>
                              ) : (
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
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9] mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#00C48C]/10 text-[#00C48C] flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">Add New Staff Account</h3>
                    <p className="text-[11px] text-[#64748B]">Create credentials with role-based access.</p>
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
                    placeholder="e.g. Somchai Prasert"
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
                      placeholder="somchai_pos"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Role</label>
                    <select
                      value={newStaff.role}
                      onChange={(e: any) => setNewStaff({ ...newStaff, role: e.target.value })}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    >
                      <option value="CASHIER">CASHIER (POS Sales)</option>
                      <option value="KITCHEN">KITCHEN (KDS Station)</option>
                      <option value="MANAGER">MANAGER (Full Ops)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    placeholder="somchai@hotel.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Phone (Optional)</label>
                  <input
                    type="text"
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#00C48C]"
                    placeholder="+66 81 234 5678"
                  />
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
      </div>
    </DashboardLayout>
  );
}
