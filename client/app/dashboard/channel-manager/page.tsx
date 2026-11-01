'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { channelManagerApi } from '@/lib/api';
import {
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  ArrowRight,
  TrendingUp,
  Settings,
  ShieldCheck,
  Calendar,
  DollarSign,
  FileText,
  Activity,
  Zap,
} from 'lucide-react';

export default function ChannelManagerDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncingCode, setSyncingCode] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await channelManagerApi.getDashboard();
      setData(res);
    } catch (err: any) {
      setMessage({ text: 'Failed to load channel dashboard: ' + err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSync = async (channelCode: string) => {
    setSyncingCode(channelCode);
    setMessage(null);
    try {
      await channelManagerApi.triggerSync(channelCode);
      setMessage({
        text: `Sync job queued for ${channelCode}. Background processing dispatched.`,
        type: 'success',
      });
      setTimeout(() => loadOverview(), 1500);
    } catch (err: any) {
      setMessage({ text: 'Sync failed: ' + err.message, type: 'error' });
    } finally {
      setSyncingCode(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Connected
          </span>
        );
      case 'CONNECTING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Connecting
          </span>
        );
      case 'SYNC_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <AlertTriangle className="w-3 h-3" />
            Sync Required
          </span>
        );
      case 'SYNC_FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" />
            Sync Failed
          </span>
        );
      case 'DISABLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Disabled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200">
            Not Connected
          </span>
        );
    }
  };

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'HEALTHY':
        return <span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Healthy</span>;
      case 'WARNING':
        return <span className="text-xs font-bold text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Warning</span>;
      case 'CRITICAL':
        return <span className="text-xs font-bold text-rose-600 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Critical</span>;
      default:
        return <span className="text-xs font-medium text-slate-400">Idle / Unknown</span>;
    }
  };

  const summary = data?.summary || {};
  const channels = data?.channels || [];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
              <Globe className="w-3.5 h-3.5" />
              Centralized OTA Distribution Network
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Channel Manager Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage room availability, pricing markups, restrictions, and instant reservation sync across OTAs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadOverview}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              href="/dashboard/channel-manager/channels"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
            >
              <Settings className="w-4 h-4" />
              Configure Channels
            </Link>
          </div>
        </div>

        {/* Alerts / Feedback Message */}
        {message && (
          <div
            className={`p-4 rounded-xl border text-sm font-medium flex items-center justify-between ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-xs font-bold uppercase underline">
              Dismiss
            </button>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Active Channels</span>
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {summary.activeChannels ?? 0}{' '}
              <span className="text-xs font-medium text-slate-400">/ {summary.totalChannels ?? 6}</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {summary.connectedChannels ?? 0} connected total
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Attention Needed</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {summary.channelsRequiringAttention ?? 0}
            </div>
            <div className="text-xs text-amber-600 mt-1 font-medium">
              Requires auth / config review
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">OTA Bookings</span>
              <TrendingUp className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {summary.totalChannelReservations ?? 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">Imported directly into PMS</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Last Full Sync</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-sm font-bold text-slate-900 truncate">
              {summary.lastSuccessfulSync
                ? new Date(summary.lastSuccessfulSync).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'No sync recorded'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {summary.failedSyncAttempts > 0 ? (
                <span className="text-rose-600 font-semibold">{summary.failedSyncAttempts} failed attempts</span>
              ) : (
                'All channels operational'
              )}
            </div>
          </div>
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link
            href="/dashboard/channel-manager/channels"
            className="p-4 bg-white hover:bg-indigo-50/50 rounded-xl border border-slate-200 hover:border-indigo-300 transition group flex flex-col justify-between"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">Channels</div>
              <div className="text-[11px] text-slate-500">API Credentials</div>
            </div>
          </Link>

          <Link
            href="/dashboard/channel-manager/mappings"
            className="p-4 bg-white hover:bg-indigo-50/50 rounded-xl border border-slate-200 hover:border-indigo-300 transition group flex flex-col justify-between"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">Room Mapping</div>
              <div className="text-[11px] text-slate-500">Link Room Types</div>
            </div>
          </Link>

          <Link
            href="/dashboard/channel-manager/pricing"
            className="p-4 bg-white hover:bg-indigo-50/50 rounded-xl border border-slate-200 hover:border-indigo-300 transition group flex flex-col justify-between"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">Pricing & Markup</div>
              <div className="text-[11px] text-slate-500">LKR Commission Rules</div>
            </div>
          </Link>

          <Link
            href="/dashboard/channel-manager/inventory"
            className="p-4 bg-white hover:bg-indigo-50/50 rounded-xl border border-slate-200 hover:border-indigo-300 transition group flex flex-col justify-between"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">Inventory Matrix</div>
              <div className="text-[11px] text-slate-500">14-Day Stop-Sell</div>
            </div>
          </Link>

          <Link
            href="/dashboard/channel-manager/reservations"
            className="p-4 bg-white hover:bg-indigo-50/50 rounded-xl border border-slate-200 hover:border-indigo-300 transition group flex flex-col justify-between"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">Reservations</div>
              <div className="text-[11px] text-slate-500">OTA Bookings</div>
            </div>
          </Link>

          <Link
            href="/dashboard/channel-manager/logs"
            className="p-4 bg-white hover:bg-indigo-50/50 rounded-xl border border-slate-200 hover:border-indigo-300 transition group flex flex-col justify-between"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">Audit Logs</div>
              <div className="text-[11px] text-slate-500">Sync Trace & Errors</div>
            </div>
          </Link>
        </div>

        {/* Connected Channels Grid */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Connected Distribution Channels</h2>
              <p className="text-xs text-slate-500">
                Official integrations, connection health, and real-time inventory synchronization.
              </p>
            </div>
            <Link
              href="/dashboard/channel-manager/channels"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              Manage All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((channel: any) => (
              <div
                key={channel.channelCode}
                className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-white transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">{channel.platformName}</h3>
                      <div className="text-[11px] text-slate-500">{channel.integrationType}</div>
                    </div>
                    {getStatusBadge(channel.status)}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Sync Health:</span>
                      {getHealthBadge(channel.syncHealth)}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">External Property ID:</span>
                      <span className="font-mono font-medium text-slate-700">
                        {channel.externalPropertyId || 'Not Configured'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Last Sync:</span>
                      <span className="text-slate-700">
                        {channel.lastSyncAt
                          ? new Date(channel.lastSyncAt).toLocaleString([], {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'Never'}
                      </span>
                    </div>

                    {channel.requiresOfficialPartnerApproval && channel.status !== 'CONNECTED' && (
                      <div className="p-2 bg-amber-50/80 rounded-lg border border-amber-200/60 text-[11px] text-amber-800 mt-2">
                        Official Connectivity Partner credentials required to activate live sync.
                      </div>
                    )}

                    {channel.lastErrorMessage && channel.status === 'SYNC_FAILED' && (
                      <div className="p-2 bg-rose-50 rounded-lg border border-rose-200 text-[11px] text-rose-700 mt-2 truncate">
                        {channel.lastErrorMessage}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    href={`/dashboard/channel-manager/channels?edit=${channel.channelCode}`}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition"
                  >
                    Configure
                  </Link>

                  <button
                    onClick={() => handleQuickSync(channel.channelCode)}
                    disabled={syncingCode === channel.channelCode || channel.status === 'NOT_CONNECTED'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg disabled:opacity-50 transition"
                  >
                    <RefreshCw className={`w-3 h-3 ${syncingCode === channel.channelCode ? 'animate-spin' : ''}`} />
                    Sync Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
