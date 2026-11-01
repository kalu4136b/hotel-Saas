'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertCircle, ShoppingCart } from 'lucide-react';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (poData: any) => Promise<void>;
  suppliers: any[];
  inventoryItems: any[];
  defaultCategory?: 'ALL' | 'BAR' | 'KITCHEN' | 'OPERATIONAL';
}

export default function PurchaseOrderModal({
  isOpen,
  onClose,
  onSave,
  suppliers,
  inventoryItems,
  defaultCategory = 'ALL',
}: PurchaseOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [supplierId, setSupplierId] = useState('');
  const [inventoryCategory, setInventoryCategory] = useState<'ALL' | 'BAR' | 'KITCHEN' | 'OPERATIONAL'>(defaultCategory);
  const [deliveryLocation, setDeliveryLocation] = useState('Main Receiving Store');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [expectedDate, setExpectedDate] = useState(
    new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
  );
  const [notes, setNotes] = useState('');

  const [lines, setLines] = useState<
    Array<{
      inventoryItemId: string;
      purchaseUnit: string;
      conversionFactor: number;
      quantityOrdered: number;
      unitCost: number;
      discountPercent: number;
      taxRate: number;
    }>
  >([]);

  useEffect(() => {
    if (isOpen) {
      setSupplierId(suppliers.length > 0 ? suppliers[0].id : '');
      setInventoryCategory(defaultCategory);
      setDeliveryLocation(
        defaultCategory === 'BAR'
          ? 'Bar Storage Depot'
          : defaultCategory === 'OPERATIONAL'
            ? 'Operations Supply Room'
            : 'Kitchen Main Store',
      );
      setPaymentTerms('Net 30');
      setExpectedDate(new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]);
      setNotes('');

      // Filter available items
      const candidateItems = inventoryItems.filter(
        (i) => defaultCategory === 'ALL' || i.mainCategory === defaultCategory,
      );

      if (candidateItems.length > 0) {
        setLines([
          {
            inventoryItemId: candidateItems[0].id,
            purchaseUnit: candidateItems[0].purchaseUnit || candidateItems[0].unit || 'PCS',
            conversionFactor: Number(candidateItems[0].conversionFactor) || 1,
            quantityOrdered: 5,
            unitCost: Number(candidateItems[0].purchaseCost) || Number(candidateItems[0].costPerUnit) || 10,
            discountPercent: 0,
            taxRate: 5,
          },
        ]);
      } else {
        setLines([]);
      }
      setError(null);
    }
  }, [isOpen, defaultCategory, suppliers, inventoryItems]);

  if (!isOpen) return null;

  // Filter items available for line selection based on chosen category
  const filteredItems = inventoryItems.filter(
    (i) => inventoryCategory === 'ALL' || i.mainCategory === inventoryCategory,
  );

  const handleAddLine = () => {
    if (filteredItems.length === 0) return;
    const defaultItem = filteredItems[0];
    setLines((prev) => [
      ...prev,
      {
        inventoryItemId: defaultItem.id,
        purchaseUnit: defaultItem.purchaseUnit || defaultItem.unit || 'PCS',
        conversionFactor: Number(defaultItem.conversionFactor) || 1,
        quantityOrdered: 10,
        unitCost: Number(defaultItem.purchaseCost) || Number(defaultItem.costPerUnit) || 5,
        discountPercent: 0,
        taxRate: 0,
      },
    ]);
  };

  const handleItemSelect = (index: number, itemId: string) => {
    const itm = inventoryItems.find((i) => i.id === itemId);
    if (!itm) return;
    setLines((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        inventoryItemId: itemId,
        purchaseUnit: itm.purchaseUnit || itm.unit || 'PCS',
        conversionFactor: Number(itm.conversionFactor) || 1,
        unitCost: Number(itm.purchaseCost) || Number(itm.costPerUnit) || 0,
      };
      return copy;
    });
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  // Computations
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  lines.forEach((l) => {
    const base = Number(l.quantityOrdered || 0) * Number(l.unitCost || 0);
    const disc = base * (Number(l.discountPercent || 0) / 100);
    const afterDisc = base - disc;
    const tax = afterDisc * (Number(l.taxRate || 0) / 100);
    subtotal += base;
    totalDiscount += disc;
    totalTax += tax;
  });

  const grandTotal = subtotal - totalDiscount + totalTax;

  const handleSubmit = async (e: React.FormEvent, status: 'DRAFT' | 'PENDING_APPROVAL') => {
    e.preventDefault();
    if (!supplierId) {
      setError('Please select a supplier');
      return;
    }
    if (lines.length === 0) {
      setError('Please add at least one line item');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave({
        supplierId,
        inventoryCategory,
        deliveryLocation,
        paymentTerms,
        expectedDate,
        notes,
        status,
        items: lines.map((l) => ({
          inventoryItemId: l.inventoryItemId,
          purchaseUnit: l.purchaseUnit,
          conversionFactor: Number(l.conversionFactor) || 1,
          quantityOrdered: Number(l.quantityOrdered),
          unitCost: Number(l.unitCost),
          discountPercent: Number(l.discountPercent) || 0,
          taxRate: Number(l.taxRate) || 0,
        })),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create Purchase Order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600 flex items-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5" />
              Procurement &amp; Supply Orders
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-0.5">Generate Purchase Order (PO)</h2>
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

        <form className="mt-6 space-y-6">
          {/* Header Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Supplier <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              >
                <option value="">-- Choose Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.paymentTerms || 'Standard'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Procurement Category</label>
              <select
                value={inventoryCategory}
                onChange={(e) => setInventoryCategory(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              >
                <option value="ALL">All / Mixed Categories</option>
                <option value="BAR">Bar Consumables &amp; Drinks</option>
                <option value="KITCHEN">Kitchen Food &amp; Ingredients</option>
                <option value="OPERATIONAL">Operational Supplies &amp; Equipment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Expected Delivery Date</label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Delivery Location</label>
              <input
                type="text"
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                placeholder="e.g. Central Store / Bar Dock"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Terms</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g. Net 30, COD"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Internal Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional supplier or audit notes"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Purchase Order Line Items ({lines.length})
              </span>
              <button
                type="button"
                onClick={handleAddLine}
                className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item Line</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-2 w-28">Purchase Unit</th>
                    <th className="py-2.5 px-2 w-20">Qty Ordered</th>
                    <th className="py-2.5 px-2 w-24">Unit Cost (Rs.)</th>
                    <th className="py-2.5 px-2 w-16">Disc %</th>
                    <th className="py-2.5 px-2 w-16">Tax %</th>
                    <th className="py-2.5 px-3 w-24 text-right">Line Total</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {lines.map((line, idx) => {
                    const base = line.quantityOrdered * line.unitCost;
                    const disc = base * (line.discountPercent / 100);
                    const lineTot = (base - disc) * (1 + line.taxRate / 100);

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3">
                          <select
                            value={line.inventoryItemId}
                            onChange={(e) => handleItemSelect(idx, e.target.value)}
                            className="w-full py-1.5 px-2 rounded-lg border border-slate-200 text-xs font-bold focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                          >
                            {filteredItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                [{item.mainCategory}] {item.name} ({item.sku})
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={line.purchaseUnit}
                            onChange={(e) => handleLineChange(idx, 'purchaseUnit', e.target.value.toUpperCase())}
                            className="w-full py-1.5 px-2 rounded-lg border border-slate-200 text-xs font-bold uppercase text-center"
                          />
                        </td>

                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            value={line.quantityOrdered}
                            onChange={(e) => handleLineChange(idx, 'quantityOrdered', parseFloat(e.target.value) || 0)}
                            className="w-full py-1.5 px-2 rounded-lg border border-slate-200 text-xs font-bold text-center"
                          />
                        </td>

                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitCost}
                            onChange={(e) => handleLineChange(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                            className="w-full py-1.5 px-2 rounded-lg border border-slate-200 text-xs font-mono font-bold text-right"
                          />
                        </td>

                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={line.discountPercent}
                            onChange={(e) => handleLineChange(idx, 'discountPercent', parseFloat(e.target.value) || 0)}
                            className="w-full py-1.5 px-1 rounded-lg border border-slate-200 text-xs text-center"
                          />
                        </td>

                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={line.taxRate}
                            onChange={(e) => handleLineChange(idx, 'taxRate', parseFloat(e.target.value) || 0)}
                            className="w-full py-1.5 px-1 rounded-lg border border-slate-200 text-xs text-center"
                          />
                        </td>

                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          ${lineTot.toFixed(2)}
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

          {/* Totals Strip */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 text-white shadow-lg">
            <div className="text-xs text-slate-300">
              <span className="font-bold text-white">Notice:</span> Creating or approving a Purchase Order will{' '}
              <strong className="text-amber-300">NOT update inventory stock</strong>. Inventory stock will increase only
              when goods are received via a Goods Received Note (GRN).
            </div>

            <div className="flex items-center gap-6 shrink-0 font-mono text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Subtotal</span>
                <span className="font-bold text-slate-200">Rs. {subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
              </div>
              {totalDiscount > 0 && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Discount</span>
                  <span className="font-bold text-rose-400">-Rs. {totalDiscount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {totalTax > 0 && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Tax</span>
                  <span className="font-bold text-slate-200">+Rs. {totalTax.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="border-l border-slate-700 pl-4">
                <span className="text-emerald-400 block text-[10px] uppercase font-bold">Grand Total</span>
                <span className="text-lg font-black text-emerald-400">Rs. {grandTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
              </div>
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
              type="button"
              disabled={loading}
              onClick={(e) => handleSubmit(e, 'DRAFT')}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={(e) => handleSubmit(e, 'PENDING_APPROVAL')}
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold shadow-lg shadow-sky-600/20 transition flex items-center gap-2"
            >
              {loading ? 'Submitting...' : 'Submit Purchase Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
