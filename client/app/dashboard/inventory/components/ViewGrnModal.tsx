'use client';

import React from 'react';
import { X, Printer, PackageCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ViewGrnModalProps {
  isOpen: boolean;
  onClose: () => void;
  grn: any | null;
}

export default function ViewGrnModal({ isOpen, onClose, grn }: ViewGrnModalProps) {
  if (!isOpen || !grn) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">{grn.grnNumber}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border bg-emerald-50 text-emerald-800 border-emerald-300">
                  {grn.status || 'RECEIVED'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Received on {new Date(grn.receivedDate).toLocaleDateString()} by {grn.receivedByName || 'Receiving Clerk'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print GRN</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body */}
        <div className="mt-6 space-y-6 text-xs">
          {/* Header Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Supplier &amp; PO Reference
              </span>
              <div className="font-bold text-slate-900 text-sm">{grn.supplier?.name || 'Supplier'}</div>
              <div className="text-slate-600 mt-1">
                Purchase Order:{' '}
                <strong className="text-slate-800">{grn.purchaseOrder?.poNumber || grn.purchaseOrderId}</strong>
              </div>
              <div className="text-slate-500">
                Delivery Note / Invoice Ref: <strong>{grn.deliveryNoteNumber || 'N/A'}</strong>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                Receiving Statistics
              </span>
              <div className="font-bold text-slate-900">
                Total Items Received: {grn.totalReceivedItems || grn.items?.length || 0}
              </div>
              <div className="text-emerald-700 font-bold mt-1">
                Accepted (Stock Incremented): {Number(grn.totalAcceptedQuantity)} Units
              </div>
              {Number(grn.totalRejectedQuantity) > 0 && (
                <div className="text-rose-700 font-bold">
                  Rejected (Not Stocked): {Number(grn.totalRejectedQuantity)} Units
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">Item Name</th>
                  <th className="py-2.5 px-2 text-center">Ordered</th>
                  <th className="py-2.5 px-2 text-center">Receiving</th>
                  <th className="py-2.5 px-2 text-center text-emerald-800">Accepted</th>
                  <th className="py-2.5 px-2 text-center text-rose-800">Rejected</th>
                  <th className="py-2.5 px-2 text-right">Unit Cost</th>
                  <th className="py-2.5 px-3 text-right">Accepted Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {grn.items?.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 block">
                        {item.inventoryItem?.name || item.name || 'Item'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.inventoryItem?.sku || item.sku}
                        {item.batchNumber ? ` • Batch: ${item.batchNumber}` : ''}
                      </span>
                      {Number(item.quantityRejected) > 0 && item.rejectionReason && (
                        <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">
                          Rejection Reason: {item.rejectionReason}
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-2 text-center font-mono text-slate-600">{item.quantityOrdered}</td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800">
                      {item.quantityReceiving}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-600">
                      {item.quantityAccepted}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-rose-600">
                      {item.quantityRejected || 0}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                      Rs. {Number(item.unitCost).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      Rs. {Number(item.totalCost || item.quantityAccepted * item.unitCost).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Strip */}
          <div className="flex justify-between items-center p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-2 text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                Inventory stock was updated atomically when this Goods Received Note was finalized.
              </span>
            </div>
            <div className="text-right font-mono">
              <span className="text-[10px] uppercase text-emerald-700 block font-bold">Total Stock In Value</span>
              <span className="text-base font-black text-emerald-900">
                Rs. {Number(grn.totalAmount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {grn.notes && (
            <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-600 border border-slate-200">
              <strong className="text-slate-800">Receiving Notes:</strong> {grn.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
