import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import SplitMateLogo from '../components/ui/SplitMateLogo';
import AppIcon from '../components/ui/AppIcon';

export default function ResetPasswordOtpPage() {
  const { verifyPasswordReset, forgotPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email ?? '';

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendMsg, setResendMsg] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const submit = async (otp: string) => {
    setIsLoading(true);
    setError('');
    try {
      const resetToken = await verifyPasswordReset(email, otp);
      navigate('/reset-password/new', { state: { email, resetToken } });
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? '';
      const status = err?.response?.status ?? 0;
      setError(
        status === 429
          ? detail || 'Too many attempts. Please request a new code.'
          : detail || 'Incorrect code. Please try again.'
      );
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (i: number, v: string) => {
    const c = v.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = c;
    setDigits(next);
    setError('');
    if (c && i < 5) inputRefs.current[i + 1]?.focus();
    if (c && i === 5 && next.every((d) => d !== '')) submit(next.join(''));
  };

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (p.length === 6) {
      setDigits(p.split(''));
      submit(p);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendMsg('');
    setError('');
    try {
      await forgotPassword(email);
      setResendCooldown(60);
      setResendMsg('New code sent to your email.');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch {
      setError('Unable to resend. Please try again.');
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
            <AppIcon name="dialpad" size={32} />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-on-surface">
            Enter reset code
          </h1>
          <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">
            If an account exists for <strong className="text-on-surface">{email || 'your email'}</strong>, we sent a 6-digit reset code.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(digits.join(''));
            }}
            className="mt-6 space-y-5"
            id="reset-otp-form"
          >
            <div
              className="flex items-center justify-center gap-2 sm:gap-2.5"
              onPaste={handlePaste}
            >
              {digits.map((d, i) => (
                <input
                  key={i}
                  id={`rotp-${i}`}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  disabled={isLoading}
                  value={d}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKey(i, e)}
                  className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold rounded-xl border tabular-nums transition-all focus:outline-none focus:ring-2 focus:ring-primary shadow-xs ${
                    d
                      ? 'border-primary-container bg-surface-container-lowest text-on-surface'
                      : 'border-outline-variant/60 bg-surface-container-low text-on-surface'
                  } ${error ? 'border-error focus:ring-error bg-error-container/20' : ''}`}
                  aria-label={`Reset code digit ${i + 1}`}
                />
              ))}
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-error-container/60 border border-error/30 text-xs text-error flex items-center justify-center gap-2">
                <AppIcon name="error" size={16} />
                <span>{error}</span>
              </div>
            )}

            {resendMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-center gap-2">
                <AppIcon name="check_circle" size={16} className="text-emerald-600" />
                <span>{resendMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || digits.join('').length !== 6}
              className="w-full h-11 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-semibold rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying code...
                </span>
              ) : (
                'Verify Code'
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-surface-container-high/60 text-xs text-on-surface-variant">
            Didn't get the code?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="font-semibold text-primary hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </button>
          </div>

          <div className="mt-3">
            <Link to="/forgot-password" className="text-xs text-on-surface-variant hover:text-on-surface">
              ← Change email
            </Link>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-on-surface-variant/80 py-2">
        © {new Date().getFullYear()} SplitMate Inc. All rights reserved.
      </div>
    </div>
  );
}