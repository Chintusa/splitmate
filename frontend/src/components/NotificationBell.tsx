import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotificationsApi,
  getUnreadCountApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
} from '../api/notifications';
import { NotificationItem } from '../types';
import { formatRelativeTime } from '../utils/formatters';
import { useRealtimeUpdate } from '../context/RealtimeContext';
import NotificationPreferencesModal from './NotificationPreferencesModal';
import './notifications.css';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load initial unread count
  const refreshUnreadCount = useCallback(() => {
    getUnreadCountApi()
      .then((data) => setUnreadCount(data.unread_count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  // Real-time WebSocket updates
  const handleSocketEvent = useCallback(
    (data: any) => {
      if (data?.event === 'notification.created' && data?.notification) {
        const notif: NotificationItem = data.notification;
        setNotifications((prev) => [notif, ...prev]);
        setUnreadCount((c) => c + 1);
      }
    },
    []
  );

  useRealtimeUpdate(handleSocketEvent);

  // Fetch list when dropdown opens or tab changes
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getNotificationsApi(1, 20, tab === 'unread')
        .then((res) => {
          setNotifications(res.items);
          setUnreadCount(res.unread_count);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen, tab]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsReadApi();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      try {
        await markNotificationReadApi(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error('Failed to mark read', err);
      }
    }
    if (notif.action_url) {
      setIsOpen(false);
      navigate(notif.action_url);
    }
  };

  const getIconClass = (type: string) => {
    if (type.includes('expense')) return 'notif-icon-expense';
    if (type.includes('settlement') || type.includes('payment')) return 'notif-icon-settlement';
    if (type.includes('member') || type.includes('group')) return 'notif-icon-group';
    if (type.includes('balance') || type.includes('reminder')) return 'notif-icon-reminder';
    return 'notif-icon-security';
  };

  const renderIcon = (type: string) => {
    if (type.includes('expense')) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      );
    }
    if (type.includes('settlement') || type.includes('payment')) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      );
    }
    if (type.includes('member') || type.includes('group')) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      );
    }
    if (type.includes('balance') || type.includes('reminder')) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    }
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    );
  };

  return (
    <div className="notif-bell-container" ref={dropdownRef}>
      <button
        className="notif-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <div className="notif-title-row">
              <h3 className="notif-title">Notifications</h3>
              {unreadCount > 0 && (
                <span className="pref-locked-badge">{unreadCount} unread</span>
              )}
            </div>
            <div className="notif-header-actions">
              {unreadCount > 0 && (
                <button className="notif-text-btn" onClick={handleMarkAllRead}>
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <div className="notif-tabs">
            <button
              className={`notif-tab ${tab === 'all' ? 'active' : ''}`}
              onClick={() => setTab('all')}
            >
              All
            </button>
            <button
              className={`notif-tab ${tab === 'unread' ? 'active' : ''}`}
              onClick={() => setTab('unread')}
            >
              Unread {unreadCount > 0 ? `(${unreadCount})` : ''}
            </button>
          </div>

          <div className="notif-list">
            {loading ? (
              <div className="notif-empty">
                <p className="notif-empty-text">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">
                <div className="notif-empty-icon">🔔</div>
                <p className="notif-empty-text">
                  {tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notif-item ${!notif.is_read ? 'unread' : ''}`}
                  onClick={() => handleItemClick(notif)}
                >
                  <div className={`notif-icon-wrapper ${getIconClass(notif.type)}`}>
                    {renderIcon(notif.type)}
                  </div>
                  <div className="notif-content">
                    <h4 className="notif-item-title">{notif.title}</h4>
                    <p className="notif-item-message">{notif.message}</p>
                    <span className="notif-item-time">
                      {formatRelativeTime(notif.created_at)}
                    </span>
                  </div>
                  {!notif.is_read && <span className="notif-unread-dot" />}
                </div>
              ))
            )}
          </div>

          <div className="notif-footer">
            <button
              className="notif-footer-link"
              onClick={() => {
                setIsOpen(false);
                setShowPrefs(true);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
              Preferences
            </button>
            <span style={{ fontSize: 11, color: '#64748b' }}>SplitMate Alerts</span>
          </div>
        </div>
      )}

      <NotificationPreferencesModal
        isOpen={showPrefs}
        onClose={() => setShowPrefs(false)}
      />
    </div>
  );
}
