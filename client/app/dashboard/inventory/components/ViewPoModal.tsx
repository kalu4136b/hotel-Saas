'use client';

import React from 'react';
import { X, Printer, Download, CheckCircle, Clock, AlertTriangle, FileText, PackageCheck } from 'lucide-react';

interface ViewPoModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: any | null;
  onApprove?: (id: string) => void;
  onCancelPo?: (id: string) => void;
  onOpenGrnModal?: (poId: string) => void;
}

export default function ViewPoModal({
  isOpen,
  onClose,
  po,
  onApprove,
  onCancelPo,
  onOpenGrnModal,
}: ViewPoModalProps) {
  if (!isOpen || !po) return null;

  const handlePrint = () => {
    window.print();
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-50 text-sky-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">{po.poNumber}</h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${getStatusBadge(
                    po.status,
                  )}`}
                >
                  {po.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Created on {new Date(po.createdAt).toLocaleDateString()} by {po.createdByName || 'Purchasing'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PO Document Body */}
        <div className="mt-6 space-y-6">
          {/* Supplier & Delivery Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Vendor / Supplier
              </span>
              <div className="font-bold text-slate-900 text-sm">{po.supplier?.name || 'Supplier'}</div>
              <div className="text-slate-600 mt-1">
                Contact: {po.supplier?.contactPerson || 'N/A'} • {po.supplier?.phone || 'N/A'}
              </div>
              <div className="text-slate-500">{po.supplier?.email || 'N/A'}</div>
              <div className="text-slate-500 mt-1">Payment Terms: {po.paymentTerms || 'Net 30'}</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Delivery Details
              </span>
              <div className="font-bold text-slate-900">
                Location: {po.deliveryLocation || 'Main Receiving Store'}
              </div>
              <div className="text-slate-600 mt-1">
                Category:{' '}
                <strong className="text-slate-800 font-bold">{po.inventoryCategory || 'ALL'}</strong>
              </div>
              <div className="text-slate-500">
                Expected Date:{' '}
                {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : 'Immediate'}
              </div>
              {po.approvedByName && (
                <div className="text-emerald-700 font-semibold mt-1">
                  Approved by {po.approvedByName} on {new Date(po.approvedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">Item</th>
                  <th className="py-2.5 px-2 text-center">Unit</th>
                  <th className="py-2.5 px-2 text-center">Qty Ordered</th>
                  <th className="py-2.5 px-2 text-center">Qty Received</th>
                  <th className="py-2.5 px-2 text-right">Unit Cost</th>
                  <th className="py-2.5 px-3 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {po.items?.map((item: any, idx: number) => {
                  const pending = Number(item.quantityOrdered) - Number(item.quantityReceived);

                  return (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 block">
                          {item.inventoryItem?.name || item.name || 'Item'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.inventoryItem?.sku || item.sku}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-600 uppercase">
                        {item.purchaseUnit || item.inventoryItem?.purchaseUnit || 'PCS'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-900">
                        {item.quantityOrdered}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold">
                        <span className={pending === 0 ? 'text-blue-600' : 'text-amber-600'}>
                          {item.quantityReceived}
                        </span>
                        {pending > 0 && (
                          <span className="text-[10px] text-slate-400 block">({pending} left)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                        Rs. {Number(item.unitCost).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        Rs. {Number(item.totalCost || item.quantityOrdered * item.unitCost).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end text-xs">
            <div className="w-64 space-y-1.5 p-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span>Rs. {Number(po.subtotal || po.totalAmount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
              </div>
              {Number(po.discountAmount) > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount:</span>
                  <span>-Rs. {Number(po.discountAmount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {Number(po.taxAmount) > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Tax:</span>
                  <span>+Rs. {Number(po.taxAmount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 pt-2">
                <span>Grand Total:</span>
                <span>Rs. {Number(po.totalAmount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {po.notes && (
            <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-600 border border-slate-200">
              <strong className="text-slate-800">Notes:</strong> {po.notes}
            </div>
          )}

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <div className="text-[11px] text-slate-400">
              Status updates automatically as shipments are received via GRN.
            </div>

            <div className="flex items-center gap-2">
              {po.status === 'PENDING_APPROVAL' && onApprove && (
                <button
                  onClick={() => onApprove(po.id)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Approve Purchase Order</span>
                </button>
              )}

              {(po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED') && onOpenGrnModal && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenGrnModal(po.id);
                  }}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  <PackageCheck className="w-3.5 h-3.5" />
                  <span>Receive Goods (Create GRN)</span>
                </button>
              )}

              {po.status !== 'FULLY_RECEIVED' && po.status !== 'CANCELLED' && onCancelPo && (
                <button
                  onClick={() => onCancelPo(po.id)}
                  className="px-4 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition"
                >
                  Cancel PO
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
