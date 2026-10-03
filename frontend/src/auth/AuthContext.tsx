import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import {
  loginApi,
  logoutApi,
  refreshApi,
  getMeApi,
  registerApi,
  verifyEmailApi,
  resendVerificationApi,
  forgotPasswordApi,
  verifyPasswordResetApi,
  resetPasswordApi,
  changePasswordApi,
  requestEmailChangeApi,
  verifyEmailChangeApi,
} from '../api/auth';
import { registerUnauthenticatedHandler, setAccessToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  // Registration
  register: (name: string, email: string, pass: string, confirmPass: string) => Promise<{ expires_in_seconds?: number }>;
  verifyEmail: (email: string, otp: string) => Promise<void>;
  resendVerification: (email: string) => Promise<{ expires_in_seconds?: number; resend_cooldown_seconds?: number }>;
  // Session
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  // Password reset
  forgotPassword: (email: string) => Promise<void>;
  verifyPasswordReset: (email: string, otp: string) => Promise<string>; // returns reset_token
  resetPassword: (email: string, resetToken: string, newPass: string, confirmPass: string) => Promise<void>;
  // Account management
  changePassword: (current: string, newPass: string, confirmPass: string) => Promise<void>;
  requestEmailChange: (newEmail: string) => Promise<void>;
  verifyEmailChange: (otp: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const hasSession = localStorage.getItem('splitmate_has_session');
      if (!hasSession) {
        setIsLoading(false);
        setUser(null);
        setAccessToken(null);
        return;
      }

      try {
        const res = await refreshApi();
        setUser(res.user);
      } catch {
        localStorage.removeItem('splitmate_has_session');
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
    registerUnauthenticatedHandler(() => {
      localStorage.removeItem('splitmate_has_session');
      setUser(null);
    });
  }, []);

  // --- Registration ---
  const register = async (name: string, email: string, pass: string, confirmPass: string) => {
    const res = await registerApi(name, email, pass, confirmPass);
    return { expires_in_seconds: res.expires_in_seconds };
  };

  const verifyEmail = async (email: string, otp: string) => {
    await verifyEmailApi(email, otp);
  };

  const resendVerification = async (email: string) => {
    const res = await resendVerificationApi(email);
    return { expires_in_seconds: res.expires_in_seconds, resend_cooldown_seconds: res.resend_cooldown_seconds };
  };

  // --- Session ---
  const login = async (email: string, pass: string) => {
    const res = await loginApi(email, pass);
    localStorage.setItem('splitmate_has_session', 'true');
    setUser(res.user);
  };

  const logout = async () => {
    try {
      await logoutApi();
    } finally {
      localStorage.removeItem('splitmate_has_session');
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await getMeApi();
      setUser(res.user);
    } catch { /* ignore */ }
  };

  // --- Password reset ---
  const forgotPassword = async (email: string) => {
    await forgotPasswordApi(email);
  };

  const verifyPasswordReset = async (email: string, otp: string): Promise<string> => {
    const res = await verifyPasswordResetApi(email, otp);
    return res.reset_token;
  };

  const resetPassword = async (email: string, resetToken: string, newPass: string, confirmPass: string) => {
    await resetPasswordApi(email, resetToken, newPass, confirmPass);
  };

  // --- Account management ---
  const changePassword = async (current: string, newPass: string, confirmPass: string) => {
    await changePasswordApi(current, newPass, confirmPass);
    setUser(null); // force re-login after password change
  };

  const requestEmailChange = async (newEmail: string) => {
    await requestEmailChangeApi(newEmail);
  };

  const verifyEmailChange = async (otp: string) => {
    const res = await verifyEmailChangeApi(otp);
    setUser((u) => u ? { ...u, email: res.new_email } : u);
  };

  return (
    <AuthContext.Provider value={{
      user, isLoading,
      register, verifyEmail, resendVerification,
      login, logout, refreshUser,
      forgotPassword, verifyPasswordReset, resetPassword,
      changePassword, requestEmailChange, verifyEmailChange,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
