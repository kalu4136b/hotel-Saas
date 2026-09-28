'use client';

// Floor plan & dining tables management
import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { posApi } from '@/lib/api';
import {
  Grid,
  Plus,
  Users,
  UtensilsCrossed,
  RefreshCw,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function TablesManagementPage() {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTable, setNewTable] = useState({
    tableNumber: '',
    capacity: 4,
  });
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadTables = async () => {
    try {
      setLoading(true);
      const data = await posApi.getTables();
      setTables(data);
    } catch (err: any) {
      setFeedback({ type: 'error', text: 'Failed to load tables: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFeedback(null);
    try {
      await posApi.createTable({
        tableNumber: newTable.tableNumber.trim(),
        capacity: Number(newTable.capacity) || 4,
      });
      setAddModalOpen(false);
      setNewTable({ tableNumber: '', capacity: 4 });
      setFeedback({ type: 'success', text: `Table "${newTable.tableNumber}" created successfully!` });
      await loadTables();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to create table' });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTable = async (table: any) => {
    if (table.status !== 'AVAILABLE') {
      alert('Cannot delete a table with an active or billed order.');
      return;
    }
    if (!confirm(`Are you sure you want to remove Table "${table.tableNumber}"?`)) {
      return;
    }

    try {
      await posApi.deleteTable(table.id);
      setFeedback({ type: 'success', text: `Table "${table.tableNumber}" deleted.` });
      await loadTables();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to delete table' });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C48C] animate-pulse"></span>
              Live Dining Floor Plan
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#0F172A]">
              Dining Floor &amp; Table Layout
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Configure restaurant tables, seating capacities, and monitor live guest occupancy.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={loadTables}
              disabled={loading}
              className="py-2 px-3 rounded-xl border border-[#E2E8F0] hover:bg-white bg-[#F8FAFC] text-xs font-semibold text-[#64748B] transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#00C48C]' : ''}`} />
              <span>Refresh Floor</span>
            </button>
            <button
              onClick={() => setAddModalOpen(true)}
              className="py-2 px-3.5 rounded-xl bg-[#00C48C] hover:bg-[#00B07D] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Dining Table</span>
            </button>
            <a
              href="/dashboard/pos"
              className="py-2 px-3.5 rounded-xl bg-[#0F172A] hover:bg-black text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <UtensilsCrossed className="w-3.5 h-3.5 text-[#00C48C]" />
              <span>Open POS Terminal</span>
            </a>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 text-xs font-medium ${
              feedback.type === 'success'
                ? 'bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46]'
                : 'bg-rose-50 border border-rose-200 text-rose-700'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#00C48C]" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            )}
            <span className="flex-1">{feedback.text}</span>
            <button onClick={() => setFeedback(null)} className="text-xs opacity-60 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tables Grid */}
        {loading ? (
          <div className="py-20 text-center text-xs text-[#64748B]">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#00C48C]" />
            Loading dining floor layout...
          </div>
        ) : tables.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center text-[#94A3B8]">
            <Grid className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-sm">No dining tables configured yet.</p>
            <button
              onClick={() => setAddModalOpen(true)}
              className="mt-3 px-4 py-2 bg-[#00C48C] text-white font-bold text-xs rounded-xl"
            >
              Add Your First Table
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tables.map((table) => {
              const isAvailable = table.status === 'AVAILABLE';
              const isOccupied = table.status === 'OCCUPIED';
              const isBilled = table.status === 'BILLED';

              let statusBadge = 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]';
              let borderStyle = 'border-[#E2E8F0]';

              if (isOccupied) {
                statusBadge = 'bg-amber-100 text-amber-800 border-amber-300';
                borderStyle = 'border-amber-300 bg-amber-50/20';
              } else if (isBilled) {
                statusBadge = 'bg-purple-100 text-purple-800 border-purple-300';
                borderStyle = 'border-purple-300 bg-purple-50/20';
              }

              return (
                <div
                  key={table.id}
                  className={`bg-white rounded-2xl border ${borderStyle} p-5 shadow-xs flex flex-col justify-between min-h-[150px] relative group`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base font-extrabold text-[#0F172A]">
                        {table.tableNumber}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge}`}>
                        {table.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                      <Users className="w-3.5 h-3.5" />
                      <span>Capacity: {table.capacity} Guests</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex justify-between items-center text-xs">
                    <span className="text-[11px] text-[#94A3B8]">
                      {isAvailable ? 'Ready for guests' : isOccupied ? 'In Service' : 'Bill Printed'}
                    </span>
                    <div className="flex items-center gap-2">
                      {isAvailable && (
                        <button
                          onClick={() => handleDeleteTable(table)}
                          title="Delete Table"
                          className="p-1 rounded-lg text-[#94A3B8] hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <a
                        href="/dashboard/pos"
                        className="font-bold text-[#00C48C] hover:underline flex items-center gap-1 text-[11px]"
                      >
                        POS &rarr;
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Add Dining Table */}
        {addModalOpen && (
          <div className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-100">
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9] mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#00C48C]/10 text-[#00C48C] flex items-center justify-center">
                    <Grid className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">Add Dining Table</h3>
                    <p className="text-[11px] text-[#64748B]">Configure table label and seating capacity.</p>
                  </div>
                </div>
                <button onClick={() => setAddModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTable} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Table Number / Name</label>
                  <input
                    type="text"
                    required
                    value={newTable.tableNumber}
                    onChange={(e) => setNewTable({ ...newTable, tableNumber: e.target.value })}
                    placeholder="e.g. Table 7 or Patio T-1"
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:border-[#00C48C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Seating Capacity (Guests)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={newTable.capacity}
                    onChange={(e) => setNewTable({ ...newTable, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-mono font-bold focus:bg-white focus:outline-none focus:border-[#00C48C]"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-[#F1F5F9]">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="px-4 py-2 border border-[#E2E8F0] text-xs font-semibold rounded-xl text-[#64748B]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-[#00C48C] hover:bg-[#00B07D] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
                  >
                    {creating ? 'Saving...' : 'Add Table'}
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
