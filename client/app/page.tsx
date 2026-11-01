'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthCard from '@/components/AuthCard';
import { authStorage } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check for active tenant or super admin session
    const tenantToken = authStorage.getTenantToken();
    const adminToken = authStorage.getAdminToken();
    const generalToken = authStorage.getToken();
    const currentUser = authStorage.getUser();

    if (tenantToken || (generalToken && currentUser?.role !== 'SUPER_ADMIN')) {
      router.replace('/dashboard');
      return;
    }

    if (adminToken || (generalToken && currentUser?.role === 'SUPER_ADMIN')) {
      router.replace('/admin');
      return;
    }

    // No active session — show sign in
    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-[#F8FAFC]">
        <div className="w-8 h-8 rounded-full border-2 border-[#00C48C] border-t-transparent animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#F8FAFC]">
      <AuthCard />
    </main>
  );
}
