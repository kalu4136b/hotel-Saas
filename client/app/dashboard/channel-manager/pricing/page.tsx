'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { channelManagerApi, pmsApi } from '@/lib/api';
import {
  DollarSign,
  TrendingUp,
  Percent,
  Plus,
  Trash2,
  Calculator,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export default function PricingRulesPage() {
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New Rule Form
  const [newRule, setNewRule] = useState({
    roomTypeId: '',
    adjustmentType: 'PERCENTAGE_MARKUP',
    adjustmentValue: 10.0,
    applyToAllRoomTypes: true,
  });

  // Interactive Live Preview
  const [previewBaseRate, setPreviewBaseRate] = useState(20000);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [dashData, rtData] = await Promise.all([
        channelManagerApi.getDashboard(),
        pmsApi.getRoomTypes(),
      ]);
      const list = dashData.channels || [];
      setChannels(list);
      setRoomTypes(rtData || []);

      if (list.length > 0) {
        setSelectedConnection(list[0]);
        await loadRules(list[0].id);
      }
    } catch (err: any) {
      alert('Failed to load pricing data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRules = async (connectionId: string) => {
    try {
      const rules = await channelManagerApi.getPricingRules(connectionId);
      setPricingRules(rules || []);
    } catch (err: any) {
      console.error('Failed to load rules:', err);
    }
  };

  const handleChannelChange = async (connectionId: string) => {
    const conn = channels.find((c) => c.id === connectionId);
    if (!conn) return;
    setSelectedConnection(conn);
    setLoading(true);
    await loadRules(conn.id);
    setLoading(false);
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConnection) return;
    setSaving(true);
    try {
      await channelManagerApi.savePricingRule(selectedConnection.id, {
        roomTypeId: newRule.applyToAllRoomTypes ? undefined : newRule.roomTypeId || undefined,
        adjustmentType: newRule.adjustmentType,
        adjustmentValue: Number(newRule.adjustmentValue),
        applyToAllRoomTypes: newRule.applyToAllRoomTypes,
      });
      await loadRules(selectedConnection.id);
      setNewRule({
        roomTypeId: '',
        adjustmentType: 'PERCENTAGE_MARKUP',
        adjustmentValue: 10.0,
        applyToAllRoomTypes: true,
      });
    } catch (err: any) {
      alert('Failed to save pricing rule: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!selectedConnection) return;
    try {
      await channelManagerApi.deletePricingRule(selectedConnection.id, ruleId);
      await loadRules(selectedConnection.id);
    } catch (err: any) {
      alert('Failed to delete rule: ' + err.message);
    }
  };

  // Preview Calculation
  const calculatePreview = () => {
    const val = Number(newRule.adjustmentValue) || 0;
    if (newRule.adjustmentType === 'PERCENTAGE_MARKUP') {
      const markup = previewBaseRate * (val / 100);
      return {
        finalRate: previewBaseRate + markup,
        markupAmount: markup,
        label: `+${val}% OTA Markup`,
      };
    }
    if (newRule.adjustmentType === 'FIXED_MARKUP') {
      return {
        finalRate: previewBaseRate + val,
        markupAmount: val,
        label: `+LKR ${val.toLocaleString()} Flat Markup`,
      };
    }
    if (newRule.adjustmentType === 'PERCENTAGE_DISCOUNT') {
      const discount = previewBaseRate * (val / 100);
      return {
        finalRate: Math.max(0, previewBaseRate - discount),
        markupAmount: -discount,
        label: `-${val}% OTA Discount`,
      };
    }
    return { finalRate: previewBaseRate, markupAmount: 0, label: 'Standard Rate' };
  };

  const preview = calculatePreview();

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link href="/dashboard/channel-manager" className="hover:text-indigo-600">
                Channel Manager
              </Link>
              <span>/</span>
              <span className="font-semibold text-slate-700">Pricing Rules</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Channel-Specific Pricing & Markups
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure commission compensation markups in LKR to offset OTA fees and maintain profit margins.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-500">Selected Channel:</label>
            <select
              value={selectedConnection?.id || ''}
              onChange={(e) => handleChannelChange(e.target.value)}
              className="px-4 py-2 text-sm font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 shadow-xs"
            >
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.platformName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Informational Card */}
        <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
              Commission Compensation Strategy
            </h3>
            <p className="text-xs text-indigo-800 mt-0.5 leading-relaxed">
              Online Travel Agencies like Booking.com, Expedia, and Agoda charge between 10% and 18% commission per
              reservation. Configure channel markups below so that rates pushed to external platforms automatically
              incorporate these fees while your direct hotel rates remain competitive.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Rule Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-slate-900">
              Create Pricing Rule for {selectedConnection?.platformName}
            </h2>

            <form onSubmit={handleCreateRule} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Room Type Scope
                  </label>
                  <select
                    value={newRule.applyToAllRoomTypes ? 'ALL' : newRule.roomTypeId}
                    onChange={(e) => {
                      if (e.target.value === 'ALL') {
                        setNewRule((prev) => ({ ...prev, applyToAllRoomTypes: true, roomTypeId: '' }));
                      } else {
                        setNewRule((prev) => ({
                          ...prev,
                          applyToAllRoomTypes: false,
                          roomTypeId: e.target.value,
                        }));
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium"
                  >
                    <option value="ALL">Apply to All Room Types (Channel Default)</option>
                    {roomTypes.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        {rt.name} only
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Adjustment Type
                  </label>
                  <select
                    value={newRule.adjustmentType}
                    onChange={(e) =>
                      setNewRule((prev) => ({ ...prev, adjustmentType: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium"
                  >
                    <option value="PERCENTAGE_MARKUP">Percentage Markup (+%)</option>
                    <option value="FIXED_MARKUP">Fixed Amount Markup (+LKR)</option>
                    <option value="PERCENTAGE_DISCOUNT">Percentage Discount (-%)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Adjustment Value ({newRule.adjustmentType === 'FIXED_MARKUP' ? 'LKR' : '%'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={newRule.adjustmentValue}
                  onChange={(e) =>
                    setNewRule((prev) => ({ ...prev, adjustmentValue: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 font-mono font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Add Pricing Policy'}
                </button>
              </div>
            </form>
          </div>

          {/* Live Preview Calculator */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                <Calculator className="w-4 h-4 text-indigo-600" />
                Live LKR Rate Preview
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Sample Internal Base Rate (LKR)
                  </label>
                  <input
                    type="number"
                    step="500"
                    value={previewBaseRate}
                    onChange={(e) => setPreviewBaseRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-200"
                  />
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Direct Base Rate:</span>
                    <span className="font-mono font-bold">LKR {previewBaseRate.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-indigo-700">
                    <span>{preview.label}:</span>
                    <span className="font-mono font-bold">+LKR {preview.markupAmount.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-extrabold text-slate-900">
                    <span>Rate Pushed to OTA:</span>
                    <span className="text-indigo-600 font-mono">
                      LKR {preview.finalRate.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 text-center">
              Pricing calculations are performed dynamically on the backend prior to synchronization.
            </div>
          </div>
        </div>

        {/* Existing Pricing Rules Table */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4">
            Active Pricing Rules for {selectedConnection?.platformName} ({pricingRules.length})
          </h2>

          {pricingRules.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No pricing rules configured for this channel. Base rates are being synchronized at 1:1.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                  <th className="pb-3">Target Scope</th>
                  <th className="pb-3">Adjustment Type</th>
                  <th className="pb-3">Adjustment Value</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pricingRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/50">
                    <td className="py-3 font-semibold text-slate-900">
                      {rule.applyToAllRoomTypes ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700">
                          All Room Types (Default)
                        </span>
                      ) : (
                        rule.roomType?.name || 'Specific Room Type'
                      )}
                    </td>
                    <td className="py-3 font-medium text-slate-700">
                      {rule.adjustmentType.replace('_', ' ')}
                    </td>
                    <td className="py-3 font-mono font-bold text-indigo-700">
                      {rule.adjustmentType === 'FIXED_MARKUP'
                        ? `+LKR ${Number(rule.adjustmentValue).toLocaleString()}`
                        : `${rule.adjustmentType === 'PERCENTAGE_DISCOUNT' ? '-' : '+'}${Number(
                            rule.adjustmentValue,
                          )}%`}
                    </td>
                    <td className="py-3">
                      <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
