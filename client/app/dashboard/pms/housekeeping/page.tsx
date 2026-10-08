'use client';

// Dedicated Housekeeping & Room Cleanliness Station
import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { pmsApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import {
  Sparkles,
  Broom,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  X,
  SlidersHorizontal,
  Home,
  ShieldCheck,
  Building,
  Clock,
  Wrench,
  BedDouble,
  CheckSquare,
  Square,
  ClipboardCheck,
  ChevronRight,
  Flame,
  ArrowRight,
  UserCheck,
  FileText,
  BadgeAlert,
} from 'lucide-react';

interface RoomItem {
  id: string;
  roomNumber: string;
  floor: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
  cleanlinessStatus: 'CLEAN' | 'DIRTY' | 'IN_CLEANING' | 'INSPECTED';
  notes?: string;
  updatedAt: string;
  roomType?: {
    id: string;
    name: string;
    code: string;
    bedType?: string;
    basePricePerNight: number;
  };
}

export default function HousekeepingStationPage() {
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cleanlinessFilter, setCleanlinessFilter] = useState<
    'ALL' | 'DIRTY' | 'IN_CLEANING' | 'CLEAN' | 'INSPECTED' | 'MAINTENANCE'
  >('ALL');
  const [selectedFloor, setSelectedFloor] = useState<number | 'ALL'>('ALL');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bulk Selection
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Inspection Checklist Modal
  const [inspectModalRoom, setInspectModalRoom] = useState<RoomItem | null>(null);
  const [checklist, setChecklist] = useState({
    linens: true,
    bathroom: true,
    minibar: true,
    vacuum: true,
    appliances: true,
  });

  // Housekeeping Note Modal
  const [notesModalRoom, setNotesModalRoom] = useState<RoomItem | null>(null);
  const [roomNoteText, setRoomNoteText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Maintenance Flag Modal
  const [maintenanceModalRoom, setMaintenanceModalRoom] = useState<RoomItem | null>(null);
  const [maintenanceReason, setMaintenanceReason] = useState('');
  const [savingMaintenance, setSavingMaintenance] = useState(false);

  useEffect(() => {
    loadRooms();

    const socket = getSocket();
    if (!socket) return;

    const onRoomUpdated = (updatedRoom: any) => {
      setRooms((prev) =>
        prev.map((r) => (r.id === updatedRoom.id ? { ...r, ...updatedRoom } : r)),
      );
    };

    socket.on('events:room:updated', onRoomUpdated);
    return () => {
      socket.off('events:room:updated', onRoomUpdated);
    };
  }, []);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const data = await pmsApi.getRooms();
      setRooms(data);
    } catch (err: any) {
      setFeedback({ type: 'error', text: 'Failed to load rooms: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // Distinct floors
  const floors = useMemo(() => {
    const list = Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b);
    return list;
  }, [rooms]);

  // Telemetry KPIs
  const stats = useMemo(() => {
    const total = rooms.length;
    const dirty = rooms.filter((r) => r.cleanlinessStatus === 'DIRTY').length;
    const inCleaning = rooms.filter((r) => r.cleanlinessStatus === 'IN_CLEANING').length;
    const clean = rooms.filter((r) => r.cleanlinessStatus === 'CLEAN').length;
    const inspected = rooms.filter((r) => r.cleanlinessStatus === 'INSPECTED').length;
    const maintenance = rooms.filter((r) => r.status === 'MAINTENANCE' || r.status === 'OUT_OF_SERVICE').length;
    const readyForArrival = rooms.filter(
      (r) => r.status === 'AVAILABLE' && (r.cleanlinessStatus === 'CLEAN' || r.cleanlinessStatus === 'INSPECTED'),
    ).length;
    const cleanlinessRate = total > 0 ? Math.round(((clean + inspected) / total) * 100) : 0;

    return { total, dirty, inCleaning, clean, inspected, maintenance, readyForArrival, cleanlinessRate };
  }, [rooms]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      // Floor filter
      if (selectedFloor !== 'ALL' && room.floor !== selectedFloor) return false;

      // Cleanliness / Maintenance filter
      if (cleanlinessFilter === 'DIRTY' && room.cleanlinessStatus !== 'DIRTY') return false;
      if (cleanlinessFilter === 'IN_CLEANING' && room.cleanlinessStatus !== 'IN_CLEANING') return false;
      if (cleanlinessFilter === 'CLEAN' && room.cleanlinessStatus !== 'CLEAN') return false;
      if (cleanlinessFilter === 'INSPECTED' && room.cleanlinessStatus !== 'INSPECTED') return false;
      if (
        cleanlinessFilter === 'MAINTENANCE' &&
        room.status !== 'MAINTENANCE' &&
        room.status !== 'OUT_OF_SERVICE'
      )
        return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = room.roomNumber.toLowerCase().includes(q);
        const matchesType = room.roomType?.name.toLowerCase().includes(q) || false;
        const matchesNotes = room.notes?.toLowerCase().includes(q) || false;
        if (!matchesNum && !matchesType && !matchesNotes) return false;
      }

      return true;
    });
  }, [rooms, selectedFloor, cleanlinessFilter, searchQuery]);

  // Quick Cleanliness Status Change
  const handleQuickStatus = async (roomId: string, newStatus: string) => {
    try {
      await pmsApi.updateCleanliness(roomId, newStatus);
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, cleanlinessStatus: newStatus as any } : r)),
      );
      setFeedback({ type: 'success', text: `Room status updated to ${newStatus}.` });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to update status' });
    }
  };

  // Bulk Cleanliness Action
  const handleBulkStatus = async (newStatus: string) => {
    if (selectedRoomIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      await pmsApi.bulkUpdateCleanliness(selectedRoomIds, newStatus);
      setRooms((prev) =>
        prev.map((r) =>
          selectedRoomIds.includes(r.id) ? { ...r, cleanlinessStatus: newStatus as any } : r,
        ),
      );
      setSelectedRoomIds([]);
      setFeedback({
        type: 'success',
        text: `Updated ${selectedRoomIds.length} rooms to ${newStatus}.`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Bulk update failed' });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Toggle selection
  const toggleSelectRoom = (id: string) => {
    setSelectedRoomIds((prev) =>
      prev.includes(id) ? prev.filter((rId) => rId !== id) : [...prev, id],
    );
  };

  const handleSelectAllVisible = () => {
    if (selectedRoomIds.length === filteredRooms.length) {
      setSelectedRoomIds([]);
    } else {
      setSelectedRoomIds(filteredRooms.map((r) => r.id));
    }
  };

  // Save Room Notes
  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesModalRoom) return;
    setSavingNotes(true);
    try {
      await pmsApi.updateRoomNotes(notesModalRoom.id, roomNoteText);
      setRooms((prev) =>
        prev.map((r) => (r.id === notesModalRoom.id ? { ...r, notes: roomNoteText } : r)),
      );
      setNotesModalRoom(null);
      setFeedback({ type: 'success', text: 'Room notes saved successfully.' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert('Failed to save notes: ' + err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  // Toggle Maintenance
  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenanceModalRoom) return;
    setSavingMaintenance(true);
    try {
      const isCurrentlyMaintenance = maintenanceModalRoom.status === 'MAINTENANCE';
      const nextStatus = isCurrentlyMaintenance ? 'AVAILABLE' : 'MAINTENANCE';

      await pmsApi.updateOccupancy(maintenanceModalRoom.id, nextStatus);
      if (maintenanceReason.trim()) {
        await pmsApi.updateRoomNotes(
          maintenanceModalRoom.id,
          isCurrentlyMaintenance
            ? `[Restored to Service] ${maintenanceReason}`
            : `[MAINTENANCE REQUIRED] ${maintenanceReason}`,
        );
      }

      setRooms((prev) =>
        prev.map((r) =>
          r.id === maintenanceModalRoom.id
            ? {
                ...r,
                status: nextStatus,
                notes: maintenanceReason.trim()
                  ? `[${nextStatus}] ${maintenanceReason}`
                  : r.notes,
              }
            : r,
        ),
      );

      setMaintenanceModalRoom(null);
      setMaintenanceReason('');
      setFeedback({
        type: 'success',
        text: `Room ${maintenanceModalRoom.roomNumber} ${isCurrentlyMaintenance ? 'returned to service' : 'flagged for maintenance'}.`,
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert('Failed to update maintenance: ' + err.message);
    } finally {
      setSavingMaintenance(false);
    }
  };

  // Submit Inspection Checklist
  const handleApproveInspection = async () => {
    if (!inspectModalRoom) return;
    try {
      await pmsApi.updateCleanliness(inspectModalRoom.id, 'INSPECTED');
      setRooms((prev) =>
        prev.map((r) =>
          r.id === inspectModalRoom.id ? { ...r, cleanlinessStatus: 'INSPECTED' } : r,
        ),
      );
      setInspectModalRoom(null);
      setFeedback({
        type: 'success',
        text: `Room ${inspectModalRoom.roomNumber} inspected, certified, and ready for guests!`,
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert('Failed to certify room: ' + err.message);
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] uppercase tracking-wider">
              PMS Operations Station
            </span>
            <span className="flex items-center gap-1 text-[11px] font-medium text-[#64748B]">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
              Live Housekeeping Rack
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-[#00C48C]" />
            Housekeeping & Cleanliness Dispatch
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Real-time cleanliness management, turn-down status tracking, inspection certifications, and room attendant dispatch.
          </p>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadRooms}
            disabled={loading}
            className="p-2.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#0F172A] text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
            title="Refresh Room Rack"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
              : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ================= TELEMETRY STAT CARDS ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-6">
        {/* Total Rooms */}
        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#64748B]">Total Rooms</span>
            <Building className="w-4 h-4 text-[#94A3B8]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{stats.total}</div>
          <div className="text-[10px] text-[#64748B] mt-1">{stats.readyForArrival} turn-key ready</div>
        </div>

        {/* Needs Cleaning (Dirty) */}
        <div
          onClick={() => setCleanlinessFilter('DIRTY')}
          className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition-all ${
            cleanlinessFilter === 'DIRTY'
              ? 'bg-[#FFF1F2] border-[#FDA4AF] ring-2 ring-[#F43F5E]'
              : 'bg-white border-[#E2E8F0] hover:border-[#FDA4AF]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#E11D48] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#E11D48] animate-pulse"></span>
              Dirty Rooms
            </span>
            <Broom className="w-4 h-4 text-[#E11D48]" />
          </div>
          <div className="text-2xl font-bold text-[#BE123C]">{stats.dirty}</div>
          <div className="text-[10px] text-[#9F1239] mt-1 font-medium">Priority for arrivals</div>
        </div>

        {/* In Cleaning */}
        <div
          onClick={() => setCleanlinessFilter('IN_CLEANING')}
          className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition-all ${
            cleanlinessFilter === 'IN_CLEANING'
              ? 'bg-[#EFF6FF] border-[#93C5FD] ring-2 ring-[#3B82F6]'
              : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#2563EB]">In Cleaning</span>
            <Sparkles className="w-4 h-4 text-[#3B82F6] animate-spin" />
          </div>
          <div className="text-2xl font-bold text-[#1D4ED8]">{stats.inCleaning}</div>
          <div className="text-[10px] text-[#1E40AF] mt-1 font-medium">Attendants active</div>
        </div>

        {/* Clean (Pending Inspection) */}
        <div
          onClick={() => setCleanlinessFilter('CLEAN')}
          className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition-all ${
            cleanlinessFilter === 'CLEAN'
              ? 'bg-[#ECFDF5] border-[#A7F3D0] ring-2 ring-[#10B981]'
              : 'bg-white border-[#E2E8F0] hover:border-[#A7F3D0]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#059669]">Clean</span>
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="text-2xl font-bold text-[#047857]">{stats.clean}</div>
          <div className="text-[10px] text-[#065F46] mt-1 font-medium">Awaiting supervisor</div>
        </div>

        {/* Inspected */}
        <div
          onClick={() => setCleanlinessFilter('INSPECTED')}
          className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition-all ${
            cleanlinessFilter === 'INSPECTED'
              ? 'bg-[#F0FDF4] border-[#86EFAC] ring-2 ring-[#22C55E]'
              : 'bg-white border-[#E2E8F0] hover:border-[#86EFAC]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#16A34A]">Inspected</span>
            <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
          </div>
          <div className="text-2xl font-bold text-[#15803D]">{stats.inspected}</div>
          <div className="text-[10px] text-[#166534] mt-1 font-medium">100% Guest Ready</div>
        </div>

        {/* Maintenance */}
        <div
          onClick={() => setCleanlinessFilter('MAINTENANCE')}
          className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition-all ${
            cleanlinessFilter === 'MAINTENANCE'
              ? 'bg-[#FFFBEB] border-[#FDE68A] ring-2 ring-[#F59E0B]'
              : 'bg-white border-[#E2E8F0] hover:border-[#FDE68A]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#D97706]">Out of Order</span>
            <Wrench className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="text-2xl font-bold text-[#B45309]">{stats.maintenance}</div>
          <div className="text-[10px] text-[#92400E] mt-1 font-medium">Repair / Inactive</div>
        </div>
      </div>

      {/* Cleanliness Health Bar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 mb-6 shadow-xs">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-[#0F172A] flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4 text-[#00C48C]" />
            Hotel Cleanliness Index
          </span>
          <span className="font-bold text-[#0F172A]">{stats.cleanlinessRate}% Clean & Inspected</span>
        </div>
        <div className="w-full h-3 rounded-full bg-[#F1F5F9] overflow-hidden flex">
          <div
            style={{ width: `${stats.total > 0 ? (stats.inspected / stats.total) * 100 : 0}%` }}
            className="bg-[#10B981] h-full transition-all duration-500"
            title={`Inspected: ${stats.inspected}`}
          />
          <div
            style={{ width: `${stats.total > 0 ? (stats.clean / stats.total) * 100 : 0}%` }}
            className="bg-[#34D399] h-full transition-all duration-500"
            title={`Clean: ${stats.clean}`}
          />
          <div
            style={{ width: `${stats.total > 0 ? (stats.inCleaning / stats.total) * 100 : 0}%` }}
            className="bg-[#60A5FA] h-full transition-all duration-500"
            title={`In Cleaning: ${stats.inCleaning}`}
          />
          <div
            style={{ width: `${stats.total > 0 ? (stats.dirty / stats.total) * 100 : 0}%` }}
            className="bg-[#F87171] h-full transition-all duration-500"
            title={`Dirty: ${stats.dirty}`}
          />
          <div
            style={{ width: `${stats.total > 0 ? (stats.maintenance / stats.total) * 100 : 0}%` }}
            className="bg-[#FBBF24] h-full transition-all duration-500"
            title={`Maintenance: ${stats.maintenance}`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-2.5 text-[11px] text-[#64748B]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /> Inspected ({stats.inspected})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#34D399]" /> Clean ({stats.clean})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#60A5FA]" /> In Cleaning ({stats.inCleaning})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F87171]" /> Dirty ({stats.dirty})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FBBF24]" /> Out of Order ({stats.maintenance})
          </span>
        </div>
      </div>

      {/* ================= CONTROLS & FILTER BAR ================= */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 mb-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'ALL', label: 'All Rooms', count: stats.total },
                { id: 'DIRTY', label: 'Dirty', count: stats.dirty, alert: stats.dirty > 0 },
                { id: 'IN_CLEANING', label: 'In Cleaning', count: stats.inCleaning },
                { id: 'CLEAN', label: 'Clean', count: stats.clean },
                { id: 'INSPECTED', label: 'Inspected', count: stats.inspected },
                { id: 'MAINTENANCE', label: 'Out of Order', count: stats.maintenance },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCleanlinessFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  cleanlinessFilter === tab.id
                    ? 'bg-[#0F172A] text-white shadow-xs'
                    : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    cleanlinessFilter === tab.id
                      ? 'bg-white/20 text-white'
                      : tab.alert
                      ? 'bg-rose-100 text-rose-700 font-bold'
                      : 'bg-[#E2E8F0] text-[#475569]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Floor & Search Controls */}
          <div className="flex items-center gap-2">
            {/* Floor Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
              <span className="font-semibold text-[#0F172A] hidden md:inline">Floor:</span>
              <select
                value={selectedFloor}
                onChange={(e) =>
                  setSelectedFloor(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
                }
                className="px-2.5 py-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] outline-none"
              >
                <option value="ALL">All Floors</option>
                {floors.map((f) => (
                  <option key={f} value={f}>
                    Floor {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Room Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search room #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] outline-none focus:bg-white focus:border-[#00C48C] w-36 sm:w-44 transition-all"
              />
            </div>
          </div>
        </div>

        {/* ================= BULK ACTIONS BAR (Appears when rooms selected) ================= */}
        <div className="pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllVisible}
              className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] flex items-center gap-1.5 font-semibold text-[#0F172A]"
            >
              {selectedRoomIds.length === filteredRooms.length && filteredRooms.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-[#00C48C]" />
              ) : (
                <Square className="w-4 h-4 text-[#94A3B8]" />
              )}
              <span>
                {selectedRoomIds.length > 0
                  ? `${selectedRoomIds.length} Selected`
                  : 'Select All Visible'}
              </span>
            </button>

            {selectedRoomIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedRoomIds([])}
                className="text-xs text-[#64748B] hover:text-[#0F172A] underline"
              >
                Clear
              </button>
            )}
          </div>

          {selectedRoomIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-[#64748B]">Bulk Apply:</span>

              <button
                type="button"
                disabled={bulkActionLoading}
                onClick={() => handleBulkStatus('IN_CLEANING')}
                className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold transition-all flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Start Cleaning</span>
              </button>

              <button
                type="button"
                disabled={bulkActionLoading}
                onClick={() => handleBulkStatus('CLEAN')}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold transition-all flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Clean</span>
              </button>

              <button
                type="button"
                disabled={bulkActionLoading}
                onClick={() => handleBulkStatus('INSPECTED')}
                className="px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-all flex items-center gap-1 shadow-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Certify Inspected</span>
              </button>

              <button
                type="button"
                disabled={bulkActionLoading}
                onClick={() => handleBulkStatus('DIRTY')}
                className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold transition-all flex items-center gap-1"
              >
                <Broom className="w-3.5 h-3.5" />
                <span>Flag Dirty</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ================= ROOM CLEANLINESS GRID ================= */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-[#E2E8F0]">
          <RefreshCw className="w-8 h-8 text-[#00C48C] animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#0F172A]">Loading room inventory rack...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-[#E2E8F0] shadow-xs">
          <Broom className="w-10 h-10 text-[#94A3B8] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#0F172A] mb-1">No rooms match filter</h3>
          <p className="text-xs text-[#64748B]">
            Try switching the cleanliness tab or clearing your search criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredRooms.map((room) => {
            const isSelected = selectedRoomIds.includes(room.id);
            const isDirty = room.cleanlinessStatus === 'DIRTY';
            const isCleaning = room.cleanlinessStatus === 'IN_CLEANING';
            const isClean = room.cleanlinessStatus === 'CLEAN';
            const isInspected = room.cleanlinessStatus === 'INSPECTED';
            const isMaintenance = room.status === 'MAINTENANCE' || room.status === 'OUT_OF_SERVICE';

            return (
              <div
                key={room.id}
                className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#00C48C] ring-2 ring-[#00C48C]/20'
                    : isDirty
                    ? 'border-rose-200 hover:border-rose-300'
                    : isCleaning
                    ? 'border-blue-200 hover:border-blue-300'
                    : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                }`}
              >
                {/* Top Banner Stripe */}
                <div
                  className={`h-1.5 w-full ${
                    isMaintenance
                      ? 'bg-amber-500'
                      : isDirty
                      ? 'bg-rose-500'
                      : isCleaning
                      ? 'bg-blue-500'
                      : isInspected
                      ? 'bg-emerald-600'
                      : 'bg-emerald-400'
                  }`}
                />

                <div className="p-4">
                  {/* Room Number & Badges */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSelectRoom(room.id)}
                        className="text-[#94A3B8] hover:text-[#0F172A] p-0.5"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#00C48C]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      <div>
                        <div className="text-xl font-bold text-[#0F172A] flex items-center gap-1.5">
                          Room {room.roomNumber}
                          {isDirty && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                          )}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          Floor {room.floor} • {room.roomType?.name || 'Standard'}
                        </div>
                      </div>
                    </div>

                    {/* Occupancy Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        room.status === 'OCCUPIED'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : room.status === 'RESERVED'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : room.status === 'MAINTENANCE'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {room.status}
                    </span>
                  </div>

                  {/* Cleanliness Status Indicator Badge */}
                  <div className="mb-3">
                    <div
                      className={`p-2 rounded-xl text-xs font-bold flex items-center justify-between ${
                        isDirty
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : isCleaning
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : isInspected
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-teal-50 text-teal-800 border border-teal-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {isDirty && <Broom className="w-3.5 h-3.5 text-rose-600" />}
                        {isCleaning && <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-spin" />}
                        {isClean && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />}
                        {isInspected && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                        <span>
                          {isDirty && 'Needs Cleaning'}
                          {isCleaning && 'Cleaning in Progress'}
                          {isClean && 'Clean — Ready for Inspection'}
                          {isInspected && 'Inspected & Certified'}
                        </span>
                      </div>

                      <span className="text-[10px] opacity-75 font-mono">
                        {room.roomType?.bedType || 'Bed'}
                      </span>
                    </div>
                  </div>

                  {/* Housekeeping Notes */}
                  {room.notes ? (
                    <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] mb-3 text-[11px] text-[#475569] flex items-start gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#94A3B8] shrink-0 mt-0.5" />
                      <div className="line-clamp-2 italic">{room.notes}</div>
                    </div>
                  ) : null}
                </div>

                {/* Card Action Footer */}
                <div className="p-3 bg-[#F8FAFC] border-t border-[#F1F5F9] space-y-2">
                  {/* Primary Workflow Transition Button */}
                  {isDirty && (
                    <button
                      type="button"
                      onClick={() => handleQuickStatus(room.id, 'IN_CLEANING')}
                      className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Start Cleaning</span>
                    </button>
                  )}

                  {isCleaning && (
                    <button
                      type="button"
                      onClick={() => handleQuickStatus(room.id, 'CLEAN')}
                      className="w-full py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Complete Cleaning</span>
                    </button>
                  )}

                  {isClean && (
                    <button
                      type="button"
                      onClick={() => setInspectModalRoom(room)}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Inspect & Approve</span>
                    </button>
                  )}

                  {isInspected && (
                    <div className="py-1 px-2 text-center text-[11px] font-bold text-emerald-700 bg-emerald-100/60 rounded-xl">
                      ✓ Turn-Key Ready for Check-In
                    </div>
                  )}

                  {/* Secondary Control Row */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {/* Add / Edit Note */}
                    <button
                      type="button"
                      onClick={() => {
                        setNotesModalRoom(room);
                        setRoomNoteText(room.notes || '');
                      }}
                      className="py-1.5 px-2 rounded-lg border border-[#E2E8F0] hover:bg-white text-[10.5px] font-semibold text-[#475569] flex items-center justify-center gap-1 transition"
                      title="Add or update attendant note"
                    >
                      <FileText className="w-3 h-3 text-[#64748B]" />
                      <span>Note</span>
                    </button>

                    {/* Flag Dirty button if clean */}
                    {(isClean || isInspected) ? (
                      <button
                        type="button"
                        onClick={() => handleQuickStatus(room.id, 'DIRTY')}
                        className="py-1.5 px-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-[10.5px] font-semibold text-rose-700 flex items-center justify-center gap-1 transition"
                        title="Flag room as dirty"
                      >
                        <Broom className="w-3 h-3 text-rose-600" />
                        <span>Dirty</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleQuickStatus(room.id, 'CLEAN')}
                        className="py-1.5 px-2 rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100 text-[10.5px] font-semibold text-teal-700 flex items-center justify-center gap-1 transition"
                        title="Mark room clean immediately"
                      >
                        <CheckCircle2 className="w-3 h-3 text-teal-600" />
                        <span>Clean</span>
                      </button>
                    )}

                    {/* Maintenance Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setMaintenanceModalRoom(room);
                        setMaintenanceReason('');
                      }}
                      className={`py-1.5 px-2 rounded-lg border text-[10.5px] font-semibold flex items-center justify-center gap-1 transition ${
                        isMaintenance
                          ? 'border-amber-300 bg-amber-100 text-amber-800'
                          : 'border-[#E2E8F0] hover:bg-white text-[#475569]'
                      }`}
                      title={isMaintenance ? 'Return to service' : 'Report repair'}
                    >
                      <Wrench className="w-3 h-3 text-amber-600" />
                      <span>{isMaintenance ? 'Fix' : 'Repair'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= INSPECTION CHECKLIST MODAL ================= */}
      {inspectModalRoom && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xl animate-fade-scale">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    Certify Room {inspectModalRoom.roomNumber}
                  </h3>
                  <p className="text-xs text-[#64748B]">Floor {inspectModalRoom.floor} • Supervisor Checklist</p>
                </div>
              </div>
              <button
                onClick={() => setInspectModalRoom(null)}
                className="text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] mb-4 text-xs text-[#475569]">
              Please verify all housekeeping touchpoints before certifying this room as ready for incoming guest check-in.
            </div>

            {/* Interactive Checklist */}
            <div className="space-y-2.5 mb-6">
              {[
                { key: 'linens', label: 'Fresh bed linens & pillowcases replaced' },
                { key: 'bathroom', label: 'Bathroom fully sanitized & towels restocked' },
                { key: 'minibar', label: 'Minibar replenished & complimentary tea/water set' },
                { key: 'vacuum', label: 'Carpet vacuumed & hard surfaces dusted' },
                { key: 'appliances', label: 'Air conditioning, lighting, & TV remote verified working' },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-3 p-3 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] cursor-pointer transition"
                >
                  <input
                    type="checkbox"
                    checked={(checklist as any)[item.key]}
                    onChange={(e) =>
                      setChecklist({ ...checklist, [item.key]: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#00C48C] accent-[#00C48C] cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-[#0F172A]">{item.label}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setInspectModalRoom(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveInspection}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Certify Inspected</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ROOM NOTES MODAL ================= */}
      {notesModalRoom && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xl animate-fade-scale">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#00C48C]" />
                Housekeeping Note — Room {notesModalRoom.roomNumber}
              </h3>
              <button
                onClick={() => setNotesModalRoom(null)}
                className="text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNotes} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Attendant / Supervisor Comments
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. VIP arrival preparation requested, extra king pillows added, minibar restocked with diet soda..."
                  value={roomNoteText}
                  onChange={(e) => setRoomNoteText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] outline-none focus:bg-white focus:border-[#00C48C] transition"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNotesModalRoom(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNotes}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold transition shadow-xs"
                >
                  {savingNotes ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MAINTENANCE / OUT OF ORDER MODAL ================= */}
      {maintenanceModalRoom && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xl animate-fade-scale">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    {maintenanceModalRoom.status === 'MAINTENANCE'
                      ? `Return Room ${maintenanceModalRoom.roomNumber} to Service`
                      : `Flag Room ${maintenanceModalRoom.roomNumber} for Maintenance`}
                  </h3>
                  <p className="text-xs text-[#64748B]">Floor {maintenanceModalRoom.floor}</p>
                </div>
              </div>
              <button
                onClick={() => setMaintenanceModalRoom(null)}
                className="text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMaintenance} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                {maintenanceModalRoom.status === 'MAINTENANCE'
                  ? 'Returning this room to service will set its status to AVAILABLE and enable front desk to assign it for check-in.'
                  : 'Flagging this room for maintenance marks it as OUT OF ORDER and locks front desk from assigning guests to it.'}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Issue Details / Resolution Note
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={
                    maintenanceModalRoom.status === 'MAINTENANCE'
                      ? 'e.g. AC compressor replaced and verified cold.'
                      : 'e.g. Leaking pipe under bathroom sink. Engineering ticket #104 dispatched.'
                  }
                  value={maintenanceReason}
                  onChange={(e) => setMaintenanceReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] outline-none focus:bg-white focus:border-amber-500 transition"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMaintenanceModalRoom(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMaintenance}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-white text-xs font-bold transition shadow-xs ${
                    maintenanceModalRoom.status === 'MAINTENANCE'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {savingMaintenance
                    ? 'Updating...'
                    : maintenanceModalRoom.status === 'MAINTENANCE'
                    ? 'Confirm Return to Service'
                    : 'Confirm Out of Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
