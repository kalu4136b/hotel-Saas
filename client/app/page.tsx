'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthCard from '@/components/AuthCard';
import { authStorage } from '@/lib/api';
import { ArrowRight, Building2, LayoutDashboard } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    const token = authStorage.getToken();
    if (token) {
      setUser(authStorage.getUser());
      setProperty(authStorage.getProperty());
    }
  }, []);

  if (!mounted) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-[#F8FAFC]">
        <div className="w-8 h-8 rounded-full border-2 border-[#00C48C] border-t-transparent animate-spin" />
      </main>
    );
  }

  // If user already has active session, offer one-click jump to dashboard or switch account
  if (user && user.role === 'SUPER_ADMIN') {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#F8FAFC]">
        <div className="w-full max-w-md bg-white rounded-[28px] border border-[#E2E8F0] p-8 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.08)] text-center animate-fade-scale">
          <div className="w-14 h-14 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center mx-auto mb-4 text-[#00C48C]">
            <Building2 className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-bold text-[#0F172A] mb-1">
            Welcome, Platform Admin
          </h2>
          <p className="text-xs text-[#64748B] mb-6">
            Global Multi-Tenant Platform Console
          </p>

          <button
            onClick={() => router.push('/admin')}
            className="w-full py-3.5 px-4 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold transition-all shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)] flex items-center justify-center gap-2 mb-3"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Open Super Admin Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              authStorage.clearSession();
              setUser(null);
              setProperty(null);
            }}
            className="w-full py-2.5 px-4 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#64748B] transition-all"
          >
            Switch Account / Log Out
          </button>
        </div>
      </main>
    );
  }

  if (user && property) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#F8FAFC]">
        <div className="w-full max-w-md bg-white rounded-[28px] border border-[#E2E8F0] p-8 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.08)] text-center animate-fade-scale">
          <div className="w-14 h-14 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center mx-auto mb-4 text-[#00C48C]">
            <Building2 className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-bold text-[#0F172A] mb-1">
            Welcome, {user.fullName}
          </h2>
          <p className="text-xs text-[#64748B] mb-6">
            Active Property: <span className="font-semibold text-[#0F172A]">{property.name}</span>
          </p>

          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3.5 px-4 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold transition-all shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)] flex items-center justify-center gap-2 mb-3"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Open Management Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              authStorage.clearSession();
              setUser(null);
              setProperty(null);
            }}
            className="w-full py-2.5 px-4 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#64748B] transition-all"
          >
            Switch Account / Log Out
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#F8FAFC]">
      <AuthCard initialMode="signup" />
    </main>
  );
}
