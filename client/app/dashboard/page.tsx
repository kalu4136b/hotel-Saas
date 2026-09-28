'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { dashboardApi } from '@/lib/api';
import {
  HandCoins,
  UtensilsCrossed,
  Grid,
  ChefHat,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Clock,
  ArrowRight,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';

export default function DashboardOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, tablesData, ordersData, productsData] =
        await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getLiveTables(),
          dashboardApi.getRecentOrders(),
          dashboardApi.getTopProducts(),
        ]);

      setStats(statsData);
      setTables(tablesData);
      setRecentOrders(ordersData);
      setTopProducts(productsData);
    } catch (err) {
      console.error('Failed to load live dashboard telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Hospitality Executive Overview
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Real-time telemetry, table occupancy, live kitchen tickets and
            revenue metrics from MySQL.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="py-2 px-3 rounded-xl border border-[#E2E8F0] hover:bg-white bg-[#F8FAFC] text-xs font-semibold text-[#64748B] transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            <span>Refresh Telemetry</span>
          </button>

          <a
            href="/dashboard/pos"
            className="py-2 px-3.5 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Open POS Terminal</span>
          </a>
        </div>
      </div>

      {/* ================= STAT CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#ECFDF5] text-[#00C48C] flex items-center justify-center shrink-0">
            <HandCoins className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-[#64748B]">
              Today&apos;s Gross Revenue
            </div>
            <div className="text-2xl font-bold text-[#0F172A] mono mt-0.5">
              ${stats?.revenue?.todayTotal?.toFixed(2) || '0.00'}
            </div>
            <div className="text-[11px] text-[#64748B] mt-1 flex items-center gap-2">
              <span className="font-semibold text-emerald-700">
                Cash: ${stats?.revenue?.cashSales?.toFixed(2) || '0.00'}
              </span>
              <span>•</span>
              <span className="font-semibold text-cyan-700">
                Card: ${stats?.revenue?.cardSales?.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#F0F9FF] text-[#0284C7] flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-[#64748B]">
              Today&apos;s Orders Count
            </div>
            <div className="text-2xl font-bold text-[#0F172A] mono mt-0.5">
              {stats?.orders?.todayTotal || 0}
            </div>
            <div className="text-[11px] text-[#64748B] mt-1 flex items-center gap-2">
              <span className="text-emerald-700 font-semibold">
                {stats?.orders?.completed || 0} Settled
              </span>
              <span>•</span>
              <span className="text-amber-700 font-semibold">
                {stats?.orders?.active || 0} In Progress
              </span>
            </div>
          </div>
        </div>

        {/* Dining Table Occupancy */}
        <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#FFFBEB] text-[#D97706] flex items-center justify-center shrink-0">
            <Grid className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-[#64748B]">
              Dining Table Occupancy
            </div>
            <div className="text-2xl font-bold text-[#0F172A] mono mt-0.5">
              {stats?.tables?.occupancyRate || 0}%
            </div>
            <div className="text-[11px] text-[#64748B] mt-1">
              <span className="font-semibold text-[#0F172A]">
                {stats?.tables?.occupied + stats?.tables?.billed || 0}
              </span>{' '}
              of {stats?.tables?.total || 0} tables in service
            </div>
          </div>
        </div>

        {/* Active Kitchen Tickets */}
        <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#F5F3FF] text-[#7C3AED] flex items-center justify-center shrink-0">
            <ChefHat className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-[#64748B]">
              Kitchen Queue (KOT)
            </div>
            <div className="text-2xl font-bold text-[#0F172A] mono mt-0.5">
              {stats?.kitchen?.activeKots || 0}
            </div>
            <div className="text-[11px] text-[#64748B] mt-1">
              <a
                href="/dashboard/kitchen"
                className="text-[#7C3AED] font-semibold hover:underline inline-flex items-center gap-1"
              >
                <span>View Kitchen Board</span>
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MIDDLE GRID: LIVE TABLES + TOP PRODUCTS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Live Dining Tables Layout */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">
                Live Table Statuses
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Real-time occupancy across dining floor and patio
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-[#00C48C]" /> Available
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                <span className="w-2 h-2 rounded-full bg-[#D97706]" /> Occupied
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700">
                <span className="w-2 h-2 rounded-full bg-[#7C3AED]" /> Billed
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {tables.map((table) => {
              const isAvailable = table.status === 'AVAILABLE';
              const isOccupied = table.status === 'OCCUPIED';
              const isBilled = table.status === 'BILLED';

              let borderColor = 'border-[#E2E8F0]';
              let badgeColor = 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]';

              if (isOccupied) {
                borderColor = 'border-amber-300 bg-amber-50/40';
                badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
              } else if (isBilled) {
                borderColor = 'border-purple-300 bg-purple-50/40';
                badgeColor = 'bg-purple-100 text-purple-800 border-purple-300';
              }

              return (
                <div
                  key={table.id}
                  className={`p-3.5 rounded-xl border ${borderColor} transition-all hover:shadow-xs flex flex-col justify-between min-h-[90px]`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0F172A]">
                      {table.tableNumber}
                    </span>
                    <span
                      className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}
                    >
                      {table.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#F1F5F9] text-[11px] text-[#64748B]">
                    <span>Capacity: {table.capacity} guests</span>
                    <a
                      href="/dashboard/pos"
                      className="text-[#00C48C] font-bold hover:underline"
                    >
                      {isAvailable ? 'Seat' : 'View'}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">
                  Top Selling Dishes
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  Ranked by volume from paid orders
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#64748B]">
                Live SQL
              </span>
            </div>

            {topProducts.length === 0 ? (
              <div className="text-center py-8 text-[#94A3B8] text-xs">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No settled orders yet today.</p>
                <p className="text-[10.5px]">
                  Place sales in POS Terminal to see live rankings.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {topProducts.map((prod, idx) => (
                  <div
                    key={prod.name}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-md bg-white border border-[#E2E8F0] text-[10.5px] font-bold text-[#64748B] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-[#0F172A] truncate max-w-[150px]">
                        {prod.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-[#0F172A] mono">
                        ${Number(prod.revenue).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-[#64748B]">
                        {prod.unitsSold} sold
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <a
            href="/dashboard/pos"
            className="mt-4 w-full py-2 px-3 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-center text-xs font-bold text-[#0F172A] transition-all block"
          >
            Create Sale in Terminal
          </a>
        </div>
      </div>

      {/* ================= RECENT ORDERS TABLE ================= */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">Recent Orders</h3>
            <p className="text-[11px] text-[#64748B]">
              Latest restaurant and takeaway tickets from MySQL
            </p>
          </div>
          <a
            href="/dashboard/orders"
            className="text-xs font-bold text-[#00C48C] hover:underline flex items-center gap-1"
          >
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {recentOrders.length === 0 ? (
          <div className="text-center py-10 text-[#94A3B8] text-xs">
            <Receipt className="w-9 h-9 mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-[#0F172A]">No orders recorded yet</p>
            <p className="mt-1">
              Start by selecting a table or takeaway in the POS Terminal.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#94A3B8] text-[10px] uppercase tracking-wider font-bold">
                  <th className="pb-3 px-2">Order #</th>
                  <th className="pb-3 px-2">Type / Table</th>
                  <th className="pb-3 px-2">Items</th>
                  <th className="pb-3 px-2">Total Amount</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {recentOrders.map((ord) => {
                  let statusBadge =
                    'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]';
                  if (ord.status === 'OPEN')
                    statusBadge =
                      'bg-blue-50 text-blue-700 border-blue-200';
                  if (ord.status === 'KOT_SENT' || ord.status === 'IN_PREPARATION')
                    statusBadge =
                      'bg-amber-50 text-amber-700 border-amber-200';
                  if (ord.status === 'BILLED')
                    statusBadge =
                      'bg-purple-50 text-purple-700 border-purple-200';
                  if (ord.status === 'CANCELLED')
                    statusBadge =
                      'bg-red-50 text-red-700 border-red-200';

                  return (
                    <tr key={ord.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-2 font-bold text-[#0F172A]">
                        {ord.orderNumber}
                      </td>
                      <td className="py-3 px-2">
                        <span className="font-semibold text-[#0F172A]">
                          {ord.tableNumber ||
                            (ord.orderType === 'TAKEAWAY'
                              ? 'Takeaway'
                              : 'Walk-in')}
                        </span>
                        <span className="block text-[10.5px] text-[#64748B]">
                          {ord.orderType}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-[#64748B]">
                        {ord.items?.length || 0} items
                      </td>
                      <td className="py-3 px-2 font-bold text-[#0F172A] mono">
                        ${Number(ord.totalAmount).toFixed(2)}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge}`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <a
                          href={`/dashboard/orders`}
                          className="text-[#00C48C] font-bold hover:underline"
                        >
                          View Details
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
