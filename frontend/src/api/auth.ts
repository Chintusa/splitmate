import { api, setAccessToken } from './client';
import { User } from '../types';

export interface AuthResponse {
  user: User;
  access_token: string;
}

export interface OtpResponse {
  detail: string;
  expires_in_seconds?: number;
  resend_cooldown_seconds?: number;
}

export interface VerifyEmailResponse {
  detail: string;
  email: string;
}

export interface ForgotPasswordResponse {
  detail: string;
}

export interface VerifyPasswordResetResponse {
  detail: string;
  reset_token: string;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export async function registerApi(
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
): Promise<OtpResponse> {
  const res = await api.post<OtpResponse>('/api/auth/register', {
    name, email, password, confirm_password: confirmPassword,
  });
  return res.data;
}

export async function verifyEmailApi(email: string, otp: string): Promise<VerifyEmailResponse> {
  const res = await api.post<VerifyEmailResponse>('/api/auth/verify-email', { email, otp });
  return res.data;
}

export async function resendVerificationApi(email: string): Promise<OtpResponse> {
  const res = await api.post<OtpResponse>('/api/auth/resend-verification', { email });
  return res.data;
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/api/auth/login', { email, password });
  setAccessToken(res.data.access_token);
  return res.data;
}

export async function refreshApi(): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/api/auth/refresh');
  setAccessToken(res.data.access_token);
  return res.data;
}

export async function logoutApi(): Promise<void> {
  try {
    await api.post('/api/auth/logout');
  } finally {
    setAccessToken(null);
  }
}

export async function getMeApi(): Promise<{ user: User }> {
  const res = await api.get<{ user: User }>('/api/auth/me');
  return res.data;
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

export async function forgotPasswordApi(email: string): Promise<ForgotPasswordResponse> {
  const res = await api.post<ForgotPasswordResponse>('/api/auth/forgot-password', { email });
  return res.data;
}

export async function verifyPasswordResetApi(
  email: string,
  otp: string,
): Promise<VerifyPasswordResetResponse> {
  const res = await api.post<VerifyPasswordResetResponse>('/api/auth/verify-password-reset', { email, otp });
  return res.data;
}

export async function resetPasswordApi(
  email: string,
  resetToken: string,
  newPassword: string,
  confirmPassword: string,
): Promise<{ detail: string }> {
  const res = await api.post<{ detail: string }>('/api/auth/reset-password', {
    email,
    reset_token: resetToken,
    new_password: newPassword,
    confirm_password: confirmPassword,
  });
  return res.data;
}

// ---------------------------------------------------------------------------
// Account management (authenticated)
// ---------------------------------------------------------------------------

export async function changePasswordApi(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<{ detail: string }> {
  const res = await api.post<{ detail: string }>('/api/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
    confirm_password: confirmPassword,
  });
  return res.data;
}

export async function requestEmailChangeApi(newEmail: string): Promise<OtpResponse> {
  const res = await api.post<OtpResponse>('/api/auth/change-email', { new_email: newEmail });
  return res.data;
}

export async function verifyEmailChangeApi(otp: string): Promise<{ detail: string; new_email: string }> {
  const res = await api.post<{ detail: string; new_email: string }>('/api/auth/verify-email-change', { otp });
  return res.data;
}
