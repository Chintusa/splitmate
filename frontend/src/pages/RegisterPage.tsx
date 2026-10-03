import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import SplitMateLogo from '../components/ui/SplitMateLogo';
import AppIcon from '../components/ui/AppIcon';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const passwordStrength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength];
  const strengthColor = ['', 'bg-error', 'bg-amber-500', 'bg-teal-500', 'bg-tertiary-container'][passwordStrength];
  const strengthTextColor = ['', 'text-error', 'text-amber-500', 'text-teal-600', 'text-tertiary-container'][passwordStrength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const res = await register(
        form.name,
        form.email,
        form.password,
        form.confirmPassword
      );
      navigate('/verify-email', {
        state: {
          email: form.email,
          expires_in_seconds: res.expires_in_seconds ?? 600,
        },
      });
    } catch (err: any) {
      const data = err?.response?.data;
      if (typeof data === 'object' && data !== null) {
        const msgs = Object.values(data).flat().join(' ');
        setError(msgs || 'Registration failed. Please try again.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="font-sans antialiased text-on-surface bg-surface min-h-screen flex flex-col justify-between selection:bg-brand-100 selection:text-brand-900">
      <div className="min-h-screen flex flex-col lg:flex-row w-full">
        {/* LEFT PANEL on desktop: Stitch Emerald Showcase */}
        <div className="hidden lg:flex lg:w-[45%] bg-[#0F766E] text-white flex-col justify-between p-12 relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(204,251,241,0.18),rgba(255,255,255,0))] pointer-events-none" />
          <div className="absolute -right-24 -bottom-24 w-96 h-96 bg-brand-800 rounded-full blur-3xl opacity-40 pointer-events-none" />

          {/* Top Branding */}
          <div className="relative z-10 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <SplitMateLogo size="lg" variant="light" />
            </Link>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-brand-100 border border-white/15 backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Instant Setup
            </span>
          </div>

          {/* Showcase Middle content */}
          <div className="relative z-10 my-auto py-8">
            <div className="max-w-md">
              <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
                Join 40,000+ groups<br />
                <span className="text-brand-200">splitting smarter.</span>
              </h1>
              <p className="mt-3 text-brand-100 text-sm leading-relaxed text-opacity-90">
                Create transparent group tabs, record expenses with automatic balance calculations, and settle debts in seconds.
              </p>
            </div>

            <div className="mt-8 space-y-3">
              {[
                { title: 'Zero awkward calculations', desc: 'Min-flow simplification reduces 15 payments to 3.' },
                { title: 'Real-time WebSocket alerts', desc: 'Everyone stays synchronized across web and mobile.' },
                { title: 'Secure OTP email verification', desc: 'Bank-grade security without sharing personal credentials.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/10 p-3.5 rounded-xl border border-white/15 backdrop-blur-xs">
                  <AppIcon name="check_circle" size={20} className="text-brand-200 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                    <p className="text-xs text-brand-100/80 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-xs text-brand-100 text-opacity-80 pt-4 border-t border-white/10">
            <span>Free for personal groups</span>
            <span>No credit card required</span>
          </div>
        </div>

        {/* RIGHT PANEL: Sign up form */}
        <div className="w-full lg:w-[55%] flex flex-col justify-between p-6 sm:p-12 lg:p-16 bg-surface min-h-screen">
          <div className="lg:hidden flex items-center justify-between pb-4 mb-4 border-b border-surface-container-high/60">
            <Link to="/" className="flex items-center gap-2">
              <SplitMateLogo size="sm" />
            </Link>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              Free Account
            </span>
          </div>

          <div className="max-w-[440px] w-full mx-auto my-auto py-4">
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
                Create your account
              </h1>
              <p className="text-sm text-on-surface-variant mt-1.5">
                Start sharing and settling expenses with your friends.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-error-container/60 border border-error/30 text-xs text-error flex items-start gap-2">
                <AppIcon name="error" size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" id="register-form">
              {/* Full Name */}
              <div>
                <label
                  htmlFor="reg-name"
                  className="block text-xs font-semibold text-on-surface mb-1.5"
                >
                  Full name
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-outline pointer-events-none flex items-center">
                    <AppIcon name="person" size={18} />
                  </span>
                  <input
                    id="reg-name"
                    name="name"
                    type="text"
                    required
                    minLength={2}
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Your Full Name"
                    className="w-full h-11 pl-9 pr-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md border border-outline-variant/60 placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition-all"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-semibold text-on-surface mb-1.5"
                >
                  Email address
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-outline pointer-events-none flex items-center">
                    <AppIcon name="mail" size={18} />
                  </span>
                  <input
                    id="reg-email"
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

              {/* Password */}
              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-semibold text-on-surface mb-1.5"
                >
                  Password
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-outline pointer-events-none flex items-center">
                    <AppIcon name="lock" size={18} />
                  </span>
                  <input
                    id="reg-password"
                    name="password"
                    type={showPass ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="At least 8 characters"
                    className="w-full h-11 pl-9 pr-10 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md border border-outline-variant/60 placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 text-outline hover:text-on-surface transition-colors flex items-center"
                  >
                    <AppIcon name={showPass ? "visibility_off" : "visibility"} size={18} />
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {form.password && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 grid grid-cols-4 gap-1 h-1.5">
                      {[1, 2, 3, 4].map((n) => (
                        <div
                          key={n}
                          className={`rounded-full transition-all ${
                            n <= passwordStrength ? strengthColor : 'bg-surface-container-high'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-[11px] font-semibold ${strengthTextColor}`}>
                      {strengthLabel}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="reg-confirm"
                  className="block text-xs font-semibold text-on-surface mb-1.5"
                >
                  Confirm password
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-outline pointer-events-none flex items-center">
                    <AppIcon name="lock_reset" size={18} />
                  </span>
                  <input
                    id="reg-confirm"
                    name="confirmPassword"
                    type={showPass ? 'text' : 'password'}
                    required
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat password"
                    className="w-full h-11 pl-9 pr-10 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md border border-outline-variant/60 placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition-all"
                  />
                  {form.confirmPassword && (
                    <span className="absolute right-3 flex items-center pointer-events-none">
                      {form.password === form.confirmPassword ? (
                        <AppIcon name="check_circle" size={18} className="text-tertiary-container" />
                      ) : (
                        <AppIcon name="cancel" size={18} className="text-error" />
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                id="register-submit"
                disabled={isLoading}
                className="w-full h-11 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-semibold rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99] mt-3"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending verification code...
                  </span>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <AppIcon name="arrow_forward" size={18} />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-on-surface-variant mt-6">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          <div className="text-center text-xs text-on-surface-variant/80 py-2">
            © {new Date().getFullYear()} SplitMate Inc. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}