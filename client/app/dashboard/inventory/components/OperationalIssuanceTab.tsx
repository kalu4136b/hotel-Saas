'use client';

import React, { useState } from 'react';
import { Building2, Search, Send, Calendar, User, Package, Tag } from 'lucide-react';

interface OperationalIssuanceTabProps {
  issuances: any[];
  onOpenCreateIssuance: () => void;
}

export default function OperationalIssuanceTab({
  issuances,
  onOpenCreateIssuance,
}: OperationalIssuanceTabProps) {
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  const departments = Array.from(
    new Set(issuances.map((iss) => iss.department).filter(Boolean)),
  );

  const filteredIssuances = issuances.filter((iss) => {
    if (departmentFilter && iss.department !== departmentFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchNum = iss.issuanceNumber?.toLowerCase().includes(q);
      const matchDept = iss.department?.toLowerCase().includes(q);
      const matchRec = iss.receivedByName?.toLowerCase().includes(q);
      if (!matchNum && !matchDept && !matchRec) return false;
    }
    return true;
  });

  const totalIssuedQty = issuances.reduce((sum, i) => sum + Number(i.totalQuantity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Bar with Filters & Action */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[220px] flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search issuance #, department, or staff..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Departments</option>
            {departments.map((d: any) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onOpenCreateIssuance}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/20 flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          <span>New Department Issuance</span>
        </button>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Issuance Events</span>
          <span className="text-xl font-black text-slate-900 mt-0.5 block">{issuances.length} Transfers Completed</span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-indigo-600 block text-[10px] uppercase font-bold">Total Operational Units Issued</span>
          <span className="text-xl font-black text-indigo-700 mt-0.5 block">{totalIssuedQty} Units Dispatched</span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Active Receiving Departments</span>
          <span className="text-xl font-black text-slate-900 mt-0.5 block">{departments.length} Hotel Divisions</span>
        </div>
      </div>

      {/* Issuances Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-3 px-4">Issuance Number</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Received By</th>
                <th className="py-3 px-2 text-center">Items</th>
                <th className="py-3 px-2 text-center">Total Quantity</th>
                <th className="py-3 px-4">Supplies &amp; Asset Tags Issued</th>
                <th className="py-3 px-3">Issued By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIssuances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No operational stock issuance records found.
                  </td>
                </tr>
              ) : (
                filteredIssuances.map((iss) => (
                  <tr key={iss.id} className="hover:bg-indigo-50/20 transition">
                    <td className="py-3 px-4">
                      <div className="font-mono font-black text-slate-900 text-sm flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{iss.issuanceNumber}</span>
                      </div>
                      {iss.notes && <div className="text-[10px] text-slate-400 truncate max-w-xs">{iss.notes}</div>}
                    </td>

                    <td className="py-3 px-3 text-slate-600 font-mono">
                      {new Date(iss.issuanceDate).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-800 border border-indigo-200">
                        {iss.department}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-bold text-slate-900">{iss.receivedByName}</td>

                    <td className="py-3 px-2 text-center font-mono font-bold text-slate-700">
                      {iss.totalItems || iss.items?.length || 0}
                    </td>

                    <td className="py-3 px-2 text-center font-mono font-bold text-indigo-700 text-sm">
                      {iss.totalQuantity}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5 max-w-md">
                        {iss.items?.map((item: any, idx: number) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] text-slate-700 font-medium"
                          >
                            <span>
                              {item.inventoryItem?.name || 'Supply'}: <strong>{item.quantity}</strong>
                            </span>
                            {item.assetTag && (
                              <span className="font-mono font-bold text-purple-700 bg-purple-50 px-1 rounded">
                                #{item.assetTag}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-500 font-medium">
                      {iss.issuedByName || 'Storekeeper'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
