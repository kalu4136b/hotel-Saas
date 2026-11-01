'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { channelManagerApi } from '@/lib/api';
import {
  Globe,
  Settings,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Key,
  X,
  Play,
  Copy,
  Info,
} from 'lucide-react';

function ChannelsManagementContent() {
  const searchParams = useSearchParams();
  const editQuery = searchParams.get('edit');

  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [formCredentials, setFormCredentials] = useState<Record<string, string>>({});
  const [formExternalPropertyId, setFormExternalPropertyId] = useState('');
  const [formAutoSync, setFormAutoSync] = useState(true);
  const [copiedFeed, setCopiedFeed] = useState(false);

  useEffect(() => {
    loadChannels();
  }, []);

  useEffect(() => {
    if (editQuery && channels.length > 0) {
      const match = channels.find((c) => c.channelCode === editQuery);
      if (match) handleOpenConfigure(match);
    }
  }, [editQuery, channels]);

  const loadChannels = async () => {
    setLoading(true);
    try {
      const data = await channelManagerApi.getDashboard();
      setChannels(data.channels || []);
    } catch (err: any) {
      alert('Failed to load channels: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConfigure = async (channel: any) => {
    setSelectedChannel(channel);
    setTestResult(null);
    setEditModalOpen(true);
    try {
      const details = await channelManagerApi.getConnection(channel.channelCode);
      setFormCredentials(details.credentials || {});
      setFormExternalPropertyId(details.externalPropertyId || '');
      setFormAutoSync(details.autoSyncEnabled ?? true);
      setSelectedChannel(details);
    } catch (err: any) {
      alert('Failed to load connection details: ' + err.message);
    }
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannel) return;
    setSaving(true);
    setTestResult(null);
    try {
      const res = await channelManagerApi.updateConnection(selectedChannel.channelCode, {
        credentials: formCredentials,
        externalPropertyId: formExternalPropertyId,
        autoSyncEnabled: formAutoSync,
      });
      setTestResult(res.testResult);
      await loadChannels();
      if (res.testResult?.healthy) {
        setTimeout(() => setEditModalOpen(false), 1500);
      }
    } catch (err: any) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!selectedChannel) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await channelManagerApi.testConnection(selectedChannel.channelCode);
      setTestResult(res);
      await loadChannels();
    } catch (err: any) {
      setTestResult({
        healthy: false,
        message: 'Connection test failed: ' + err.message,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async (channelCode: string) => {
    if (!confirm('Are you sure you want to disable synchronization for this channel?')) return;
    try {
      await channelManagerApi.disconnectChannel(channelCode);
      await loadChannels();
      setEditModalOpen(false);
    } catch (err: any) {
      alert('Failed to disconnect: ' + err.message);
    }
  };

  const handleReconnect = async (channelCode: string) => {
    try {
      await channelManagerApi.reconnectChannel(channelCode);
      await loadChannels();
    } catch (err: any) {
      alert('Failed to reconnect: ' + err.message);
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

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Navigation Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link href="/dashboard/channel-manager" className="hover:text-indigo-600">
                Channel Manager
              </Link>
              <span>/</span>
              <span className="font-semibold text-slate-700">Available Channels</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              OTA Distribution Channels
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Connect official Online Travel Agencies (Booking.com, Agoda, Airbnb, Expedia, Tripadvisor, iCal).
            </p>
          </div>

          <Link
            href="/dashboard/channel-manager"
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Channels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {channels.map((channel: any) => (
            <div
              key={channel.channelCode}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg">{channel.platformName}</h3>
                    <div className="text-xs text-slate-500">{channel.integrationType}</div>
                  </div>
                  {getStatusBadge(channel.status)}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {channel.channelCode === 'BOOKING_COM' &&
                    '2-Way B.XML & REST connection for availability, rates, restrictions, and real-time reservation notifications.'}
                  {channel.channelCode === 'EXPEDIA' &&
                    'Direct connectivity with Expedia Partner Central for inventory, dynamic rate plans, and booking retrievals.'}
                  {channel.channelCode === 'AGODA' &&
                    'Agoda YCS distribution network covering major Asian and international tourist bookings.'}
                  {channel.channelCode === 'AIRBNB' &&
                    'Sync boutique hotel rooms, villas, and resort chalets with Airbnb using Partner API or 2-way iCal.'}
                  {channel.channelCode === 'TRIPADVISOR' &&
                    'TripConnect Instant Booking integration for direct bookings directly on Tripadvisor pages.'}
                  {channel.channelCode === 'ICAL' &&
                    'Universal calendar feed (RFC 5545) compatible with all booking sites, Google Calendar, and VRBO.'}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Approval Status:</span>
                    {channel.requiresOfficialPartnerApproval ? (
                      <span className="font-semibold text-amber-600">Partner Accreditation Req.</span>
                    ) : (
                      <span className="font-semibold text-emerald-600">Open Standard (Ready)</span>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-slate-500">
                    <span>Auto-Sync:</span>
                    <span className="font-semibold text-slate-700">
                      {channel.autoSyncEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {channel.status === 'DISABLED' ? (
                  <button
                    onClick={() => handleReconnect(channel.channelCode)}
                    className="w-full py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                  >
                    Enable Channel
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenConfigure(channel)}
                    className="w-full py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs"
                  >
                    {channel.status === 'NOT_CONNECTED' ? 'Connect Channel' : 'Configure Integration'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Configuration Modal */}
        {editModalOpen && selectedChannel && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Configure {selectedChannel.platformName}
                  </h2>
                  <p className="text-xs text-slate-500">{selectedChannel.integrationType}</p>
                </div>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveConnection} className="p-6 space-y-4">
                {/* Partner Guidance Box */}
                {selectedChannel.requiresOfficialPartnerApproval && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-amber-600" />
                      Official Connectivity Partner Requirements
                    </div>
                    <p className="text-[11px] text-amber-700 leading-normal">
                      This integration communicates directly with {selectedChannel.platformName} APIs. Ensure you have
                      registered in the official partner portal or have machine credentials issued.
                    </p>
                    {selectedChannel.officialDocumentationUrl && (
                      <a
                        href={selectedChannel.officialDocumentationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:underline pt-1"
                      >
                        Visit Partner Portal <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}

                {/* External Property ID */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    External Property / Hotel ID
                  </label>
                  <input
                    type="text"
                    value={formExternalPropertyId}
                    onChange={(e) => setFormExternalPropertyId(e.target.value)}
                    placeholder="e.g. 102948 or property-code"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    The identifier assigned to your accommodation on {selectedChannel.platformName}.
                  </p>
                </div>

                {/* Specific Fields by Channel */}
                {selectedChannel.channelCode === 'BOOKING_COM' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Machine Account Username
                      </label>
                      <input
                        type="text"
                        value={formCredentials.username || ''}
                        onChange={(e) =>
                          setFormCredentials((prev) => ({ ...prev, username: e.target.value }))
                        }
                        placeholder="e.g. connectivity-user"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Machine Account Password
                      </label>
                      <input
                        type="password"
                        value={formCredentials.password || ''}
                        onChange={(e) =>
                          setFormCredentials((prev) => ({ ...prev, password: e.target.value }))
                        }
                        placeholder="••••••••"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </>
                )}

                {selectedChannel.channelCode === 'EXPEDIA' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Expedia API Key</label>
                      <input
                        type="text"
                        value={formCredentials.apiKey || ''}
                        onChange={(e) =>
                          setFormCredentials((prev) => ({ ...prev, apiKey: e.target.value }))
                        }
                        placeholder="Expedia API Key"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Expedia API Secret</label>
                      <input
                        type="password"
                        value={formCredentials.apiSecret || ''}
                        onChange={(e) =>
                          setFormCredentials((prev) => ({ ...prev, apiSecret: e.target.value }))
                        }
                        placeholder="••••••••"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </>
                )}

                {selectedChannel.channelCode === 'AGODA' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Agoda YCS API Key / Token</label>
                    <input
                      type="text"
                      value={formCredentials.apiKey || ''}
                      onChange={(e) =>
                        setFormCredentials((prev) => ({ ...prev, apiKey: e.target.value }))
                      }
                      placeholder="Agoda Partner API Key"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {selectedChannel.channelCode === 'AIRBNB' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Inbound iCal Calendar Link (Import Airbnb Stays)
                      </label>
                      <input
                        type="text"
                        value={formCredentials.icalImportUrl || ''}
                        onChange={(e) =>
                          setFormCredentials((prev) => ({ ...prev, icalImportUrl: e.target.value }))
                        }
                        placeholder="https://www.airbnb.com/calendar/ical/..."
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Paste your Airbnb listing export calendar URL to automatically import reservations.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-xs font-bold text-slate-700 mb-1">Or Airbnb Partner API:</div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={formCredentials.apiKey || ''}
                          onChange={(e) =>
                            setFormCredentials((prev) => ({ ...prev, apiKey: e.target.value }))
                          }
                          placeholder="Client ID"
                          className="px-3 py-2 text-xs rounded-xl border border-slate-200"
                        />
                        <input
                          type="password"
                          value={formCredentials.apiSecret || ''}
                          onChange={(e) =>
                            setFormCredentials((prev) => ({ ...prev, apiSecret: e.target.value }))
                          }
                          placeholder="Client Secret"
                          className="px-3 py-2 text-xs rounded-xl border border-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedChannel.channelCode === 'TRIPADVISOR' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tripadvisor Partner API Key
                    </label>
                    <input
                      type="text"
                      value={formCredentials.apiKey || ''}
                      onChange={(e) =>
                        setFormCredentials((prev) => ({ ...prev, apiKey: e.target.value }))
                      }
                      placeholder="Tripadvisor API Key"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {selectedChannel.channelCode === 'ICAL' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      External iCal Feed URL (To Import)
                    </label>
                    <input
                      type="text"
                      value={formCredentials.icalImportUrl || ''}
                      onChange={(e) =>
                        setFormCredentials((prev) => ({ ...prev, icalImportUrl: e.target.value }))
                      }
                      placeholder="https://example.com/calendar.ics"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      External calendar feed URL to pull booked dates into this PMS.
                    </p>
                  </div>
                )}

                {/* Auto Sync Toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Automatic Background Sync</div>
                    <div className="text-[11px] text-slate-500">
                      Push availability and rates automatically upon PMS changes.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formAutoSync}
                    onChange={(e) => setFormAutoSync(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </div>

                {/* Diagnostics Test Result */}
                {testResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs ${
                      testResult.healthy
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 mb-1">
                      {testResult.healthy ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600" />
                      )}
                      {testResult.healthy ? 'Connection Verified' : 'Connection Test Failed'}
                    </div>
                    <p>{testResult.message}</p>
                    {testResult.latencyMs > 0 && (
                      <div className="text-[10px] text-slate-500 mt-1 font-mono">
                        Probe Latency: {testResult.latencyMs}ms
                      </div>
                    )}
                  </div>
                )}

                {/* Modal Actions */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testing || saving}
                      className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
                    >
                      <Play className="w-3 h-3" />
                      {testing ? 'Testing...' : 'Test Connection'}
                    </button>

                    {selectedChannel.status === 'CONNECTED' && (
                      <button
                        type="button"
                        onClick={() => handleDisconnect(selectedChannel.channelCode)}
                        className="px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-xl transition"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
                    >
                      {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function ChannelsManagementPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="p-8 text-center text-xs font-semibold text-slate-500">
            Loading OTA channels...
          </div>
        </DashboardLayout>
      }
    >
      <ChannelsManagementContent />
    </Suspense>
  );
}

