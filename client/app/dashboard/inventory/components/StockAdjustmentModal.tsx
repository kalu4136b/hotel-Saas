'use client';

import React, { useState, useEffect } from 'react';
import { X, SlidersHorizontal, AlertCircle } from 'lucide-react';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemId: string, data: any) => Promise<void>;
  item: any | null;
}

export default function StockAdjustmentModal({
  isOpen,
  onClose,
  onSave,
  item,
}: StockAdjustmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(0);
  const [movementType, setMovementType] = useState('MANUAL_ADJUSTMENT');
  const [reason, setReason] = useState('Routine stock-take audit');
  const [referenceId, setReferenceId] = useState('');

  useEffect(() => {
    if (isOpen && item) {
      setQuantity(0);
      setMovementType('MANUAL_ADJUSTMENT');
      setReason('Routine stock-take audit');
      setReferenceId(`ADJ-${Date.now().toString().slice(-6)}`);
      setError(null);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const currentStock = Number(item.currentStock || 0);
  const projectedStock = currentStock + Number(quantity);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity === 0) {
      setError('Adjustment quantity cannot be 0');
      return;
    }
    if (projectedStock < 0) {
      setError(`Cannot reduce stock below zero. Maximum reduction allowed is ${currentStock} ${item.unit}`);
      return;
    }
    if (!reason.trim()) {
      setError('Reason is required for auditing purposes');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave(item.id, {
        quantity: Number(quantity),
        movementType,
        reason,
        referenceId,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Manual Stock Adjustment
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-0.5">{item.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Current vs Projected preview */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Current Balance</span>
              <span className="text-xl font-extrabold text-slate-800 font-mono">
                {currentStock} {item.unit}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block">New Balance</span>
              <span
                className={`text-xl font-extrabold font-mono ${
                  projectedStock < 0
                    ? 'text-rose-600'
                    : projectedStock < item.minStockLevel
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                }`}
              >
                {projectedStock} {item.unit}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Quantity Adjustment (Enter negative to deduct, positive to add)
            </label>
            <input
              type="number"
              step="any"
              required
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Movement Type</label>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            >
              <option value="MANUAL_ADJUSTMENT">Stock Take Physical Count (Correction)</option>
              <option value="WASTE_SPOILAGE">Waste / Spoilage / Damage</option>
              <option value="RETURN">Supplier Return</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reason for Adjustment <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Month-end physical count reconciliation"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reference ID</label>
            <input
              type="text"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold shadow-lg shadow-amber-500/20 transition"
            >
              {loading ? 'Recording...' : 'Save Stock Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
