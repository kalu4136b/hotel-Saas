'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { posApi } from '@/lib/api';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Flame,
  UtensilsCrossed,
  RefreshCw,
  Bell,
} from 'lucide-react';

export default function KitchenDisplayPage() {
  const [kots, setKots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadKots = async () => {
    try {
      setLoading(true);
      const data = await posApi.getKitchenKots();
      setKots(data);
    } catch (err) {
      console.error('Failed to load kitchen tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKots();
    const interval = setInterval(loadKots, 10000); // 10s auto-refresh for kitchen display
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (kotId: string, status: string) => {
    try {
      await posApi.updateKotStatus(kotId, status);
      loadKots();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const activeKots = kots.filter(
    (k) => k.status === 'PENDING' || k.status === 'IN_PREPARATION' || k.status === 'READY',
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Kitchen Display System (KDS)
            </h1>
            <span className="w-2.5 h-2.5 rounded-full bg-[#00C48C] animate-pulse" />
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Live kitchen order tickets dispatched from POS terminals. Auto-syncs every 10 seconds.
          </p>
        </div>

        <button
          onClick={loadKots}
          disabled={loading}
          className="py-2 px-3 rounded-xl border border-[#E2E8F0] hover:bg-white bg-[#F8FAFC] text-xs font-semibold text-[#64748B] transition-all flex items-center gap-1.5 shadow-2xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Kitchen Board</span>
        </button>
      </div>

      {activeKots.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#ECFDF5] text-[#00C48C] flex items-center justify-center mx-auto mb-3">
            <ChefHat className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[#0F172A] mb-1">
            Kitchen Queue is Clear
          </h3>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto">
            All kitchen orders have been prepared and served. New tickets from POS terminals will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {activeKots.map((kot) => {
            const isPending = kot.status === 'PENDING';
            const isPreparing = kot.status === 'IN_PREPARATION';
            const isReady = kot.status === 'READY';

            let headerBg = 'bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A]';
            let statusPill = 'bg-amber-100 text-amber-800 border-amber-200';

            if (isPreparing) {
              headerBg = 'bg-amber-500 text-white border-amber-600';
              statusPill = 'bg-white text-amber-800 border-white/40';
            } else if (isReady) {
              headerBg = 'bg-[#00C48C] text-white border-[#00A877]';
              statusPill = 'bg-white text-[#065F46] border-white/40';
            }

            return (
              <div
                key={kot.id}
                className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden flex flex-col justify-between"
              >
                {/* Ticket Header */}
                <div className={`p-3.5 border-b ${headerBg} flex items-center justify-between`}>
                  <div>
                    <span className="text-[10px] font-mono tracking-wider uppercase opacity-80">
                      {kot.kotNumber}
                    </span>
                    <h3 className="text-sm font-extrabold truncate">
                      {kot.tableNumber || 'Takeaway'}
                    </h3>
                  </div>

                  <span className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${statusPill}`}>
                    {kot.status}
                  </span>
                </div>

                {/* Ticket Items */}
                <div className="p-4 space-y-3 flex-1">
                  <div className="divide-y divide-[#F1F5F9] text-xs">
                    {kot.items?.map((item: any) => (
                      <div key={item.id} className="py-2 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-[#0F172A] block">
                            {item.quantity}x {item.productName}
                          </span>
                          {item.notes && (
                            <span className="text-[11px] text-amber-700 italic block mt-0.5">
                              Note: {item.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {kot.notes && (
                    <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#64748B]">
                      <span className="font-bold text-[#0F172A] block">Chef Note:</span>
                      {kot.notes}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="p-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex gap-2">
                  {isPending && (
                    <button
                      onClick={() => handleUpdateStatus(kot.id, 'IN_PREPARATION')}
                      className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>Start Cooking</span>
                    </button>
                  )}

                  {isPreparing && (
                    <button
                      onClick={() => handleUpdateStatus(kot.id, 'READY')}
                      className="w-full py-2 px-3 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Ready</span>
                    </button>
                  )}

                  {isReady && (
                    <button
                      onClick={() => handleUpdateStatus(kot.id, 'SERVED')}
                      className="w-full py-2 px-3 rounded-xl border border-[#00C48C] text-[#00C48C] hover:bg-[#00C48C] hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <UtensilsCrossed className="w-3.5 h-3.5" />
                      <span>Mark as Served</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
