'use client';

import React, { useState } from 'react';
import {
  Wine,
  Search,
  Plus,
  SlidersHorizontal,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Beer,
  DollarSign,
} from 'lucide-react';

interface BarInventoryTabProps {
  items: any[];
  onOpenAddItem: () => void;
  onEditItem: (item: any) => void;
  onAdjustItem: (item: any) => void;
  onDeleteItem: (id: string) => void;
}

export default function BarInventoryTab({
  items,
  onOpenAddItem,
  onEditItem,
  onAdjustItem,
  onDeleteItem,
}: BarInventoryTabProps) {
  const [search, setSearch] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const barItems = items.filter((i) => i.mainCategory === 'BAR');

  const subcategories = Array.from(
    new Set(barItems.map((i) => i.subcategory).filter(Boolean)),
  );

  const filteredItems = barItems.filter((item) => {
    if (subcategoryFilter && item.subcategory !== subcategoryFilter) return false;
    if (lowStockOnly && Number(item.currentStock) > Number(item.minStockLevel)) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = item.name?.toLowerCase().includes(q);
      const matchSku = item.sku?.toLowerCase().includes(q);
      const matchSub = item.subcategory?.toLowerCase().includes(q);
      if (!matchName && !matchSku && !matchSub) return false;
    }
    return true;
  });

  const totalHoldingValue = barItems.reduce(
    (sum, i) => sum + Number(i.currentStock || 0) * Number(i.costPerUnit || 0),
    0,
  );
  const lowStockCount = barItems.filter(
    (i) => Number(i.currentStock) <= Number(i.minStockLevel),
  ).length;

  return (
    <div className="space-y-6">
      {/* Bar Top Banner */}
      <div className="rounded-3xl bg-linear-to-r from-amber-950 via-amber-900 to-amber-800 p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-amber-300 mb-2 border border-white/10">
            <Wine className="w-3.5 h-3.5" />
            <span>Bar &amp; Beverage Cellar</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black">Bar Inventory &amp; Consumables</h2>
          <p className="text-amber-200 text-xs sm:text-sm mt-1 max-w-xl">
            Track beers, canned beverages, mixers, juices, and beverage prep ingredients with conversion tracking and POS
            retail prices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 shrink-0 font-mono">
          <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-right">
            <span className="text-[10px] uppercase text-amber-300 block font-bold">Bar Stock Valuation</span>
            <span className="text-xl sm:text-2xl font-black text-white">
              Rs. {totalHoldingValue.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <button
            onClick={onOpenAddItem}
            className="px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Bar Item</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bar beverage, SKU, or mixer..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <select
            value={subcategoryFilter}
            onChange={(e) => setSubcategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          >
            <option value="">All Subcategories</option>
            {subcategories.map((sub: any) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
            />
            <span className="flex items-center gap-1">
              <span>Low Stock Alerts</span>
              {lowStockCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-extrabold">
                  {lowStockCount}
                </span>
              )}
            </span>
          </label>
        </div>

        <span className="text-xs font-bold text-slate-500">
          Showing {filteredItems.length} of {barItems.length} items
        </span>
      </div>

      {/* Bar Items Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-3 px-4">Beverage / Consumable</th>
                <th className="py-3 px-3">Subcategory</th>
                <th className="py-3 px-3 text-center">Unit / Packaging</th>
                <th className="py-3 px-3 text-center">Current Stock</th>
                <th className="py-3 px-3 text-center">Thresholds</th>
                <th className="py-3 px-3 text-right">Cost (Rs.)</th>
                <th className="py-3 px-3 text-right">Selling Price</th>
                <th className="py-3 px-3 text-right">Holdings Value</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No bar inventory items match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const current = Number(item.currentStock);
                  const min = Number(item.minStockLevel);
                  const isLow = current <= min;
                  const cost = Number(item.costPerUnit);
                  const price = Number(item.sellingPrice || 0);
                  const val = current * cost;
                  const margin = price > 0 ? Math.round(((price - cost) / price) * 100) : 0;

                  return (
                    <tr key={item.id} className="hover:bg-amber-50/30 transition">
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.sku}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {item.subcategory || 'General'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-slate-700 uppercase">{item.unit}</span>
                        {item.purchaseUnit && item.purchaseUnit !== item.unit && (
                          <span className="text-[10px] text-slate-400 block font-medium">
                            1 {item.purchaseUnit} = {item.conversionFactor} {item.unit}s
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center font-mono">
                        <span
                          className={`inline-flex items-center gap-1 font-black text-sm ${
                            isLow ? 'text-amber-600' : 'text-slate-900'
                          }`}
                        >
                          {current} {item.unit}
                          {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center text-[11px] text-slate-500 font-mono">
                        <div>Min: {min}</div>
                        <div className="text-[10px] text-slate-400">Reorder: {item.reorderLevel}</div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        Rs. {cost.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-3 text-right font-mono">
                        {price > 0 ? (
                          <div>
                            <span className="font-bold text-emerald-700">Rs. {price.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                            <span className="text-[10px] text-emerald-600 block">({margin}% margin)</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Ingredient</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        Rs. {val.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onAdjustItem(item)}
                            title="Quick Stock Adjustment"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditItem(item)}
                            title="Edit Item"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteItem(item.id)}
                            title="Deactivate Item"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
