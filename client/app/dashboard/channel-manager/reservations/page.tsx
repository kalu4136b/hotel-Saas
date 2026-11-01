'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { channelManagerApi } from '@/lib/api';
import {
  Zap,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Calendar,
  User,
  DollarSign,
  Tag,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export default function ChannelReservationsPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('');

  useEffect(() => {
    loadReservations();
  }, [channelFilter]);

  const loadReservations = async () => {
    setLoading(true);
    try {
      const data = await channelManagerApi.getReservations(
        channelFilter || undefined,
        searchQuery || undefined,
      );
      setReservations(data || []);
    } catch (err: any) {
      alert('Failed to load channel reservations: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadReservations();
  };

  const getChannelBadge = (code: string) => {
    switch (code) {
      case 'BOOKING_COM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            Booking.com
          </span>
        );
      case 'EXPEDIA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-50 text-yellow-800 border border-yellow-200">
            Expedia
          </span>
        );
      case 'AGODA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
            Agoda
          </span>
        );
      case 'AIRBNB':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
            Airbnb
          </span>
        );
      case 'TRIPADVISOR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            Tripadvisor
          </span>
        );
      case 'ICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
            iCal Feed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200">
            {code}
          </span>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link href="/dashboard/channel-manager" className="hover:text-indigo-600">
                Channel Manager
              </Link>
              <span>/</span>
              <span className="font-semibold text-slate-700">Reservations</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              OTA Imported Reservations
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live inbound reservations imported from connected Online Travel Agencies and synchronized with PMS folios.
            </p>
          </div>

          <button
            onClick={loadReservations}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guest or OTA reference..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
            >
              <option value="">All Channels</option>
              <option value="BOOKING_COM">Booking.com</option>
              <option value="EXPEDIA">Expedia</option>
              <option value="AGODA">Agoda</option>
              <option value="AIRBNB">Airbnb</option>
              <option value="TRIPADVISOR">Tripadvisor</option>
              <option value="ICAL">iCal Feed</option>
            </select>
          </div>
        </div>

        {/* Reservations Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase">
                  <th className="p-3">Channel</th>
                  <th className="p-3">External OTA Reference</th>
                  <th className="p-3">PMS Reservation #</th>
                  <th className="p-3">Guest Name</th>
                  <th className="p-3">Stay Dates</th>
                  <th className="p-3">Room Type</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Commission</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">PMS Folio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reservations.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      No external channel reservations found. Inbound bookings will appear here automatically.
                    </td>
                  </tr>
                ) : (
                  reservations.map((cr) => {
                    const res = cr.reservation;
                    return (
                      <tr key={cr.id} className="hover:bg-slate-50/60 transition">
                        <td className="p-3">{getChannelBadge(cr.channelCode)}</td>
                        <td className="p-3 font-mono font-bold text-slate-800">
                          {cr.externalReservationId}
                        </td>
                        <td className="p-3 font-mono text-indigo-700 font-semibold">
                          {res?.reservationNumber || '—'}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">
                            {res?.guest?.fullName || 'External Guest'}
                          </div>
                          {res?.guest?.email && (
                            <div className="text-[10px] text-slate-400">{res.guest.email}</div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-slate-800">
                            {res?.checkInDate} → {res?.checkOutDate}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {res?.nightsCount || 1} nights • {res?.adultsCount || 2} guests
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-slate-700">
                          {res?.roomType?.name || 'Standard Room'}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">
                          LKR {Number(cr.channelTotalAmount || res?.totalAmount || 0).toLocaleString()}
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          LKR {Number(cr.channelCommissionAmount || 0).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              cr.channelStatus === 'CANCELLED'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {cr.channelStatus === 'CANCELLED' ? (
                              <XCircle className="w-3 h-3" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            {cr.channelStatus}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {res?.id ? (
                            <Link
                              href={`/dashboard/pms/front-desk?reservationId=${res.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                            >
                              Folio <ExternalLink className="w-3 h-3" />
                            </Link>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
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
    </DashboardLayout>
  );
}
