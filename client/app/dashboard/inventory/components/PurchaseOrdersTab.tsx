'use client';

import React, { useState } from 'react';
import {
  Truck,
  Search,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  PackageCheck,
  FileText,
  Printer,
  Calendar,
} from 'lucide-react';

interface PurchaseOrdersTabProps {
  purchaseOrders: any[];
  suppliers: any[];
  onOpenCreatePo: () => void;
  onViewPo: (po: any) => void;
  onApprovePo: (id: string) => void;
  onCancelPo: (id: string) => void;
  onOpenGrnModal: (poId: string) => void;
}

export default function PurchaseOrdersTab({
  purchaseOrders,
  suppliers,
  onOpenCreatePo,
  onViewPo,
  onApprovePo,
  onCancelPo,
  onOpenGrnModal,
}: PurchaseOrdersTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');

  const filteredPOs = purchaseOrders.filter((po) => {
    if (statusFilter && po.status !== statusFilter) return false;
    if (categoryFilter && po.inventoryCategory !== categoryFilter) return false;
    if (supplierFilter && po.supplierId !== supplierFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchPo = po.poNumber?.toLowerCase().includes(q);
      const matchSup = po.supplier?.name?.toLowerCase().includes(q);
      if (!matchPo && !matchSup) return false;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'PARTIALLY_RECEIVED':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'FULLY_RECEIVED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'PENDING_APPROVAL':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Filters and Create Button */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[220px] flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search PO Number or Supplier..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved (Awaiting GRN)</option>
            <option value="PARTIALLY_RECEIVED">Partially Received</option>
            <option value="FULLY_RECEIVED">Fully Received</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Categories</option>
            <option value="BAR">Bar Inventory</option>
            <option value="KITCHEN">Kitchen Inventory</option>
            <option value="OPERATIONAL">Operational Inventory</option>
            <option value="ALL">Mixed Procurement</option>
          </select>

          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onOpenCreatePo}
          className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition shadow-lg shadow-sky-600/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase Order</span>
        </button>
      </div>

      {/* PO Listing Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-3">Supplier</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">PO Date</th>
                <th className="py-3 px-3">Expected Date</th>
                <th className="py-3 px-2 text-center">Items</th>
                <th className="py-3 px-3 text-right">Total Amount</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No purchase orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => {
                  const itemCount = po.items?.length || 0;
                  const totalUnitsOrdered = po.items?.reduce(
                    (sum: number, i: any) => sum + Number(i.quantityOrdered || 0),
                    0,
                  );

                  return (
                    <tr key={po.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-mono font-black text-slate-900 text-sm flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-sky-600" />
                          <span>{po.poNumber}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          By: {po.createdByName || 'Purchasing Officer'}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-extrabold text-slate-900 block">{po.supplier?.name || 'Vendor'}</span>
                        <span className="text-[10px] text-slate-400">{po.paymentTerms || 'Net 30'}</span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            po.inventoryCategory === 'BAR'
                              ? 'bg-amber-100 text-amber-800'
                              : po.inventoryCategory === 'OPERATIONAL'
                                ? 'bg-indigo-100 text-indigo-800'
                                : po.inventoryCategory === 'KITCHEN'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {po.inventoryCategory || 'ALL'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-600 font-mono">
                        {new Date(po.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-3 text-slate-600 font-mono">
                        {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : 'N/A'}
                      </td>

                      <td className="py-3 px-2 text-center font-mono">
                        <span className="font-bold text-slate-900">{itemCount} items</span>
                        <span className="text-[10px] text-slate-400 block font-normal">
                          ({totalUnitsOrdered} units)
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900 text-sm">
                        Rs. {Number(po.totalAmount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${getStatusBadge(
                            po.status,
                          )}`}
                        >
                          {po.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onViewPo(po)}
                            title="View / Print PO"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {po.status === 'PENDING_APPROVAL' && (
                            <button
                              onClick={() => onApprovePo(po.id)}
                              title="Approve Purchase Order"
                              className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {(po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED') && (
                            <button
                              onClick={() => onOpenGrnModal(po.id)}
                              title="Receive Goods (Create GRN)"
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition flex items-center gap-1 shadow-xs"
                            >
                              <PackageCheck className="w-3 h-3" />
                              <span>Receive GRN</span>
                            </button>
                          )}

                          {po.status !== 'FULLY_RECEIVED' && po.status !== 'CANCELLED' && (
                            <button
                              onClick={() => onCancelPo(po.id)}
                              title="Cancel PO"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
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
