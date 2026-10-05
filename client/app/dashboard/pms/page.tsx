'use client';

// PMS (Property Management System) Executive Hub & Front Desk Overview
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { pmsApi, authStorage } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import {
  BedDouble,
  DoorOpen,
  CalendarCheck,
  Key,
  Users,
  Sparkles,
  Broom,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Plus,
  UtensilsCrossed,
  ShieldCheck,
  AlertCircle,
  Building,
} from 'lucide-react';

export default function PMSDashboardHub() {
  const [property, setProperty] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomFilter, setRoomFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'DIRTY'>('ALL');

  const loadData = async () => {
    try {
      setLoading(true);
      const [roomsData, typesData, resData] = await Promise.all([
        pmsApi.getRooms(),
        pmsApi.getRoomTypes(),
        pmsApi.getReservations(),
      ]);
      setRooms(roomsData || []);
      setRoomTypes(typesData || []);
      setReservations(resData || []);
    } catch (err) {
      console.error('Failed to load PMS Overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setProperty(authStorage.getProperty());
    loadData();

    const socket = getSocket();
    if (!socket) return;

    const onRoomUpdate = (updatedRoom: any) => {
      setRooms((prev) =>
        prev.map((r) => (r.id === updatedRoom.id ? { ...r, ...updatedRoom } : r)),
      );
    };

    socket.on('room:updated', onRoomUpdate);
    return () => {
      socket.off('room:updated', onRoomUpdate);
    };
  }, []);

  // Metrics computation
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.status === 'OCCUPIED').length;
  const availableRooms = rooms.filter((r) => r.status === 'AVAILABLE').length;
  const reservedRooms = rooms.filter((r) => r.status === 'RESERVED').length;
  const maintenanceRooms = rooms.filter(
    (r) => r.status === 'MAINTENANCE' || r.status === 'OUT_OF_SERVICE',
  ).length;

  const dirtyRooms = rooms.filter((r) => r.cleanlinessStatus === 'DIRTY').length;
  const inCleaningRooms = rooms.filter(
    (r) => r.cleanlinessStatus === 'IN_CLEANING',
  ).length;
  const cleanRooms = rooms.filter(
    (r) => r.cleanlinessStatus === 'CLEAN' || r.cleanlinessStatus === 'INSPECTED',
  ).length;

  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  // In-house reservations & today's arrivals
  const inHouseGuests = reservations.filter((r) => r.status === 'CHECKED_IN');
  const todayStr = new Date().toISOString().split('T')[0];
  const pendingArrivals = reservations.filter(
    (r) => r.status === 'CONFIRMED' && r.checkInDate?.startsWith(todayStr),
  );
  const pendingDepartures = reservations.filter(
    (r) => r.status === 'CHECKED_IN' && r.checkOutDate?.startsWith(todayStr),
  );

  const filteredRooms = rooms.filter((r) => {
    if (roomFilter === 'AVAILABLE') return r.status === 'AVAILABLE';
    if (roomFilter === 'OCCUPIED') return r.status === 'OCCUPIED';
    if (roomFilter === 'DIRTY') return r.cleanlinessStatus === 'DIRTY' || r.cleanlinessStatus === 'IN_CLEANING';
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-[#064E3B] via-[#0D9488] to-[#0284C7] p-8 text-white shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-emerald-200 mb-3 border border-white/10">
                <Sparkles className="w-3.5 h-3.5" />
                <span>PMS &amp; Front Desk Operations</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                {property?.name || 'Grand Horizon Hotel & Resort'}
              </h1>
              <p className="text-emerald-100/90 text-sm mt-1 max-w-xl">
                Real-time room inventory, guest folios, housekeeping workflows, and cross-outlet billing.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadData}
                disabled={loading}
                className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-xs font-bold transition-all flex items-center gap-2 border border-white/20"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Sync Board</span>
              </button>
              <Link
                href="/dashboard/pms/front-desk"
                className="px-5 py-2.5 rounded-2xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold transition-all shadow-lg flex items-center gap-2"
              >
                <Key className="w-4 h-4" />
                <span>Front Desk Folios</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Live KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Occupancy Rate */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Occupancy Rate
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#00C48C] flex items-center justify-center font-bold text-xs">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-[#0F172A]">
                {occupancyRate}%
              </span>
              <span className="text-xs text-[#64748B]">
                ({occupiedRooms}/{totalRooms} rooms)
              </span>
            </div>
            <div className="mt-3 w-full bg-[#F1F5F9] rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#00C48C] h-full rounded-full transition-all duration-500"
                style={{ width: `${occupancyRate}%` }}
              />
            </div>
          </div>

          {/* Available Rooms */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Available Ready
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0284C7] flex items-center justify-center font-bold text-xs">
                <DoorOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-[#0284C7]">
                {availableRooms}
              </span>
              <span className="text-xs text-[#64748B]">ready for check-in</span>
            </div>
            <div className="mt-3 text-[11px] text-[#64748B] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>{cleanRooms} Clean / Inspected</span>
            </div>
          </div>

          {/* In-House Guests */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                In-House Stays
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#7C3AED] flex items-center justify-center font-bold text-xs">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-[#7C3AED]">
                {inHouseGuests.length}
              </span>
              <span className="text-xs text-[#64748B]">active folios</span>
            </div>
            <div className="mt-3 text-[11px] text-[#64748B] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span>Folio room charges active</span>
            </div>
          </div>

          {/* Housekeeping Needs */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Housekeeping
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
                <Broom className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-amber-600">
                {dirtyRooms + inCleaningRooms}
              </span>
              <span className="text-xs text-[#64748B]">rooms to clean</span>
            </div>
            <div className="mt-3 text-[11px] text-[#64748B] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>{dirtyRooms} Dirty · {inCleaningRooms} In Cleaning</span>
            </div>
          </div>
        </div>

        {/* Quick Nav Operational Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. Front Desk & Folios */}
          <Link
            href="/dashboard/pms/front-desk"
            className="group relative bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xs hover:shadow-md hover:border-[#00C48C] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#00C48C] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Key className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0F172A]">Front Desk &amp; Folios</h3>
              <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                Execute guest check-ins, settle itemized folios, post room charges, and print official statements.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-[#00C48C]">
              <span>Open Front Desk</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* 2. Room Inventory & Housekeeping */}
          <Link
            href="/dashboard/pms/rooms"
            className="group relative bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xs hover:shadow-md hover:border-[#0284C7] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0284C7] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BedDouble className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0F172A]">Rooms &amp; Housekeeping Board</h3>
              <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                Live floor-plan matrix, update cleanliness states (Clean, Dirty, Inspected), and configure Room Types.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-[#0284C7]">
              <span>Manage Rooms &amp; Cleanliness</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* 3. Reservations & Stays */}
          <Link
            href="/dashboard/pms/reservations"
            className="group relative bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xs hover:shadow-md hover:border-[#7C3AED] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#7C3AED] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0F172A]">Reservations &amp; Bookings</h3>
              <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                Create new walk-in or advance reservations, search guest profiles, calculate rate totals, and track deposits.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-[#7C3AED]">
              <span>Browse All Bookings</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Today's Stays & Quick Room Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active In-House Guests / Arrivals Panel */}
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xs lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#0F172A]">In-House Guests</h3>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-[#00C48C]">
                {inHouseGuests.length} Guests
              </span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {inHouseGuests.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#94A3B8]">
                  No guests currently checked in.
                </div>
              ) : (
                inHouseGuests.map((res: any) => (
                  <div
                    key={res.id}
                    className="p-3.5 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-md bg-[#0F172A] text-white">
                          #{res.room?.roomNumber || '—'}
                        </span>
                        <span className="font-bold text-xs text-[#0F172A]">
                          {res.guest?.fullName}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#64748B] mt-1">
                        Out: {res.checkOutDate?.split('T')[0]} · {res.roomType?.name}
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/pms/front-desk?resId=${res.id}`}
                      className="text-xs font-bold text-[#00C48C] hover:underline shrink-0"
                    >
                      Folio →
                    </Link>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-[#F1F5F9]">
              <Link
                href="/dashboard/pms/reservations"
                className="w-full py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC] flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Booking</span>
              </Link>
            </div>
          </div>

          {/* Quick Room Inventory Grid */}
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xs lg:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Room Inventory Status</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Live occupancy and cleanliness states across all floors
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-[#F1F5F9] rounded-xl text-xs font-bold">
                {(['ALL', 'AVAILABLE', 'OCCUPIED', 'DIRTY'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setRoomFilter(tab)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      roomFilter === tab
                        ? 'bg-white text-[#0F172A] shadow-xs'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Room Pills Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-96 overflow-y-auto pr-1">
              {filteredRooms.map((room) => {
                const isOccupied = room.status === 'OCCUPIED';
                const isClean = room.cleanlinessStatus === 'CLEAN' || room.cleanlinessStatus === 'INSPECTED';

                return (
                  <div
                    key={room.id}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isOccupied
                        ? 'bg-purple-50/50 border-purple-200'
                        : room.status === 'MAINTENANCE'
                        ? 'bg-rose-50/50 border-rose-200'
                        : 'bg-emerald-50/50 border-emerald-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm font-extrabold text-[#0F172A]">
                        #{room.roomNumber}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isOccupied
                            ? 'bg-purple-600'
                            : room.status === 'MAINTENANCE'
                            ? 'bg-rose-600'
                            : 'bg-[#00C48C]'
                        }`}
                      />
                    </div>
                    <div className="text-[10.5px] font-bold text-[#64748B] truncate">
                      {room.roomType?.name || 'Standard'}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className="font-bold text-[#0F172A]">{room.status}</span>
                      <span
                        className={`font-semibold ${
                          isClean ? 'text-[#00C48C]' : 'text-amber-600 font-bold'
                        }`}
                      >
                        {room.cleanlinessStatus}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-[#F1F5F9] flex items-center justify-between text-xs text-[#64748B]">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00C48C]" /> Available
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600" /> Occupied
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Dirty
                </span>
              </div>
              <Link
                href="/dashboard/pms/rooms"
                className="font-bold text-[#00C48C] hover:underline flex items-center gap-1"
              >
                <span>Full Housekeeping Board</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
