'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { pmsApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import {
  Key,
  DoorOpen,
  LogOut,
  Plus,
  Receipt,
  Printer,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  CreditCard,
  User,
  Coffee,
  X,
  Search,
  Sparkles,
  RefreshCw,
  Broom,
} from 'lucide-react';

function FrontDeskContent() {
  const searchParams = useSearchParams();
  const preselectedResId = searchParams.get('resId');

  const [reservations, setReservations] = useState<any[]>([]);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'IN_HOUSE' | 'ARRIVALS'>('IN_HOUSE');

  // Check-In Modal State
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [selectedResForCheckIn, setSelectedResForCheckIn] = useState<any>(null);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);

  // Folio Modal State
  const [folioModalOpen, setFolioModalOpen] = useState(false);
  const [activeFolio, setActiveFolio] = useState<any>(null);
  const [loadingFolio, setLoadingFolio] = useState(false);

  // Post Charge Sub-Modal
  const [postChargeOpen, setPostChargeOpen] = useState(false);
  const [newCharge, setNewCharge] = useState({
    chargeType: 'MINIBAR',
    description: 'Minibar Snacks & Beverages',
    amount: 25.0,
  });

  // Post Payment Sub-Modal
  const [postPaymentOpen, setPostPaymentOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({
    paymentMethod: 'CARD',
    amount: 0,
  });

  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadData();

    const socket = getSocket();
    if (!socket) return;

    const onRoomUpdated = () => {
      pmsApi.getRooms().then(setAvailableRooms).catch(console.error);
    };

    const onFolioUpdated = () => {
      pmsApi.getReservations().then(setReservations).catch(console.error);
    };

    socket.on('events:room:updated', onRoomUpdated);
    socket.on('events:folio:updated', onFolioUpdated);

    return () => {
      socket.off('events:room:updated', onRoomUpdated);
      socket.off('events:folio:updated', onFolioUpdated);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resData, roomsData] = await Promise.all([
        pmsApi.getReservations(),
        pmsApi.getRooms(),
      ]);
      setReservations(resData);
      setAvailableRooms(roomsData);

      // If user came with ?resId=..., automatically open folio or check-in
      if (preselectedResId) {
        const found = resData.find((r: any) => r.id === preselectedResId);
        if (found) {
          if (found.status === 'CHECKED_IN') {
            openFolioModal(found.id);
          } else if (found.status === 'CONFIRMED') {
            openCheckInModal(found);
          }
        }
      }
    } catch (err: any) {
      setFeedback('Error loading front desk: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openCheckInModal = (reservation: any) => {
    setSelectedResForCheckIn(reservation);
    const preassigned = reservation.roomId || '';
    setSelectedRoomId(preassigned);
    setCheckInModalOpen(true);
  };

  const handleExecuteCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) {
      alert('Please select an available room for check-in');
      return;
    }

    setCheckingIn(true);
    try {
      await pmsApi.checkIn(selectedResForCheckIn.id, selectedRoomId);
      setCheckInModalOpen(false);
      await loadData();
      // Automatically open folio
      await openFolioModal(selectedResForCheckIn.id);
    } catch (err: any) {
      alert('Check-in failed: ' + err.message);
    } finally {
      setCheckingIn(false);
    }
  };

  const openFolioModal = async (reservationId: string) => {
    setLoadingFolio(true);
    setFolioModalOpen(true);
    try {
      const folio = await pmsApi.getFolio(reservationId);
      setActiveFolio(folio);
      setNewPayment((prev) => ({ ...prev, amount: Number(folio.balanceDue) }));
    } catch (err: any) {
      alert('Failed to load guest folio: ' + err.message);
      setFolioModalOpen(false);
    } finally {
      setLoadingFolio(false);
    }
  };

  const handlePostCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFolio) return;
    try {
      const updated = await pmsApi.postFolioCharge(activeFolio.reservationId, newCharge);
      setActiveFolio(updated);
      setPostChargeOpen(false);
      // Reload full folio
      const freshFolio = await pmsApi.getFolio(activeFolio.reservationId);
      setActiveFolio(freshFolio);
      setNewPayment((prev) => ({ ...prev, amount: Number(freshFolio.balanceDue) }));
    } catch (err: any) {
      alert('Failed to post charge: ' + err.message);
    }
  };

  const handlePostPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFolio) return;
    try {
      const updated = await pmsApi.postFolioPayment(activeFolio.reservationId, {
        paymentMethod: newPayment.paymentMethod,
        amount: Number(newPayment.amount),
      });
      setActiveFolio(updated);
      setPostPaymentOpen(false);
      // Reload full folio
      const freshFolio = await pmsApi.getFolio(activeFolio.reservationId);
      setActiveFolio(freshFolio);
      setNewPayment((prev) => ({ ...prev, amount: Number(freshFolio.balanceDue) }));
    } catch (err: any) {
      alert('Payment settlement failed: ' + err.message);
    }
  };

  const handleExecuteCheckOut = async () => {
    if (!activeFolio) return;
    if (Number(activeFolio.balanceDue) > 0.05) {
      alert(
        `Cannot check out with an outstanding balance of $${Number(activeFolio.balanceDue).toFixed(2)}. Please settle folio first.`
      );
      return;
    }

    if (!confirm('Confirm guest check-out? Room will be released and flagged for housekeeping cleaning.')) {
      return;
    }

    try {
      await pmsApi.checkOut(activeFolio.reservationId);
      setFolioModalOpen(false);
      await loadData();
      alert('Guest checked out successfully! Room marked as DIRTY for Housekeeping.');
    } catch (err: any) {
      alert('Check-out failed: ' + err.message);
    }
  };

  const inHouseGuests = reservations.filter((r) => r.status === 'CHECKED_IN');
  const arrivalGuests = reservations.filter((r) => r.status === 'CONFIRMED');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C48C] animate-pulse"></span>
              Live Front Desk & Guest Accounting
            </div>
            <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
              Front Desk & Folio Operations
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Execute check-ins, bill room charges, settle folio balances, and handle check-outs.
            </p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#CBD5E1] text-[#334155] text-xs font-bold rounded-xl hover:bg-[#F8FAFC] transition shadow-2xs self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#00C48C]' : ''}`} />
            <span>Refresh Roster</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#E2E8F0] gap-2">
          <button
            onClick={() => setActiveTab('IN_HOUSE')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition -mb-[2px] ${
              activeTab === 'IN_HOUSE'
                ? 'border-[#00C48C] text-[#00C48C]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Currently In-House ({inHouseGuests.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('ARRIVALS')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition -mb-[2px] ${
              activeTab === 'ARRIVALS'
                ? 'border-[#00C48C] text-[#00C48C]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <DoorOpen className="w-4 h-4" />
            <span>Expected Arrivals ({arrivalGuests.length})</span>
          </button>
        </div>

        {/* Tab 1: In-House Guests */}
        {activeTab === 'IN_HOUSE' && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#64748B] uppercase font-bold text-[10px] tracking-wider border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-5 py-3.5">Room</th>
                    <th className="px-5 py-3.5">Guest Name</th>
                    <th className="px-5 py-3.5">Booking #</th>
                    <th className="px-5 py-3.5">Departure Date</th>
                    <th className="px-5 py-3.5">Room Tier</th>
                    <th className="px-5 py-3.5 text-right">Folio Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] font-medium text-[#334155]">
                  {inHouseGuests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-[#94A3B8]">
                        No guests currently checked in.
                      </td>
                    </tr>
                  ) : (
                    inHouseGuests.map((res) => (
                      <tr key={res.id} className="hover:bg-[#F8FAFC] transition">
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#ECFDF5] text-[#00C48C] font-mono font-bold text-xs border border-[#A7F3D0]">
                            #{res.room?.roomNumber || '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-[#0F172A]">{res.guest?.fullName}</div>
                          <div className="text-[10.5px] text-[#64748B]">{res.guest?.phone || res.guest?.email}</div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[11px] font-semibold text-[#475569]">
                          #{res.reservationNumber}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[11px] text-[#0F172A]">
                          {res.checkOutDate}
                        </td>
                        <td className="px-5 py-3.5 text-[#64748B]">
                          {res.roomType?.name}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => openFolioModal(res.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00C48C] hover:bg-[#00B07D] text-white font-bold text-[11px] rounded-xl transition shadow-xs"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Manage Folio</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Expected Arrivals */}
        {activeTab === 'ARRIVALS' && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#64748B] uppercase font-bold text-[10px] tracking-wider border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-5 py-3.5">Booking #</th>
                    <th className="px-5 py-3.5">Arriving Guest</th>
                    <th className="px-5 py-3.5">Arrival Date</th>
                    <th className="px-5 py-3.5">Requested Room Tier</th>
                    <th className="px-5 py-3.5">Deposit Paid</th>
                    <th className="px-5 py-3.5 text-right">Front Desk Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] font-medium text-[#334155]">
                  {arrivalGuests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-[#94A3B8]">
                        No arriving reservations pending check-in.
                      </td>
                    </tr>
                  ) : (
                    arrivalGuests.map((res) => (
                      <tr key={res.id} className="hover:bg-[#F8FAFC] transition">
                        <td className="px-5 py-3.5 font-mono text-[11px] font-bold text-[#0F172A]">
                          #{res.reservationNumber}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-[#0F172A]">{res.guest?.fullName}</div>
                          <div className="text-[10.5px] text-[#64748B]">{res.guest?.nationality || 'International'}</div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[11px] text-[#0F172A]">
                          {res.checkInDate}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-[#0F172A]">
                          {res.roomType?.name}
                        </td>
                        <td className="px-5 py-3.5 font-mono font-bold text-[#00C48C]">
                          ${res.depositPaid || '0.00'}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => openCheckInModal(res)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00C48C] hover:bg-[#00B07D] text-white font-bold text-[11px] rounded-xl transition shadow-xs"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>Check-In Guest</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Check-In Guest */}
        {checkInModalOpen && selectedResForCheckIn && (
          <div className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9] mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#00C48C]/10 text-[#00C48C] flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">Front Desk Check-In</h3>
                    <p className="text-[11px] text-[#64748B]">Assign room key and open guest lodging folio.</p>
                  </div>
                </div>
                <button onClick={() => setCheckInModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1 mb-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Guest:</span>
                  <span className="font-bold text-[#0F172A]">{selectedResForCheckIn.guest?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Booking Ref:</span>
                  <span className="font-mono font-bold text-[#0F172A]">#{selectedResForCheckIn.reservationNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Duration:</span>
                  <span className="font-semibold text-[#0F172A]">{selectedResForCheckIn.nightsCount} Nights</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Room Tier:</span>
                  <span className="font-bold text-[#00C48C]">{selectedResForCheckIn.roomType?.name}</span>
                </div>
              </div>

              <form onSubmit={handleExecuteCheckIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Select Physical Room</label>
                  <select
                    required
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold focus:outline-none focus:border-[#00C48C]"
                  >
                    <option value="">-- Choose Clean Available Room --</option>
                    {availableRooms
                      .filter((r) => r.status === 'AVAILABLE' || r.id === selectedResForCheckIn.roomId)
                      .map((room) => (
                        <option key={room.id} value={room.id}>
                          Room #{room.roomNumber} ({room.roomType?.name}) · Floor {room.floor} · [{room.cleanlinessStatus}]
                        </option>
                      ))}
                  </select>
                  <p className="text-[10.5px] text-[#64748B] mt-1">
                    Assigning a room marks it OCCUPIED and opens the guest billing folio.
                  </p>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-[#F1F5F9]">
                  <button
                    type="button"
                    onClick={() => setCheckInModalOpen(false)}
                    className="px-4 py-2 border border-[#E2E8F0] text-xs font-semibold rounded-xl text-[#64748B]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={checkingIn}
                    className="px-4 py-2 bg-[#00C48C] hover:bg-[#00B07D] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
                  >
                    {checkingIn ? 'Checking In...' : 'Confirm Check-In'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Full Guest Folio Management */}
        {folioModalOpen && (
          <div className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto print:shadow-none print:border-none print:p-0">
              {loadingFolio || !activeFolio ? (
                <div className="py-16 text-center text-xs text-[#64748B]">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#00C48C]" />
                  Loading folio statement from MySQL...
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Folio Header */}
                  <div className="flex items-start justify-between pb-4 border-b border-[#F1F5F9]">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                        Guest Folio Statement
                      </span>
                      <h2 className="text-xl font-extrabold text-[#0F172A]">
                        {activeFolio.guest?.fullName}
                      </h2>
                      <div className="text-xs text-[#64748B] mt-0.5">
                        Room <span className="font-bold text-[#0F172A]">#{activeFolio.room?.roomNumber}</span> · Booking Ref <span className="font-mono font-bold text-[#0F172A]">#{activeFolio.reservation?.reservationNumber}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          activeFolio.status === 'SETTLED'
                            ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {activeFolio.status}
                      </span>
                      <button
                        onClick={() => setFolioModalOpen(false)}
                        className="block mt-2 ml-auto text-[#94A3B8] hover:text-[#0F172A] print:hidden"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Financial Summary Strip */}
                  <div className="grid grid-cols-3 gap-3 p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                    <div>
                      <div className="text-[10px] font-bold text-[#64748B] uppercase">Total Charges</div>
                      <div className="text-base font-extrabold font-mono text-[#0F172A]">
                        ${Number(activeFolio.totalCharges).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-[#64748B] uppercase">Payments Received</div>
                      <div className="text-base font-extrabold font-mono text-[#00C48C]">
                        ${Number(activeFolio.totalPayments).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-[#64748B] uppercase">Outstanding Balance</div>
                      <div
                        className={`text-base font-extrabold font-mono ${
                          Number(activeFolio.balanceDue) > 0 ? 'text-rose-600' : 'text-[#00C48C]'
                        }`}
                      >
                        ${Number(activeFolio.balanceDue).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Folio Items Table */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                        Itemized Charges
                      </h4>
                      <button
                        onClick={() => setPostChargeOpen(true)}
                        className="text-[11px] font-bold text-[#00C48C] hover:underline flex items-center gap-1 print:hidden"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Post In-Room Charge</span>
                      </button>
                    </div>
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-[#F8FAFC] text-[10px] text-[#64748B] uppercase font-bold border-b border-[#E2E8F0]">
                          <tr>
                            <th className="px-3.5 py-2">Category</th>
                            <th className="px-3.5 py-2">Description</th>
                            <th className="px-3.5 py-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9] font-medium text-[#334155]">
                          {activeFolio.items?.map((item: any) => (
                            <tr key={item.id}>
                              <td className="px-3.5 py-2 font-mono text-[10.5px] font-bold text-[#0F172A]">
                                {item.chargeType}
                              </td>
                              <td className="px-3.5 py-2">{item.description}</td>
                              <td className="px-3.5 py-2 text-right font-mono font-bold text-[#0F172A]">
                                ${Number(item.amount).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Payments Table */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                        Payments & Credits
                      </h4>
                      {Number(activeFolio.balanceDue) > 0.05 && (
                        <button
                          onClick={() => setPostPaymentOpen(true)}
                          className="text-[11px] font-bold text-[#00C48C] hover:underline flex items-center gap-1 print:hidden"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Settle Payment</span>
                        </button>
                      )}
                    </div>
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-[#F8FAFC] text-[10px] text-[#64748B] uppercase font-bold border-b border-[#E2E8F0]">
                          <tr>
                            <th className="px-3.5 py-2">Method</th>
                            <th className="px-3.5 py-2">Receipt #</th>
                            <th className="px-3.5 py-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9] font-medium text-[#334155]">
                          {activeFolio.payments?.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-3.5 py-4 text-center text-[#94A3B8]">
                                No payments recorded yet.
                              </td>
                            </tr>
                          ) : (
                            activeFolio.payments?.map((pmt: any) => (
                              <tr key={pmt.id}>
                                <td className="px-3.5 py-2 font-bold text-[#00C48C]">
                                  {pmt.paymentMethod}
                                </td>
                                <td className="px-3.5 py-2 font-mono text-[10.5px] text-[#64748B]">
                                  {pmt.receiptNumber || '—'}
                                </td>
                                <td className="px-3.5 py-2 text-right font-mono font-bold text-[#00C48C]">
                                  ${Number(pmt.amount).toFixed(2)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Actions Bottom Bar */}
                  <div className="pt-4 border-t border-[#F1F5F9] flex items-center justify-between print:hidden">
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 px-3 py-2 border border-[#CBD5E1] text-[#334155] text-xs font-bold rounded-xl hover:bg-[#F8FAFC]"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Statement</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFolioModalOpen(false)}
                        className="px-4 py-2 border border-[#E2E8F0] text-xs font-semibold rounded-xl text-[#64748B]"
                      >
                        Close
                      </button>
                      <button
                        onClick={handleExecuteCheckOut}
                        disabled={Number(activeFolio.balanceDue) > 0.05}
                        className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-40"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Complete Check-Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sub-Modal: Post In-Room Charge */}
        {postChargeOpen && (
          <div className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4 z-60">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-sm p-5 animate-in fade-in zoom-in duration-100">
              <h3 className="text-sm font-bold text-[#0F172A] mb-3">Post In-Room Charge</h3>
              <form onSubmit={handlePostCharge} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Charge Category</label>
                  <select
                    value={newCharge.chargeType}
                    onChange={(e) => setNewCharge({ ...newCharge, chargeType: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold"
                  >
                    <option value="MINIBAR">Minibar Consumables</option>
                    <option value="ROOM_SERVICE">Room Service Dining</option>
                    <option value="LAUNDRY">Express Laundry</option>
                    <option value="RESTAURANT_POS">Restaurant POS Transfer</option>
                    <option value="OTHER">Other / Damages</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Item Description</label>
                  <input
                    type="text"
                    required
                    value={newCharge.description}
                    onChange={(e) => setNewCharge({ ...newCharge, description: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Charge Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={newCharge.amount}
                    onChange={(e) => setNewCharge({ ...newCharge, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPostChargeOpen(false)}
                    className="px-3 py-1.5 border border-[#E2E8F0] text-xs font-semibold rounded-xl text-[#64748B]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#00C48C] text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    Post Charge
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Sub-Modal: Settle Payment */}
        {postPaymentOpen && (
          <div className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4 z-60">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-sm p-5 animate-in fade-in zoom-in duration-100">
              <h3 className="text-sm font-bold text-[#0F172A] mb-3">Settle Folio Payment</h3>
              <form onSubmit={handlePostPayment} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Payment Method</label>
                  <select
                    value={newPayment.paymentMethod}
                    onChange={(e) => setNewPayment({ ...newPayment, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold"
                  >
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="CASH">Cash Currency</option>
                    <option value="BANK_TRANSFER">Direct Wire Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Amount Paid ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-mono font-bold text-[#00C48C]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPostPaymentOpen(false)}
                    className="px-3 py-1.5 border border-[#E2E8F0] text-xs font-semibold rounded-xl text-[#64748B]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#00C48C] text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    Confirm Payment
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

export default function FrontDeskPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-xs text-[#64748B]">Loading Front Desk...</div>}>
      <FrontDeskContent />
    </Suspense>
  );
}
