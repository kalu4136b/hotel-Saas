'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { posApi } from '@/lib/api';
import { getSocket, playKitchenChime } from '@/lib/socket';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Flame,
  UtensilsCrossed,
  RefreshCw,
  Bell,
  BellOff,
  Radio,
  Wifi,
  WifiOff,
  Volume2,
} from 'lucide-react';

export default function KitchenDisplayPage() {
  const [kots, setKots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newTicketHighlightId, setNewTicketHighlightId] = useState<string | null>(null);
  const [notificationBanner, setNotificationBanner] = useState<string | null>(null);

  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const loadKots = useCallback(async () => {
    try {
      setLoading(true);
      const data = await posApi.getKitchenKots();
      setKots(data);
    } catch (err) {
      console.error('Failed to load kitchen tickets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Setup WebSocket connection and event handlers
  useEffect(() => {
    loadKots();

    // Check stored sound preference
    const storedSound = localStorage.getItem('kds_sound_enabled');
    if (storedSound !== null) {
      setSoundEnabled(storedSound === 'true');
    }

    const socket = getSocket();
    if (!socket) return;

    if (socket.connected) {
      setWsConnected(true);
    }

    const onConnect = () => {
      setWsConnected(true);
    };

    const onDisconnect = () => {
      setWsConnected(false);
    };

    const onNewKot = (kot: any) => {
      console.log('⚡ [KDS] Real-time KOT received:', kot);

      // Play audio chime
      if (soundEnabledRef.current) {
        playKitchenChime();
      }

      // Prepend or update ticket in state
      setKots((prev) => {
        const exists = prev.some((k) => k.id === kot.id);
        if (exists) {
          return prev.map((k) => (k.id === kot.id ? kot : k));
        }
        return [kot, ...prev];
      });

      // Highlight new ticket
      setNewTicketHighlightId(kot.id);
      setNotificationBanner(`New Order Ticket #${kot.kotNumber} for ${kot.tableNumber || 'Takeaway'}`);

      // Clear highlight after 6 seconds
      setTimeout(() => {
        setNewTicketHighlightId((curr) => (curr === kot.id ? null : curr));
      }, 6000);

      setTimeout(() => {
        setNotificationBanner(null);
      }, 5000);
    };

    const onKotUpdated = (kot: any) => {
      console.log('⚡ [KDS] KOT updated:', kot);
      setKots((prev) =>
        prev.map((k) => (k.id === kot.id ? { ...k, ...kot } : k)),
      );
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('events:kot:new', onNewKot);
    socket.on('events:kot:updated', onKotUpdated);

    // Fallback sync polling every 30s in case socket drops
    const fallbackInterval = setInterval(() => {
      if (!socket.connected) {
        loadKots();
      }
    }, 30000);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('events:kot:new', onNewKot);
      socket.off('events:kot:updated', onKotUpdated);
      clearInterval(fallbackInterval);
    };
  }, [loadKots]);

  const toggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem('kds_sound_enabled', String(nextVal));
    if (nextVal) {
      playKitchenChime();
    }
  };

  const handleUpdateStatus = async (kotId: string, status: string) => {
    try {
      await posApi.updateKotStatus(kotId, status);
      // Local optimistic update for instantaneous UI reaction
      setKots((prev) =>
        prev.map((k) => (k.id === kotId ? { ...k, status } : k)),
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
      loadKots();
    }
  };

  const activeKots = kots.filter(
    (k) => k.status === 'PENDING' || k.status === 'IN_PREPARATION' || k.status === 'READY',
  );

  const getElapsedTime = (createdAt: string) => {
    if (!createdAt) return '';
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m ago`;
  };

  return (
    <DashboardLayout>
      {/* Top Banner for Real-Time Arrival Toast */}
      {notificationBanner && (
        <div className="mb-4 p-3 rounded-2xl bg-[#00C48C] text-white flex items-center justify-between shadow-lg shadow-[#00C48C]/20 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5">
            <span className="p-1 rounded-lg bg-white/20">
              <Bell className="w-4 h-4 animate-bounce" />
            </span>
            <span className="text-xs font-bold tracking-wide">{notificationBanner}</span>
          </div>
          <span className="text-[10px] font-semibold bg-white/25 px-2 py-0.5 rounded-full uppercase tracking-wider">
            Live Dispatched
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Kitchen Display System (KDS)
            </h1>

            {/* WebSocket Live Status Indicator */}
            {wsConnected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] text-[11px] font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#00C48C] animate-pulse" />
                <span>Live Socket</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Polling Fallback</span>
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Real-time instant kitchen order ticket pipeline dispatched from POS cashiers & table runners.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Sound Notification Toggle */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Kitchen chime sound is ON (click to mute)' : 'Kitchen chime sound is MUTED (click to enable)'}
            className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs ${
              soundEnabled
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8] hover:bg-white'
            }`}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Chime Active</span>
              </>
            ) : (
              <>
                <BellOff className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span>Chime Muted</span>
              </>
            )}
          </button>

          {/* Audio Chime Preview Test Button */}
          <button
            onClick={playKitchenChime}
            title="Test Kitchen Bell Sound"
            className="p-2 rounded-xl border border-[#E2E8F0] hover:bg-white bg-[#F8FAFC] text-[#64748B] transition-all shadow-2xs"
          >
            <Bell className="w-3.5 h-3.5" />
          </button>

          {/* Manual Sync Button */}
          <button
            onClick={loadKots}
            disabled={loading}
            className="py-2 px-3 rounded-xl border border-[#E2E8F0] hover:bg-white bg-[#F8FAFC] text-xs font-semibold text-[#64748B] transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Board</span>
          </button>
        </div>
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
            All kitchen orders have been prepared and served. New tickets dispatched from POS terminals will chime and appear instantly via WebSockets.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {activeKots.map((kot) => {
            const isPending = kot.status === 'PENDING';
            const isPreparing = kot.status === 'IN_PREPARATION';
            const isReady = kot.status === 'READY';
            const isHighlighted = newTicketHighlightId === kot.id;

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
                className={`bg-white rounded-2xl border shadow-xs overflow-hidden flex flex-col justify-between transition-all duration-300 ${
                  isHighlighted
                    ? 'border-[#00C48C] ring-4 ring-[#00C48C]/20 scale-[1.01]'
                    : 'border-[#E2E8F0]'
                }`}
              >
                {/* Ticket Header */}
                <div className={`p-3.5 border-b ${headerBg} flex items-center justify-between`}>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono tracking-wider uppercase opacity-85">
                        {kot.kotNumber}
                      </span>
                      {kot.createdAt && (
                        <span className="text-[10px] opacity-75 flex items-center gap-1">
                          • <Clock className="w-2.5 h-2.5 inline" /> {getElapsedTime(kot.createdAt)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-extrabold truncate mt-0.5">
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
                          <span className="font-bold text-[#0F172A] block text-[13px]">
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
                      className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>Start Cooking</span>
                    </button>
                  )}

                  {isPreparing && (
                    <button
                      onClick={() => handleUpdateStatus(kot.id, 'READY')}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Ready</span>
                    </button>
                  )}

                  {isReady && (
                    <button
                      onClick={() => handleUpdateStatus(kot.id, 'SERVED')}
                      className="w-full py-2.5 px-3 rounded-xl border-2 border-[#00C48C] text-[#00C48C] hover:bg-[#00C48C] hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
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
