'use client';

import React, { useState, useEffect } from 'react';
import { X, PackageCheck, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface GoodsReceivedNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (grnData: any) => Promise<void>;
  purchaseOrders: any[];
  preselectedPoId?: string;
}

export default function GoodsReceivedNoteModal({
  isOpen,
  onClose,
  onSave,
  purchaseOrders,
  preselectedPoId,
}: GoodsReceivedNoteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedPoId, setSelectedPoId] = useState(preselectedPoId || '');
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const [itemsToReceive, setItemsToReceive] = useState<
    Array<{
      purchaseOrderItemId: string;
      inventoryItemId: string;
      itemName: string;
      itemCode: string;
      purchaseUnit: string;
      conversionFactor: number;
      quantityOrdered: number;
      quantityPreviouslyReceived: number;
      remainingQuantity: number;
      quantityReceiving: number;
      quantityAccepted: number;
      quantityRejected: number;
      rejectionReason: string;
      unitCost: number;
      batchNumber: string;
      expiryDate: string;
    }>
  >([]);

  // Filter approved or partially received POs that have pending items
  const eligiblePOs = purchaseOrders.filter(
    (po) =>
      (po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED') &&
      po.items?.some((i: any) => Number(i.quantityOrdered) > Number(i.quantityReceived)),
  );

  useEffect(() => {
    if (isOpen) {
      const activePoId = preselectedPoId || (eligiblePOs.length > 0 ? eligiblePOs[0].id : '');
      setSelectedPoId(activePoId);
      setDeliveryNoteNumber(`DN-${Date.now().toString().slice(-6)}`);
      setReceivedDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setError(null);
    }
  }, [isOpen, preselectedPoId]);

  useEffect(() => {
    if (!selectedPoId) {
      setItemsToReceive([]);
      return;
    }

    const po = purchaseOrders.find((p) => p.id === selectedPoId);
    if (!po || !po.items) {
      setItemsToReceive([]);
      return;
    }

    const receivingList = po.items
      .map((item: any) => {
        const ordered = Number(item.quantityOrdered || 0);
        const received = Number(item.quantityReceived || 0);
        const remaining = Math.max(0, ordered - received);

        return {
          purchaseOrderItemId: item.id,
          inventoryItemId: item.inventoryItemId,
          itemName: item.inventoryItem?.name || 'Inventory Item',
          itemCode: item.inventoryItem?.sku || item.inventoryItem?.itemCode || 'SKU',
          purchaseUnit: item.purchaseUnit || item.inventoryItem?.purchaseUnit || 'PCS',
          conversionFactor: Number(item.conversionFactor) || 1,
          quantityOrdered: ordered,
          quantityPreviouslyReceived: received,
          remainingQuantity: remaining,
          quantityReceiving: remaining,
          quantityAccepted: remaining,
          quantityRejected: 0,
          rejectionReason: '',
          unitCost: Number(item.unitCost || 0),
          batchNumber: '',
          expiryDate: '',
        };
      })
      .filter((i: any) => i.remainingQuantity > 0);

    setItemsToReceive(receivingList);
  }, [selectedPoId, purchaseOrders]);

  if (!isOpen) return null;

  const handleReceivingChange = (index: number, receivingVal: number) => {
    setItemsToReceive((prev) => {
      const copy = [...prev];
      const maxRemaining = copy[index].remainingQuantity;
      const validReceiving = Math.max(0, Math.min(receivingVal, maxRemaining));
      copy[index] = {
        ...copy[index],
        quantityReceiving: validReceiving,
        quantityAccepted: Math.max(0, validReceiving - copy[index].quantityRejected),
      };
      return copy;
    });
  };

  const handleAcceptedChange = (index: number, acceptedVal: number) => {
    setItemsToReceive((prev) => {
      const copy = [...prev];
      const receiving = copy[index].quantityReceiving;
      const validAccepted = Math.max(0, Math.min(acceptedVal, receiving));
      copy[index] = {
        ...copy[index],
        quantityAccepted: validAccepted,
        quantityRejected: Math.max(0, receiving - validAccepted),
      };
      return copy;
    });
  };

  const handleRejectedChange = (index: number, rejectedVal: number) => {
    setItemsToReceive((prev) => {
      const copy = [...prev];
      const receiving = copy[index].quantityReceiving;
      const validRejected = Math.max(0, Math.min(rejectedVal, receiving));
      copy[index] = {
        ...copy[index],
        quantityRejected: validRejected,
        quantityAccepted: Math.max(0, receiving - validRejected),
      };
      return copy;
    });
  };

  const handleFieldChange = (index: number, field: string, val: any) => {
    setItemsToReceive((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Calculations
  const totalReceivingCount = itemsToReceive.reduce((sum, i) => sum + Number(i.quantityReceiving), 0);
  const totalAcceptedCount = itemsToReceive.reduce((sum, i) => sum + Number(i.quantityAccepted), 0);
  const totalRejectedCount = itemsToReceive.reduce((sum, i) => sum + Number(i.quantityRejected), 0);
  const totalDeliveryValue = itemsToReceive.reduce((sum, i) => sum + Number(i.quantityAccepted) * Number(i.unitCost), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoId) {
      setError('Please select an approved Purchase Order');
      return;
    }
    if (itemsToReceive.length === 0 || totalReceivingCount === 0) {
      setError('At least one item must have a receiving quantity greater than zero');
      return;
    }

    // Validation for rejection reason
    for (const item of itemsToReceive) {
      if (item.quantityRejected > 0 && !item.rejectionReason.trim()) {
        setError(`Please provide a rejection reason for ${item.itemName}`);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      await onSave({
        purchaseOrderId: selectedPoId,
        deliveryNoteNumber,
        receivedDate,
        notes,
        items: itemsToReceive
          .filter((i) => i.quantityReceiving > 0)
          .map((i) => ({
            purchaseOrderItemId: i.purchaseOrderItemId,
            inventoryItemId: i.inventoryItemId,
            quantityReceiving: Number(i.quantityReceiving),
            quantityAccepted: Number(i.quantityAccepted),
            quantityRejected: Number(i.quantityRejected),
            rejectionReason: i.rejectionReason,
            unitCost: Number(i.unitCost),
            batchNumber: i.batchNumber,
            expiryDate: i.expiryDate || undefined,
          })),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process Goods Received Note');
    } finally {
      setLoading(false);
    }
  };

  const selectedPo = purchaseOrders.find((p) => p.id === selectedPoId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4" />
              Stock Receiving &amp; Verification
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-0.5">Goods Received Note (GRN)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* PO Selector & Delivery Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Approved Purchase Order <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={selectedPoId}
                onChange={(e) => setSelectedPoId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-emerald-200 bg-white text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Choose Approved PO --</option>
                {eligiblePOs.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.poNumber} — {po.supplier?.name} ({po.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Delivery / Invoice Ref #</label>
              <input
                type="text"
                value={deliveryNoteNumber}
                onChange={(e) => setDeliveryNoteNumber(e.target.value)}
                placeholder="e.g. DN-8921"
                className="w-full px-3 py-2.5 rounded-xl border border-emerald-200 bg-white text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Receiving Date</label>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-emerald-200 bg-white text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {selectedPo && (
            <div className="flex flex-wrap items-center gap-4 text-xs bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
              <span className="text-slate-600">
                Supplier: <strong className="text-slate-900">{selectedPo.supplier?.name}</strong>
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600">
                PO Category: <strong className="text-slate-900">{selectedPo.inventoryCategory}</strong>
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600">
                Destination: <strong className="text-slate-900">{selectedPo.deliveryLocation || 'General Store'}</strong>
              </span>
            </div>
          )}

          {/* Items Table */}
          <div className="space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 block">
              Received Items &amp; Quality Inspection
            </span>

            {itemsToReceive.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                No pending items found for receiving on this Purchase Order.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">Item Details</th>
                      <th className="py-2.5 px-2 w-20 text-center">Remaining</th>
                      <th className="py-2.5 px-2 w-24 text-center">Receiving</th>
                      <th className="py-2.5 px-2 w-24 text-center">Accepted</th>
                      <th className="py-2.5 px-2 w-24 text-center">Rejected</th>
                      <th className="py-2.5 px-3">Rejection Reason / Batch</th>
                      <th className="py-2.5 px-3 w-24 text-right">Delivered Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {itemsToReceive.map((line, idx) => (
                      <tr key={line.purchaseOrderItemId} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 block">{line.itemName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {line.itemCode} • {line.purchaseUnit} (factor: {line.conversionFactor})
                          </span>
                        </td>

                        <td className="py-2.5 px-2 text-center font-bold text-slate-600 font-mono">
                          {line.remainingQuantity}
                        </td>

                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            min="0"
                            max={line.remainingQuantity}
                            step="any"
                            value={line.quantityReceiving}
                            onChange={(e) => handleReceivingChange(idx, parseFloat(e.target.value) || 0)}
                            className="w-full py-1 px-2 rounded-lg border border-slate-300 text-xs font-bold text-center focus:ring-2 focus:ring-emerald-500"
                          />
                        </td>

                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            min="0"
                            max={line.quantityReceiving}
                            step="any"
                            value={line.quantityAccepted}
                            onChange={(e) => handleAcceptedChange(idx, parseFloat(e.target.value) || 0)}
                            className="w-full py-1 px-2 rounded-lg border border-emerald-300 bg-emerald-50/40 text-emerald-800 text-xs font-bold text-center focus:ring-2 focus:ring-emerald-500"
                          />
                        </td>

                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            min="0"
                            max={line.quantityReceiving}
                            step="any"
                            value={line.quantityRejected}
                            onChange={(e) => handleRejectedChange(idx, parseFloat(e.target.value) || 0)}
                            className={`w-full py-1 px-2 rounded-lg border text-xs font-bold text-center focus:ring-2 focus:ring-rose-500 ${
                              line.quantityRejected > 0
                                ? 'border-rose-300 bg-rose-50 text-rose-800'
                                : 'border-slate-200 text-slate-400'
                            }`}
                          />
                        </td>

                        <td className="py-2.5 px-3 space-y-1">
                          {line.quantityRejected > 0 ? (
                            <input
                              type="text"
                              required
                              value={line.rejectionReason}
                              onChange={(e) => handleFieldChange(idx, 'rejectionReason', e.target.value)}
                              placeholder="Reason (e.g. Broken bottles, expired)"
                              className="w-full py-1 px-2 rounded-lg border border-rose-300 text-[11px] bg-rose-50/30 text-rose-900"
                            />
                          ) : (
                            <input
                              type="text"
                              value={line.batchNumber}
                              onChange={(e) => handleFieldChange(idx, 'batchNumber', e.target.value)}
                              placeholder="Batch # (Optional)"
                              className="w-full py-1 px-2 rounded-lg border border-slate-200 text-[11px]"
                            />
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          Rs. {(line.quantityAccepted * line.unitCost).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Validation Notice & Totals */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 text-white shadow-lg">
            <div className="text-xs text-slate-300 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                <strong>Stock Update Guarantee:</strong> Inventory stock balances will increment strictly by the{' '}
                <strong className="text-emerald-300">{totalAcceptedCount} Accepted Units</strong>. Rejected quantities
                will NOT increase inventory.
              </span>
            </div>

            <div className="flex items-center gap-6 shrink-0 font-mono text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Receiving</span>
                <span className="font-bold text-slate-200">{totalReceivingCount}</span>
              </div>
              <div>
                <span className="text-emerald-400 block text-[10px] uppercase">Accepted</span>
                <span className="font-bold text-emerald-400">{totalAcceptedCount}</span>
              </div>
              {totalRejectedCount > 0 && (
                <div>
                  <span className="text-rose-400 block text-[10px] uppercase">Rejected</span>
                  <span className="font-bold text-rose-400">{totalRejectedCount}</span>
                </div>
              )}
              <div className="border-l border-slate-700 pl-4">
                <span className="text-emerald-400 block text-[10px] uppercase font-bold">Added Stock Value</span>
                <span className="text-lg font-black text-emerald-400">Rs. {totalDeliveryValue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || itemsToReceive.length === 0}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Finalizing GRN & Stock...' : 'Confirm GRN & Receive Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
