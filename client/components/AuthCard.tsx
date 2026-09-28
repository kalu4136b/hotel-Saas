'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  Check,
  Building2,
  Lock,
  User as UserIcon,
  Mail,
  Phone,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { authApi } from '@/lib/api';

interface AuthCardProps {
  initialMode?: 'login' | 'signup';
}

export default function AuthCard({ initialMode = 'signup' }: AuthCardProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sign up fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [propertyName, setPropertyName] = useState('');
  const [password, setPassword] = useState('');

  // Log in fields
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authApi.register({
        fullName,
        username,
        email,
        phone: phone ? `${countryCode} ${phone}` : undefined,
        propertyName: propertyName || undefined,
        password,
      });

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authApi.login({
        usernameOrEmail,
        password: loginPassword,
      });

      router.push('/dashboard');
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

        {/* Middle Catchphrase & Value Proposition */}
        <div className="relative z-10 my-auto py-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-md text-emerald-100 border border-white/20 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#00C48C]" />
            <span>Join Us to Build 🤩</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight mb-3">
            {mode === 'signup'
              ? 'Start your Hospitality Journey'
              : 'Welcome Back to your Hotel Command Center'}
          </h2>
          <p className="text-sm text-emerald-100/85 leading-relaxed max-w-md">
            {mode === 'signup'
              ? 'Follow these simple steps to set up your account and access your hotel suite management console.'
              : 'Access your live POS terminals, kitchen orders, billing engine, and revenue telemetry.'}
          </p>
        </div>

        {/* 3-Step Flow Cards matching template screenshot */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div
            className={`p-3 rounded-xl border backdrop-blur-md transition-all ${
              mode === 'signup'
                ? 'bg-white/20 border-white/40 shadow-sm'
                : 'bg-white/10 border-white/15 opacity-75'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-[#00C48C] text-white flex items-center justify-center text-xs font-bold mb-2">
              1
            </div>
            <div className="text-xs font-semibold text-white leading-snug">
              Register your account
            </div>
          </div>

          <div className="p-3 rounded-xl border bg-white/10 border-white/15 backdrop-blur-md opacity-75">
            <div className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-bold mb-2">
              2
            </div>
            <div className="text-xs font-semibold text-white leading-snug">
              Configure POS &amp; Tables
            </div>
          </div>

          <div className="p-3 rounded-xl border bg-white/10 border-white/15 backdrop-blur-md opacity-75">
            <div className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-bold mb-2">
              3
            </div>
            <div className="text-xs font-semibold text-white leading-snug">
              Accept Live Orders
            </div>
          </div>
        </div>
      </div>

      {/* ================= RIGHT FORM PANEL ================= */}
      <div className="p-4 lg:p-8 flex flex-col justify-center max-w-[480px] mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#0F172A] mb-1">
            {mode === 'signup' ? 'Join Us' : 'Welcome Back'}
          </h1>
          <p className="text-xs text-[#64748B]">
            {mode === 'signup'
              ? 'Create your multi-tenant hotel account and property setup in 30 seconds.'
              : 'Enter your credentials to access your hotel console.'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-fade-scale">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* ================= SIGN UP FORM ================= */}
        {mode === 'signup' ? (
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Phone Number Field with country selector */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Phone number
              </label>
              <div className="flex rounded-xl border border-[#E2E8F0] focus-within:border-[#00C48C] focus-within:ring-2 focus-within:ring-[#00C48C]/20 transition-all bg-[#F8FAFC]">
                <div className="flex items-center gap-1.5 px-3 border-r border-[#E2E8F0] bg-white rounded-l-xl text-xs font-bold text-[#0F172A]">
                  <span>🇺🇸</span>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="bg-transparent border-none outline-none cursor-pointer pr-1"
                  >
                    <option value="+1">+1</option>
                    <option value="+44">+44</option>
                    <option value="+94">+94</option>
                    <option value="+374">+374</option>
                    <option value="+971">+971</option>
                    <option value="+66">+66</option>
                  </select>
                </div>
                <input
                  type="tel"
                  placeholder="000 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-transparent outline-none text-xs text-[#0F172A] placeholder:text-[#94A3B8]"
                />
              </div>
            </div>

            {/* Full Name & Username */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Juliette Karapetyan"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:border-[#00C48C] focus:ring-2 focus:ring-[#00C48C]/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="julietux"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:border-[#00C48C] focus:ring-2 focus:ring-[#00C48C]/20 outline-none transition-all"
                  />
                  {username.length >= 3 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00C48C]">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Email Address & Hotel Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Work Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="juliet@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:border-[#00C48C] focus:ring-2 focus:ring-[#00C48C]/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Hotel / Property Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Novotel Resort"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:border-[#00C48C] focus:ring-2 focus:ring-[#00C48C]/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="••••••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:border-[#00C48C] focus:ring-2 focus:ring-[#00C48C]/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-[#64748B] mt-1.5 leading-snug">
                At least 6 characters. Letters, numbers, and symbols.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#00C48C] hover:bg-[#00A877] active:bg-[#008F65] text-white text-xs font-bold transition-all shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Tenant Environment...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {/* Switch Mode Prompt */}
            <div className="text-center text-xs text-[#64748B]">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="font-bold text-[#00C48C] hover:underline"
              >
                Log in
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center text-center text-[#94A3B8] text-xs font-semibold my-2">
              <div className="flex-1 border-b border-[#E2E8F0]"></div>
              <span className="px-3">Or</span>
              <div className="flex-1 border-b border-[#E2E8F0]"></div>
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={() =>
                alert(
                  'Google OAuth SSO will be enabled via Cloud Identity Provider.',
                )
              }
              className="w-full py-2.5 px-4 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.86c2.26-2.09 3.68-5.17 3.68-9.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.37 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                />
              </svg>
              <span>Sign up with Google</span>
            </button>

            {/* Legal Footer */}
            <p className="text-[10.5px] text-center text-[#94A3B8] leading-tight pt-1">
              By signing up I confirm that I have read and agree to the Ninth
              Hotel SaaS{' '}
              <a href="#" className="text-[#00C48C] font-semibold hover:underline">
                Privacy Policy
              </a>{' '}
              and{' '}
              <a href="#" className="text-[#00C48C] font-semibold hover:underline">
                Terms of Service
              </a>
              .
            </p>
          </form>
        ) : (
          /* ================= LOG IN FORM ================= */
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
                      'Please contact your hotel administrator or support to reset your credentials.',
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

            {/* Switch to Sign Up */}
            <div className="text-center text-xs text-[#64748B]">
              Don&apos;t have an account yet?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className="font-bold text-[#00C48C] hover:underline"
              >
                Join us
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center text-center text-[#94A3B8] text-xs font-semibold my-2">
              <div className="flex-1 border-b border-[#E2E8F0]"></div>
              <span className="px-3">Or</span>
              <div className="flex-1 border-b border-[#E2E8F0]"></div>
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={() =>
                alert(
                  'Google OAuth SSO will be enabled via Cloud Identity Provider.',
                )
              }
              className="w-full py-2.5 px-4 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.86c2.26-2.09 3.68-5.17 3.68-9.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.37 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
