'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { channelManagerApi, pmsApi } from '@/lib/api';
import {
  Layers,
  Sparkles,
  Save,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export default function MappingsPage() {
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'ROOMS' | 'RATES'>('ROOMS');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Room Mapping State
  const [internalRoomTypes, setInternalRoomTypes] = useState<any[]>([]);
  const [roomMappings, setRoomMappings] = useState<any[]>([]);

  // Rate Plan Mapping State
  const [ratePlanMappings, setRatePlanMappings] = useState<any[]>([]);
  const [newRatePlan, setNewRatePlan] = useState({
    internalRatePlanCode: 'STANDARD',
    externalRatePlanId: '',
    externalRatePlanName: '',
    mealPlan: 'ROOM_ONLY',
    cancellationPolicy: 'FLEXIBLE',
  });

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    setLoading(true);
    try {
      const data = await channelManagerApi.getDashboard();
      const list = data.channels || [];
      setChannels(list);
      if (list.length > 0) {
        setSelectedConnection(list[0]);
        await loadMappings(list[0].id);
      }
    } catch (err: any) {
      alert('Failed to load channels: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMappings = async (connectionId: string) => {
    try {
      const [roomsData, ratesData] = await Promise.all([
        channelManagerApi.getRoomMappings(connectionId),
        channelManagerApi.getRatePlanMappings(connectionId),
      ]);
      setInternalRoomTypes(roomsData.internalRoomTypes || []);
      setRoomMappings(roomsData.mappings || []);
      setRatePlanMappings(ratesData || []);
    } catch (err: any) {
      console.error('Failed to load mappings:', err);
    }
  };

  const handleChannelChange = async (connectionId: string) => {
    const conn = channels.find((c) => c.id === connectionId);
    if (!conn) return;
    setSelectedConnection(conn);
    setLoading(true);
    await loadMappings(conn.id);
    setLoading(false);
  };

  const handleAutoSuggest = async () => {
    if (!selectedConnection) return;
    try {
      const suggestions = await channelManagerApi.autoSuggestRooms(selectedConnection.id);
      for (const s of suggestions) {
        await channelManagerApi.saveRoomMapping(selectedConnection.id, {
          roomTypeId: s.roomTypeId,
          externalRoomId: s.suggestedExternalId,
          externalRoomName: s.suggestedExternalName,
          externalMaxOccupancy: s.suggestedOccupancy,
          syncAvailability: true,
          syncRates: true,
        });
      }
      await loadMappings(selectedConnection.id);
      setFeedback('Automated mapping suggestions applied successfully!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert('Auto-suggest failed: ' + err.message);
    }
  };

  const handleSaveRoomMapping = async (
    roomTypeId: string,
    externalRoomId: string,
    externalRoomName: string,
    externalMaxOccupancy: number,
  ) => {
    if (!selectedConnection || !externalRoomId.trim()) return;
    setSaving(true);
    try {
      await channelManagerApi.saveRoomMapping(selectedConnection.id, {
        roomTypeId,
        externalRoomId,
        externalRoomName,
        externalMaxOccupancy,
        syncAvailability: true,
        syncRates: true,
      });
      await loadMappings(selectedConnection.id);
      setFeedback('Room mapping saved successfully.');
      setTimeout(() => setFeedback(null), 2500);
    } catch (err: any) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoomMapping = async (mappingId: string) => {
    if (!selectedConnection) return;
    try {
      await channelManagerApi.deleteRoomMapping(selectedConnection.id, mappingId);
      await loadMappings(selectedConnection.id);
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleSaveRatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConnection || !newRatePlan.externalRatePlanId.trim()) return;
    setSaving(true);
    try {
      await channelManagerApi.saveRatePlanMapping(selectedConnection.id, newRatePlan);
      setNewRatePlan({
        internalRatePlanCode: 'STANDARD',
        externalRatePlanId: '',
        externalRatePlanName: '',
        mealPlan: 'ROOM_ONLY',
        cancellationPolicy: 'FLEXIBLE',
      });
      await loadMappings(selectedConnection.id);
      setFeedback('Rate plan mapping saved.');
      setTimeout(() => setFeedback(null), 2500);
    } catch (err: any) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRatePlan = async (mappingId: string) => {
    if (!selectedConnection) return;
    try {
      await channelManagerApi.deleteRatePlanMapping(selectedConnection.id, mappingId);
      await loadMappings(selectedConnection.id);
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
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
              <span className="font-semibold text-slate-700">Mappings</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Room Type & Rate Plan Mappings
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Map internal PMS room categories and rate plans to their corresponding external OTA identifiers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-500">Selected OTA:</label>
            <select
              value={selectedConnection?.id || ''}
              onChange={(e) => handleChannelChange(e.target.value)}
              className="px-4 py-2 text-sm font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 shadow-xs"
            >
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.platformName} ({c.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {feedback}
          </div>
        )}

        {/* Tab Controls */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('ROOMS')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'ROOMS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Room Type Mappings ({internalRoomTypes.length})
          </button>
          <button
            onClick={() => setActiveTab('RATES')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'RATES'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Rate Plan Mappings ({ratePlanMappings.length})
          </button>
        </div>

        {/* TAB 1: ROOM TYPE MAPPINGS */}
        {activeTab === 'ROOMS' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Room Mappings for {selectedConnection?.platformName}
                </h2>
                <p className="text-xs text-slate-500">
                  Ensure all active room types are mapped to prevent booking failures or inventory leakage.
                </p>
              </div>

              <button
                onClick={handleAutoSuggest}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition"
              >
                <Sparkles className="w-4 h-4" />
                Auto-Suggest Mappings
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                    <th className="pb-3">Internal PMS Room Type</th>
                    <th className="pb-3">Base Price (LKR)</th>
                    <th className="pb-3">External OTA Room ID</th>
                    <th className="pb-3">External Room Name</th>
                    <th className="pb-3">Occupancy</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {internalRoomTypes.map((rt) => {
                    const mapping = roomMappings.find((m) => m.roomTypeId === rt.id);
                    return (
                      <RoomMappingRow
                        key={rt.id}
                        roomType={rt}
                        existingMapping={mapping}
                        onSave={handleSaveRoomMapping}
                        onDelete={handleDeleteRoomMapping}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: RATE PLAN MAPPINGS */}
        {activeTab === 'RATES' && (
          <div className="space-y-5">
            {/* Add New Rate Plan Mapping */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-3">Add Rate Plan Mapping</h2>
              <form onSubmit={handleSaveRatePlan} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Internal Rate Plan Code
                  </label>
                  <select
                    value={newRatePlan.internalRatePlanCode}
                    onChange={(e) =>
                      setNewRatePlan((prev) => ({ ...prev, internalRatePlanCode: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  >
                    <option value="STANDARD">Standard Rate</option>
                    <option value="NON_REFUNDABLE">Non-Refundable</option>
                    <option value="BED_AND_BREAKFAST">Bed & Breakfast</option>
                    <option value="HALF_BOARD">Half Board</option>
                    <option value="FULL_BOARD">Full Board</option>
                    <option value="PROMOTIONAL">Promotional Rate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    External Rate Plan ID
                  </label>
                  <input
                    type="text"
                    required
                    value={newRatePlan.externalRatePlanId}
                    onChange={(e) =>
                      setNewRatePlan((prev) => ({ ...prev, externalRatePlanId: e.target.value }))
                    }
                    placeholder="e.g. BAR_01 or RP-9812"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    External Plan Name
                  </label>
                  <input
                    type="text"
                    value={newRatePlan.externalRatePlanName}
                    onChange={(e) =>
                      setNewRatePlan((prev) => ({ ...prev, externalRatePlanName: e.target.value }))
                    }
                    placeholder="e.g. Standard Room Only"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Meal Plan</label>
                  <select
                    value={newRatePlan.mealPlan}
                    onChange={(e) => setNewRatePlan((prev) => ({ ...prev, mealPlan: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  >
                    <option value="ROOM_ONLY">Room Only</option>
                    <option value="BREAKFAST">Breakfast Included</option>
                    <option value="HALF_BOARD">Half Board</option>
                    <option value="ALL_INCLUSIVE">All Inclusive</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Map Plan
                </button>
              </form>
            </div>

            {/* Existing Rate Plans Table */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-4">
                Active Rate Plan Mappings ({ratePlanMappings.length})
              </h2>

              {ratePlanMappings.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No rate plan mappings configured for this channel yet.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                      <th className="pb-3">Internal Code</th>
                      <th className="pb-3">External Rate Plan ID</th>
                      <th className="pb-3">External Rate Plan Name</th>
                      <th className="pb-3">Meal Plan</th>
                      <th className="pb-3">Cancellation Policy</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ratePlanMappings.map((rpm) => (
                      <tr key={rpm.id} className="hover:bg-slate-50/50">
                        <td className="py-3 font-mono font-bold text-indigo-700">
                          {rpm.internalRatePlanCode}
                        </td>
                        <td className="py-3 font-mono font-medium text-slate-800">
                          {rpm.externalRatePlanId}
                        </td>
                        <td className="py-3 text-slate-600">{rpm.externalRatePlanName || '—'}</td>
                        <td className="py-3 text-slate-600">{rpm.mealPlan}</td>
                        <td className="py-3 text-slate-600">{rpm.cancellationPolicy}</td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleDeleteRatePlan(rpm.id)}
                            className="text-rose-600 hover:text-rose-800 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function RoomMappingRow({
  roomType,
  existingMapping,
  onSave,
  onDelete,
}: {
  roomType: any;
  existingMapping?: any;
  onSave: (
    roomTypeId: string,
    externalRoomId: string,
    externalRoomName: string,
    externalMaxOccupancy: number,
  ) => void;
  onDelete: (mappingId: string) => void;
}) {
  const [externalId, setExternalId] = useState(existingMapping?.externalRoomId || '');
  const [externalName, setExternalName] = useState(existingMapping?.externalRoomName || roomType.name);
  const [occupancy, setOccupancy] = useState(existingMapping?.externalMaxOccupancy || roomType.maxOccupancy);
  const [isChanged, setIsChanged] = useState(false);

  useEffect(() => {
    if (existingMapping) {
      setExternalId(existingMapping.externalRoomId);
      setExternalName(existingMapping.externalRoomName || roomType.name);
      setOccupancy(existingMapping.externalMaxOccupancy || roomType.maxOccupancy);
    }
  }, [existingMapping, roomType]);

  const handleFieldChange = (field: string, value: any) => {
    setIsChanged(true);
    if (field === 'id') setExternalId(value);
    if (field === 'name') setExternalName(value);
    if (field === 'occ') setOccupancy(Number(value));
  };

  return (
    <tr className="hover:bg-slate-50/50">
      <td className="py-3">
        <div className="font-bold text-slate-900">{roomType.name}</div>
        <div className="text-[11px] text-slate-400 font-mono">{roomType.code || 'NO-CODE'}</div>
      </td>
      <td className="py-3 font-semibold text-slate-700">
        LKR {Number(roomType.basePricePerNight).toLocaleString()}
      </td>
      <td className="py-3">
        <input
          type="text"
          value={externalId}
          onChange={(e) => handleFieldChange('id', e.target.value)}
          placeholder="External Room ID"
          className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 w-36 font-mono focus:border-indigo-500 focus:outline-none"
        />
      </td>
      <td className="py-3">
        <input
          type="text"
          value={externalName}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          placeholder="External Room Name"
          className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 w-44 focus:border-indigo-500 focus:outline-none"
        />
      </td>
      <td className="py-3">
        <input
          type="number"
          min="1"
          max="10"
          value={occupancy}
          onChange={(e) => handleFieldChange('occ', e.target.value)}
          className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 w-16 text-center"
        />
      </td>
      <td className="py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onSave(roomType.id, externalId, externalName, occupancy)}
            disabled={!externalId.trim()}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              isChanged
                ? 'bg-indigo-600 text-white'
                : existingMapping
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {existingMapping ? 'Update' : 'Map'}
          </button>

          {existingMapping && (
            <button
              onClick={() => onDelete(existingMapping.id)}
              className="text-rose-500 hover:text-rose-700 p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
