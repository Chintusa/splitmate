import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import SplitMateLogo from '../components/ui/SplitMateLogo';
import AppIcon from '../components/ui/AppIcon';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await forgotPassword(email);
      navigate('/reset-password/verify', { state: { email } });
    } catch (err: any) {
      const status = err?.response?.status ?? 0;
      if (status === 503) {
        setError('Unable to send the reset email right now. Please try again later.');
      } else if (status >= 500) {
        setError('Something went wrong. Please try again.');
      } else {
        navigate('/reset-password/verify', { state: { email } });
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
            <AppIcon name="lock_reset" size={32} />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-on-surface">
            Forgot your password?
          </h1>
          <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">
            Enter your email address and we'll send a 6-digit verification code to reset your password.
          </p>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-error-container/60 border border-error/30 text-xs text-error flex items-center justify-center gap-2">
              <AppIcon name="error" size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left" id="forgot-password-form">
            <div>
              <label htmlFor="forgot-email" className="block text-xs font-semibold text-on-surface mb-1.5">
                Email address
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-outline pointer-events-none flex items-center">
                  <AppIcon name="mail" size={18} />
                </span>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="you@example.com"
                  className="w-full h-11 pl-9 pr-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md border border-outline-variant/60 placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition-all"
                />
              </div>
            </div>

            <button
              id="forgot-submit"
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-semibold rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99] mt-2"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending code...
                </span>
              ) : (
                'Send Reset Code'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-on-surface-variant mt-6">
            Remember your password?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign in
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