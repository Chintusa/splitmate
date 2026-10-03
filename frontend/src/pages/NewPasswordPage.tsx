import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import SplitMateLogo from '../components/ui/SplitMateLogo';
import AppIcon from '../components/ui/AppIcon';

export default function NewPasswordPage() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as { email?: string; resetToken?: string } | null);
  const email = state?.email ?? '';
  const resetToken = state?.resetToken ?? '';

  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!email || !resetToken) {
    return (
      <div className="font-sans antialiased text-on-surface bg-surface min-h-screen flex items-center justify-center p-6">
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high/80 p-8 shadow-xl text-center max-w-md w-full">
          <p className="text-sm text-on-surface-variant">
            Invalid session or expired reset link.{' '}
            <Link to="/forgot-password" className="font-semibold text-primary hover:underline">
              Start over
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const strength = (() => {
    const p = form.newPassword;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', 'bg-error', 'bg-amber-500', 'bg-teal-500', 'bg-tertiary-container'][strength];
  const strengthTextColor = ['', 'text-error', 'text-amber-500', 'text-teal-600', 'text-tertiary-container'][strength];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      await resetPassword(email, resetToken, form.newPassword, form.confirmPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login', { state: { email } }), 2000);
    } catch (err: any) {
      const data = err?.response?.data;
      if (typeof data === 'object') {
        setError(Object.values(data).flat().join(' ') || 'Reset failed. Please try again.');
      } else {
        setError('Reset failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="font-sans antialiased text-on-surface bg-surface min-h-screen flex flex-col justify-between p-6 selection:bg-brand-100 selection:text-brand-900">
      <div className="max-w-[440px] w-full mx-auto my-auto py-8">
        <div className="flex justify-center mb-6">
          <Link to="/" className="flex items-center gap-2">
            <SplitMateLogo size="md" />
          </Link>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high/80 p-8 shadow-xl text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xs bg-surface-container-low text-primary-container">
            {success ? (
              <AppIcon name="check_circle" size={32} className="text-tertiary-container" />
            ) : (
              <AppIcon name="key" size={32} />
            )}
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-on-surface">
            {success ? 'Password reset!' : 'Set new password'}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">
            {success
              ? 'Your password has been changed successfully. Redirecting you to login...'
              : 'Choose a strong password for your SplitMate account.'}
          </p>

          {!success && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left" id="new-password-form">
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-xs font-semibold text-on-surface mb-1.5"
                >
                  New password
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-outline pointer-events-none flex items-center">
                    <AppIcon name="lock" size={18} />
                  </span>
                  <input
                    id="new-password"
                    name="newPassword"
                    type={showPass ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={form.newPassword}
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

                {form.newPassword && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 grid grid-cols-4 gap-1 h-1.5">
                      {[1, 2, 3, 4].map((n) => (
                        <div
                          key={n}
                          className={`rounded-full transition-all ${
                            n <= strength ? strengthColor : 'bg-surface-container-high'
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

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-semibold text-on-surface mb-1.5"
                >
                  Confirm password
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-outline pointer-events-none flex items-center">
                    <AppIcon name="lock_reset" size={18} />
                  </span>
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type={showPass ? 'text' : 'password'}
                    required
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat your password"
                    className="w-full h-11 pl-9 pr-10 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md border border-outline-variant/60 placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-error-container/60 border border-error/30 text-xs text-error flex items-center justify-center gap-2">
                  <AppIcon name="error" size={16} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-semibold rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99] mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Resetting...
                  </span>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          )}

          <p className="text-center text-xs text-on-surface-variant mt-6">
            <Link to="/login" className="font-semibold text-primary hover:underline">
              ← Back to login
            </Link>
          </p>
        </div>
      </div>

      <div className="text-center text-xs text-on-surface-variant/80 py-2">
        © {new Date().getFullYear()} SplitMate Inc. All rights reserved.
      </div>
    </div>
  );
}