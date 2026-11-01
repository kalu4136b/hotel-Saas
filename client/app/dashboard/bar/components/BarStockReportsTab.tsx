'use client';

import React, { useState, useEffect } from 'react';
import { barApi } from '@/lib/api';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Layers,
  Droplets,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Flame,
  ArrowUpRight,
  ShieldAlert,
  Wine,
  RefreshCw,
} from 'lucide-react';

interface BarStockReportsTabProps {
  categories: string[];
}

export default function BarStockReportsTab({ categories }: BarStockReportsTabProps) {
  const [subTab, setSubTab] = useState<'VALUATION' | 'RUNWAY' | 'SHRINKAGE' | 'REQUISITION'>('VALUATION');
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [runwayDays, setRunwayDays] = useState(30);

  // Data states
  const [valuationData, setValuationData] = useState<any>(null);
  const [runwayData, setRunwayData] = useState<any>(null);
  const [shrinkageData, setShrinkageData] = useState<any>(null);

  useEffect(() => {
    loadReportData();
  }, [subTab, selectedCategory, runwayDays]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      if (subTab === 'VALUATION' || subTab === 'REQUISITION') {
        const data = await barApi.getValuationReport({
          category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        });
        setValuationData(data);
      } else if (subTab === 'RUNWAY') {
        const data = await barApi.getRunwayReport({ daysPeriod: runwayDays });
        setRunwayData(data);
      } else if (subTab === 'SHRINKAGE') {
        const data = await barApi.getShrinkageReport();
        setShrinkageData(data);
      }
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
    }
  };

  // CSV Exporter
  const exportValuationCSV = () => {
    if (!valuationData?.items) return;
    const headers = [
      'Liquor Name',
      'Category',
      'Brand',
      'Sealed Bottles',
      'Open Bottle ml',
      'Total Liters',
      'Cost Per Bottle',
      'Total Cost Value',
      'Price Per Pour',
      'Potential Retail Value',
      'Potential Profit',
      'Margin %',
      'Low Stock',
    ];

    const rows = valuationData.items.map((i: any) => [
      `"${i.name}"`,
      i.category,
      `"${i.brand || ''}"`,
      i.fullBottlesStock,
      i.currentBottleRemainingMl,
      i.totalLiters,
      i.costPerBottle,
      i.totalCostValue,
      i.pricePerPour,
      i.potentialRetailValue,
      i.potentialGrossProfit,
      `${i.marginPercent}%`,
      i.isLowStock ? 'YES' : 'NO',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bar_stock_valuation_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportRequisitionCSV = () => {
    if (!valuationData?.items) return;
    const lowStockItems = valuationData.items.filter((i: any) => i.isLowStock);
    const headers = [
      'Liquor Name',
      'Category',
      'Brand',
      'Current Full Bottles',
      'Par Level Bottles',
      'Suggested Order Quantity',
      'Cost Per Bottle',
      'Estimated Reorder Cost',
    ];

    const rows = lowStockItems.map((i: any) => [
      `"${i.name}"`,
      i.category,
      `"${i.brand || ''}"`,
      i.fullBottlesStock,
      i.parLevelBottles,
      i.reorderSuggestedBottles,
      i.costPerBottle,
      i.reorderCost,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bar_replenishment_requisition_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printRequisitionSheet = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Sub-Navigation & Header Controls */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Navigation Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubTab('VALUATION')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              subTab === 'VALUATION'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Stock Asset Valuation</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('RUNWAY')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              subTab === 'RUNWAY'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Depletion Velocity & Runway</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('SHRINKAGE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              subTab === 'SHRINKAGE'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Shrinkage & Loss Audit</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('REQUISITION')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              subTab === 'REQUISITION'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
            <span>Par Reorder Sheet</span>
          </button>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-2">
          {subTab === 'VALUATION' && (
            <button
              type="button"
              onClick={exportValuationCSV}
              disabled={loading || !valuationData?.items?.length}
              className="py-2 px-3 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#0F172A] text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Export CSV</span>
            </button>
          )}

          {subTab === 'REQUISITION' && (
            <>
              <button
                type="button"
                onClick={exportRequisitionCSV}
                className="py-2 px-3 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#0F172A] text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={printRequisitionSheet}
                className="py-2 px-3 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Sheet</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={loadReportData}
            disabled={loading}
            className="p-2 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] transition"
            title="Refresh Report"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. STOCK ASSET VALUATION REPORT                                 */}
      {/* ============================================================== */}
      {subTab === 'VALUATION' && (
        <div className="space-y-6">
          {/* Executive KPI Valuation Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-white to-[#F8FAFC] border border-[#E2E8F0] shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-[#64748B]">Total Asset Cost Value</span>
                <DollarSign className="w-4 h-4 text-[#3B82F6]" />
              </div>
              <div className="text-2xl font-bold text-[#0F172A]">
                Rs. {valuationData?.summary?.totalInventoryCostValue ? Number(valuationData.summary.totalInventoryCostValue).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              </div>
              <div className="text-[10px] text-[#64748B] mt-1 flex items-center gap-2">
                <span>Cellar: Rs. {valuationData?.summary?.totalCellarCostValue ? Number(valuationData.summary.totalCellarCostValue).toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}</span>
                <span>•</span>
                <span>Open: Rs. {valuationData?.summary?.totalOpenCostValue ? Number(valuationData.summary.totalOpenCostValue).toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-white to-[#F0FDF4] border border-[#DCFCE7] shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-[#16A34A]">Potential Retail Revenue</span>
                <TrendingUp className="w-4 h-4 text-[#16A34A]" />
              </div>
              <div className="text-2xl font-bold text-[#15803D]">
                Rs. {valuationData?.summary?.totalPotentialRetailValue ? Number(valuationData.summary.totalPotentialRetailValue).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              </div>
              <div className="text-[10px] text-[#166534] mt-1">
                From ~{valuationData?.summary?.totalLitersOnHand || 0} Liters on hand
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-white to-[#FAF5FF] border border-[#F3E8FF] shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-[#7E22CE]">Potential Gross Profit</span>
                <Sparkles className="w-4 h-4 text-[#A855F7]" />
              </div>
              <div className="text-2xl font-bold text-[#6B21A8]">
                Rs. {valuationData?.summary?.totalPotentialGrossProfit ? Number(valuationData.summary.totalPotentialGrossProfit).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              </div>
              <div className="text-[10px] font-bold text-[#7E22CE] mt-1">
                {valuationData?.summary?.overallMarginPercent || 0}% Gross Margin
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-white to-[#FFFBEB] border border-[#FEF3C7] shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-[#D97706]">Physical Stock In Bar</span>
                <Layers className="w-4 h-4 text-[#D97706]" />
              </div>
              <div className="text-2xl font-bold text-[#B45309]">
                {valuationData?.summary?.totalFullBottles || 0} <span className="text-sm font-normal text-[#92400E]">Bottles</span>
              </div>
              <div className="text-[10px] text-[#92400E] mt-1">
                {valuationData?.summary?.lowStockCount || 0} labels below par level
              </div>
            </div>
          </div>

          {/* Category Asset Distribution */}
          {valuationData?.categoryBreakdown?.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-3">
                Asset Allocation by Spirit Category
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {valuationData.categoryBreakdown.map((c: any) => (
                  <div key={c.category} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9]">
                    <div className="text-[11px] font-bold text-[#0F172A]">{c.category}</div>
                    <div className="text-base font-bold text-[#D97706] mt-0.5">Rs. {Number(c.costValue).toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                    <div className="text-[10px] text-[#64748B] mt-1 flex items-center justify-between">
                      <span>{c.bottles} btls</span>
                      <span>{c.liters} L</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    selectedCategory === cat
                      ? 'bg-[#D97706] text-white shadow-xs'
                      : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search liquor label..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white text-xs text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
              />
            </div>
          </div>

          {/* Detailed Valuation Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold">
                    <th className="py-3 px-4">Beverage Label</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3 text-right">Sealed Stock</th>
                    <th className="py-3 px-3 text-right">Open Rail ml</th>
                    <th className="py-3 px-3 text-right">Total Liters</th>
                    <th className="py-3 px-3 text-right">Unit Cost</th>
                    <th className="py-3 px-3 text-right">Asset Cost</th>
                    <th className="py-3 px-3 text-right">Pour Retail</th>
                    <th className="py-3 px-3 text-right">Potential Retail</th>
                    <th className="py-3 px-4 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-[#64748B]">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#D97706]" />
                        Calculating asset balances...
                      </td>
                    </tr>
                  ) : !valuationData?.items?.length ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-[#64748B]">
                        No liquor items found for valuation.
                      </td>
                    </tr>
                  ) : (
                    valuationData.items
                      .filter((item: any) =>
                        searchQuery.trim()
                          ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.brand && item.brand.toLowerCase().includes(searchQuery.toLowerCase()))
                          : true
                      )
                      .map((item: any) => (
                        <tr key={item.id} className="hover:bg-[#F8FAFC] transition">
                          <td className="py-3 px-4 font-bold text-[#0F172A]">
                            <div className="flex items-center gap-2">
                              <span>{item.name}</span>
                              {item.isLowStock && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FEF3C7] text-[#92400E]">
                                  LOW
                                </span>
                              )}
                            </div>
                            {item.brand && <div className="text-[10px] text-[#64748B] font-normal">{item.brand}</div>}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-[#F1F5F9] text-[#475569]">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-[#0F172A]">
                            {item.fullBottlesStock} btls
                          </td>
                          <td className="py-3 px-3 text-right text-[#3B82F6] font-medium">
                            {item.currentBottleRemainingMl} ml
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-[#0F172A]">
                            {item.totalLiters} L
                          </td>
                          <td className="py-3 px-3 text-right text-[#64748B]">
                            Rs. {Number(item.costPerBottle).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-[#0F172A]">
                            Rs. {Number(item.totalCostValue).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-right text-[#059669]">
                            Rs. {Number(item.pricePerPour).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-[#16A34A]">
                            Rs. {Number(item.potentialRetailValue).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.marginPercent >= 70
                                  ? 'bg-[#DCFCE7] text-[#15803D]'
                                  : item.marginPercent >= 50
                                  ? 'bg-[#FEF3C7] text-[#B45309]'
                                  : 'bg-[#FEE2E2] text-[#B91C1C]'
                              }`}
                            >
                              {item.marginPercent}%
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. DEPLETION VELOCITY & RUNWAY REPORT                           */}
      {/* ============================================================== */}
      {subTab === 'RUNWAY' && (
        <div className="space-y-6">
          {/* Controls: Runway Days Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#64748B]">Consumption Sample Period:</span>
              {[7, 14, 30, 60].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setRunwayDays(days)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    runwayDays === days
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'
                  }`}
                >
                  Last {days} Days
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-[#DC2626]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span>
                <span>Critical (&lt; 3 days)</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#D97706]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
                <span>Warning (3–7 days)</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#16A34A]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
                <span>Healthy (&gt; 7 days)</span>
              </div>
            </div>
          </div>

          {/* Runway Cards Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold">
                    <th className="py-3 px-4">Beverage Label</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3 text-right">Stock On Hand</th>
                    <th className="py-3 px-3 text-right">Period Pours</th>
                    <th className="py-3 px-3 text-right">Daily Burn Rate</th>
                    <th className="py-3 px-3 text-right">Days Runway</th>
                    <th className="py-3 px-3 text-center">Health Status</th>
                    <th className="py-3 px-4 text-right">Reorder Needed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#64748B]">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#D97706]" />
                        Analyzing depletion velocity...
                      </td>
                    </tr>
                  ) : !runwayData?.items?.length ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#64748B]">
                        No consumption data available.
                      </td>
                    </tr>
                  ) : (
                    runwayData.items.map((item: any) => (
                      <tr key={item.id} className="hover:bg-[#F8FAFC] transition">
                        <td className="py-3 px-4 font-bold text-[#0F172A]">
                          <div>{item.name}</div>
                          {item.brand && <div className="text-[10px] text-[#64748B] font-normal">{item.brand}</div>}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-[#F1F5F9] text-[#475569]">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="font-bold text-[#0F172A]">{item.totalLiters} L</div>
                          <div className="text-[10px] text-[#64748B]">{item.fullBottlesStock} sealed btls</div>
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-[#0F172A]">
                          <div>{item.totalPouredInPeriodMl} ml</div>
                          <div className="text-[10px] text-[#64748B]">{item.servingsInPeriod} servings</div>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[#D97706]">
                          <div>{item.dailyBurnRateMl} ml / day</div>
                          <div className="text-[10px] text-[#64748B]">~{item.dailyBurnBottles} btl/day</div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {item.daysRemaining !== null ? (
                            <div className="text-base font-extrabold text-[#0F172A]">
                              {item.daysRemaining} <span className="text-[10px] font-normal text-[#64748B]">days</span>
                            </div>
                          ) : (
                            <div className="text-xs text-[#94A3B8] italic">No active pours</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.runwayStatus === 'CRITICAL' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FEE2E2] text-[#B91C1C]">
                              <AlertTriangle className="w-3 h-3" />
                              CRITICAL
                            </span>
                          )}
                          {item.runwayStatus === 'LOW' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#B45309]">
                              <Clock className="w-3 h-3" />
                              LOW RUNWAY
                            </span>
                          )}
                          {item.runwayStatus === 'HEALTHY' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#15803D]">
                              <CheckCircle2 className="w-3 h-3" />
                              HEALTHY
                            </span>
                          )}
                          {item.runwayStatus === 'DORMANT' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#F1F5F9] text-[#64748B]">
                              DORMANT
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {item.reorderRecommendation > 0 ? (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E]">
                              +{item.reorderRecommendation} Bottles
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#94A3B8] font-medium">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. SHRINKAGE & LOSS REPORT                                      */}
      {/* ============================================================== */}
      {subTab === 'SHRINKAGE' && (
        <div className="space-y-6">
          {/* Executive Shrinkage Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-white to-[#FEF2F2] border border-[#FEE2E2] shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-[#DC2626]">Total Shrinkage Loss</span>
                <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
              </div>
              <div className="text-2xl font-bold text-[#B91C1C]">
                Rs. {shrinkageData?.summary?.totalShrinkageCost ? Number(shrinkageData.summary.totalShrinkageCost).toLocaleString('en-LK', { minimumFractionDigits: 2 }) : '0.00'}
              </div>
              <div className="text-[10px] text-[#991B1B] mt-1">
                {shrinkageData?.summary?.totalShrinkageLiters || 0} Liters unaccounted/lost
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-[#64748B]">Spillage & Bar Waste</span>
                <Droplets className="w-4 h-4 text-[#D97706]" />
              </div>
              <div className="text-2xl font-bold text-[#0F172A]">
                Rs. {shrinkageData?.summary?.spillageCost ? Number(shrinkageData.summary.spillageCost).toLocaleString('en-LK', { minimumFractionDigits: 2 }) : '0.00'}
              </div>
              <div className="text-[10px] text-[#64748B] mt-1">
                {shrinkageData?.summary?.spillageMl || 0} ml spilled during service
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-[#64748B]">Breakage Incidents</span>
                <XCircle className="w-4 h-4 text-[#EF4444]" />
              </div>
              <div className="text-2xl font-bold text-[#0F172A]">
                Rs. {shrinkageData?.summary?.breakageCost ? Number(shrinkageData.summary.breakageCost).toLocaleString('en-LK', { minimumFractionDigits: 2 }) : '0.00'}
              </div>
              <div className="text-[10px] text-[#64748B] mt-1">
                {shrinkageData?.summary?.breakageMl || 0} ml dropped / shattered
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-[#64748B]">Audit Count Discrepancies</span>
                <AlertTriangle className="w-4 h-4 text-[#8B5CF6]" />
              </div>
              <div className="text-2xl font-bold text-[#0F172A]">
                Rs. {shrinkageData?.summary?.auditShortageCost ? Number(shrinkageData.summary.auditShortageCost).toLocaleString('en-LK', { minimumFractionDigits: 2 }) : '0.00'}
              </div>
              <div className="text-[10px] text-[#64748B] mt-1">
                {shrinkageData?.summary?.auditShortageMl || 0} ml stocktake variance
              </div>
            </div>
          </div>

          {/* Loss Incidents Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                Loss & Shrinkage Incident Audit Log ({shrinkageData?.incidents?.length || 0})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-3">Beverage Label</th>
                    <th className="py-3 px-3">Incident Category</th>
                    <th className="py-3 px-3 text-right">Volume Lost</th>
                    <th className="py-3 px-3 text-right">Cost Impact</th>
                    <th className="py-3 px-3">Staff / Performer</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#64748B]">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#D97706]" />
                        Loading incident records...
                      </td>
                    </tr>
                  ) : !shrinkageData?.incidents?.length ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#64748B]">
                        No shrinkage incidents recorded. Excellent inventory control!
                      </td>
                    </tr>
                  ) : (
                    shrinkageData.incidents.map((inc: any) => (
                      <tr key={inc.id} className="hover:bg-[#F8FAFC] transition">
                        <td className="py-3 px-4 font-mono text-[11px] text-[#64748B]">
                          {new Date(inc.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-bold text-[#0F172A]">
                          {inc.itemName}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                              inc.type === 'BREAKAGE'
                                ? 'bg-[#FEE2E2] text-[#B91C1C]'
                                : inc.type === 'EXPIRY_SPOILAGE'
                                ? 'bg-[#FEF3C7] text-[#B45309]'
                                : inc.type === 'PHYSICAL_AUDIT'
                                ? 'bg-[#EDE9FE] text-[#6D28D9]'
                                : 'bg-[#F1F5F9] text-[#475569]'
                            }`}
                          >
                            {inc.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[#DC2626]">
                          -{inc.volumeMl} ml
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-[#B91C1C]">
                          -Rs. {Number(inc.costImpact).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 font-medium text-[#0F172A]">
                          {inc.responsiblePerson || 'Bartender'}
                        </td>
                        <td className="py-3 px-4 text-[#64748B]">
                          {inc.reason}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. PAR REORDER REQUISITION SHEET                                */}
      {/* ============================================================== */}
      {subTab === 'REQUISITION' && (
        <div className="space-y-6">
          {/* Header Summary */}
          <div className="bg-gradient-to-r from-[#FFFBEB] to-[#FEF3C7] rounded-2xl border border-[#FDE68A] p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#D97706]" />
                <h3 className="text-base font-bold text-[#92400E]">
                  Beverage Replenishment & Purchase Requisition
                </h3>
              </div>
              <p className="text-xs text-[#B45309] mt-1">
                Showing all liquors currently at or below par level. Quantities are calculated to replenish cellar stock to 150% par buffer.
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-[#92400E]">Total Capital Required</div>
              <div className="text-2xl font-black text-[#92400E]">
                Rs. {valuationData?.summary?.totalReorderEstimatedCost ? Number(valuationData.summary.totalReorderEstimatedCost).toLocaleString('en-LK', { minimumFractionDigits: 2 }) : '0.00'}
              </div>
            </div>
          </div>

          {/* Requisition Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold">
                    <th className="py-3 px-4">Beverage Label</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3 text-right">On-Hand Stock</th>
                    <th className="py-3 px-3 text-right">Par Level</th>
                    <th className="py-3 px-3 text-right">Deficit</th>
                    <th className="py-3 px-3 text-right">Reorder Qty</th>
                    <th className="py-3 px-3 text-right">Est. Unit Cost</th>
                    <th className="py-3 px-4 text-right">Total Est. Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#64748B]">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#D97706]" />
                        Compiling replenishment sheet...
                      </td>
                    </tr>
                  ) : !valuationData?.items?.filter((i: any) => i.isLowStock).length ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#16A34A] font-bold">
                        <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-[#10B981]" />
                        All bar liquors are above par levels! No replenishment needed at this time.
                      </td>
                    </tr>
                  ) : (
                    valuationData.items
                      .filter((i: any) => i.isLowStock)
                      .map((item: any) => (
                        <tr key={item.id} className="hover:bg-[#FFFBEB] transition">
                          <td className="py-3 px-4 font-bold text-[#0F172A]">
                            <div>{item.name}</div>
                            {item.brand && <div className="text-[10px] text-[#64748B] font-normal">{item.brand}</div>}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-[#F1F5F9] text-[#475569]">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-[#DC2626]">
                            {item.fullBottlesStock} btls
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-[#64748B]">
                            {item.parLevelBottles} btls
                          </td>
                          <td className="py-3 px-3 text-right text-[#B45309] font-bold">
                            -{Math.max(0, item.parLevelBottles - item.fullBottlesStock)} btls
                          </td>
                          <td className="py-3 px-3 text-right font-black text-[#D97706]">
                            +{item.reorderSuggestedBottles} Bottles
                          </td>
                          <td className="py-3 px-3 text-right text-[#64748B]">
                            Rs. {Number(item.costPerBottle).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-[#0F172A]">
                            Rs. {Number(item.reorderCost).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
