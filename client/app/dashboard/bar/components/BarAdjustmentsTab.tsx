'use client';

import React, { useState, useEffect } from 'react';
import { barApi } from '@/lib/api';
import SingleAdjustModal from './SingleAdjustModal';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Plus,
  ClipboardCheck,
  XCircle,
  Wine,
  Layers,
  Droplets,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  History,
  X,
} from 'lucide-react';

interface BarAdjustmentsTabProps {
  items: any[];
  onReloadAll: () => Promise<void>;
  onShowFeedback: (type: 'success' | 'error', text: string) => void;
}

export default function BarAdjustmentsTab({
  items,
  onReloadAll,
  onShowFeedback,
}: BarAdjustmentsTabProps) {
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Single Adjustment Modal
  const [singleAdjustOpen, setSingleAdjustOpen] = useState(false);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<any | null>(null);

  // Physical Stocktake Audit Mode State
  const [auditMode, setAuditMode] = useState(false);
  const [stocktakeCounts, setStocktakeCounts] = useState<
    Record<string, { actualFull: number; actualOpenMl: number; notes: string }>
  >({});
  const [auditedBy, setAuditedBy] = useState('Audit Staff');
  const [auditNotes, setAuditNotes] = useState('Closing shift physical inventory count');
  const [submittingAudit, setSubmittingAudit] = useState(false);

  useEffect(() => {
    loadAdjustments();
  }, [typeFilter]);

  // Initialize Stocktake counts when entering audit mode
  useEffect(() => {
    if (auditMode && items.length > 0) {
      const initialCounts: Record<
        string,
        { actualFull: number; actualOpenMl: number; notes: string }
      > = {};
      items.forEach((item) => {
        initialCounts[item.id] = {
          actualFull: item.fullBottlesStock ?? 0,
          actualOpenMl: item.currentBottleRemainingMl ?? 0,
          notes: '',
        };
      });
      setStocktakeCounts(initialCounts);
    }
  }, [auditMode, items]);

  const loadAdjustments = async () => {
    setLoading(true);
    try {
      const data = await barApi.getAdjustments({
        adjustmentType: typeFilter !== 'ALL' ? typeFilter : undefined,
        limit: 100,
      });
      setAdjustments(data);
    } catch (err: any) {
      console.error('Failed to load adjustments:', err);
    } finally {
      setLoading(false);
    }
  };

  // Compute live Stocktake variances
  const stocktakeVariances = React.useMemo(() => {
    if (!auditMode) return [];
    const list: any[] = [];
    items.forEach((item) => {
      const count = stocktakeCounts[item.id];
      if (!count) return;

      const expectedFull = Number(item.fullBottlesStock) || 0;
      const expectedOpen = Number(item.currentBottleRemainingMl) || 0;
      const bottleSize = Number(item.bottleSizeMl) || 750;
      const costPerMl = (Number(item.costPerBottle) || 0) / bottleSize;

      const fullDelta = count.actualFull - expectedFull;
      const openDelta = count.actualOpenMl - expectedOpen;
      const netMlDelta = (fullDelta * bottleSize) + openDelta;
      const costImpact = Math.round(netMlDelta * costPerMl * 100) / 100;

      if (fullDelta !== 0 || Math.abs(openDelta) > 0.01) {
        list.push({
          item,
          fullDelta,
          openDelta,
          netMlDelta,
          costImpact,
        });
      }
    });
    return list;
  }, [auditMode, items, stocktakeCounts]);

  const totalStocktakeCostVariance = stocktakeVariances.reduce(
    (sum, v) => sum + v.costImpact,
    0
  );

  // Commit Stocktake Reconciliation
  const handleCommitStocktake = async () => {
    if (stocktakeVariances.length === 0) {
      alert('No inventory variances detected. Physical count exactly matches book inventory!');
      setAuditMode(false);
      return;
    }

    if (
      !confirm(
        `Reconcile ${stocktakeVariances.length} inventory variances with a net financial impact of ${
          totalStocktakeCostVariance >= 0 ? '+Rs. ' : '-Rs. '
        }${Math.abs(totalStocktakeCostVariance).toLocaleString('en-LK', { minimumFractionDigits: 2 })}?`
      )
    ) {
      return;
    }

    setSubmittingAudit(true);
    try {
      const countsPayload = items.map((item) => {
        const count = stocktakeCounts[item.id] || {
          actualFull: item.fullBottlesStock,
          actualOpenMl: item.currentBottleRemainingMl,
          notes: '',
        };
        return {
          barItemId: item.id,
          actualFullBottles: Number(count.actualFull),
          actualOpenMl: Number(count.actualOpenMl),
          notes: count.notes,
        };
      });

      const res = await barApi.bulkStocktake({
        counts: countsPayload,
        auditedBy: auditedBy.trim() || 'Bar Auditor',
        notes: auditNotes.trim() || undefined,
      });

      onShowFeedback('success', res.message || 'Stocktake reconciliation committed successfully!');
      setAuditMode(false);
      await onReloadAll();
      await loadAdjustments();
    } catch (err: any) {
      alert('Failed to commit stocktake: ' + err.message);
    } finally {
      setSubmittingAudit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Actions */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE]">
              Inventory Governance
            </span>
            <span className="text-xs font-semibold text-[#0F172A]">
              Physical Count & Incident Adjustments
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Log shattered bottles, oxidized wine, or run a full shift closing stocktake audit with automated variance reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!auditMode ? (
            <>
              <button
                type="button"
                onClick={() => setAuditMode(true)}
                className="py-2.5 px-3.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Start Shift Stocktake</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedItemForAdjust(null);
                  setSingleAdjustOpen(true);
                }}
                className="py-2.5 px-3.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Log Single Incident</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setAuditMode(false)}
              className="py-2.5 px-3.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#64748B] text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>Cancel Stocktake</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadAdjustments}
            disabled={loading}
            className="p-2.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] transition"
            title="Refresh Log"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* PHYSICAL STOCKTAKE AUDIT MODE                                   */}
      {/* ============================================================== */}
      {auditMode && (
        <div className="bg-gradient-to-br from-white to-[#FAF5FF] rounded-2xl border-2 border-[#8B5CF6] p-5 shadow-lg space-y-5 animate-in fade-in duration-200">
          {/* Header & Live Summary */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E9D5FF]">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#8B5CF6] animate-ping"></span>
                <h3 className="text-base font-extrabold text-[#5B21B6]">
                  Live Shift Stocktake Audit in Progress
                </h3>
              </div>
              <p className="text-xs text-[#6B21A8] mt-0.5">
                Verify each bottle on the speed rail and cellar racks. Discrepancies are highlighted in real-time.
              </p>
            </div>

            {/* Audit Status Stats */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-[#6B21A8]">Discrepancies Detected</div>
                <div className="text-xl font-extrabold text-[#7C3AED]">
                  {stocktakeVariances.length} of {items.length} items
                </div>
              </div>

              <div className="text-right pl-4 border-l border-[#DDD6FE]">
                <div className="text-[10px] uppercase font-bold text-[#6B21A8]">Net Cost Variance</div>
                <div
                  className={`text-xl font-black ${
                    totalStocktakeCostVariance < 0 ? 'text-[#DC2626]' : totalStocktakeCostVariance > 0 ? 'text-[#16A34A]' : 'text-[#64748B]'
                  }`}
                >
                  {totalStocktakeCostVariance >= 0
                    ? `+Rs. ${totalStocktakeCostVariance.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`
                    : `-Rs. ${Math.abs(totalStocktakeCostVariance).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCommitStocktake}
                disabled={submittingAudit}
                className="py-2.5 px-5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold shadow-md transition flex items-center gap-2"
              >
                {submittingAudit ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Committing Audit...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Commit Reconciliation</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Auditor Name & General Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#5B21B6] mb-1">Audited By (Staff Name)</label>
              <input
                type="text"
                value={auditedBy}
                onChange={(e) => setAuditedBy(e.target.value)}
                placeholder="e.g. Lead Bartender & Shift Manager"
                className="w-full px-3 py-1.5 rounded-xl border border-[#DDD6FE] bg-white text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#5B21B6] mb-1">Audit Shift Session Notes</label>
              <input
                type="text"
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                placeholder="e.g. Closing count Saturday Night Shift"
                className="w-full px-3 py-1.5 rounded-xl border border-[#DDD6FE] bg-white text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
              />
            </div>
          </div>

          {/* Interactive Stocktake Input Table */}
          <div className="bg-white rounded-xl border border-[#E9D5FF] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF5FF] border-b border-[#E9D5FF] text-[#6B21A8] font-bold">
                    <th className="py-3 px-4">Beverage Label</th>
                    <th className="py-3 px-3 text-center">Expected Full Btls</th>
                    <th className="py-3 px-3 text-center bg-[#F3E8FF] font-black">Actual Full Btls</th>
                    <th className="py-3 px-3 text-center">Expected Open ml</th>
                    <th className="py-3 px-3 text-center bg-[#F3E8FF] font-black">Actual Open ml</th>
                    <th className="py-3 px-3 text-right">Net Variance</th>
                    <th className="py-3 px-3 text-right">Cost Impact</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {items.map((item) => {
                    const count = stocktakeCounts[item.id] || {
                      actualFull: item.fullBottlesStock ?? 0,
                      actualOpenMl: item.currentBottleRemainingMl ?? 0,
                      notes: '',
                    };
                    const expectedFull = Number(item.fullBottlesStock) || 0;
                    const expectedOpen = Number(item.currentBottleRemainingMl) || 0;
                    const bottleSize = Number(item.bottleSizeMl) || 750;
                    const costPerMl = (Number(item.costPerBottle) || 0) / bottleSize;

                    const fullDelta = count.actualFull - expectedFull;
                    const openDelta = count.actualOpenMl - expectedOpen;
                    const netMlDelta = (fullDelta * bottleSize) + openDelta;
                    const costImpact = Math.round(netMlDelta * costPerMl * 100) / 100;
                    const hasDiscrepancy = fullDelta !== 0 || Math.abs(openDelta) > 0.01;

                    return (
                      <tr
                        key={item.id}
                        className={`transition ${hasDiscrepancy ? 'bg-[#FEF2F2]/60 hover:bg-[#FEF2F2]' : 'hover:bg-[#F8FAFC]'}`}
                      >
                        <td className="py-3 px-4 font-bold text-[#0F172A]">
                          <div>{item.name}</div>
                          <div className="text-[10px] text-[#64748B] font-normal">
                            {item.category} • {bottleSize}ml bottle
                          </div>
                        </td>

                        {/* Expected Full */}
                        <td className="py-3 px-3 text-center font-bold text-[#64748B]">
                          {expectedFull}
                        </td>

                        {/* Actual Full Input */}
                        <td className="py-2 px-3 text-center bg-[#FAF5FF]">
                          <input
                            type="number"
                            min="0"
                            value={count.actualFull}
                            onChange={(e) =>
                              setStocktakeCounts((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...count,
                                  actualFull: Math.max(0, parseInt(e.target.value) || 0),
                                },
                              }))
                            }
                            className={`w-16 py-1 px-2 text-center rounded-lg border font-bold text-xs ${
                              fullDelta !== 0
                                ? 'border-[#EF4444] bg-[#FEF2F2] text-[#B91C1C]'
                                : 'border-[#E2E8F0] bg-white text-[#0F172A]'
                            }`}
                          />
                        </td>

                        {/* Expected Open ml */}
                        <td className="py-3 px-3 text-center text-[#3B82F6] font-medium">
                          {expectedOpen} ml
                        </td>

                        {/* Actual Open ml Input */}
                        <td className="py-2 px-3 text-center bg-[#FAF5FF]">
                          <input
                            type="number"
                            min="0"
                            max={bottleSize}
                            step="10"
                            value={count.actualOpenMl}
                            onChange={(e) =>
                              setStocktakeCounts((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...count,
                                  actualOpenMl: Math.max(0, parseInt(e.target.value) || 0),
                                },
                              }))
                            }
                            className={`w-20 py-1 px-2 text-center rounded-lg border font-bold text-xs ${
                              openDelta !== 0
                                ? 'border-[#EF4444] bg-[#FEF2F2] text-[#B91C1C]'
                                : 'border-[#E2E8F0] bg-white text-[#0F172A]'
                            }`}
                          />
                        </td>

                        {/* Net Variance */}
                        <td className="py-3 px-3 text-right">
                          {hasDiscrepancy ? (
                            <div className="font-bold text-[#DC2626]">
                              {netMlDelta > 0 ? `+${netMlDelta}` : netMlDelta} ml
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#10B981] font-semibold flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Match
                            </span>
                          )}
                        </td>

                        {/* Cost Impact */}
                        <td className="py-3 px-3 text-right">
                          {hasDiscrepancy ? (
                            <span
                              className={`font-black ${costImpact < 0 ? 'text-[#B91C1C]' : 'text-[#15803D]'}`}
                            >
                              {costImpact >= 0 ? `+Rs. ${costImpact.toLocaleString('en-LK', { minimumFractionDigits: 2 })}` : `-Rs. ${Math.abs(costImpact).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`}
                            </span>
                          ) : (
                            <span className="text-[#94A3B8]">—</span>
                          )}
                        </td>

                        {/* Notes */}
                        <td className="py-2 px-4">
                          <input
                            type="text"
                            placeholder="Optional note..."
                            value={count.notes}
                            onChange={(e) =>
                              setStocktakeCounts((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...count,
                                  notes: e.target.value,
                                },
                              }))
                            }
                            className="w-full py-1 px-2 rounded-lg border border-[#E2E8F0] bg-white text-[11px] text-[#0F172A]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ADJUSTMENT AUDIT LOG TABLE                                      */}
      {/* ============================================================== */}
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { label: 'All Incidents', val: 'ALL' },
              { label: 'Physical Audit', val: 'PHYSICAL_AUDIT' },
              { label: 'Breakages', val: 'BREAKAGE' },
              { label: 'Expiry / Spoilage', val: 'EXPIRY_SPOILAGE' },
              { label: 'Overpour', val: 'OVERPOUR_VARIANCE' },
              { label: 'Corrections', val: 'CORRECTION' },
            ].map((f) => (
              <button
                key={f.val}
                type="button"
                onClick={() => setTypeFilter(f.val)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  typeFilter === f.val
                    ? 'bg-[#0F172A] text-white shadow-xs'
                    : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search adjustments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white text-xs text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#0F172A]"
            />
          </div>
        </div>

        {/* Adjustments Table */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-3">Beverage Label</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3 text-right">Sealed Delta</th>
                  <th className="py-3 px-3 text-right">Open Delta</th>
                  <th className="py-3 px-3 text-right">Net Volume</th>
                  <th className="py-3 px-3 text-right">Cost Impact</th>
                  <th className="py-3 px-3">Staff / Performer</th>
                  <th className="py-3 px-4">Reason & Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[#64748B]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0F172A]" />
                      Loading adjustment ledger...
                    </td>
                  </tr>
                ) : !adjustments.length ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[#64748B]">
                      No stock adjustments found. Use the buttons above to log an incident or run a stocktake audit.
                    </td>
                  </tr>
                ) : (
                  adjustments
                    .filter((a) =>
                      searchQuery.trim()
                        ? a.barItemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.adjustedBy?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.reason?.toLowerCase().includes(searchQuery.toLowerCase())
                        : true
                    )
                    .map((adj) => (
                      <tr key={adj.id} className="hover:bg-[#F8FAFC] transition">
                        <td className="py-3 px-4 font-mono text-[11px] text-[#64748B]">
                          {new Date(adj.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-bold text-[#0F172A]">
                          {adj.barItemName}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                              adj.adjustmentType === 'BREAKAGE'
                                ? 'bg-[#FEE2E2] text-[#B91C1C]'
                                : adj.adjustmentType === 'EXPIRY_SPOILAGE'
                                ? 'bg-[#FEF3C7] text-[#B45309]'
                                : adj.adjustmentType === 'PHYSICAL_AUDIT'
                                ? 'bg-[#EDE9FE] text-[#6D28D9]'
                                : 'bg-[#F1F5F9] text-[#475569]'
                            }`}
                          >
                            {adj.adjustmentType}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`font-semibold ${
                              adj.fullBottlesDelta > 0
                                ? 'text-[#16A34A]'
                                : adj.fullBottlesDelta < 0
                                ? 'text-[#DC2626]'
                                : 'text-[#64748B]'
                            }`}
                          >
                            {adj.fullBottlesDelta > 0 ? `+${adj.fullBottlesDelta}` : adj.fullBottlesDelta} btls
                          </span>
                          <div className="text-[10px] text-[#94A3B8]">
                            ({adj.previousFullBottles} → {adj.newFullBottles})
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right text-[#3B82F6]">
                          <span className="font-semibold">
                            {Number(adj.openMlDelta) > 0 ? `+${adj.openMlDelta}` : adj.openMlDelta} ml
                          </span>
                          <div className="text-[10px] text-[#94A3B8]">
                            ({adj.previousOpenMl} → {adj.newOpenMl})
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[#0F172A]">
                          <span
                            className={
                              Number(adj.netVolumeDeltaMl) > 0
                                ? 'text-[#16A34A]'
                                : Number(adj.netVolumeDeltaMl) < 0
                                ? 'text-[#DC2626]'
                                : 'text-[#64748B]'
                            }
                          >
                            {Number(adj.netVolumeDeltaMl) > 0
                              ? `+${adj.netVolumeDeltaMl}`
                              : adj.netVolumeDeltaMl}{' '}
                            ml
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`font-black ${
                              Number(adj.costImpact) > 0
                                ? 'text-[#16A34A]'
                                : Number(adj.costImpact) < 0
                                ? 'text-[#DC2626]'
                                : 'text-[#64748B]'
                            }`}
                          >
                            {Number(adj.costImpact) >= 0
                              ? `+Rs. ${Number(adj.costImpact).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`
                              : `-Rs. ${Math.abs(Number(adj.costImpact)).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-[#0F172A]">
                          {adj.adjustedBy || 'Bar Staff'}
                        </td>
                        <td className="py-3 px-4 text-[#64748B]">
                          <div>{adj.reason}</div>
                          {adj.notes && <div className="text-[10px] text-[#94A3B8] italic">{adj.notes}</div>}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Single Adjustment Modal */}
      <SingleAdjustModal
        isOpen={singleAdjustOpen}
        onClose={() => setSingleAdjustOpen(false)}
        items={items}
        preselectedItem={selectedItemForAdjust}
        onSuccess={async (msg) => {
          onShowFeedback('success', msg);
          await onReloadAll();
          await loadAdjustments();
        }}
      />
    </div>
  );
}
