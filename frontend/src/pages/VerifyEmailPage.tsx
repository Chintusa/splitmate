import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import SplitMateLogo from '../components/ui/SplitMateLogo';
import AppIcon from '../components/ui/AppIcon';

type OtpState = 'idle' | 'loading' | 'success' | 'error' | 'expired' | 'max_attempts';

export default function VerifyEmailPage() {
  const { verifyEmail, resendVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const state = (location.state as { email?: string; expires_in_seconds?: number } | null);
  const email = state?.email ?? '';
  const initialExpiry = state?.expires_in_seconds ?? 600;

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [pageState, setPageState] = useState<OtpState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expirySeconds, setExpirySeconds] = useState(initialExpiry);
  const [resendSuccess, setResendSuccess] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Expiry countdown
  useEffect(() => {
    if (expirySeconds <= 0) {
      setPageState('expired');
      return;
    }
    const t = setTimeout(() => setExpirySeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [expirySeconds]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const submitOtp = useCallback(
    async (otp: string) => {
      if (!email) {
        setErrorMsg('Session expired. Please register again.');
        return;
      }
      setPageState('loading');
      setErrorMsg('');
      try {
        await verifyEmail(email, otp);
        setPageState('success');
        setTimeout(
          () => navigate('/login', { state: { email, verified: true } }),
          1500
        );
      } catch (err: any) {
        const detail: string = err?.response?.data?.detail ?? '';
        const status: number = err?.response?.status ?? 0;
        if (status === 429) {
          setPageState('max_attempts');
          setErrorMsg(
            detail || 'Too many incorrect attempts. Please request a new code.'
          );
        } else if (detail.toLowerCase().includes('expired')) {
          setPageState('expired');
          setErrorMsg(detail);
        } else {
          setPageState('error');
          setErrorMsg(detail || 'Incorrect verification code.');
          setDigits(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
        }
      }
    },
    [email, verifyEmail, navigate]
  );

  const handleDigitChange = (i: number, value: string) => {
    if (pageState === 'loading' || pageState === 'success') return;
    const char = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = char;
    setDigits(next);
    if (pageState === 'error') {
      setPageState('idle');
      setErrorMsg('');
    }

    if (char && i < 5) inputRefs.current[i + 1]?.focus();
    if (char && i === 5 && next.every((d) => d !== '')) submitOtp(next.join(''));
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && i > 0) inputRefs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const arr = pasted.split('');
      setDigits(arr);
      inputRefs.current[5]?.focus();
      submitOtp(pasted);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const otp = digits.join('');
    if (otp.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit code.');
      return;
    }
    submitOtp(otp);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendSuccess('');
    setErrorMsg('');
    try {
      const res = await resendVerification(email);
      setPageState('idle');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setExpirySeconds(res.expires_in_seconds ?? 600);
      setResendCooldown(res.resend_cooldown_seconds ?? 60);
      setResendSuccess('New verification code sent to your email.');
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? '';
      const secsRemaining = err?.response?.data?.seconds_remaining;
      if (secsRemaining) setResendCooldown(secsRemaining);
      setErrorMsg(detail || 'Unable to resend. Please try again.');
    }
  };

  const isBlocked = pageState === 'expired' || pageState === 'max_attempts';
  const isInputDisabled =
    pageState === 'loading' || pageState === 'success' || isBlocked;

  return (
    <div className="font-sans antialiased text-on-surface bg-surface min-h-screen flex flex-col justify-between p-6 selection:bg-brand-100 selection:text-brand-900">
      <div className="max-w-[440px] w-full mx-auto my-auto py-8">
        {/* Top Branding */}
        <div className="flex justify-center mb-6">
          <Link to="/" className="flex items-center gap-2">
            <SplitMateLogo size="md" />
          </Link>
        </div>

        {/* Card Container */}
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high/80 p-8 shadow-xl text-center">
          {/* Status Icon Container */}
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xs bg-surface-container-low text-primary-container">
            {pageState === 'success' ? (
              <AppIcon name="check_circle" size={32} className="text-tertiary-container" />
            ) : (
              <AppIcon name="mark_email_read" size={32} />
            )}
          </div>

          {/* Heading */}
          {pageState === 'expired' ? (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-on-surface">
                Code expired
              </h1>
              <p className="text-sm text-on-surface-variant mt-1.5">
                Your verification code has expired. Request a new one below.
              </p>
            </>
          ) : pageState === 'max_attempts' ? (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-on-surface">
                Too many attempts
              </h1>
              <p className="text-sm text-on-surface-variant mt-1.5">
                Request a new verification code to continue.
              </p>
            </>
          ) : pageState === 'success' ? (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-on-surface">
                Email verified!
              </h1>
              <p className="text-sm text-on-surface-variant mt-1.5">
                Redirecting you to login...
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-on-surface">
                Check your inbox
              </h1>
              <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">
                Enter the 6-digit code sent to<br />
                <strong className="text-on-surface font-semibold">{email || 'your email'}</strong>
              </p>
            </>
          )}

          {!isBlocked && pageState !== 'success' && (
            <>
              {/* Expiry timer badge */}
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium my-5 ${
                  expirySeconds <= 30
                    ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <AppIcon name="timer" size={14} />
                <span>Code expires in <strong className="tabular-nums font-semibold">{formatTime(expirySeconds)}</strong></span>
              </div>

              {/* OTP Form */}
              <form onSubmit={handleSubmit} className="space-y-5" id="verify-email-form">
                <div
                  className="flex items-center justify-center gap-2 sm:gap-2.5"
                  onPaste={handlePaste}
                >
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      ref={(el) => {
                        inputRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]"
                      maxLength={1}
                      disabled={isInputDisabled}
                      value={d}
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold rounded-xl border tabular-nums transition-all focus:outline-none focus:ring-2 focus:ring-primary shadow-xs ${
                        d
                          ? 'border-primary-container bg-surface-container-lowest text-on-surface'
                          : 'border-outline-variant/60 bg-surface-container-low text-on-surface'
                      } ${pageState === 'error' ? 'border-error focus:ring-error bg-error-container/20' : ''}`}
                      aria-label={`Digit ${i + 1} of 6`}
                    />
                  ))}
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-error-container/60 border border-error/30 text-xs text-error flex items-center justify-center gap-2">
                    <AppIcon name="error" size={16} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {resendSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-center gap-2">
                    <AppIcon name="check_circle" size={16} className="text-emerald-600" />
                    <span>{resendSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  id="verify-email-submit"
                  disabled={isInputDisabled || digits.join('').length !== 6}
                  className="w-full h-11 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-semibold rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
                >
                  {pageState === 'loading' ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verifying code...
                    </span>
                  ) : (
                    'Verify Email'
                  )}
                </button>
              </form>
            </>
          )}

          {/* Blocked state action button */}
          {isBlocked && (
            <div className="mt-5 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-error-container/60 border border-error/30 text-xs text-error flex items-center justify-center gap-2">
                  <AppIcon name="error" size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}
              <button
                type="button"
                id="otp-request-new"
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="w-full h-11 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-semibold rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50"
              >
                {resendCooldown > 0 ? `Request new code in ${resendCooldown}s` : 'Send New Code'}
              </button>
            </div>
          )}

          {/* Resend link */}
          {!isBlocked && pageState !== 'success' && (
            <div className="mt-6 pt-4 border-t border-surface-container-high/60 text-xs text-on-surface-variant">
              Didn't receive the email?{' '}
              <button
                type="button"
                id="otp-resend"
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="font-semibold text-primary hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>
            </div>
          )}

          <div className="mt-4">
            <Link to="/register" className="text-xs text-on-surface-variant hover:text-on-surface">
              ← Back to registration
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