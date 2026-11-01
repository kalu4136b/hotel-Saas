'use client';

import React, { useState } from 'react';
import {
  PackageCheck,
  Search,
  Plus,
  Eye,
  Printer,
  Calendar,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface GoodsReceivedNotesTabProps {
  grns: any[];
  suppliers: any[];
  onOpenCreateGrn: () => void;
  onViewGrn: (grn: any) => void;
  onViewPo: (po: any) => void;
}

export default function GoodsReceivedNotesTab({
  grns,
  suppliers,
  onOpenCreateGrn,
  onViewGrn,
  onViewPo,
}: GoodsReceivedNotesTabProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');

  const filteredGRNs = grns.filter((grn) => {
    if (categoryFilter && grn.inventoryCategory !== categoryFilter) return false;
    if (supplierFilter && grn.supplierId !== supplierFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchGrn = grn.grnNumber?.toLowerCase().includes(q);
      const matchPo = grn.purchaseOrder?.poNumber?.toLowerCase().includes(q);
      const matchSup = grn.supplier?.name?.toLowerCase().includes(q);
      const matchNote = grn.deliveryNoteNumber?.toLowerCase().includes(q);
      if (!matchGrn && !matchPo && !matchSup && !matchNote) return false;
    }
    return true;
  });

  const totalDeliveredValue = grns.reduce((sum, g) => sum + Number(g.totalAmount || 0), 0);
  const totalAcceptedUnits = grns.reduce((sum, g) => sum + Number(g.totalAcceptedQuantity || 0), 0);
  const totalRejectedUnits = grns.reduce((sum, g) => sum + Number(g.totalRejectedQuantity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Summary */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[220px] flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search GRN #, PO #, Delivery Note #..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Categories</option>
            <option value="BAR">Bar Inventory</option>
            <option value="KITCHEN">Kitchen Inventory</option>
            <option value="OPERATIONAL">Operational Inventory</option>
            <option value="ALL">Mixed Category</option>
          </select>

          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
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
          onClick={onOpenCreateGrn}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20 flex items-center gap-2"
        >
          <PackageCheck className="w-4 h-4" />
          <span>Receive Goods (New GRN)</span>
        </button>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Goods Received</span>
          <span className="text-xl font-black text-slate-900 mt-0.5 block">{grns.length} Notes Finalized</span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-emerald-600 block text-[10px] uppercase font-bold">Total Accepted Stock Units</span>
          <span className="text-xl font-black text-emerald-700 mt-0.5 block">{totalAcceptedUnits} Units In Stock</span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Delivered Value</span>
          <span className="text-xl font-black text-slate-900 mt-0.5 block">Rs. {totalDeliveredValue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* GRN Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-3 px-4">GRN Number</th>
                <th className="py-3 px-3">PO Reference</th>
                <th className="py-3 px-3">Supplier</th>
                <th className="py-3 px-3">Received Date</th>
                <th className="py-3 px-2 text-center">Items</th>
                <th className="py-3 px-2 text-center text-emerald-700">Accepted Qty</th>
                <th className="py-3 px-2 text-center text-rose-700">Rejected Qty</th>
                <th className="py-3 px-3 text-right">Received Value</th>
                <th className="py-3 px-3">Received By</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGRNs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No Goods Received Notes recorded yet.
                  </td>
                </tr>
              ) : (
                filteredGRNs.map((grn) => (
                  <tr key={grn.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-mono font-black text-slate-900 text-sm flex items-center gap-1.5">
                        <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{grn.grnNumber}</span>
                      </div>
                      {grn.deliveryNoteNumber && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          DN: {grn.deliveryNoteNumber}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      {grn.purchaseOrder ? (
                        <button
                          onClick={() => onViewPo(grn.purchaseOrder)}
                          className="font-mono font-bold text-sky-600 hover:text-sky-800 hover:underline"
                        >
                          {grn.purchaseOrder.poNumber}
                        </button>
                      ) : (
                        <span className="font-mono text-slate-400">{grn.purchaseOrderId?.slice(0, 8)}</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-extrabold text-slate-900 block">{grn.supplier?.name || 'Vendor'}</span>
                      <span className="text-[10px] text-slate-400">{grn.inventoryCategory || 'ALL'}</span>
                    </td>

                    <td className="py-3 px-3 text-slate-600 font-mono">
                      {new Date(grn.receivedDate).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-2 text-center font-mono font-bold text-slate-800">
                      {grn.totalReceivedItems || grn.items?.length || 0}
                    </td>

                    <td className="py-3 px-2 text-center font-mono font-bold text-emerald-600">
                      {grn.totalAcceptedQuantity}
                    </td>

                    <td className="py-3 px-2 text-center font-mono font-bold">
                      {Number(grn.totalRejectedQuantity) > 0 ? (
                        <span className="text-rose-600 font-bold">{grn.totalRejectedQuantity}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                      Rs. {Number(grn.totalAmount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3 px-3 text-slate-600">
                      {grn.receivedByName || 'Receiving Staff'}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onViewGrn(grn)}
                        title="View & Print GRN Document"
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
