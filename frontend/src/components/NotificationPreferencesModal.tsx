import React, { useState, useEffect } from 'react';
import {
  getNotificationPreferencesApi,
  updateNotificationPreferencesApi,
} from '../api/notifications';
import { NotificationPreference } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPreferencesModal({ isOpen, onClose }: Props) {
  const [prefs, setPrefs] = useState<NotificationPreference | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      setSaveSuccess(false);
      getNotificationPreferencesApi()
        .then((data) => setPrefs(data))
        .catch(() => setError('Failed to load preferences.'))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof NotificationPreference) => {
    if (!prefs) return;
    if (key === 'email_security_alerts') return; // Cannot be disabled

    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
  };

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await updateNotificationPreferencesApi(prefs);
      setPrefs(saved);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pref-modal-backdrop" onClick={onClose}>
      <div className="pref-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="pref-modal-header">
          <h2 className="pref-modal-title">Notification Preferences</h2>
          <button className="notif-icon-btn" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="pref-modal-body">
          {loading && <p style={{ color: '#94a3b8', textAlign: 'center' }}>Loading preferences...</p>}
          {error && <div className="auth-alert error" style={{ marginBottom: 16 }}>{error}</div>}
          {saveSuccess && (
            <div className="auth-alert success" style={{ marginBottom: 16 }}>
              ✓ Preferences updated successfully.
            </div>
          )}

          {prefs && (
            <>
              <p className="pref-group-title">Account & Security</p>
              <div className="pref-row">
                <div className="pref-info">
                  <span className="pref-label">
                    Security Alerts & OTPs
                    <span className="pref-locked-badge">Mandatory</span>
                  </span>
                  <p className="pref-desc">
                    Password resets, login verification codes, and security alerts. Required for account safety.
                  </p>
                </div>
                <label className="pref-switch">
                  <input type="checkbox" checked={true} disabled />
                  <span className="pref-slider" />
                </label>
              </div>

              <p className="pref-group-title" style={{ marginTop: 20 }}>Email Notifications</p>

              <div className="pref-row">
                <div className="pref-info">
                  <span className="pref-label">Expense Changes</span>
                  <p className="pref-desc">Receive an email when you are included in a new, edited, or deleted expense.</p>
                </div>
                <label className="pref-switch">
                  <input
                    type="checkbox"
                    checked={prefs.email_expense_updates}
                    onChange={() => handleToggle('email_expense_updates')}
                  />
                  <span className="pref-slider" />
                </label>
              </div>

              <div className="pref-row">
                <div className="pref-info">
                  <span className="pref-label">Group Activity</span>
                  <p className="pref-desc">When you are added to or removed from a group, or a group is updated.</p>
                </div>
                <label className="pref-switch">
                  <input
                    type="checkbox"
                    checked={prefs.email_group_activity}
                    onChange={() => handleToggle('email_group_activity')}
                  />
                  <span className="pref-slider" />
                </label>
              </div>

              <div className="pref-row">
                <div className="pref-info">
                  <span className="pref-label">Settlement Updates</span>
                  <p className="pref-desc">When a payment is recorded or received in any of your groups.</p>
                </div>
                <label className="pref-switch">
                  <input
                    type="checkbox"
                    checked={prefs.email_settlement_updates}
                    onChange={() => handleToggle('email_settlement_updates')}
                  />
                  <span className="pref-slider" />
                </label>
              </div>

              <div className="pref-row">
                <div className="pref-info">
                  <span className="pref-label">Balance Reminders</span>
                  <p className="pref-desc">Reminders about pending balances or outstanding group settlements.</p>
                </div>
                <label className="pref-switch">
                  <input
                    type="checkbox"
                    checked={prefs.email_balance_reminders}
                    onChange={() => handleToggle('email_balance_reminders')}
                  />
                  <span className="pref-slider" />
                </label>
              </div>

              <div className="pref-row">
                <div className="pref-info">
                  <span className="pref-label">Product & Feature News</span>
                  <p className="pref-desc">Occasional updates about new SplitMate tools and tips.</p>
                </div>
                <label className="pref-switch">
                  <input
                    type="checkbox"
                    checked={prefs.email_product_news}
                    onChange={() => handleToggle('email_product_news')}
                  />
                  <span className="pref-slider" />
                </label>
              </div>

              <p className="pref-group-title" style={{ marginTop: 20 }}>In-App Notifications</p>
              <div className="pref-row">
                <div className="pref-info">
                  <span className="pref-label">In-App Notification Center</span>
                  <p className="pref-desc">Show updates and badges in the notification bell center.</p>
                </div>
                <label className="pref-switch">
                  <input
                    type="checkbox"
                    checked={prefs.in_app_notifications}
                    onChange={() => handleToggle('in_app_notifications')}
                  />
                  <span className="pref-slider" />
                </label>
              </div>
            </>
          )}
        </div>

        <div className="pref-modal-footer">
          <button className="auth-btn secondary" onClick={onClose} style={{ padding: '8px 16px', fontSize: 13 }}>
            Cancel
          </button>
          <button
            className="auth-btn primary"
            onClick={handleSave}
            disabled={saving || !prefs}
            style={{ padding: '8px 20px', fontSize: 13 }}
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
