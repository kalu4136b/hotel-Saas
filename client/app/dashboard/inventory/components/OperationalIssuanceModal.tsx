'use client';

import React, { useState, useEffect } from 'react';
import { X, Send, AlertCircle, Building2, Plus, Trash2 } from 'lucide-react';

interface OperationalIssuanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (issuanceData: any) => Promise<void>;
  inventoryItems: any[];
}

const DEPARTMENTS = [
  { id: 'FRONT_OFFICE', label: 'Front Office & Reception' },
  { id: 'BAR', label: 'Bar & Beverage Lounge' },
  { id: 'KITCHEN', label: 'Kitchen & Culinary Prep' },
  { id: 'HOUSEKEEPING', label: 'Housekeeping & Laundry' },
  { id: 'MAINTENANCE', label: 'Engineering & Maintenance' },
  { id: 'ADMIN', label: 'General Administration & HR' },
];

export default function OperationalIssuanceModal({
  isOpen,
  onClose,
  onSave,
  inventoryItems,
}: OperationalIssuanceModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [department, setDepartment] = useState('FRONT_OFFICE');
  const [receivedByName, setReceivedByName] = useState('');
  const [notes, setNotes] = useState('');

  const [lines, setLines] = useState<
    Array<{
      inventoryItemId: string;
      quantity: number;
      purpose: string;
      assetTag: string;
    }>
  >([]);

  // Filter operational items (or any consumables/supplies)
  const operationalItems = inventoryItems.filter(
    (i) => i.mainCategory === 'OPERATIONAL' || i.mainCategory === 'KITCHEN' || i.mainCategory === 'BAR',
  );

  useEffect(() => {
    if (isOpen) {
      setDepartment('FRONT_OFFICE');
      setReceivedByName('');
      setNotes('');
      setError(null);

      const opItems = inventoryItems.filter((i) => i.mainCategory === 'OPERATIONAL');
      if (opItems.length > 0) {
        setLines([
          {
            inventoryItemId: opItems[0].id,
            quantity: 5,
            purpose: 'Department daily supplies',
            assetTag: opItems[0].assetTag || '',
          },
        ]);
      } else if (inventoryItems.length > 0) {
        setLines([
          {
            inventoryItemId: inventoryItems[0].id,
            quantity: 1,
            purpose: 'Department requisition',
            assetTag: '',
          },
        ]);
      } else {
        setLines([]);
      }
    }
  }, [isOpen, inventoryItems]);

  if (!isOpen) return null;

  const handleAddLine = () => {
    if (operationalItems.length === 0) return;
    const defaultItem = operationalItems[0];
    setLines((prev) => [
      ...prev,
      {
        inventoryItemId: defaultItem.id,
        quantity: 1,
        purpose: '',
        assetTag: defaultItem.assetTag || '',
      },
    ]);
  };

  const handleItemSelect = (index: number, itemId: string) => {
    const itm = inventoryItems.find((i) => i.id === itemId);
    setLines((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        inventoryItemId: itemId,
        assetTag: itm?.assetTag || '',
      };
      return copy;
    });
  };

  const handleLineChange = (index: number, field: string, val: any) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivedByName.trim()) {
      setError('Recipient staff member name is required');
      return;
    }
    if (lines.length === 0) {
      setError('Please add at least one item to issue');
      return;
    }

    // Check stock availability
    for (const l of lines) {
      const itm = inventoryItems.find((i) => i.id === l.inventoryItemId);
      if (itm && Number(l.quantity) > Number(itm.currentStock)) {
        setError(
          `Requested quantity (${l.quantity}) exceeds available stock (${itm.currentStock} ${itm.unit}) for "${itm.name}"`,
        );
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      await onSave({
        department,
        receivedByName,
        notes,
        items: lines.map((l) => ({
          inventoryItemId: l.inventoryItemId,
          quantity: Number(l.quantity),
          purpose: l.purpose,
          assetTag: l.assetTag,
        })),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to issue operational stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              Internal Distribution
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-0.5">Issue Operational Stock to Department</h2>
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

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Destination Department & Recipient */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Issuing to Department <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-indigo-200 bg-white text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Received By (Staff Name) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={receivedByName}
                onChange={(e) => setReceivedByName(e.target.value)}
                placeholder="e.g., Sarah Jenkins, Leo (Bartender)"
                className="w-full px-3 py-2.5 rounded-xl border border-indigo-200 bg-white text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Requisition Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Monthly POS terminal rolls replenishment"
                className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Items to Deduct &amp; Transfer ({lines.length})
              </span>
              <button
                type="button"
                onClick={handleAddLine}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-2 w-28 text-center">Available Stock</th>
                    <th className="py-2.5 px-2 w-24 text-center">Quantity to Issue</th>
                    <th className="py-2.5 px-3">Purpose / Notes</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {lines.map((line, idx) => {
                    const itm = inventoryItems.find((i) => i.id === line.inventoryItemId);
                    const isOverStock = itm && Number(line.quantity) > Number(itm.currentStock);

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3">
                          <select
                            value={line.inventoryItemId}
                            onChange={(e) => handleItemSelect(idx, e.target.value)}
                            className="w-full py-1.5 px-2 rounded-lg border border-slate-200 text-xs font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                          >
                            {operationalItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                [{item.mainCategory}] {item.name} ({item.currentStock} {item.unit})
                              </option>
                            ))}
                          </select>
                          {itm?.itemType === 'REUSABLE_EQUIPMENT' && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800">
                              Reusable Asset: {itm.assetTag || 'Tagged Equipment'}
                            </span>
                          )}
                        </td>

                        <td className="py-2 px-2 text-center font-bold text-slate-600 font-mono">
                          {itm ? `${itm.currentStock} ${itm.unit}` : '-'}
                        </td>

                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            value={line.quantity}
                            onChange={(e) => handleLineChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            className={`w-full py-1 px-2 rounded-lg border text-xs font-bold text-center focus:ring-2 focus:ring-indigo-500 ${
                              isOverStock
                                ? 'border-rose-400 bg-rose-50 text-rose-700'
                                : 'border-slate-300'
                            }`}
                          />
                        </td>

                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={line.purpose}
                            onChange={(e) => handleLineChange(idx, 'purpose', e.target.value)}
                            placeholder="e.g. Front desk receipt printers"
                            className="w-full py-1 px-2 rounded-lg border border-slate-200 text-[11px]"
                          />
                        </td>

                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            disabled={lines.length <= 1}
                            className="text-slate-400 hover:text-rose-600 disabled:opacity-20 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
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
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-lg shadow-indigo-600/20 transition flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Deducting & Issuing...' : 'Complete Stock Issuance'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
