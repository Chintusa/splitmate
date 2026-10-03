import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import SplitMateLogo from '../components/ui/SplitMateLogo';
import AppIcon from '../components/ui/AppIcon';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as { email?: string; verified?: boolean; from?: Location } | null;
  const [form, setForm] = useState({
    email: state?.email || '',
    password: '',
    rememberMe: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifiedBanner, setVerifiedBanner] = useState(state?.verified === true);

  // If already logged in, redirect away
  useEffect(() => {
    if (user) {
      const from = (state?.from as any)?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user]);

  // Auto-hide the verified banner after 5s
  useEffect(() => {
    if (!verifiedBanner) return;
    const t = setTimeout(() => setVerifiedBanner(false), 5000);
    return () => clearTimeout(t);
  }, [verifiedBanner]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(form.email, form.password);
      const from = (state?.from as any)?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Invalid credentials. Email or password is incorrect.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="font-sans antialiased text-on-surface bg-surface min-h-screen flex flex-col justify-between selection:bg-brand-100 selection:text-brand-900">
      <div className="min-h-screen flex flex-col lg:flex-row w-full">
        {/* LEFT PANEL (45% on desktop): Brand & Miniature Dashboard Showcase (Stitch Screen 8) */}
        <div className="hidden lg:flex lg:w-[45%] bg-[#0F766E] text-white flex-col justify-between p-12 relative overflow-hidden shadow-2xl">
          {/* Background subtle geometry */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(204,251,241,0.18),rgba(255,255,255,0))] pointer-events-none" />
          <div className="absolute -right-24 -bottom-24 w-96 h-96 bg-brand-800 rounded-full blur-3xl opacity-40 pointer-events-none" />

          {/* Top Branding */}
          <div className="relative z-10 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <SplitMateLogo size="lg" variant="light" />
            </Link>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-brand-100 border border-white/15 backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Sync Engine
            </span>
          </div>

          {/* Mid Content: Headline & Miniature Dashboard Preview */}
          <div className="relative z-10 my-auto py-8">
            <div className="max-w-md">
              <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
                Split expenses.<br />
                <span className="text-brand-200">Stay even.</span>
              </h1>
              <p className="mt-3 text-brand-100 text-sm leading-relaxed text-opacity-90">
                Manage shared expenses, track balances, and settle up with your group — without the spreadsheet chaos.
              </p>
            </div>

            {/* Miniature Dashboard Preview Card */}
            <div className="mt-8 bg-white/95 text-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-xs border border-white/40 transform transition-all duration-300 hover:scale-[1.01]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Live Workspace · Goa Trip 2024
                  </span>
                </div>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Synced
                </span>
              </div>

              {/* 3 Metric Pills */}
              <div className="grid grid-cols-3 gap-2 py-3 border-b border-slate-100 text-center">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="block text-[10px] uppercase font-medium text-slate-500">You Owe</span>
                  <span className="text-sm font-bold text-red-600 tabular-nums">₹2,450</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="block text-[10px] uppercase font-medium text-slate-500">Owed to You</span>
                  <span className="text-sm font-bold text-emerald-600 tabular-nums">₹5,820</span>
                </div>
                <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                  <span className="block text-[10px] uppercase font-medium text-emerald-800">Net Standing</span>
                  <span className="text-sm font-bold text-emerald-700 tabular-nums">+₹3,370</span>
                </div>
              </div>

              {/* Recent item preview */}
              <div className="pt-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-[10px]">
                    RV
                  </span>
                  <div>
                    <span className="font-semibold text-slate-900 block leading-tight">Rahul Verma</span>
                    <span className="text-[11px] text-slate-500">Dinner at Thalassa</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-600 tabular-nums">+₹850</span>
                  <span className="block text-[10px] text-slate-400">owes you</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security Assurance */}
          <div className="relative z-10 flex items-center justify-between text-xs text-brand-100 text-opacity-80 pt-4 border-t border-white/10">
            <span className="flex items-center gap-1.5">
              <AppIcon name="verified_user" size={16} />
              Bank-grade security & encryption
            </span>
            <span>40,000+ active groups</span>
          </div>
        </div>

        {/* RIGHT PANEL (or full width on mobile): Authentication Form (Stitch Screen 7 & 8) */}
        <div className="w-full lg:w-[55%] flex flex-col justify-between p-6 sm:p-12 lg:p-16 bg-surface min-h-screen">
          {/* Top Bar for Mobile only */}
          <div className="lg:hidden flex items-center justify-between pb-4 mb-4 border-b border-surface-container-high/60">
            <Link to="/" className="flex items-center gap-2">
              <SplitMateLogo size="sm" />
            </Link>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
          </div>

          <div className="max-w-[420px] w-full mx-auto my-auto py-4">
            {/* Mobile Value Banner (Stitch Screen 7) */}
            <div className="lg:hidden mb-6 p-3.5 rounded-xl bg-gradient-to-r from-[#0F766E] to-[#115E59] text-white flex items-center justify-between shadow-xs">
              <div>
                <h3 className="text-xs font-bold leading-tight">Split expenses. Stay even.</h3>
                <p className="text-[11px] text-brand-100/90 mt-0.5">Real-time shared balances & instant settlements.</p>
              </div>
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-brand-100 shrink-0 ml-2">
                <AppIcon name="bolt" size={18} />
              </div>
            </div>

            {/* Header Titles */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
                Welcome back
              </h1>
              <p className="text-sm text-on-surface-variant mt-1.5">
                Sign in to manage your shared group expenses.
              </p>
            </div>

            {/* Account Verified Notification */}
            {verifiedBanner && (
              <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <AppIcon name="check_circle" size={18} className="text-emerald-600" />
                <span>Account verified! You can now log in.</span>
              </div>
            )}

            {/* Error Alert Banner */}
            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-error-container/60 border border-error/30 text-xs text-error flex items-start gap-2">
                <AppIcon name="error" size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4" id="loginForm">
              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-on-surface mb-1.5"
                >
                  Email address
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-outline pointer-events-none flex items-center">
                    <AppIcon name="mail" size={18} />
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full h-11 pl-9 pr-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md border border-outline-variant/60 placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-on-surface"
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-outline pointer-events-none flex items-center">
                    <AppIcon name="lock" size={18} />
                  </span>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full h-11 pl-9 pr-10 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md border border-outline-variant/60 placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-outline hover:text-on-surface transition-colors flex items-center"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <AppIcon name={showPassword ? "visibility_off" : "visibility"} size={18} />
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={form.rememberMe}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-primary-container focus:ring-primary border-outline-variant"
                  />
                  <span className="text-xs text-on-surface-variant font-medium">
                    Remember me for 30 days
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="login-submit"
                disabled={isLoading}
                className="w-full h-11 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-semibold rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99] mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <>
                    <span>Sign in to SplitMate</span>
                    <AppIcon name="arrow_forward" size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Bottom Sign up redirect */}
            <p className="text-center text-xs text-on-surface-variant mt-6">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-semibold text-primary hover:underline"
              >
                Create an account
              </Link>
            </p>
          </div>

          {/* Footer copyright */}
          <div className="text-center text-xs text-on-surface-variant/80 py-2">
            © {new Date().getFullYear()} SplitMate Inc. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}