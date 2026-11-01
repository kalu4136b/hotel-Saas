'use client';

import React from 'react';
import {
  Boxes,
  Wine,
  UtensilsCrossed,
  Building2,
  Truck,
  PackageCheck,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Plus,
  Send,
  SlidersHorizontal,
} from 'lucide-react';

interface InventoryOverviewTabProps {
  stats: {
    totalItems: number;
    totalValuation: number;
    barStockValue: number;
    kitchenStockValue: number;
    operationalStockValue: number;
    lowStockCount: number;
    pendingPOsCount: number;
    pendingGRNsCount: number;
  };
  onNavigateTab: (tab: any) => void;
  onOpenAddItem: () => void;
  onOpenCreatePo: () => void;
  onOpenCreateGrn: () => void;
  onOpenCreateIssuance: () => void;
  recentMovements: any[];
}

export default function InventoryOverviewTab({
  stats,
  onNavigateTab,
  onOpenAddItem,
  onOpenCreatePo,
  onOpenCreateGrn,
  onOpenCreateIssuance,
  recentMovements,
}: InventoryOverviewTabProps) {
  const barPercent = stats.totalValuation > 0 ? Math.round((stats.barStockValue / stats.totalValuation) * 100) : 0;
  const kitchenPercent = stats.totalValuation > 0 ? Math.round((stats.kitchenStockValue / stats.totalValuation) * 100) : 0;
  const opPercent = stats.totalValuation > 0 ? Math.max(0, 100 - barPercent - kitchenPercent) : 0;

  return (
    <div className="space-y-6">
      {/* 7 KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Valuation */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs relative overflow-hidden group hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Stock Valuation</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-900">
            Rs. {stats.totalValuation.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
            <span>{stats.totalItems} Active Stock SKUs</span>
            <span className="font-bold text-teal-600">All 3 Categories</span>
          </div>
        </div>

        {/* Bar Stock Value */}
        <div
          onClick={() => onNavigateTab('BAR')}
          className="bg-white rounded-3xl border border-amber-200/80 p-5 shadow-xs relative overflow-hidden cursor-pointer hover:border-amber-400 hover:shadow-md transition group"
        >
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold uppercase tracking-wider">Bar Inventory</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition">
              <Wine className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-amber-950">
            Rs. {stats.barStockValue.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Liquors, Beers &amp; Mixers</span>
            <span className="font-bold text-amber-600 flex items-center gap-1">
              <span>{barPercent}%</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Kitchen Stock Value */}
        <div
          onClick={() => onNavigateTab('KITCHEN')}
          className="bg-white rounded-3xl border border-emerald-200/80 p-5 shadow-xs relative overflow-hidden cursor-pointer hover:border-emerald-400 hover:shadow-md transition group"
        >
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-bold uppercase tracking-wider">Kitchen Inventory</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-950">
            Rs. {stats.kitchenStockValue.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Produce, Meats, Dairy &amp; Dry</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <span>{kitchenPercent}%</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Operational Stock Value */}
        <div
          onClick={() => onNavigateTab('OPERATIONAL')}
          className="bg-white rounded-3xl border border-indigo-200/80 p-5 shadow-xs relative overflow-hidden cursor-pointer hover:border-indigo-400 hover:shadow-md transition group"
        >
          <div className="flex items-center justify-between text-indigo-700">
            <span className="text-xs font-bold uppercase tracking-wider">Operational Inventory</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-indigo-950">
            Rs. {stats.operationalStockValue.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Supplies &amp; Equipment Assets</span>
            <span className="font-bold text-indigo-600 flex items-center gap-1">
              <span>{opPercent}%</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Operational Alerts Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pending POs */}
        <div
          onClick={() => onNavigateTab('PURCHASE_ORDERS')}
          className="bg-sky-50/60 rounded-2xl border border-sky-100 p-4 cursor-pointer hover:bg-sky-50 transition flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500 text-white shadow-xs">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-sky-950">Pending Purchase Orders</span>
              <div className="text-lg font-black font-mono text-sky-700">
                {stats.pendingPOsCount} Orders Open
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-sky-400" />
        </div>

        {/* Pending GRNs */}
        <div
          onClick={() => onNavigateTab('GRN')}
          className="bg-emerald-50/60 rounded-2xl border border-emerald-100 p-4 cursor-pointer hover:bg-emerald-50 transition flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-xs">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-950">Awaiting GRN Receiving</span>
              <div className="text-lg font-black font-mono text-emerald-700">
                {stats.pendingGRNsCount} Shipments Ready
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-emerald-400" />
        </div>

        {/* Low Stock Alerts */}
        <div
          onClick={() => onNavigateTab('REPORTS')}
          className={`rounded-2xl border p-4 cursor-pointer transition flex items-center justify-between ${
            stats.lowStockCount > 0
              ? 'bg-amber-50/80 border-amber-200 hover:bg-amber-100/70'
              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl shadow-xs ${
                stats.lowStockCount > 0 ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-300 text-slate-700'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900">Low Stock Warnings</span>
              <div
                className={`text-lg font-black font-mono ${
                  stats.lowStockCount > 0 ? 'text-amber-700' : 'text-slate-600'
                }`}
              >
                {stats.lowStockCount} Items Below Safety Level
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Fast Action Launchpad & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fast Action Launchpad */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">
            Executive Quick Actions
          </span>

          <div className="space-y-2.5">
            <button
              onClick={onOpenAddItem}
              className="w-full p-3.5 rounded-2xl bg-teal-50 hover:bg-teal-100/80 text-teal-900 text-xs font-bold transition flex items-center justify-between border border-teal-200/60"
            >
              <div className="flex items-center gap-2.5">
                <Plus className="w-4 h-4 text-teal-600" />
                <span>Create New Stock SKU</span>
              </div>
              <span className="text-[10px] text-teal-600 uppercase font-extrabold bg-white px-2 py-0.5 rounded-md">
                + Item
              </span>
            </button>

            <button
              onClick={onOpenCreatePo}
              className="w-full p-3.5 rounded-2xl bg-sky-50 hover:bg-sky-100/80 text-sky-900 text-xs font-bold transition flex items-center justify-between border border-sky-200/60"
            >
              <div className="flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-sky-600" />
                <span>Create Purchase Order (PO)</span>
              </div>
              <span className="text-[10px] text-sky-600 uppercase font-extrabold bg-white px-2 py-0.5 rounded-md">
                Procure
              </span>
            </button>

            <button
              onClick={onOpenCreateGrn}
              className="w-full p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 text-emerald-900 text-xs font-bold transition flex items-center justify-between border border-emerald-200/60"
            >
              <div className="flex items-center gap-2.5">
                <PackageCheck className="w-4 h-4 text-emerald-600" />
                <span>Receive Goods (Create GRN)</span>
              </div>
              <span className="text-[10px] text-emerald-600 uppercase font-extrabold bg-white px-2 py-0.5 rounded-md">
                Stock-In
              </span>
            </button>

            <button
              onClick={onOpenCreateIssuance}
              className="w-full p-3.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100/80 text-indigo-900 text-xs font-bold transition flex items-center justify-between border border-indigo-200/60"
            >
              <div className="flex items-center gap-2.5">
                <Send className="w-4 h-4 text-indigo-600" />
                <span>Issue Operational Stock</span>
              </div>
              <span className="text-[10px] text-indigo-600 uppercase font-extrabold bg-white px-2 py-0.5 rounded-md">
                Transfer
              </span>
            </button>
          </div>
        </div>

        {/* Category Breakdown & Progress meters */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Valuation Balance Breakdown
              </span>
              <span className="text-xs font-black font-mono text-slate-800">
                Rs. {stats.totalValuation.toLocaleString('en-LK', { minimumFractionDigits: 2 })} Total
              </span>
            </div>

            {/* Segmented bar */}
            <div className="h-4 rounded-full bg-slate-100 flex overflow-hidden mt-4 shadow-inner">
              <div style={{ width: `${barPercent}%` }} className="bg-amber-500 transition-all" title="Bar" />
              <div style={{ width: `${kitchenPercent}%` }} className="bg-emerald-500 transition-all" title="Kitchen" />
              <div style={{ width: `${opPercent}%` }} className="bg-indigo-500 transition-all" title="Operational" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div
                onClick={() => onNavigateTab('BAR')}
                className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 cursor-pointer hover:border-amber-300 transition"
              >
                <div className="flex items-center gap-2 text-amber-700 font-bold text-xs mb-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Bar Inventory</span>
                </div>
                <div className="text-lg font-black font-mono text-slate-900">
                  ${stats.barStockValue.toFixed(2)}
                </div>
                <span className="text-[11px] text-slate-500">{barPercent}% of total holdings</span>
              </div>

              <div
                onClick={() => onNavigateTab('KITCHEN')}
                className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 cursor-pointer hover:border-emerald-300 transition"
              >
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs mb-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Kitchen Inventory</span>
                </div>
                <div className="text-lg font-black font-mono text-slate-900">
                  ${stats.kitchenStockValue.toFixed(2)}
                </div>
                <span className="text-[11px] text-slate-500">{kitchenPercent}% of total holdings</span>
              </div>

              <div
                onClick={() => onNavigateTab('OPERATIONAL')}
                className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 cursor-pointer hover:border-indigo-300 transition"
              >
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs mb-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span>Operational Inventory</span>
                </div>
                <div className="text-lg font-black font-mono text-slate-900">
                  ${stats.operationalStockValue.toFixed(2)}
                </div>
                <span className="text-[11px] text-slate-500">{opPercent}% of total holdings</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Real-time valuations update automatically upon GRN receiving and department issuances.</span>
            <button
              onClick={() => onNavigateTab('REPORTS')}
              className="text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1"
            >
              <span>View Full Reports</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Movements Activity Mini-Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Recent Stock Activity</h3>
            <p className="text-xs text-slate-500">Latest receipts, POS deductions, and operational transfers</p>
          </div>
          <button
            onClick={() => onNavigateTab('MOVEMENTS')}
            className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            <span>View Full Audit Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Item</th>
                <th className="py-2.5 px-2">Category</th>
                <th className="py-2.5 px-3">Movement Type</th>
                <th className="py-2.5 px-2 text-right">Qty Delta</th>
                <th className="py-2.5 px-3 text-right">New Stock</th>
                <th className="py-2.5 px-3">Reference / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentMovements.slice(0, 6).map((m: any) => {
                const isPositive = Number(m.quantity) > 0;
                return (
                  <tr key={m.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                      {new Date(m.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{m.inventoryItem?.name || 'Stock Item'}</td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          m.inventoryCategory === 'BAR'
                            ? 'bg-amber-100 text-amber-800'
                            : m.inventoryCategory === 'OPERATIONAL'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {m.inventoryCategory || 'Stock'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-700">{m.movementType}</span>
                    </td>
                    <td className={`py-2.5 px-2 text-right font-mono font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isPositive ? `+${m.quantity}` : m.quantity}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {m.newStock}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">{m.reason || m.referenceId || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
