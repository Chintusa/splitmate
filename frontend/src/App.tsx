import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { AlertProvider } from './context/AlertContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Loading } from './components/Loading';
import './pages/auth.css';
import './pages/app.css';

// Lazy-loaded route chunks for instantaneous initial page render
const LandingPage = lazy(() => import('./pages/LandingPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordOtpPage = lazy(() => import('./pages/ResetPasswordOtpPage'));
const NewPasswordPage = lazy(() => import('./pages/NewPasswordPage'));
const AppShell = lazy(() => import('./components/layout/AppShell'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const GroupsPage = lazy(() => import('./pages/GroupsPage'));
const GroupDetailPage = lazy(() => import('./pages/GroupDetailPage'));
const ActivityPage = lazy(() => import('./pages/ActivityPage'));
const SettlementsPage = lazy(() => import('./pages/SettlementsPage'));
const PersonalHistoryPage = lazy(() => import('./pages/PersonalHistoryPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

export default function App() {
  return (
    <BrowserRouter>
      <AlertProvider>
        <AuthProvider>
          <Suspense fallback={<Loading fullScreen message="Loading SplitMate..." />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />

              {/* Password Recovery Flow */}
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/verify" element={<ResetPasswordOtpPage />} />
              <Route path="/reset-password/new" element={<NewPasswordPage />} />

              {/* Protected Application Workspace */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/groups" element={<GroupsPage />} />
                <Route path="/groups/:id" element={<GroupDetailPage />} />
                <Route path="/activity" element={<ActivityPage />} />
                <Route path="/settlements" element={<SettlementsPage />} />
                <Route path="/personal-history" element={<PersonalHistoryPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </AlertProvider>
    </BrowserRouter>
  );
}
