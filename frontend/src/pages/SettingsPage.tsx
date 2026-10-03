import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  getNotificationPreferencesApi,
  updateNotificationPreferencesApi,
} from '../api/notifications';
import { NotificationPreference } from '../types';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function SettingsPage() {
  const { user, changePassword } = useAuth();

  // Notification Preferences
  const [prefs, setPrefs] = useState<NotificationPreference | null>(null);
  const [prefLoading, setPrefLoading] = useState(true);
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState(false);
  const [prefError, setPrefError] = useState<string | null>(null);

  // Change Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  useEffect(() => {
    getNotificationPreferencesApi()
      .then((data) => setPrefs(data))
      .catch(() => setPrefError('Failed to load preferences.'))
      .finally(() => setPrefLoading(false));
  }, []);

  const handleTogglePref = (key: keyof NotificationPreference) => {
    if (!prefs) return;
    if (key === 'email_security_alerts') return; // Mandatory
    setPrefs({ ...prefs, [key]: !prefs[key] });
  };

  const handleSavePrefs = async () => {
    if (!prefs) return;
    setPrefSaving(true);
    setPrefError(null);
    try {
      const updated = await updateNotificationPreferencesApi(prefs);
      setPrefs(updated);
      setPrefSuccess(true);
      setTimeout(() => setPrefSuccess(false), 3000);
    } catch (err: any) {
      setPrefError(err?.response?.data?.detail || 'Failed to update preferences.');
    } finally {
      setPrefSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }
    setPwdLoading(true);
    setPwdError(null);
    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
      setPwdSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwdSuccess(false), 4000);
    } catch (err: any) {
      setPwdError(err?.response?.data?.detail || 'Failed to update password.');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto w-full px-4 sm:px-6 lg:px-space-xl py-6 lg:py-space-xl flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight font-bold">
          Settings & Preferences
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Manage your account profile, security credentials, and real-time notification alerts.
        </p>
      </div>

      {/* Account Info Card */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container-high/60 shadow-xs flex flex-col gap-4">
        <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
          Account Profile
        </h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 pt-2">
          <Avatar name={user?.name || 'User'} size="lg" status="active" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            <div>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                Full Name
              </span>
              <div className="font-headline-sm text-headline-sm text-on-surface font-semibold mt-0.5">
                {user?.name || '—'}
              </div>
            </div>
            <div>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                Email Address
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  {user?.email || '—'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  Verified ✓
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Preferences Card */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container-high/60 shadow-xs flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-container-high/60 pb-4">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
              Notification Channels & Events
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Control transactional emails and in-app updates across your groups.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={handleSavePrefs}
            loading={prefSaving}
            disabled={prefSaving || !prefs}
          >
            Save Preferences
          </Button>
        </div>

        {prefError && (
          <div className="p-3 rounded-xl bg-error-container/60 text-xs text-error">
            {prefError}
          </div>
        )}
        {prefSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
            ✓ Notification preferences saved successfully.
          </div>
        )}

        {prefLoading ? (
          <div className="text-center py-6 text-on-surface-variant">Loading preferences...</div>
        ) : prefs ? (
          <div className="flex flex-col divide-y divide-surface-container-high/60">
            {/* Mandatory */}
            <div className="py-3.5 flex items-center justify-between gap-4">
              <div>
                <span className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-2">
                  Security Alerts & Verification OTPs
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-medium">
                    Required
                  </span>
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Password reset codes and important security alerts. Cannot be disabled.
                </p>
              </div>
              <input type="checkbox" checked disabled className="w-5 h-5 rounded text-primary-container" />
            </div>

            {/* Expense Changes */}
            <div className="py-3.5 flex items-center justify-between gap-4">
              <div>
                <span className="font-label-md text-label-md text-on-surface font-semibold">
                  Expense Changes
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Receive an email breakdown when an expense is added, edited, or deleted.
                </p>
              </div>
              <input
                type="checkbox"
                checked={prefs.email_expense_updates}
                onChange={() => handleTogglePref('email_expense_updates')}
                className="w-5 h-5 rounded text-primary-container focus:ring-primary cursor-pointer"
              />
            </div>

            {/* Group Activity */}
            <div className="py-3.5 flex items-center justify-between gap-4">
              <div>
                <span className="font-label-md text-label-md text-on-surface font-semibold">
                  Group Activity
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  When you are added to a new group, removed from a group, or a group is closed.
                </p>
              </div>
              <input
                type="checkbox"
                checked={prefs.email_group_activity}
                onChange={() => handleTogglePref('email_group_activity')}
                className="w-5 h-5 rounded text-primary-container focus:ring-primary cursor-pointer"
              />
            </div>

            {/* Settlement Updates */}
            <div className="py-3.5 flex items-center justify-between gap-4">
              <div>
                <span className="font-label-md text-label-md text-on-surface font-semibold">
                  Settlement Updates
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  When a payment is recorded or received between you and another group member.
                </p>
              </div>
              <input
                type="checkbox"
                checked={prefs.email_settlement_updates}
                onChange={() => handleTogglePref('email_settlement_updates')}
                className="w-5 h-5 rounded text-primary-container focus:ring-primary cursor-pointer"
              />
            </div>

            {/* Balance Reminders */}
            <div className="py-3.5 flex items-center justify-between gap-4">
              <div>
                <span className="font-label-md text-label-md text-on-surface font-semibold">
                  Balance Reminders
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Polite reminders from group members about outstanding balances.
                </p>
              </div>
              <input
                type="checkbox"
                checked={prefs.email_balance_reminders}
                onChange={() => handleTogglePref('email_balance_reminders')}
                className="w-5 h-5 rounded text-primary-container focus:ring-primary cursor-pointer"
              />
            </div>

            {/* In-app Notifications */}
            <div className="py-3.5 flex items-center justify-between gap-4">
              <div>
                <span className="font-label-md text-label-md text-on-surface font-semibold">
                  Header Notification Bell
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Receive real-time in-app alerts and unread badges in the top navigation center.
                </p>
              </div>
              <input
                type="checkbox"
                checked={prefs.in_app_notifications}
                onChange={() => handleTogglePref('in_app_notifications')}
                className="w-5 h-5 rounded text-primary-container focus:ring-primary cursor-pointer"
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Change Password Card */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container-high/60 shadow-xs flex flex-col gap-4">
        <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
          Change Password
        </h2>

        {pwdError && (
          <div className="p-3 rounded-xl bg-error-container/60 text-xs text-error">
            {pwdError}
          </div>
        )}
        {pwdSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
            ✓ Password updated successfully. A confirmation email has been sent.
          </div>
        )}

        <form onSubmit={handleChangePassword} className="max-w-md flex flex-col gap-4">
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={pwdLoading}
            disabled={pwdLoading || !currentPassword || !newPassword}
            className="self-start mt-1"
          >
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
}
