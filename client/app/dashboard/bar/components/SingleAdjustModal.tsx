'use client';

import React, { useState } from 'react';
import { barApi } from '@/lib/api';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Wine,
  DollarSign,
  Droplets,
  Layers,
} from 'lucide-react';

interface SingleAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: any[];
  preselectedItem?: any | null;
  onSuccess: (msg: string) => void;
}

export default function SingleAdjustModal({
  isOpen,
  onClose,
  items,
  preselectedItem,
  onSuccess,
}: SingleAdjustModalProps) {
  const [selectedItemId, setSelectedItemId] = useState<string>(
    preselectedItem?.id || (items[0]?.id || '')
  );
  const [adjustmentType, setAdjustmentType] = useState<string>('BREAKAGE');
  const [mode, setMode] = useState<'DELTA' | 'EXACT'>('DELTA');

  // Relative Delta state
  const [fullBottlesDelta, setFullBottlesDelta] = useState<number>(-1);
  const [openMlDelta, setOpenMlDelta] = useState<number>(0);

  // Exact Balance state
  const [newFullBottles, setNewFullBottles] = useState<number>(0);
  const [newOpenMl, setNewOpenMl] = useState<number>(0);

  const [adjustedBy, setAdjustedBy] = useState<string>('');
  const [reason, setReason] = useState<string>('Broken bottle on floor during shift');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeItem = items.find((i) => i.id === selectedItemId) || preselectedItem || items[0];
  const bottleSize = activeItem ? Number(activeItem.bottleSizeMl) || 750 : 750;
  const costPerBottle = activeItem ? Number(activeItem.costPerBottle) || 0 : 0;
  const costPerMl = costPerBottle / bottleSize;

  // Compute preview
  let previewNetMl = 0;
  let previewCost = 0;
  if (mode === 'DELTA') {
    previewNetMl = (fullBottlesDelta * bottleSize) + openMlDelta;
  } else if (activeItem) {
    const curFull = Number(activeItem.fullBottlesStock) || 0;
    const curOpen = Number(activeItem.currentBottleRemainingMl) || 0;
    previewNetMl = ((newFullBottles - curFull) * bottleSize) + (newOpenMl - curOpen);
  }
  previewCost = Math.round(previewNetMl * costPerMl * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;
    if (!reason.trim()) {
      setError('Please provide a mandatory reason for this stock adjustment.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload: any = {
        barItemId: activeItem.id,
        adjustmentType,
        adjustedBy: adjustedBy.trim() || undefined,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      };

      if (mode === 'DELTA') {
        payload.fullBottlesDelta = Number(fullBottlesDelta);
        payload.openMlDelta = Number(openMlDelta);
      } else {
        payload.newFullBottles = Number(newFullBottles);
        payload.newOpenMl = Number(newOpenMl);
      }

      const res = await barApi.adjustStock(payload);
      onSuccess(res.message || `Successfully adjusted ${activeItem.name}!`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust stock');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-[#F8FAFC] to-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FEF3C7] text-[#D97706]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Stock Adjustment & Incident Log</h2>
              <p className="text-[11px] text-[#64748B]">
                Record breakages, oxidized wine, or manual cellar corrections
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Select Target Bottle */}
          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1">Select Liquor Bottle</label>
            <select
              value={selectedItemId}
              onChange={(e) => {
                setSelectedItemId(e.target.value);
                const it = items.find((i) => i.id === e.target.value);
                if (it) {
                  setNewFullBottles(it.fullBottlesStock || 0);
                  setNewOpenMl(it.currentBottleRemainingMl || 0);
                }
              }}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.category}) — {i.fullBottlesStock} btls / {i.currentBottleRemainingMl}ml
                </option>
              ))}
            </select>
          </div>

          {/* Adjustment Incident Type */}
          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1">Adjustment Reason / Incident Type</label>
            <select
              value={adjustmentType}
              onChange={(e) => {
                setAdjustmentType(e.target.value);
                if (e.target.value === 'BREAKAGE') setReason('Bottle shattered behind bar');
                else if (e.target.value === 'EXPIRY_SPOILAGE') setReason('Oxidized wine / spoiled batch');
                else if (e.target.value === 'OVERPOUR_VARIANCE') setReason('Calibration variance / free pour difference');
                else if (e.target.value === 'INTERNAL_TRANSFER') setReason('Transferred bottle to banquet / kitchen');
                else setReason('Inventory correction');
              }}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
            >
              <option value="BREAKAGE">🍾 Bottle Breakage / Shattered Glass</option>
              <option value="EXPIRY_SPOILAGE">🍷 Expiry / Wine Oxidation / Spoilage</option>
              <option value="OVERPOUR_VARIANCE">⚖️ Over-pour Discrepancy / Free Pour</option>
              <option value="INTERNAL_TRANSFER">🔄 Internal Transfer (Kitchen / Banquet)</option>
              <option value="PHYSICAL_AUDIT">📋 Audit Discrepancy Reconciliation</option>
              <option value="CORRECTION">✏️ Manual Balance Correction</option>
            </select>
          </div>

          {/* Adjustment Mode Selector */}
          <div className="flex rounded-xl bg-[#F1F5F9] p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMode('DELTA')}
              className={`flex-1 py-1.5 rounded-lg transition ${
                mode === 'DELTA' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#64748B]'
              }`}
            >
              Relative Change (+ / - Delta)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('EXACT');
                if (activeItem) {
                  setNewFullBottles(activeItem.fullBottlesStock || 0);
                  setNewOpenMl(activeItem.currentBottleRemainingMl || 0);
                }
              }}
              className={`flex-1 py-1.5 rounded-lg transition ${
                mode === 'EXACT' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#64748B]'
              }`}
            >
              Set Exact New Balances
            </button>
          </div>

          {/* Mode 1: Relative Delta */}
          {mode === 'DELTA' ? (
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
                  Sealed Bottles Delta
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFullBottlesDelta((prev) => prev - 1)}
                    className="w-8 h-8 rounded-lg bg-white border border-[#E2E8F0] font-bold text-sm text-[#0F172A]"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={fullBottlesDelta}
                    onChange={(e) => setFullBottlesDelta(Number(e.target.value))}
                    className="w-full text-center py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-bold text-[#0F172A]"
                  />
                  <button
                    type="button"
                    onClick={() => setFullBottlesDelta((prev) => prev + 1)}
                    className="w-8 h-8 rounded-lg bg-white border border-[#E2E8F0] font-bold text-sm text-[#0F172A]"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
                  Open Bottle Delta (ml)
                </label>
                <input
                  type="number"
                  step="10"
                  value={openMlDelta}
                  onChange={(e) => setOpenMlDelta(Number(e.target.value))}
                  placeholder="e.g. -60"
                  className="w-full py-1.5 px-3 rounded-lg border border-[#E2E8F0] bg-white text-xs font-bold text-[#0F172A]"
                />
              </div>
            </div>
          ) : (
            /* Mode 2: Exact New Values */
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
                  Exact Full Bottles Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={newFullBottles}
                  onChange={(e) => setNewFullBottles(Math.max(0, Number(e.target.value)))}
                  className="w-full py-1.5 px-3 rounded-lg border border-[#E2E8F0] bg-white text-xs font-bold text-[#0F172A]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
                  Exact Open Bottle ml (0–{bottleSize})
                </label>
                <input
                  type="number"
                  min="0"
                  max={bottleSize}
                  value={newOpenMl}
                  onChange={(e) => setNewOpenMl(Math.max(0, Number(e.target.value)))}
                  className="w-full py-1.5 px-3 rounded-lg border border-[#E2E8F0] bg-white text-xs font-bold text-[#0F172A]"
                />
              </div>
            </div>
          )}

          {/* Live Impact Preview */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-between text-xs">
            <div>
              <span className="text-[#64748B] font-medium">Net Volume Change: </span>
              <span className={`font-bold ${previewNetMl < 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>
                {previewNetMl > 0 ? `+${previewNetMl}` : previewNetMl} ml
              </span>
            </div>
            <div>
              <span className="text-[#64748B] font-medium">Financial Impact: </span>
              <span className={`font-black ${previewCost < 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>
                {previewCost >= 0 ? `+$${previewCost.toFixed(2)}` : `-$${Math.abs(previewCost).toFixed(2)}`}
              </span>
            </div>
          </div>

          {/* Performer & Reason */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">Staff / Manager Name</label>
              <input
                type="text"
                value={adjustedBy}
                onChange={(e) => setAdjustedBy(e.target.value)}
                placeholder="e.g. Lead Bartender"
                className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">Incident Explanation *</label>
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Detailed reason..."
                className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1">Audit Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Incident report logged with shift manager"
              className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Recording Adjustment...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Commit Adjustment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
