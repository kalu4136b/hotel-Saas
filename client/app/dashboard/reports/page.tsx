'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { reportsApi } from '@/lib/api';
import {
  Receipt,
  CreditCard,
  UtensilsCrossed,
  Ban,
  Calendar,
  Filter,
  Printer,
  RefreshCw,
  TrendingUp,
  Download,
} from 'lucide-react';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'daily' | 'payments' | 'items' | 'cancellations'>('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const applyUrlTab = (searchStr?: string) => {
      const params = new URLSearchParams(searchStr ?? window.location.search);
      const tab = params.get('tab')?.toLowerCase() as any;
      const validTabs = ['daily', 'payments', 'items', 'cancellations'];
      if (tab && validTabs.includes(tab)) {
        setActiveTab(tab);
      }
    };
    applyUrlTab();
    const handleNavTab = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.href?.includes('?')) {
        applyUrlTab('?' + detail.href.split('?')[1]);
      }
    };
    window.addEventListener('hotel-nav-tab', handleNavTab);
    window.addEventListener('popstate', () => applyUrlTab());
    return () => {
      window.removeEventListener('hotel-nav-tab', handleNavTab);
    };
  }, []);

  // Report Data States
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [itemSales, setItemSales] = useState<any[]>([]);
  const [cancellations, setCancellations] = useState<any[]>([]);

  const loadReport = async () => {
    setLoading(true);
    try {
      if (activeTab === 'daily') {
        const data = await reportsApi.getDailySales(startDate || undefined, endDate || undefined);
        setDailySales(data);
      } else if (activeTab === 'payments') {
        const data = await reportsApi.getPayments(startDate || undefined, endDate || undefined);
        setPayments(data);
      } else if (activeTab === 'items') {
        const data = await reportsApi.getItemSales(startDate || undefined, endDate || undefined);
        setItemSales(data);
      } else if (activeTab === 'cancellations') {
        const data = await reportsApi.getCancellations(startDate || undefined, endDate || undefined);
        setCancellations(data);
      }
    } catch (err) {
      console.error('Failed to load report from MySQL:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [activeTab]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    loadReport();
  };

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
    setTimeout(loadReport, 50);
  };

  // Aggregated totals for the active view
  const totalRevenueAllDays = dailySales.reduce((sum, r) => sum + Number(r.netRevenue), 0);
  const totalPaidOrders = dailySales.reduce((sum, r) => sum + Number(r.paidOrders), 0);
  const totalPaymentsCollected = payments.reduce((sum, p) => sum + Number(p.totalAmount), 0);
  const totalItemsSold = itemSales.reduce((sum, i) => sum + Number(i.unitsSold), 0);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Financial &amp; Operational Reports
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Real SQL aggregations from settled bills, orders, and payment records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="py-2 px-3.5 rounded-xl border border-[#E2E8F0] hover:bg-white bg-[#F8FAFC] text-xs font-bold text-[#0F172A] transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] mb-6 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('daily')}
          className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'daily'
              ? 'border-[#00C48C] text-[#00C48C]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Daily Sales Summary</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'payments'
              ? 'border-[#00C48C] text-[#00C48C]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payment Method Reconciliation</span>
        </button>

        <button
          onClick={() => setActiveTab('items')}
          className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'items'
              ? 'border-[#00C48C] text-[#00C48C]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>Item Sales Ranking</span>
        </button>

        <button
          onClick={() => setActiveTab('cancellations')}
          className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'cancellations'
              ? 'border-[#00C48C] text-[#00C48C]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Ban className="w-4 h-4" />
          <span>Cancellation &amp; Void Audit</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <form
        onSubmit={handleApplyFilter}
        className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs flex flex-wrap items-center gap-3 mb-6 text-xs"
      >
        <div className="flex items-center gap-2">
          <label className="font-semibold text-[#64748B]">From Date:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] outline-none font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="font-semibold text-[#64748B]">To Date:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] outline-none font-medium"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="submit"
            disabled={loading}
            className="py-2 px-4 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white font-bold transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Apply Filter</span>
          </button>
          <button
            type="button"
            onClick={handleResetFilter}
            className="py-2 px-3 rounded-xl border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] font-semibold"
          >
            Reset
          </button>
        </div>
      </form>

      {/* ================= TAB 1: DAILY SALES SUMMARY ================= */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs">
              <span className="text-[11px] font-semibold text-[#64748B]">
                Net Revenue In Scope
              </span>
              <div className="text-xl font-bold text-[#0F172A] mono mt-1">
                Rs. {totalRevenueAllDays.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs">
              <span className="text-[11px] font-semibold text-[#64748B]">
                Total Completed Orders
              </span>
              <div className="text-xl font-bold text-[#0F172A] mono mt-1">
                {totalPaidOrders}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs">
              <span className="text-[11px] font-semibold text-[#64748B]">
                Average Ticket Size
              </span>
              <div className="text-xl font-bold text-[#0F172A] mono mt-1">
                Rs.{' '}
                {totalPaidOrders > 0
                  ? (totalRevenueAllDays / totalPaidOrders).toLocaleString('en-LK', { minimumFractionDigits: 2 })
                  : '0.00'}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#94A3B8] text-[10px] uppercase tracking-wider font-bold bg-[#F8FAFC]">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Paid Orders</th>
                    <th className="py-3 px-4">Gross Sales</th>
                    <th className="py-3 px-4">Discounts</th>
                    <th className="py-3 px-4">Taxes Collected</th>
                    <th className="py-3 px-4 font-bold text-[#0F172A]">Net Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {dailySales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#94A3B8]">
                        No sales found for the selected timeframe.
                      </td>
                    </tr>
                  ) : (
                    dailySales.map((r, i) => (
                      <tr key={i} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-semibold text-[#0F172A]">
                          {new Date(r.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 mono text-[#64748B]">
                          {r.paidOrders} of {r.totalOrders}
                        </td>
                        <td className="py-3 px-4 mono text-[#64748B]">
                          Rs. {r.grossSales.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 mono text-[#64748B]">
                          Rs. {r.totalDiscounts.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 mono text-[#64748B]">
                          Rs. {r.totalTaxes.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 mono font-extrabold text-[#00C48C]">
                          Rs. {r.netRevenue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
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

      {/* ================= TAB 2: PAYMENTS RECONCILIATION ================= */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs max-w-sm">
            <span className="text-[11px] font-semibold text-[#64748B]">
              Total Tender Collected
            </span>
            <div className="text-xl font-bold text-[#0F172A] mono mt-1">
              Rs. {totalPaymentsCollected.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#94A3B8] text-[10px] uppercase tracking-wider font-bold bg-[#F8FAFC]">
                  <th className="py-3 px-4">Tender Method</th>
                  <th className="py-3 px-4">Transactions</th>
                  <th className="py-3 px-4">Change Given</th>
                  <th className="py-3 px-4 font-bold text-[#0F172A]">Total Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#94A3B8]">
                      No payment settlements found.
                    </td>
                  </tr>
                ) : (
                  payments.map((p, i) => (
                    <tr key={i} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-4 font-bold text-[#0F172A]">
                        {p.method}
                      </td>
                      <td className="py-3 px-4 mono text-[#64748B]">
                        {p.transactionCount} payments
                      </td>
                      <td className="py-3 px-4 mono text-[#64748B]">
                        Rs. {p.totalChange.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 mono font-extrabold text-[#00C48C]">
                        Rs. {p.totalAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: ITEM SALES RANKING ================= */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs max-w-sm">
            <span className="text-[11px] font-semibold text-[#64748B]">
              Total Units Sold
            </span>
            <div className="text-xl font-bold text-[#0F172A] mono mt-1">
              {totalItemsSold} dishes
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#94A3B8] text-[10px] uppercase tracking-wider font-bold bg-[#F8FAFC]">
                  <th className="py-3 px-4">Menu Dish</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Units Sold</th>
                  <th className="py-3 px-4">Unit Price</th>
                  <th className="py-3 px-4 font-bold text-[#0F172A]">Gross Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {itemSales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#94A3B8]">
                      No sold items recorded for this timeframe.
                    </td>
                  </tr>
                ) : (
                  itemSales.map((item, i) => (
                    <tr key={i} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-4 font-bold text-[#0F172A]">
                        {item.productName}
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        <span className="px-2 py-0.5 rounded-md bg-[#F1F5F9] font-medium text-[10.5px]">
                          {item.categoryName}
                        </span>
                      </td>
                      <td className="py-3 px-4 mono font-bold text-[#0F172A]">
                        {item.unitsSold}
                      </td>
                      <td className="py-3 px-4 mono text-[#64748B]">
                        Rs. {Number(item.avgPrice).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 mono font-extrabold text-[#00C48C]">
                        Rs. {Number(item.totalRevenue).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 4: CANCELLATIONS AUDIT ================= */}
      {activeTab === 'cancellations' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#94A3B8] text-[10px] uppercase tracking-wider font-bold bg-[#F8FAFC]">
                <th className="py-3 px-4">Order Number</th>
                <th className="py-3 px-4">Table</th>
                <th className="py-3 px-4">Void Amount</th>
                <th className="py-3 px-4">Cancellation Reason</th>
                <th className="py-3 px-4">Cancelled Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {cancellations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#94A3B8]">
                    No cancelled or voided orders recorded. (Clean record!)
                  </td>
                </tr>
              ) : (
                cancellations.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-4 font-bold text-[#0F172A]">
                      {c.orderNumber}
                    </td>
                    <td className="py-3 px-4 text-[#64748B]">{c.tableNumber}</td>
                    <td className="py-3 px-4 mono font-bold text-red-600">
                      Rs. {c.totalAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-[#64748B] italic">
                      {c.reason}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-[#64748B]">
                      {new Date(c.cancelledAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
