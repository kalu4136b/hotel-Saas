'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: any) => Promise<void>;
  item?: any | null;
  suppliers: any[];
  defaultCategory?: 'BAR' | 'KITCHEN' | 'OPERATIONAL';
}

export default function ItemModal({
  isOpen,
  onClose,
  onSave,
  item,
  suppliers,
  defaultCategory = 'KITCHEN',
}: ItemModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    sku: '',
    itemCode: '',
    mainCategory: defaultCategory,
    subcategory: '',
    unit: 'PCS',
    purchaseUnit: 'PCS',
    conversionFactor: 1.0,
    currentStock: 0,
    minStockLevel: 5,
    reorderLevel: 10,
    defaultSupplierId: '',
    purchaseCost: 0,
    costPerUnit: 0,
    sellingPrice: '',
    isSellingItem: false,
    taxRate: 0,
    itemType: 'CONSUMABLE',
    assetTag: '',
    serialNumber: '',
    assignedDepartment: '',
    expiryTracking: false,
    batchTracking: false,
    description: '',
  });

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || '',
        sku: item.sku || '',
        itemCode: item.itemCode || item.sku || '',
        mainCategory: item.mainCategory || defaultCategory,
        subcategory: item.subcategory || '',
        unit: item.unit || 'PCS',
        purchaseUnit: item.purchaseUnit || item.unit || 'PCS',
        conversionFactor: Number(item.conversionFactor) || 1.0,
        currentStock: Number(item.currentStock) || 0,
        minStockLevel: Number(item.minStockLevel) || 5,
        reorderLevel: Number(item.reorderLevel) || 10,
        defaultSupplierId: item.defaultSupplierId || item.defaultSupplier?.id || '',
        purchaseCost: Number(item.purchaseCost) || 0,
        costPerUnit: Number(item.costPerUnit) || 0,
        sellingPrice: item.sellingPrice !== null && item.sellingPrice !== undefined ? String(item.sellingPrice) : '',
        isSellingItem: Boolean(item.isSellingItem),
        taxRate: Number(item.taxRate) || 0,
        itemType: item.itemType || 'CONSUMABLE',
        assetTag: item.assetTag || '',
        serialNumber: item.serialNumber || '',
        assignedDepartment: item.assignedDepartment || '',
        expiryTracking: Boolean(item.expiryTracking),
        batchTracking: Boolean(item.batchTracking),
        description: item.description || '',
      });
    } else {
      setForm({
        name: '',
        sku: '',
        itemCode: '',
        mainCategory: defaultCategory,
        subcategory: defaultCategory === 'BAR' ? 'Beer & Cider' : defaultCategory === 'OPERATIONAL' ? 'Stationery & Printing' : 'Produce & Greens',
        unit: defaultCategory === 'BAR' ? 'BOTTLE' : defaultCategory === 'OPERATIONAL' ? 'ROLL' : 'KG',
        purchaseUnit: defaultCategory === 'BAR' ? 'CARTON' : defaultCategory === 'OPERATIONAL' ? 'BOX' : 'CRATE',
        conversionFactor: defaultCategory === 'BAR' ? 24 : defaultCategory === 'OPERATIONAL' ? 50 : 10,
        currentStock: 0,
        minStockLevel: 5,
        reorderLevel: 10,
        defaultSupplierId: suppliers.length > 0 ? suppliers[0].id : '',
        purchaseCost: 0,
        costPerUnit: 0,
        sellingPrice: defaultCategory === 'BAR' ? '5.00' : '',
        isSellingItem: defaultCategory === 'BAR',
        taxRate: 0,
        itemType: 'CONSUMABLE',
        assetTag: '',
        serialNumber: '',
        assignedDepartment: '',
        expiryTracking: defaultCategory === 'KITCHEN',
        batchTracking: defaultCategory === 'KITCHEN',
        description: '',
      });
    }
    setError(null);
  }, [item, defaultCategory, isOpen, suppliers]);

  if (!isOpen) return null;

  const handlePurchaseCostChange = (val: number) => {
    const factor = Number(form.conversionFactor) > 0 ? Number(form.conversionFactor) : 1;
    setForm((prev) => ({
      ...prev,
      purchaseCost: val,
      costPerUnit: Number((val / factor).toFixed(2)),
    }));
  };

  const handleCostPerUnitChange = (val: number) => {
    const factor = Number(form.conversionFactor) > 0 ? Number(form.conversionFactor) : 1;
    setForm((prev) => ({
      ...prev,
      costPerUnit: val,
      purchaseCost: Number((val * factor).toFixed(2)),
    }));
  };

  const handleFactorChange = (factor: number) => {
    const f = factor > 0 ? factor : 1;
    setForm((prev) => ({
      ...prev,
      conversionFactor: f,
      costPerUnit: prev.purchaseCost > 0 ? Number((prev.purchaseCost / f).toFixed(2)) : prev.costPerUnit,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Item name is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave({
        ...form,
        conversionFactor: Number(form.conversionFactor) || 1.0,
        currentStock: Number(form.currentStock) || 0,
        minStockLevel: Number(form.minStockLevel) || 0,
        reorderLevel: Number(form.reorderLevel) || 0,
        purchaseCost: Number(form.purchaseCost) || 0,
        costPerUnit: Number(form.costPerUnit) || 0,
        sellingPrice: form.sellingPrice !== '' ? Number(form.sellingPrice) : null,
        taxRate: Number(form.taxRate) || 0,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600">
              {item ? 'Modify SKU' : 'New Stock Item'}
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-0.5">
              {item ? `Edit ${item.name}` : `Add ${form.mainCategory} Inventory Item`}
            </h2>
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
          {/* Main Category Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Primary Classification Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['BAR', 'KITCHEN', 'OPERATIONAL'] as const).map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setForm((prev) => ({ ...prev, mainCategory: cat }))}
                  className={`py-2.5 px-3 rounded-2xl text-xs font-extrabold border transition text-center ${
                    form.mainCategory === cat
                      ? cat === 'BAR'
                        ? 'bg-amber-500 border-amber-600 text-white shadow-md'
                        : cat === 'KITCHEN'
                          ? 'bg-emerald-600 border-emerald-700 text-white shadow-md'
                          : 'bg-indigo-600 border-indigo-700 text-white shadow-md'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat === 'BAR' ? 'Bar Inventory' : cat === 'KITCHEN' ? 'Kitchen Inventory' : 'Operational Inventory'}
                </button>
              ))}
            </div>
          </div>

          {/* Basic Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Item Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Heineken 330ml, Roma Tomatoes, POS Bill Rolls"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Item Code / SKU</label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value, itemCode: e.target.value })}
                placeholder="Auto-generated if empty"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Subcategory</label>
              <input
                type="text"
                value={form.subcategory}
                onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                placeholder="e.g. Beer, Meat, Cleaning"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Unit of Measurement and Conversion Factor */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Packaging &amp; Unit Conversion
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                1 {form.purchaseUnit || 'Unit'} = {form.conversionFactor} {form.unit || 'Units'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Purchase Unit (PO)</label>
                <input
                  type="text"
                  value={form.purchaseUnit}
                  onChange={(e) => setForm({ ...form, purchaseUnit: e.target.value.toUpperCase() })}
                  placeholder="e.g. CARTON, BOX, BAG"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold uppercase focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Stock / Track Unit</label>
                <input
                  type="text"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value.toUpperCase() })}
                  placeholder="e.g. BOTTLE, CAN, KG, ROLL"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold uppercase focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Conversion Factor</label>
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  value={form.conversionFactor}
                  onChange={(e) => handleFactorChange(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Pricing & Supplier */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Purchase Cost ({form.purchaseUnit})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.purchaseCost}
                onChange={(e) => handlePurchaseCostChange(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold font-mono focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cost per Stock Unit ({form.unit})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.costPerUnit}
                onChange={(e) => handleCostPerUnitChange(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold font-mono focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Default Supplier</label>
              <select
                value={form.defaultSupplierId}
                onChange={(e) => setForm({ ...form, defaultSupplierId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              >
                <option value="">-- No Default Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stock Levels */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {!item && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Initial Stock ({form.unit})
                </label>
                <input
                  type="number"
                  step="any"
                  value={form.currentStock}
                  onChange={(e) => setForm({ ...form, currentStock: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Min Safety Level ({form.unit})
              </label>
              <input
                type="number"
                step="any"
                value={form.minStockLevel}
                onChange={(e) => setForm({ ...form, minStockLevel: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reorder Threshold ({form.unit})
              </label>
              <input
                type="number"
                step="any"
                value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Specific Operational & Selling Settings */}
          {form.mainCategory === 'OPERATIONAL' ? (
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-900 block">
                Operational Equipment &amp; Asset Settings
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Item Nature</label>
                  <select
                    value={form.itemType}
                    onChange={(e) => setForm({ ...form, itemType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="CONSUMABLE">Consumable Supply (Disposed upon use)</option>
                    <option value="REUSABLE_EQUIPMENT">Reusable Equipment (Asset Tracked)</option>
                  </select>
                </div>

                {form.itemType === 'REUSABLE_EQUIPMENT' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Asset Tag</label>
                      <input
                        type="text"
                        value={form.assetTag}
                        onChange={(e) => setForm({ ...form, assetTag: e.target.value })}
                        placeholder="e.g. AST-PRN-01"
                        className="w-full px-3 py-2 rounded-xl border border-indigo-200 text-xs font-mono font-bold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Serial Number</label>
                      <input
                        type="text"
                        value={form.serialNumber}
                        onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                        placeholder="e.g. SN-998822"
                        className="w-full px-3 py-2 rounded-xl border border-indigo-200 text-xs font-mono bg-white"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
                  POS Direct Retail Sales
                </span>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isSellingItem}
                    onChange={(e) => setForm({ ...form, isSellingItem: e.target.checked })}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                  />
                  <span>Direct Customer Selling Item</span>
                </label>
              </div>

              {form.isSellingItem && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Selling Price per {form.unit} (Rs.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.sellingPrice}
                      onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                      placeholder="e.g. 7.50"
                      className="w-full px-3 py-2 rounded-xl border border-amber-200 text-xs font-bold font-mono bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Applicable Tax %</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.taxRate}
                      onChange={(e) => setForm({ ...form, taxRate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-amber-200 text-xs font-bold bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
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
              className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold shadow-lg shadow-teal-600/20 transition flex items-center gap-2"
            >
              {loading ? 'Saving...' : item ? 'Update Item' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
