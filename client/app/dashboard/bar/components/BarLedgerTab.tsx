'use client';

import React, { useState, useEffect } from 'react';
import { barApi } from '@/lib/api';
import {
  History,
  Search,
  Filter,
  Wine,
  RefreshCw,
  Droplets,
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react';

interface BarLedgerTabProps {
  items: any[];
}

export default function BarLedgerTab({ items }: BarLedgerTabProps) {
  const [ledgerEvents, setLedgerEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadLedger();
  }, [selectedItemId]);

  const loadLedger = async () => {
    setLoading(true);
    try {
      const data = await barApi.getLedger({
        barItemId: selectedItemId !== 'ALL' ? selectedItemId : undefined,
        limit: 150,
      });
      setLedgerEvents(data);
    } catch (err: any) {
      console.error('Failed to load bar ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  // Quick stats
  const totalVolumeMovedMl = ledgerEvents.reduce((sum, e) => sum + Math.abs(Number(e.volumeDeltaMl) || 0), 0);
  const totalRevenue = ledgerEvents.reduce((sum, e) => sum + (Number(e.revenueAmount) || 0), 0);
  const totalLossCost = ledgerEvents
    .filter((e) => e.eventType === 'WASTAGE' || e.eventType === 'BREAKAGE' || e.eventType === 'EXPIRY_SPOILAGE' || (e.costImpact < 0))
    .reduce((sum, e) => sum + Math.abs(Number(e.costImpact) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-[#64748B]">Total Fluid Handled</span>
            <Droplets className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <div className="text-2xl font-bold text-[#1D4ED8]">
            {(totalVolumeMovedMl / 1000).toFixed(2)} L
          </div>
          <div className="text-[10px] text-[#64748B] mt-1">{ledgerEvents.length} transactions in timeline</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-[#059669]">Recorded Pour Revenue</span>
            <DollarSign className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="text-2xl font-bold text-[#047857]">
            ${totalRevenue.toFixed(2)}
          </div>
          <div className="text-[10px] text-[#065F46] mt-1">From guest drink sales</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-[#DC2626]">Loss / Shrinkage Cost</span>
            <TrendingDown className="w-4 h-4 text-[#EF4444]" />
          </div>
          <div className="text-2xl font-bold text-[#B91C1C]">
            ${totalLossCost.toFixed(2)}
          </div>
          <div className="text-[10px] text-[#991B1B] mt-1">Breakage, spills & audit adjustments</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-[#64748B] shrink-0">Filter by Bottle:</span>
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            className="w-full sm:w-72 px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#0F172A]"
          >
            <option value="ALL">All Bar Liquors ({items.length} bottles)</option>
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.name} ({it.category})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ledger..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white text-xs text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#0F172A]"
            />
          </div>

          <button
            type="button"
            onClick={loadLedger}
            disabled={loading}
            className="p-2 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] transition"
            title="Refresh Timeline"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Timeline Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-3">Event Type</th>
                <th className="py-3 px-3">Beverage Label</th>
                <th className="py-3 px-3 text-right">Volume Delta</th>
                <th className="py-3 px-3 text-right">Revenue</th>
                <th className="py-3 px-3 text-right">Cost Impact</th>
                <th className="py-3 px-3">Staff / Performer</th>
                <th className="py-3 px-4">Event Detail & Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#64748B]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0F172A]" />
                    Loading unified ledger timeline...
                  </td>
                </tr>
              ) : !ledgerEvents.length ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#64748B]">
                    No inventory events recorded yet.
                  </td>
                </tr>
              ) : (
                ledgerEvents
                  .filter((ev) =>
                    searchQuery.trim()
                      ? ev.barItemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        ev.eventType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        ev.performer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        ev.reason?.toLowerCase().includes(searchQuery.toLowerCase())
                      : true
                  )
                  .map((ev) => (
                    <tr key={ev.id} className="hover:bg-[#F8FAFC] transition">
                      <td className="py-3 px-4 font-mono text-[11px] text-[#64748B]">
                        {new Date(ev.timestamp).toLocaleString()}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            ev.eventType === 'SALE'
                              ? 'bg-[#DCFCE7] text-[#15803D]'
                              : ev.eventType === 'WASTAGE' || ev.eventType === 'BREAKAGE'
                              ? 'bg-[#FEE2E2] text-[#B91C1C]'
                              : ev.eventType === 'PHYSICAL_AUDIT'
                              ? 'bg-[#EDE9FE] text-[#6D28D9]'
                              : ev.eventType === 'COMPLIMENTARY'
                              ? 'bg-[#FEF3C7] text-[#B45309]'
                              : 'bg-[#F1F5F9] text-[#475569]'
                          }`}
                        >
                          {ev.eventType}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-bold text-[#0F172A]">
                        {ev.barItemName}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span
                          className={`font-bold ${
                            Number(ev.volumeDeltaMl) > 0
                              ? 'text-[#16A34A]'
                              : Number(ev.volumeDeltaMl) < 0
                              ? 'text-[#DC2626]'
                              : 'text-[#64748B]'
                          }`}
                        >
                          {Number(ev.volumeDeltaMl) > 0 ? `+${ev.volumeDeltaMl}` : ev.volumeDeltaMl} ml
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        {Number(ev.revenueAmount) > 0 ? (
                          <span className="font-bold text-[#16A34A]">
                            +${Number(ev.revenueAmount).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[#94A3B8]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        {Number(ev.costImpact) !== 0 ? (
                          <span
                            className={`font-semibold ${
                              Number(ev.costImpact) > 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                            }`}
                          >
                            {Number(ev.costImpact) >= 0
                              ? `+$${Number(ev.costImpact).toFixed(2)}`
                              : `-$${Math.abs(Number(ev.costImpact)).toFixed(2)}`}
                          </span>
                        ) : (
                          <span className="text-[#94A3B8]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-medium text-[#0F172A]">
                        {ev.performer || 'Staff'}
                      </td>

                      <td className="py-3 px-4 text-[#64748B]">
                        {ev.reason}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
