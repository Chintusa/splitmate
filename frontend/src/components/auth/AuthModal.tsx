import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useAlert } from '../../context/AlertContext';
import SplitMateLogo from '../ui/SplitMateLogo';
import AppIcon from '../ui/AppIcon';

export type AuthMode = 'login' | 'register' | 'verify' | 'forgot';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
  initialEmail?: string;
  initialSuccessNotice?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  initialEmail = '',
  initialSuccessNotice,
}) => {
  const navigate = useNavigate();
  const { login, register, verifyEmail, resendVerification, forgotPassword } = useAuth();
  const { toast } = useAlert();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(initialSuccessNotice || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const loginPasswordRef = useRef<HTMLInputElement | null>(null);

  // OTP State (6 digits)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Sync mode and email when props change
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      if (initialEmail) setEmail(initialEmail);
      if (initialSuccessNotice) setSuccessNotice(initialSuccessNotice);
      else setSuccessNotice(null);
      setError(null);
    }
  }, [isOpen, initialMode, initialEmail, initialSuccessNotice]);

  // Auto-focus password input when entering login mode with a success notice
  useEffect(() => {
    if (mode === 'login' && successNotice) {
      const timer = setTimeout(() => loginPasswordRef.current?.focus(), 120);
      return () => {
        clearTimeout(timer);
      };
    }
    return undefined;
  }, [mode, successNotice]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  if (!isOpen) return null;

  // Handle Sign In Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await login(email.trim(), password);
      toast.success('Signed in successfully! Welcome back.');
      onClose();
      navigate('/dashboard');
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        'Invalid email or password. Please try again.';
      setError(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Register Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await register(name.trim(), email.trim(), password, password);
      toast.success('Account created! Verification code sent to your email.');
      setMode('verify');
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      const data = err?.response?.data;
      let msg = 'Registration failed. Please check your information.';
      if (data?.email) {
        msg = Array.isArray(data.email) ? data.email[0] : data.email;
      } else if (data?.password) {
        msg = Array.isArray(data.password) ? data.password[0] : data.password;
      } else if (data?.detail) {
        msg = data.detail;
      }
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle OTP digit changes
  const handleOtpChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = clean;
    setOtpDigits(updated);

    if (clean && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const updated = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasteData[i] || '';
    }
    setOtpDigits(updated);
    const targetIdx = Math.min(pasteData.length, 5);
    otpInputRefs.current[targetIdx]?.focus();
  };

  // Handle OTP Verification Submit
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = otpDigits.join('');
    if (otp.length < 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await verifyEmail(email.trim(), otp);
      // Explicitly switch to login mode with prefilled email, empty password, and clear success banner
      setPassword('');
      setOtpDigits(['', '', '', '', '', '']);
      setError(null);
      setSuccessNotice('Email verified successfully! Please enter your password to sign in.');
      setMode('login');
      toast.success('Account verified successfully! Please sign in.');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Invalid or expired OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      await resendVerification(email.trim());
      setResendCooldown(60);
      toast.success('A fresh 6-digit verification code has been sent to your email.');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to resend code. Please try again later.');
    }
  };

  // Forgot Password Submit
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await forgotPassword(email.trim());
      toast.success('Password reset instructions sent to your email.');
      setMode('login');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not send reset code. Please check your email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop with dark blur */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md animate-modal-backdrop transition-opacity"
        onClick={onClose}
      />

      {/* Compact Auth Modal Container */}
      <div className="relative w-full max-w-[420px] bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-high/80 p-6 sm:p-8 z-10 flex flex-col gap-5 animate-modal-content my-auto">
        {/* Top Header Bar: Logo & Close Button */}
        <div className="flex items-center justify-between">
          <SplitMateLogo size="md" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface flex items-center justify-center transition-colors"
          >
            <AppIcon name="close" size={20} />
          </button>
        </div>

        {/* View Switcher: Tabs (Only in Login or Register mode) */}
        {(mode === 'login' || mode === 'register') && (
          <div className="p-1 rounded-xl bg-surface-container-low flex items-center gap-1 border border-surface-container-high/60">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg font-label-md text-label-md font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
                setSuccessNotice(null);
              }}
              className={`flex-1 py-1.5 rounded-lg font-label-md text-label-md font-semibold transition-all ${
                mode === 'register'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Title & Subtitle */}
        <div className="flex flex-col gap-1">
          <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
            {mode === 'login' && 'Welcome back'}
            {mode === 'register' && 'Get started with SplitMate'}
            {mode === 'verify' && 'Verify your email'}
            {mode === 'forgot' && 'Reset your password'}
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {mode === 'login' && 'Sign in to access your shared tabs and real-time balances.'}
            {mode === 'register' && 'Join thousands of groups splitting expenses with zero stress.'}
            {mode === 'verify' && (
              <>
                Enter the 6-digit code sent to <strong className="text-on-surface font-semibold">{email}</strong>
              </>
            )}
            {mode === 'forgot' && 'Enter your email address to receive password reset instructions.'}
          </p>
        </div>

        {/* Success Notice Banner (e.g. after OTP verification) */}
        {successNotice && mode === 'login' && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-body-sm text-body-sm flex items-start gap-2.5 animate-modal-content">
            <AppIcon name="check_circle" size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-snug flex-1 font-medium">{successNotice}</span>
          </div>
        )}

        {/* Error Alert Banner */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-body-sm text-body-sm flex items-start gap-2.5 animate-modal-content">
            <AppIcon name="error" size={18} className="text-red-600 shrink-0 mt-0.5" />
            <span className="leading-snug flex-1">{error}</span>
          </div>
        )}

        {/* -------------------- 1. LOGIN FORM -------------------- */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface font-semibold mb-1.5">
                Email address
              </label>
              <div className="relative flex items-center">
                <AppIcon name="mail" size={18} className="absolute left-3 text-outline pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md border border-surface-container-high/80 placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-label-sm text-label-sm text-on-surface font-semibold">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setError(null);
                    setSuccessNotice(null);
                  }}
                  className="font-label-sm text-label-sm text-primary hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative flex items-center">
                <AppIcon name="lock" size={18} className="absolute left-3 text-outline pointer-events-none" />
                <input
                  ref={loginPasswordRef}
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="••••••••"
                  className="w-full h-10 pl-9 pr-10 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md border border-surface-container-high/80 placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-outline hover:text-on-surface transition-colors"
                >
                  <AppIcon name={showPassword ? "visibility_off" : "visibility"} size={18} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 w-full h-11 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <AppIcon name="arrow_forward" size={18} />
                </>
              )}
            </button>

            <p className="text-center font-body-sm text-body-sm text-on-surface-variant pt-1">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                  setSuccessNotice(null);
                }}
                className="text-primary font-semibold hover:underline"
              >
                Create an account
              </button>
            </p>
          </form>
        )}

        {/* -------------------- 2. REGISTER FORM -------------------- */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface font-semibold mb-1.5">
                Full name
              </label>
              <div className="relative flex items-center">
                <AppIcon name="person" size={18} className="absolute left-3 text-outline pointer-events-none" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Full Name"
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md border border-surface-container-high/80 placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block font-label-sm text-label-sm text-on-surface font-semibold mb-1.5">
                Email address
              </label>
              <div className="relative flex items-center">
                <AppIcon name="mail" size={18} className="absolute left-3 text-outline pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md border border-surface-container-high/80 placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block font-label-sm text-label-sm text-on-surface font-semibold mb-1.5">
                Password
              </label>
              <div className="relative flex items-center">
                <AppIcon name="lock" size={18} className="absolute left-3 text-outline pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full h-10 pl-9 pr-10 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md border border-surface-container-high/80 placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-outline hover:text-on-surface transition-colors"
                >
                  <AppIcon name={showPassword ? "visibility_off" : "visibility"} size={18} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 w-full h-11 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <AppIcon name="arrow_forward" size={18} />
                </>
              )}
            </button>

            <p className="text-center font-body-sm text-body-sm text-on-surface-variant pt-1">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="text-primary font-semibold hover:underline"
              >
                Sign in
              </button>
            </p>
          </form>
        )}

        {/* -------------------- 3. VERIFY OTP FORM -------------------- */}
        {mode === 'verify' && (
          <form onSubmit={handleVerifyOtpSubmit} className="flex flex-col gap-5">
            {/* 6-box OTP Input */}
            <div className="flex items-center justify-between gap-2" onPaste={handleOtpPaste}>
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (otpInputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-12 h-13 text-center font-headline-lg text-headline-lg font-bold rounded-xl bg-surface-container-low text-on-surface border border-surface-container-high/80 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition-all"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify & Continue</span>
                  <AppIcon name="check" size={18} />
                </>
              )}
            </button>

            {/* Resend Cooldown Action */}
            <div className="flex items-center justify-between pt-1 border-t border-surface-container-high/60">
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                  setSuccessNotice(null);
                }}
                className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface flex items-center gap-1"
              >
                <AppIcon name="arrow_back" size={16} />
                Change email
              </button>

              <button
                type="button"
                disabled={resendCooldown > 0}
                onClick={handleResendOtp}
                className="font-label-sm text-label-sm text-primary font-semibold hover:underline disabled:text-outline disabled:no-underline"
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
              </button>
            </div>

            <p className="text-center font-body-sm text-body-sm text-on-surface-variant pt-1">
              Already verified?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessNotice(null);
                }}
                className="text-primary font-semibold hover:underline"
              >
                Sign in to your account
              </button>
            </p>
          </form>
        )}

        {/* -------------------- 4. FORGOT PASSWORD FORM -------------------- */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPasswordSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface font-semibold mb-1.5">
                Registered email address
              </label>
              <div className="relative flex items-center">
                <AppIcon name="mail" size={18} className="absolute left-3 text-outline pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md border border-surface-container-high/80 placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 w-full h-11 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sending reset link...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Code</span>
                  <AppIcon name="send" size={18} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className="text-center font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface font-medium pt-1"
            >
              ← Back to Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthModal;