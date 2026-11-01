'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { channelManagerApi } from '@/lib/api';
import {
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  BedDouble,
} from 'lucide-react';

export default function InventoryGridPage() {
  const [gridData, setGridData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysCount, setDaysCount] = useState<number>(14);

  useEffect(() => {
    loadGrid();
  }, [daysCount]);

  const loadGrid = async () => {
    setLoading(true);
    try {
      const data = await channelManagerApi.getAvailabilityGrid(daysCount);
      setGridData(data || []);
    } catch (err: any) {
      alert('Failed to load availability grid: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Group by roomTypeName
  const roomTypesMap = new Map<string, any[]>();
  for (const item of gridData) {
    const list = roomTypesMap.get(item.roomTypeName) || [];
    list.push(item);
    roomTypesMap.set(item.roomTypeName, list);
  }

  // Unique sorted dates
  const dates = Array.from(new Set(gridData.map((g) => g.date))).sort();

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link href="/dashboard/channel-manager" className="hover:text-indigo-600">
                Channel Manager
              </Link>
              <span>/</span>
              <span className="font-semibold text-slate-700">Inventory Matrix</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Availability & Restrictions Matrix
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Derived in real-time from active PMS room counts minus confirmed stays. Never allows overbooking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-xl border border-slate-200 flex items-center text-xs font-bold shadow-xs">
              <button
                onClick={() => setDaysCount(14)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  daysCount === 14 ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                14 Days
              </button>
              <button
                onClick={() => setDaysCount(30)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  daysCount === 30 ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                30 Days
              </button>
            </div>

            <button
              onClick={loadGrid}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Grid
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500"></span>
            <span>Available (3+ rooms)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-500"></span>
            <span>Low Inventory (1-2 rooms)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-500"></span>
            <span>Sold Out / Stop Sell</span>
          </div>
        </div>

        {/* Grid Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                  <th className="p-3 text-left min-w-[200px] sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                    Room Type / Capacity
                  </th>
                  {dates.map((d) => {
                    const dateObj = new Date(d);
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                    const dayNum = dateObj.getDate();
                    const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
                    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                    return (
                      <th
                        key={d}
                        className={`p-2 min-w-[70px] border-r border-slate-200 font-semibold ${
                          isWeekend ? 'bg-indigo-50/40 text-indigo-950 font-bold' : ''
                        }`}
                      >
                        <div className="text-[10px] text-slate-400 uppercase">{dayName}</div>
                        <div className="text-sm font-extrabold text-slate-800">{dayNum}</div>
                        <div className="text-[9px] text-slate-400 uppercase">{monthName}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {Array.from(roomTypesMap.entries()).map(([roomTypeName, items]) => {
                  const total = items[0]?.totalRooms || 0;
                  const basePrice = items[0]?.basePrice || 0;

                  return (
                    <tr key={roomTypeName} className="hover:bg-slate-50/40 transition">
                      {/* Fixed Room Type Column */}
                      <td className="p-3 text-left sticky left-0 bg-white z-10 border-r border-slate-200 shadow-xs">
                        <div className="font-extrabold text-slate-900">{roomTypeName}</div>
                        <div className="text-[11px] text-slate-500">
                          {total} Total Rooms • LKR {basePrice.toLocaleString()}
                        </div>
                      </td>

                      {/* Date Cells */}
                      {dates.map((d) => {
                        const cell = items.find((i) => i.date === d);
                        const available = cell?.availableRooms ?? total;
                        const stopSell = cell?.stopSell ?? false;

                        let colorClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                        if (available <= 0 || stopSell) {
                          colorClass = 'bg-rose-50 text-rose-800 border-rose-200 font-extrabold';
                        } else if (available <= 2) {
                          colorClass = 'bg-amber-50 text-amber-800 border-amber-200 font-bold';
                        }

                        return (
                          <td key={d} className="p-1 border-r border-slate-100">
                            <div
                              className={`p-2 rounded-xl border flex flex-col items-center justify-center transition ${colorClass}`}
                            >
                              <span className="text-sm font-black">{available}</span>
                              <span className="text-[9px] uppercase tracking-tighter opacity-75">
                                {stopSell || available === 0 ? 'Closed' : 'Avail'}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
