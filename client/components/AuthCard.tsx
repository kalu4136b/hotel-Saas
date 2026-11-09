'use client';

// Enterprise Hotel SaaS Authentication Console
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  Building2,
  Lock,
  User as UserIcon,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  BedDouble,
  UtensilsCrossed,
  BarChart3,
} from 'lucide-react';
import { authApi } from '@/lib/api';

export default function AuthCard() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sign in fields
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authApi.login({
        usernameOrEmail: usernameOrEmail.trim(),
        password: loginPassword,
        rememberMe,
      });

      if (res.user?.role === 'SUPER_ADMIN') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Invalid username/email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[1140px] bg-white rounded-[32px] border border-[#E2E8F0] shadow-[0_20px_50px_-15px_rgba(15,23,42,0.08)] grid grid-cols-1 lg:grid-cols-[1.08fr_1fr] p-3 lg:p-4 gap-6 animate-fade-scale overflow-hidden relative">
      {/* Top Floating Brand Tag */}
      <div className="absolute top-6 right-6 hidden lg:flex items-center gap-2 z-20">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
          <span className="w-2 h-2 rounded-full bg-[#00C48C] animate-pulse"></span>
          Live Production Engine
        </span>
      </div>

      {/* ================= LEFT HERO PANEL ================= */}
      <div
        className="rounded-[24px] p-8 lg:p-10 text-white flex flex-col justify-between relative overflow-hidden min-h-[560px] lg:min-h-[640px]"
        style={{
          background:
            'linear-gradient(135deg, #064E3B 0%, #0D9488 50%, #0284C7 100%)',
        }}
      >
        {/* Animated ambient mesh glow circles */}
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-[#00C48C] blur-3xl opacity-40 animate-glow pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-[#0284C7] blur-3xl opacity-40 animate-glow pointer-events-none" />

        {/* Top Header & Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-sm">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-white">
                ninth<span className="text-[#00C48C]">.</span>hotel
              </span>
              <span className="block text-[10px] uppercase font-bold tracking-widest text-emerald-200">
                Hospitality Cloud
              </span>
            </div>
          </div>
        </div>

        {/* Middle Value Proposition */}
        <div className="relative z-10 my-auto py-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-md text-emerald-100 border border-white/20 mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00C48C]" />
            <span>Enterprise Hospitality OS</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight mb-3">
            Hotel Command &amp; Operations Center
          </h2>
          <p className="text-sm text-emerald-100/85 leading-relaxed max-w-md">
            Unified operations console for front desk, room reservations, high-speed POS terminals, bar inventory, kitchen displays, and live financial revenue.
          </p>
        </div>

        {/* 3 Capability Highlight Cards */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="p-3.5 rounded-xl border bg-white/10 border-white/15 backdrop-blur-md transition-all hover:bg-white/15">
            <div className="w-7 h-7 rounded-lg bg-[#00C48C]/30 border border-[#00C48C]/40 text-[#00C48C] flex items-center justify-center mb-2.5">
              <BedDouble className="w-4 h-4 text-white" />
            </div>
            <div className="text-xs font-bold text-white mb-0.5">
              PMS &amp; Front Desk
            </div>
            <div className="text-[11px] text-emerald-100/75 leading-tight">
              Room stays, reservations &amp; folios
            </div>
          </div>

          <div className="p-3.5 rounded-xl border bg-white/10 border-white/15 backdrop-blur-md transition-all hover:bg-white/15">
            <div className="w-7 h-7 rounded-lg bg-[#0284C7]/30 border border-[#0284C7]/40 text-sky-300 flex items-center justify-center mb-2.5">
              <UtensilsCrossed className="w-4 h-4 text-white" />
            </div>
            <div className="text-xs font-bold text-white mb-0.5">
              POS &amp; Outlets
            </div>
            <div className="text-[11px] text-emerald-100/75 leading-tight">
              Table service, kitchen &amp; bar stock
            </div>
          </div>

          <div className="p-3.5 rounded-xl border bg-white/10 border-white/15 backdrop-blur-md transition-all hover:bg-white/15">
            <div className="w-7 h-7 rounded-lg bg-emerald-400/30 border border-emerald-400/40 text-emerald-200 flex items-center justify-center mb-2.5">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div className="text-xs font-bold text-white mb-0.5">
              Audit &amp; Finance
            </div>
            <div className="text-[11px] text-emerald-100/75 leading-tight">
              Real-time telemetry &amp; reporting
            </div>
          </div>
        </div>
      </div>

      {/* ================= RIGHT FORM PANEL ================= */}
      <div className="p-4 lg:p-8 flex flex-col justify-center max-w-[480px] mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F1F5F9] text-[#475569] text-[11px] font-semibold mb-3">
            <Lock className="w-3 h-3 text-[#00C48C]" />
            <span>Secure Personnel Sign-In</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#0F172A] mb-1">
            Welcome Back
          </h1>
          <p className="text-xs text-[#64748B]">
            Enter your credentials to access your hotel management console.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-fade-scale">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* ================= LOG IN FORM ================= */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Username or Email */}
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Username or Email
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="novotel_admin or admin@domain.com"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:border-[#00C48C] focus:ring-2 focus:ring-[#00C48C]/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#0F172A]">
                Password
              </label>
              <button
                type="button"
                onClick={() =>
                  alert(
                    'Please contact your hotel administrator or platform support to reset your credentials.',
                  )
                }
                className="text-[11px] font-semibold text-[#00C48C] hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:border-[#00C48C] focus:ring-2 focus:ring-[#00C48C]/20 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] transition-colors"
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <input
              type="checkbox"
              id="rememberMeCheckbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded text-[#00C48C] accent-[#00C48C] cursor-pointer"
            />
            <label htmlFor="rememberMeCheckbox" className="cursor-pointer">
              Keep me signed in on this workstation
            </label>
          </div>

          {/* Super Admin Quick Shortcut (Development Only) */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="p-2.5 rounded-xl bg-[#0F172A]/5 border border-[#E2E8F0] flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-[#0F172A] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00C48C]"></span>
                  Company Platform Manager
                </div>
                <div className="text-[9.5px] text-[#64748B]">
                  Super Admin: <code className="text-[#0F172A] font-semibold">superadmin</code> / <code className="text-[#0F172A] font-semibold">SuperAdmin123!</code>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUsernameOrEmail('superadmin');
                  setLoginPassword('SuperAdmin123!');
                }}
                className="px-2 py-1 bg-white hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[10px] font-bold rounded-lg text-[#0F172A] transition"
              >
                Auto-Fill
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-[#00C48C] hover:bg-[#00A877] active:bg-[#008F65] text-white text-xs font-bold transition-all shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In to Hotel Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {/* Enterprise Access Information Note */}
          <div className="mt-5 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center">
            <div className="text-[11px] font-semibold text-[#0F172A] flex items-center justify-center gap-1.5 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00C48C]" />
              <span>Restricted Enterprise Access</span>
            </div>
            <p className="text-[10.5px] text-[#64748B] leading-relaxed">
              Public self-registration is disabled. New hotel tenants and staff accounts are provisioned exclusively by Platform Administration.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
