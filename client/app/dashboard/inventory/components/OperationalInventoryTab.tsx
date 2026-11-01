'use client';

import React, { useState } from 'react';
import {
  Building2,
  Search,
  Plus,
  Send,
  SlidersHorizontal,
  Pencil,
  Trash2,
  AlertTriangle,
  Monitor,
  Package,
  Tag,
} from 'lucide-react';

interface OperationalInventoryTabProps {
  items: any[];
  onOpenAddItem: () => void;
  onEditItem: (item: any) => void;
  onAdjustItem: (item: any) => void;
  onDeleteItem: (id: string) => void;
  onOpenCreateIssuance: () => void;
}

export default function OperationalInventoryTab({
  items,
  onOpenAddItem,
  onEditItem,
  onAdjustItem,
  onDeleteItem,
  onOpenCreateIssuance,
}: OperationalInventoryTabProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CONSUMABLE' | 'REUSABLE_EQUIPMENT'>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('');

  const opItems = items.filter((i) => i.mainCategory === 'OPERATIONAL');

  const departments = Array.from(
    new Set(opItems.map((i) => i.assignedDepartment).filter(Boolean)),
  );

  const filteredItems = opItems.filter((item) => {
    if (typeFilter !== 'ALL' && item.itemType !== typeFilter) return false;
    if (departmentFilter && item.assignedDepartment !== departmentFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = item.name?.toLowerCase().includes(q);
      const matchSku = item.sku?.toLowerCase().includes(q);
      const matchTag = item.assetTag?.toLowerCase().includes(q);
      const matchSub = item.subcategory?.toLowerCase().includes(q);
      if (!matchName && !matchSku && !matchTag && !matchSub) return false;
    }
    return true;
  });

  const totalHoldingValue = opItems.reduce(
    (sum, i) => sum + Number(i.currentStock || 0) * Number(i.costPerUnit || 0),
    0,
  );
  const equipmentCount = opItems.filter((i) => i.itemType === 'REUSABLE_EQUIPMENT').length;
  const consumableCount = opItems.filter((i) => i.itemType !== 'REUSABLE_EQUIPMENT').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-3xl bg-linear-to-r from-slate-900 via-indigo-950 to-indigo-900 p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-300 mb-2 border border-white/10">
            <Building2 className="w-3.5 h-3.5" />
            <span>Internal Property Operations</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black">Operational Inventory &amp; Assets</h2>
          <p className="text-indigo-200 text-xs sm:text-sm mt-1 max-w-xl">
            Internal operational supplies, thermal bill rolls, cleaning chemicals, hardware, and reusable equipment with
            department assignment. (Non-selling inventory).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 shrink-0 font-mono">
          <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-right">
            <span className="text-[10px] uppercase text-indigo-300 block font-bold">Total Operations Value</span>
            <span className="text-xl sm:text-2xl font-black text-white">
              Rs. {totalHoldingValue.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenCreateIssuance}
              className="px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg transition flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Issue Stock to Department</span>
            </button>
            <button
              onClick={onOpenAddItem}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/10 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Supply / Asset</span>
            </button>
          </div>
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
              placeholder="Search bill rolls, disinfectant, vacuum, asset tag..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition ${
                typeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Items ({opItems.length})
            </button>
            <button
              onClick={() => setTypeFilter('CONSUMABLE')}
              className={`px-3 py-1.5 rounded-lg transition ${
                typeFilter === 'CONSUMABLE' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Consumables ({consumableCount})
            </button>
            <button
              onClick={() => setTypeFilter('REUSABLE_EQUIPMENT')}
              className={`px-3 py-1.5 rounded-lg transition ${
                typeFilter === 'REUSABLE_EQUIPMENT'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Reusable Equipment ({equipmentCount})
            </button>
          </div>

          {departments.length > 0 && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Departments</option>
              {departments.map((d: any) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
        </div>

        <span className="text-xs font-bold text-slate-500">
          Showing {filteredItems.length} of {opItems.length} items
        </span>
      </div>

      {/* Operational Items Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-3 px-4">Supply / Asset Item</th>
                <th className="py-3 px-3">Classification</th>
                <th className="py-3 px-3">Subcategory</th>
                <th className="py-3 px-3 text-center">Unit / Packaging</th>
                <th className="py-3 px-3 text-center">Stock Balance</th>
                <th className="py-3 px-3 text-center">Thresholds</th>
                <th className="py-3 px-3 text-right">Unit Cost</th>
                <th className="py-3 px-3 text-right">Holdings Value</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No operational supplies match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const current = Number(item.currentStock);
                  const min = Number(item.minStockLevel);
                  const isLow = current <= min;
                  const cost = Number(item.costPerUnit);
                  const val = current * cost;
                  const isEquipment = item.itemType === 'REUSABLE_EQUIPMENT';

                  return (
                    <tr key={item.id} className="hover:bg-indigo-50/20 transition">
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                          <span>{item.sku}</span>
                          {item.assetTag && (
                            <span className="px-1.5 py-0.2 rounded font-bold bg-purple-100 text-purple-900 flex items-center gap-1">
                              <Tag className="w-2.5 h-2.5" />
                              <span>{item.assetTag}</span>
                            </span>
                          )}
                          {item.assignedDepartment && (
                            <span className="text-slate-500 font-semibold">
                              Assigned to: {item.assignedDepartment}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {isEquipment ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200 inline-flex items-center gap-1">
                            <Monitor className="w-2.5 h-2.5" />
                            <span>Reusable Equipment</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 inline-flex items-center gap-1">
                            <Package className="w-2.5 h-2.5" />
                            <span>Consumable Supply</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-slate-700 font-medium">{item.subcategory || 'General'}</span>
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
                            isLow ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {current} {item.unit}
                          {isLow && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center text-[11px] text-slate-500 font-mono">
                        <div>Min: {min}</div>
                        <div className="text-[10px] text-slate-400">Reorder: {item.reorderLevel}</div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        Rs. {cost.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
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
