'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { pmsApi } from '@/lib/api';
import {
  CalendarCheck,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Key,
  DoorOpen,
  DollarSign,
  User,
  Clock,
  CheckCircle2,
  X,
  CreditCard,
  Luggage,
} from 'lucide-react';
import Link from 'next/link';

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT'>('ALL');

  // New Booking Modal State
  const [newBookingModalOpen, setNewBookingModalOpen] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [newBooking, setNewBooking] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    passportOrId: '',
    nationality: 'United States',
    roomTypeId: '',
    roomId: '',
    checkInDate: new Date().toISOString().split('T')[0],
    checkOutDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    adultsCount: 2,
    childrenCount: 0,
    depositPaid: 0,
    source: 'DIRECT',
    specialRequests: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resData, typesData, roomsData] = await Promise.all([
        pmsApi.getReservations(),
        pmsApi.getRoomTypes(),
        pmsApi.getRooms(),
      ]);
      setReservations(resData);
      setRoomTypes(typesData);
      setAvailableRooms(roomsData);
      if (typesData.length > 0 && !newBooking.roomTypeId) {
        setNewBooking((prev) => ({ ...prev, roomTypeId: typesData[0].id }));
      }
    } catch (err: any) {
      alert('Failed to load reservations: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingBooking(true);
    try {
      await pmsApi.createReservation({
        guestName: newBooking.guestName,
        guestEmail: newBooking.guestEmail,
        guestPhone: newBooking.guestPhone,
        passportOrId: newBooking.passportOrId,
        nationality: newBooking.nationality,
        roomTypeId: newBooking.roomTypeId,
        roomId: newBooking.roomId || undefined,
        checkInDate: newBooking.checkInDate,
        checkOutDate: newBooking.checkOutDate,
        adultsCount: Number(newBooking.adultsCount),
        childrenCount: Number(newBooking.childrenCount),
        depositPaid: Number(newBooking.depositPaid) || 0,
        source: newBooking.source,
        specialRequests: newBooking.specialRequests,
      });

      setNewBookingModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Failed to create reservation: ' + err.message);
    } finally {
      setCreatingBooking(false);
    }
  };

  const filteredReservations = reservations.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      r.reservationNumber?.toLowerCase().includes(q) ||
      r.guest?.fullName?.toLowerCase().includes(q) ||
      r.room?.roomNumber?.toLowerCase().includes(q) ||
      r.roomType?.name?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (statusFilter === 'CONFIRMED') return r.status === 'CONFIRMED';
    if (statusFilter === 'CHECKED_IN') return r.status === 'CHECKED_IN';
    if (statusFilter === 'CHECKED_OUT') return r.status === 'CHECKED_OUT';

    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C48C] animate-pulse"></span>
              Real MySQL Reservations & Booking Engine
            </div>
            <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
              Reservations & Guest Stays
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Manage arrivals, assign room keys, handle deposits, and track stay folios.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/pms/front-desk"
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#CBD5E1] text-[#334155] text-xs font-bold rounded-xl hover:bg-[#F8FAFC] transition shadow-2xs"
            >
              <Key className="w-3.5 h-3.5 text-[#00C48C]" />
              <span>Front Desk Folios</span>
            </Link>
            <button
              onClick={() => setNewBookingModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#00C48C] hover:bg-[#00B07D] text-white text-xs font-bold rounded-xl transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Reservation</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Guest Name, Booking #, Room Number..."
              className="w-full pl-9 pr-3.5 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#00C48C]"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-[#0F172A] text-white shadow-2xs'
                  : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              All Bookings ({reservations.length})
            </button>
            <button
              onClick={() => setStatusFilter('CHECKED_IN')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === 'CHECKED_IN'
                  ? 'bg-[#00C48C] text-white shadow-2xs'
                  : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Checked-In ({reservations.filter((r) => r.status === 'CHECKED_IN').length})
            </button>
            <button
              onClick={() => setStatusFilter('CONFIRMED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === 'CONFIRMED'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Confirmed ({reservations.filter((r) => r.status === 'CONFIRMED').length})
            </button>
            <button
              onClick={() => setStatusFilter('CHECKED_OUT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === 'CHECKED_OUT'
                  ? 'bg-slate-600 text-white shadow-2xs'
                  : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Checked-Out ({reservations.filter((r) => r.status === 'CHECKED_OUT').length})
            </button>
          </div>
        </div>

        {/* Reservations Table matching Template */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#64748B] uppercase font-bold text-[10px] tracking-wider border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-5 py-3.5">Booking ID</th>
                  <th className="px-5 py-3.5">Guest Profile</th>
                  <th className="px-5 py-3.5">Room & Tier</th>
                  <th className="px-5 py-3.5">Stay Duration</th>
                  <th className="px-5 py-3.5">Total Lodging</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] font-medium text-[#334155]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-[#94A3B8]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#00C48C]" />
                      Loading bookings from database...
                    </td>
                  </tr>
                ) : reservations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] text-[#00C48C] flex items-center justify-center mx-auto mb-3 border border-[#A7F3D0]">
                        <CalendarCheck className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-sm text-[#0F172A]">No reservations or stays recorded yet</p>
                      <p className="text-xs text-[#64748B] mt-1 mb-4">
                        All bookings are completely dynamic. Create your first guest reservation to start tracking stays and folios.
                      </p>
                      <button
                        onClick={() => setNewBookingModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#00C48C] hover:bg-[#00B07D] text-white text-xs font-bold rounded-xl transition shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create First Booking</span>
                      </button>
                    </td>
                  </tr>
                ) : filteredReservations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-[#94A3B8]">
                      No reservations found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredReservations.map((res) => {
                    const isCheckedIn = res.status === 'CHECKED_IN';
                    const isConfirmed = res.status === 'CONFIRMED';
                    const isCheckedOut = res.status === 'CHECKED_OUT';

                    return (
                      <tr key={res.id} className="hover:bg-[#F8FAFC] transition">
                        {/* Booking ID */}
                        <td className="px-5 py-3.5 font-mono text-[11px] font-bold text-[#0F172A]">
                          #{res.reservationNumber}
                        </td>

                        {/* Guest Profile */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-[#00C48C]/10 text-[#00C48C] font-bold flex items-center justify-center text-xs">
                              {res.guest?.fullName?.charAt(0) || 'G'}
                            </div>
                            <div>
                              <div className="font-bold text-[#0F172A] leading-tight">
                                {res.guest?.fullName}
                              </div>
                              <div className="text-[10.5px] text-[#64748B]">
                                {res.guest?.nationality || 'International Guest'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Room & Tier */}
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-[#0F172A]">
                            {res.room ? `#${res.room.roomNumber}` : 'Unassigned'}
                          </div>
                          <div className="text-[10.5px] text-[#64748B]">
                            {res.roomType?.name || 'Standard Tier'}
                          </div>
                        </td>

                        {/* Stay Duration */}
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-[#0F172A]">
                            {res.nightsCount} {res.nightsCount === 1 ? 'Night' : 'Nights'}
                          </div>
                          <div className="text-[10.5px] text-[#64748B] font-mono">
                            {res.checkInDate} → {res.checkOutDate}
                          </div>
                        </td>

                        {/* Total Price */}
                        <td className="px-5 py-3.5">
                          <div className="font-mono font-bold text-sm text-[#0F172A]">
                            Rs. {Number(res.totalAmount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                          </div>
                          {Number(res.depositPaid) > 0 && (
                            <div className="text-[10px] text-[#00C48C] font-semibold">
                              Deposit: Rs. {Number(res.depositPaid).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md ${
                              isCheckedIn
                                ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                                : isConfirmed
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : isCheckedOut
                                ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {isCheckedIn
                              ? 'Checked-in'
                              : isConfirmed
                              ? 'Confirmed'
                              : isCheckedOut
                              ? 'Checked-out'
                              : res.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            href={`/dashboard/pms/front-desk?resId=${res.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F8FAFC] font-bold text-[11px] transition shadow-2xs"
                          >
                            <Key className="w-3.5 h-3.5 text-[#00C48C]" />
                            <span>{isCheckedIn ? 'View Folio' : 'Front Desk'}</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: New Reservation */}
        {newBookingModalOpen && (
          <div className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9] mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#00C48C]/10 text-[#00C48C] flex items-center justify-center">
                    <Luggage className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">New Guest Reservation</h3>
                    <p className="text-[11px] text-[#64748B]">Create a lodging booking with real rate calculation.</p>
                  </div>
                </div>
                <button
                  onClick={() => setNewBookingModalOpen(false)}
                  className="text-[#94A3B8] hover:text-[#0F172A]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateReservation} className="space-y-4">
                {/* Guest Information */}
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Guest Full Name</label>
                  <input
                    type="text"
                    required
                    value={newBooking.guestName}
                    onChange={(e) => setNewBooking({ ...newBooking, guestName: e.target.value })}
                    placeholder="e.g. Angela Vance"
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#00C48C]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Email</label>
                    <input
                      type="email"
                      value={newBooking.guestEmail}
                      onChange={(e) => setNewBooking({ ...newBooking, guestEmail: e.target.value })}
                      placeholder="angela@example.com"
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Phone</label>
                    <input
                      type="text"
                      value={newBooking.guestPhone}
                      onChange={(e) => setNewBooking({ ...newBooking, guestPhone: e.target.value })}
                      placeholder="+1 555-0142"
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Passport / ID #</label>
                    <input
                      type="text"
                      value={newBooking.passportOrId}
                      onChange={(e) => setNewBooking({ ...newBooking, passportOrId: e.target.value })}
                      placeholder="US-9823412"
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Nationality</label>
                    <input
                      type="text"
                      value={newBooking.nationality}
                      onChange={(e) => setNewBooking({ ...newBooking, nationality: e.target.value })}
                      placeholder="United States"
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs"
                    />
                  </div>
                </div>

                {/* Stay Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Check-In Date</label>
                    <input
                      type="date"
                      required
                      value={newBooking.checkInDate}
                      onChange={(e) => setNewBooking({ ...newBooking, checkInDate: e.target.value })}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-mono font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Check-Out Date</label>
                    <input
                      type="date"
                      required
                      value={newBooking.checkOutDate}
                      onChange={(e) => setNewBooking({ ...newBooking, checkOutDate: e.target.value })}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-mono font-semibold"
                    />
                  </div>
                </div>

                {/* Room Type & Pre-assignment */}
                {roomTypes.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                    <p className="font-bold mb-1">No Room Types Available</p>
                    <p className="text-[11px] mb-3">Please configure at least one Room Type in Rooms & Housekeeping before creating bookings.</p>
                    <Link
                      href="/dashboard/pms/rooms"
                      className="inline-block px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs"
                    >
                      Go to Rooms & Housekeeping &rarr;
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">Room Type</label>
                      <select
                        value={newBooking.roomTypeId}
                        onChange={(e) => setNewBooking({ ...newBooking, roomTypeId: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold"
                      >
                        {roomTypes.map((rt) => (
                          <option key={rt.id} value={rt.id}>
                            {rt.name} (Rs. {Number(rt.basePricePerNight).toLocaleString('en-LK')}/nt)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">Assign Room (Optional)</label>
                      <select
                        value={newBooking.roomId}
                        onChange={(e) => setNewBooking({ ...newBooking, roomId: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-semibold"
                      >
                        <option value="">Assign at Check-in</option>
                        {availableRooms
                          .filter((r) => r.status === 'AVAILABLE')
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              #{r.roomNumber} ({r.roomType?.name})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Adults, Children, Deposit */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Adults</label>
                    <input
                      type="number"
                      min="1"
                      value={newBooking.adultsCount}
                      onChange={(e) => setNewBooking({ ...newBooking, adultsCount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Children</label>
                    <input
                      type="number"
                      min="0"
                      value={newBooking.childrenCount}
                      onChange={(e) => setNewBooking({ ...newBooking, childrenCount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Deposit (Rs.)</label>
                    <input
                      type="number"
                      min="0"
                      value={newBooking.depositPaid}
                      onChange={(e) => setNewBooking({ ...newBooking, depositPaid: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-mono font-bold text-[#00C48C]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Special Requests</label>
                  <textarea
                    rows={2}
                    value={newBooking.specialRequests}
                    onChange={(e) => setNewBooking({ ...newBooking, specialRequests: e.target.value })}
                    placeholder="e.g. Honeymoon setup, high floor, quiet corner"
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-[#F1F5F9]">
                  <button
                    type="button"
                    onClick={() => setNewBookingModalOpen(false)}
                    className="px-4 py-2 border border-[#E2E8F0] text-xs font-semibold rounded-xl text-[#64748B]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingBooking || roomTypes.length === 0}
                    className="px-4 py-2 bg-[#00C48C] hover:bg-[#00B07D] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
                  >
                    {creatingBooking ? 'Saving...' : 'Confirm Booking'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
