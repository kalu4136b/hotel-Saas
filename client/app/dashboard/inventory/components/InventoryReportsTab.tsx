'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Printer,
  Download,
  AlertTriangle,
  Building2,
  Boxes,
  Wine,
  UtensilsCrossed,
  RefreshCw,
} from 'lucide-react';
import { inventoryApi } from '@/lib/api';

export default function InventoryReportsTab() {
  const [activeReport, setActiveReport] = useState<'STOCK' | 'VALUATION' | 'LOW_STOCK' | 'ISSUANCE'>('STOCK');
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const [stockReportData, setStockReportData] = useState<any[]>([]);
  const [valuationData, setValuationData] = useState<any[]>([]);
  const [lowStockData, setLowStockData] = useState<any[]>([]);
  const [issuanceData, setIssuanceData] = useState<any[]>([]);

  const loadReport = async () => {
    setLoading(true);
    try {
      if (activeReport === 'STOCK') {
        const data = await inventoryApi.getStockReport(categoryFilter !== 'ALL' ? categoryFilter : undefined);
        setStockReportData(data || []);
      } else if (activeReport === 'VALUATION') {
        const data = await inventoryApi.getValuationReport();
        setValuationData(data || []);
      } else if (activeReport === 'LOW_STOCK') {
        const data = await inventoryApi.getLowStockReport(categoryFilter !== 'ALL' ? categoryFilter : undefined);
        setLowStockData(data || []);
      } else if (activeReport === 'ISSUANCE') {
        const data = await inventoryApi.getDepartmentIssuanceReport();
        setIssuanceData(data || []);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [activeReport, categoryFilter]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Report Switcher & Actions */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'STOCK', label: '1. Stock Ledger Report' },
            { id: 'VALUATION', label: '2. Inventory Valuation Report' },
            { id: 'LOW_STOCK', label: '3. Low Stock & Reorder Report' },
            { id: 'ISSUANCE', label: '4. Department Consumption Report' },
          ].map((rep) => (
            <button
              key={rep.id}
              onClick={() => setActiveReport(rep.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition ${
                activeReport === rep.id
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {rep.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {(activeReport === 'STOCK' || activeReport === 'LOW_STOCK') && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">All Categories</option>
              <option value="BAR">Bar Inventory</option>
              <option value="KITCHEN">Kitchen Inventory</option>
              <option value="OPERATIONAL">Operational Inventory</option>
            </select>
          )}

          <button
            onClick={loadReport}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Data Views */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        {/* REPORT 1: Stock Ledger Report */}
        {activeReport === 'STOCK' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">Inventory Stock &amp; Valuation Ledger</h3>
              <p className="text-xs text-slate-500">
                Itemized on-hand stock quantities, safety levels, and valuation computed by category
              </p>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-2">Category</th>
                    <th className="py-2.5 px-2 text-center">Unit</th>
                    <th className="py-2.5 px-2 text-center">Current Stock</th>
                    <th className="py-2.5 px-2 text-center">Reorder Point</th>
                    <th className="py-2.5 px-2 text-right">Cost (Rs.)</th>
                    <th className="py-2.5 px-3 text-right">Valuation</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockReportData.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3">
                        <span className="font-extrabold text-slate-900 block">{row.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{row.sku}</span>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-700">
                          {row.mainCategory}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-600">{row.unit}</td>
                      <td className="py-2.5 px-2 text-center font-mono font-black text-slate-900">
                        {row.currentStock}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-500">{row.reorderLevel}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-600">
                        Rs. {Number(row.costPerUnit).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                        Rs. {Number(row.totalValuation).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            row.stockStatus === 'CRITICAL_LOW'
                              ? 'bg-rose-100 text-rose-800'
                              : row.stockStatus === 'REORDER_POINT'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {row.stockStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 2: Inventory Valuation Report */}
        {activeReport === 'VALUATION' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">Category &amp; Subcategory Valuation Breakdown</h3>
              <p className="text-xs text-slate-500">
                Asset valuation distributed by primary inventory categories and storage classifications
              </p>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-4">Primary Category</th>
                    <th className="py-2.5 px-3">Subcategory Classification</th>
                    <th className="py-2.5 px-2 text-center">SKU Count</th>
                    <th className="py-2.5 px-3 text-right">Total Units on Hand</th>
                    <th className="py-2.5 px-4 text-right">Category Holdings Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {valuationData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            row.category === 'BAR'
                              ? 'bg-amber-100 text-amber-800'
                              : row.category === 'OPERATIONAL'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {row.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{row.subcategory}</td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700">{row.itemCount}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">{row.totalQuantity}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-black text-slate-900 text-sm">
                        ${Number(row.valuation).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 3: Low Stock & Reorder Report */}
        {activeReport === 'LOW_STOCK' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">Safety Threshold &amp; Suggested Reorder Alerts</h3>
              <p className="text-xs text-slate-500">
                Items requiring procurement intervention based on reorder thresholds and safety stock limits
              </p>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-2">Category</th>
                    <th className="py-2.5 px-2 text-center">Unit</th>
                    <th className="py-2.5 px-2 text-center">Current Stock</th>
                    <th className="py-2.5 px-2 text-center">Safety Level</th>
                    <th className="py-2.5 px-2 text-center">Reorder Point</th>
                    <th className="py-2.5 px-2 text-center text-emerald-700">Recommended Order</th>
                    <th className="py-2.5 px-3">Default Vendor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStockData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        All items are currently above their reorder thresholds.
                      </td>
                    </tr>
                  ) : (
                    lowStockData.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3">
                          <span className="font-extrabold text-slate-900 block">{row.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{row.sku}</span>
                        </td>
                        <td className="py-2.5 px-2">
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-700">
                            {row.mainCategory}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-600">{row.unit}</td>
                        <td className="py-2.5 px-2 text-center font-mono font-black text-rose-600">
                          {row.currentStock}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-slate-500">{row.minStockLevel}</td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-amber-600">
                          {row.reorderLevel}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-black text-emerald-700">
                          +{row.suggestedReorderQuantity} {row.purchaseUnit || row.unit}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-medium">
                          {row.supplier?.name || 'Unassigned'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 4: Operational Department Consumption Report */}
        {activeReport === 'ISSUANCE' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">Department Operational Stock Consumption</h3>
              <p className="text-xs text-slate-500">
                Distribution of internal operational supplies and equipment expenses across hotel divisions
              </p>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-4">Department</th>
                    <th className="py-2.5 px-3 text-center">Issuance Requisitions</th>
                    <th className="py-2.5 px-3 text-right">Total Units Dispatched</th>
                    <th className="py-2.5 px-4 text-right">Total Consumed Cost (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {issuanceData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No operational stock issuances recorded yet.
                      </td>
                    </tr>
                  ) : (
                    issuanceData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-black text-indigo-950 uppercase tracking-wide">
                          {row.department}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                          {row.issuanceCount}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">{row.totalUnitsIssued}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-black text-indigo-900 text-sm">
                          Rs. {Number(row.totalCost).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
