'use client';

import React, { useState } from 'react';
import { Truck, Search, Plus, Mail, Phone, MapPin, CreditCard, Building } from 'lucide-react';

interface SuppliersTabProps {
  suppliers: any[];
  onOpenAddSupplier: () => void;
}

export default function SuppliersTab({ suppliers, onOpenAddSupplier }: SuppliersTabProps) {
  const [search, setSearch] = useState('');

  const filteredSuppliers = suppliers.filter((s) => {
    if (search) {
      const q = search.toLowerCase();
      const matchName = s.name?.toLowerCase().includes(q);
      const matchContact = s.contactPerson?.toLowerCase().includes(q);
      const matchCode = s.supplierCode?.toLowerCase().includes(q);
      if (!matchName && !matchContact && !matchCode) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="relative min-w-[240px] flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search suppliers by name, code, contact..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <button
          onClick={onOpenAddSupplier}
          className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-lg shadow-teal-600/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Supplier</span>
        </button>
      </div>

      {/* Supplier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSuppliers.map((supplier) => (
          <div
            key={supplier.id}
            className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover:border-teal-300 hover:shadow-md transition space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                  {supplier.supplierCode || 'SUP-VENDOR'}
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">{supplier.name}</h3>
                {supplier.contactPerson && (
                  <p className="text-xs text-slate-500 font-medium">Rep: {supplier.contactPerson}</p>
                )}
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-50 text-slate-600">
                <Truck className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
              {supplier.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{supplier.phone}</span>
                </div>
              )}
              {supplier.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{supplier.email}</span>
                </div>
              )}
              {supplier.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{supplier.address}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Payment Terms: <strong>{supplier.paymentTerms || 'Net 30'}</strong>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
