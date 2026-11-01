'use client';

import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  Calendar,
} from 'lucide-react';

interface StockMovementsTabProps {
  movements: any[];
}

export default function StockMovementsTab({ movements }: StockMovementsTabProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState('');

  const filteredMovements = movements.filter((m) => {
    if (categoryFilter && m.inventoryCategory !== categoryFilter && m.inventoryItem?.mainCategory !== categoryFilter) {
      return false;
    }
    if (movementTypeFilter && m.movementType !== movementTypeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchItem = m.inventoryItem?.name?.toLowerCase().includes(q);
      const matchSku = m.inventoryItem?.sku?.toLowerCase().includes(q);
      const matchRef = m.referenceId?.toLowerCase().includes(q);
      const matchReason = m.reason?.toLowerCase().includes(q);
      if (!matchItem && !matchSku && !matchRef && !matchReason) return false;
    }
    return true;
  });

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'PURCHASE_RECEIPT':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'OPERATIONAL_ISSUANCE':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'RECIPE_DEDUCTION':
      case 'POS_DIRECT_SALE':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'WASTE_SPOILAGE':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'MANUAL_ADJUSTMENT':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Filters */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[220px] flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search item, SKU, reference #, reason..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Categories</option>
            <option value="BAR">Bar Inventory</option>
            <option value="KITCHEN">Kitchen Inventory</option>
            <option value="OPERATIONAL">Operational Inventory</option>
          </select>

          <select
            value={movementTypeFilter}
            onChange={(e) => setMovementTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Transaction Types</option>
            <option value="PURCHASE_RECEIPT">GRN Purchase Receipt</option>
            <option value="OPERATIONAL_ISSUANCE">Operational Department Issue</option>
            <option value="RECIPE_DEDUCTION">POS Order Recipe Deduction</option>
            <option value="WASTE_SPOILAGE">Waste / Spoilage / Damage</option>
            <option value="MANUAL_ADJUSTMENT">Manual Stock Count Correction</option>
          </select>
        </div>

        <span className="text-xs font-bold text-slate-500">
          Showing {filteredMovements.length} audit records
        </span>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-3 px-4">Date &amp; Time</th>
                <th className="py-3 px-3">Inventory Item</th>
                <th className="py-3 px-2">Category</th>
                <th className="py-3 px-3">Transaction Type</th>
                <th className="py-3 px-3">Reference #</th>
                <th className="py-3 px-2 text-right">Qty Delta</th>
                <th className="py-3 px-2 text-right">Previous</th>
                <th className="py-3 px-2 text-right">New Stock</th>
                <th className="py-3 px-4">Audit Reason / Notes</th>
                <th className="py-3 px-3">Authorized By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No stock movement audit records found.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => {
                  const qty = Number(m.quantity);
                  const isPositive = qty > 0;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        <div>{new Date(m.createdAt).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-extrabold text-slate-900 block">{m.inventoryItem?.name || 'Item'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{m.inventoryItem?.sku}</span>
                      </td>

                      <td className="py-3 px-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            m.inventoryCategory === 'BAR'
                              ? 'bg-amber-100 text-amber-800'
                              : m.inventoryCategory === 'OPERATIONAL'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {m.inventoryCategory || m.inventoryItem?.mainCategory || 'Item'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getMovementBadge(
                            m.movementType,
                          )}`}
                        >
                          {m.movementType}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        {m.referenceId || '-'}
                      </td>

                      <td className="py-3 px-2 text-right font-mono font-black">
                        <span
                          className={`inline-flex items-center gap-0.5 ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isPositive ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          <span>{isPositive ? `+${qty}` : qty}</span>
                        </span>
                      </td>

                      <td className="py-3 px-2 text-right font-mono text-slate-400">{m.previousStock ?? '-'}</td>

                      <td className="py-3 px-2 text-right font-mono font-bold text-slate-900">
                        {m.newStock ?? '-'}
                      </td>

                      <td className="py-3 px-4 text-slate-600 truncate max-w-xs">
                        {m.reason || (m.department ? `Department: ${m.department}` : '-')}
                      </td>

                      <td className="py-3 px-3 text-slate-500 font-medium">
                        {m.createdByName || m.createdById || 'SYSTEM'}
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
