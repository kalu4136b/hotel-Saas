'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { pmsApi } from '@/lib/api';
import {
  BedDouble,
  DoorOpen,
  Sparkles,
  Broom,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  X,
  SlidersHorizontal,
  Home,
  ShieldCheck,
  Building,
} from 'lucide-react';

export default function RoomsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'DIRTY'>('ALL');
  const [feedback, setFeedback] = useState<string | null>(null);

  // New Room Modal
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({
    roomNumber: '',
    roomTypeId: '',
    floor: 1,
    notes: '',
  });

  // New Room Type Modal
  const [addTypeOpen, setAddTypeOpen] = useState(false);
  const [newType, setNewType] = useState({
    name: '',
    code: '',
    basePricePerNight: 200,
    maxOccupancy: 2,
    bedType: 'King Bed',
    amenities: 'WiFi, AC, Smart TV, Mini-bar',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [roomsData, typesData] = await Promise.all([
        pmsApi.getRooms(),
        pmsApi.getRoomTypes(),
      ]);
      setRooms(roomsData);
      setRoomTypes(typesData);
      if (typesData.length > 0 && !newRoom.roomTypeId) {
        setNewRoom((prev) => ({ ...prev, roomTypeId: typesData[0].id }));
      }
    } catch (err: any) {
      setFeedback('Error loading rooms: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanlinessChange = async (roomId: string, newStatus: string) => {
    try {
      await pmsApi.updateCleanliness(roomId, newStatus);
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, cleanlinessStatus: newStatus } : r))
      );
    } catch (err: any) {
      alert('Failed to update cleanliness: ' + err.message);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await pmsApi.createRoom({
        roomNumber: newRoom.roomNumber,
        roomTypeId: newRoom.roomTypeId,
        floor: Number(newRoom.floor) || 1,
        notes: newRoom.notes,
      });
      setAddRoomOpen(false);
      setNewRoom({ roomNumber: '', roomTypeId: roomTypes[0]?.id || '', floor: 1, notes: '' });
      await loadData();
    } catch (err: any) {
      alert('Failed to create room: ' + err.message);
    }
  };

  const handleCreateRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await pmsApi.createRoomType(newType);
      setAddTypeOpen(false);
      setNewType({
        name: '',
        code: '',
        basePricePerNight: 200,
        maxOccupancy: 2,
        bedType: 'King Bed',
        amenities: 'WiFi, AC, Smart TV, Mini-bar',
        description: '',
      });
      await loadData();
    } catch (err: any) {
      alert('Failed to create room type: ' + err.message);
    }
  };

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      r.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.roomType?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'AVAILABLE') return r.status === 'AVAILABLE';
    if (statusFilter === 'OCCUPIED') return r.status === 'OCCUPIED';
    if (statusFilter === 'DIRTY') return r.cleanlinessStatus === 'DIRTY';

    return true;
  });

  const availableCount = rooms.filter((r) => r.status === 'AVAILABLE').length;
  const occupiedCount = rooms.filter((r) => r.status === 'OCCUPIED').length;
  const dirtyCount = rooms.filter((r) => r.cleanlinessStatus === 'DIRTY').length;
  const inspectedCount = rooms.filter((r) => r.cleanlinessStatus === 'INSPECTED').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C48C] animate-pulse"></span>
              Live Room Inventory (MySQL)
            </div>
            <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
              Rooms & Housekeeping Matrix
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Live room status rack, cleanliness inspection states, and physical inventory.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setAddTypeOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#CBD5E1] text-[#334155] text-xs font-bold rounded-xl hover:bg-[#F8FAFC] transition shadow-2xs"
            >
              <BedDouble className="w-3.5 h-3.5 text-[#00C48C]" />
              <span>New Room Type</span>
            </button>
            <button
              onClick={() => setAddRoomOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#00C48C] hover:bg-[#00B07D] text-white text-xs font-bold rounded-xl transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Physical Room</span>
            </button>
          </div>
        </div>

        {/* Quick Telemetry Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Total Rooms
              </div>
              <div className="text-2xl font-extrabold text-[#0F172A] mt-1 font-mono">
                {rooms.length}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] text-[#475569] flex items-center justify-center">
              <DoorOpen className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Available
              </div>
              <div className="text-2xl font-extrabold text-[#00C48C] mt-1 font-mono">
                {availableCount}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] text-[#00C48C] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Occupied
              </div>
              <div className="text-2xl font-extrabold text-blue-600 mt-1 font-mono">
                {occupiedCount}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <BedDouble className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Needs Cleaning
              </div>
              <div className="text-2xl font-extrabold text-rose-600 mt-1 font-mono">
                {dirtyCount}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Broom className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Room # or Type..."
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
              All Rooms ({rooms.length})
            </button>
            <button
              onClick={() => setStatusFilter('AVAILABLE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === 'AVAILABLE'
                  ? 'bg-[#00C48C] text-white shadow-2xs'
                  : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Available ({availableCount})
            </button>
            <button
              onClick={() => setStatusFilter('OCCUPIED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === 'OCCUPIED'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Occupied ({occupiedCount})
            </button>
            <button
              onClick={() => setStatusFilter('DIRTY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === 'DIRTY'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Dirty / Clean ({dirtyCount})
            </button>
          </div>
        </div>

        {/* Room Grid */}
        {loading ? (
          <div className="py-20 flex justify-center items-center text-xs text-[#64748B] gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-[#00C48C]" />
            <span>Fetching live room rack from MySQL...</span>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center text-[#94A3B8]">
            <DoorOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-sm">No rooms match filter criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredRooms.map((room) => {
              const isOccupied = room.status === 'OCCUPIED';
              const isReserved = room.status === 'RESERVED';

              return (
                <div
                  key={room.id}
                  className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs hover:shadow-md transition p-4 flex flex-col justify-between"
                >
                  <div>
                    {/* Room Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-base border ${
                            isOccupied
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : isReserved
                              ? 'bg-amber-50 border-amber-200 text-amber-700'
                              : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#00C48C]'
                          }`}
                        >
                          #{room.roomNumber}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#0F172A] leading-tight">
                            {room.roomType?.name || 'Standard Room'}
                          </div>
                          <div className="text-[10.5px] text-[#64748B] mt-0.5">
                            Floor {room.floor} · {room.roomType?.bedType || 'King Bed'}
                          </div>
                        </div>
                      </div>

                      {/* Occupancy Badge */}
                      <span
                        className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${
                          isOccupied
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : isReserved
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                        }`}
                      >
                        {room.status}
                      </span>
                    </div>

                    {/* Pricing */}
                    <div className="text-xs font-semibold text-[#0F172A] my-2">
                      <span className="font-mono text-sm font-bold text-[#00C48C]">
                        ${room.roomType?.basePricePerNight}
                      </span>{' '}
                      <span className="text-[10px] text-[#64748B] font-normal">/ night</span>
                    </div>
                  </div>

                  {/* Housekeeping Status Section */}
                  <div className="pt-3 border-t border-[#F1F5F9] mt-2">
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="font-semibold text-[#64748B] flex items-center gap-1">
                        <Broom className="w-3 h-3 text-[#94A3B8]" />
                        Cleanliness
                      </span>
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                          room.cleanlinessStatus === 'CLEAN'
                            ? 'bg-emerald-50 text-emerald-700'
                            : room.cleanlinessStatus === 'INSPECTED'
                            ? 'bg-purple-50 text-purple-700'
                            : room.cleanlinessStatus === 'IN_CLEANING'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {room.cleanlinessStatus}
                      </span>
                    </div>

                    {/* Quick Cleanliness Dropdown */}
                    <select
                      value={room.cleanlinessStatus}
                      onChange={(e) => handleCleanlinessChange(room.id, e.target.value)}
                      className="w-full px-2 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[11px] font-semibold text-[#334155] focus:outline-none focus:border-[#00C48C]"
                    >
                      <option value="CLEAN">Set to CLEAN</option>
                      <option value="DIRTY">Set to DIRTY</option>
                      <option value="IN_CLEANING">Set to IN CLEANING</option>
                      <option value="INSPECTED">Set to INSPECTED</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Add Physical Room */}
        {addRoomOpen && (
          <div className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9] mb-4">
                <h3 className="text-sm font-bold text-[#0F172A]">Add Physical Room</h3>
                <button onClick={() => setAddRoomOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Room #</label>
                    <input
                      type="text"
                      required
                      value={newRoom.roomNumber}
                      onChange={(e) => setNewRoom({ ...newRoom, roomNumber: e.target.value })}
                      placeholder="e.g. 305"
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Floor</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={newRoom.floor}
                      onChange={(e) => setNewRoom({ ...newRoom, floor: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Room Type Tier</label>
                  <select
                    value={newRoom.roomTypeId}
                    onChange={(e) => setNewRoom({ ...newRoom, roomTypeId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold"
                  >
                    {roomTypes.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        {rt.name} (${rt.basePricePerNight}/night)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Location / Notes (Optional)</label>
                  <input
                    type="text"
                    value={newRoom.notes}
                    onChange={(e) => setNewRoom({ ...newRoom, notes: e.target.value })}
                    placeholder="e.g. North Wing, Sunset Facing"
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-[#F1F5F9]">
                  <button
                    type="button"
                    onClick={() => setAddRoomOpen(false)}
                    className="px-4 py-2 border border-[#E2E8F0] text-xs font-semibold rounded-xl text-[#64748B]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#00C48C] text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    Create Room
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Room Type */}
        {addTypeOpen && (
          <div className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9] mb-4">
                <h3 className="text-sm font-bold text-[#0F172A]">Create Room Type</h3>
                <button onClick={() => setAddTypeOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateRoomType} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Type Name</label>
                  <input
                    type="text"
                    required
                    value={newType.name}
                    onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                    placeholder="e.g. Presidential Penthouse"
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Nightly Rate ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newType.basePricePerNight}
                      onChange={(e) => setNewType({ ...newType, basePricePerNight: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Max Occupancy</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={newType.maxOccupancy}
                      onChange={(e) => setNewType({ ...newType, maxOccupancy: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Bed Configuration</label>
                  <input
                    type="text"
                    required
                    value={newType.bedType}
                    onChange={(e) => setNewType({ ...newType, bedType: e.target.value })}
                    placeholder="e.g. 1 Super King Bed + 1 Daybed"
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Amenities</label>
                  <input
                    type="text"
                    value={newType.amenities}
                    onChange={(e) => setNewType({ ...newType, amenities: e.target.value })}
                    placeholder="e.g. Private Pool, Ocean View, Mini-bar"
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-[#F1F5F9]">
                  <button
                    type="button"
                    onClick={() => setAddTypeOpen(false)}
                    className="px-4 py-2 border border-[#E2E8F0] text-xs font-semibold rounded-xl text-[#64748B]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#00C48C] text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    Save Room Type
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
