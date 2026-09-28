'use client';

// Orders management & kitchen coordination
import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { posApi } from '@/lib/api';
import {
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  X,
  CreditCard,
  Ban,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await posApi.getOrders(statusFilter || undefined);
      setOrders(data);
    } catch (err) {
      console.error('Failed to load orders from MySQL:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const filteredOrders = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      (o.tableNumber && o.tableNumber.toLowerCase().includes(q)) ||
      (o.customerName && o.customerName.toLowerCase().includes(q))
    );
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Orders &amp; Bills Registry
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Audit history of all restaurant and takeaway transactions from MySQL.
          </p>
        </div>

        <button
          onClick={loadOrders}
          disabled={loading}
          className="py-2 px-3 rounded-xl border border-[#E2E8F0] hover:bg-white bg-[#F8FAFC] text-xs font-semibold text-[#64748B] transition-all flex items-center gap-1.5 shadow-2xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs space-y-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search by Order #, Table, or Customer Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] focus:bg-white focus:border-[#00C48C] outline-none"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto text-xs">
            {['', 'OPEN', 'KOT_SENT', 'BILLED', 'PAID', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                  statusFilter === st
                    ? 'bg-[#00C48C] text-white shadow-xs'
                    : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                }`}
              >
                {st === '' ? 'All Statuses' : st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-[#94A3B8] text-xs">
            <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-[#0F172A]">No orders found</p>
            <p className="mt-1">Orders placed in the POS will be listed here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#94A3B8] text-[10px] uppercase tracking-wider font-bold bg-[#F8FAFC]">
                  <th className="py-3 px-4">Order Number</th>
                  <th className="py-3 px-4">Dining Space</th>
                  <th className="py-3 px-4">Items Summary</th>
                  <th className="py-3 px-4">Subtotal</th>
                  <th className="py-3 px-4">Tax (10%)</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredOrders.map((ord) => {
                  let badge = 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]';
                  if (ord.status === 'OPEN') badge = 'bg-blue-50 text-blue-700 border-blue-200';
                  if (ord.status === 'KOT_SENT') badge = 'bg-amber-50 text-amber-700 border-amber-200';
                  if (ord.status === 'BILLED') badge = 'bg-purple-50 text-purple-700 border-purple-200';
                  if (ord.status === 'CANCELLED') badge = 'bg-red-50 text-red-700 border-red-200';

                  return (
                    <tr key={ord.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3.5 px-4 font-bold text-[#0F172A]">
                        {ord.orderNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-[#0F172A] block">
                          {ord.tableNumber || (ord.orderType === 'TAKEAWAY' ? 'Takeaway' : 'Walk-in')}
                        </span>
                        <span className="text-[10px] text-[#64748B]">{ord.orderType}</span>
                      </td>
                      <td className="py-3.5 px-4 text-[#64748B]">
                        {ord.items?.map((i: any) => `${i.quantity}x ${i.productName}`).join(', ')}
                      </td>
                      <td className="py-3.5 px-4 mono text-[#64748B]">
                        ${Number(ord.subtotal).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 mono text-[#64748B]">
                        ${Number(ord.taxAmount).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 mono font-extrabold text-[#0F172A]">
                        ${Number(ord.totalAmount).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${badge}`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-[#64748B] whitespace-nowrap">
                        {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="text-[#00C48C] font-bold hover:underline"
                        >
                          View Bill
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bill Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xl animate-fade-scale">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">
                  Invoice {selectedOrder.orderNumber}
                </h3>
                <span className="text-xs text-[#64748B]">
                  {selectedOrder.tableNumber || selectedOrder.orderType}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-[#F1F5F9] text-xs mb-4">
              {selectedOrder.items?.map((item: any) => (
                <div key={item.id} className="py-2 flex justify-between">
                  <div>
                    <span className="font-bold text-[#0F172A]">
                      {item.quantity}x {item.productName}
                    </span>
                    <span className="block text-[11px] text-[#64748B]">
                      ${Number(item.unitPrice).toFixed(2)} each
                    </span>
                  </div>
                  <span className="font-bold text-[#0F172A] mono">
                    ${Number(item.totalAmount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 pt-3 border-t border-[#E2E8F0] text-xs">
              <div className="flex justify-between text-[#64748B]">
                <span>Subtotal</span>
                <span className="mono">${Number(selectedOrder.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#64748B]">
                <span>Tax (10%)</span>
                <span className="mono">${Number(selectedOrder.taxAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-[#0F172A] pt-1.5 border-t border-[#E2E8F0]">
                <span>Total Amount</span>
                <span className="mono text-[#00C48C]">
                  ${Number(selectedOrder.totalAmount).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Bill</span>
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="py-2.5 px-4 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#64748B]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
