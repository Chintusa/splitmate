import React, { useState } from 'react';
import { sendSettlementReminderApi } from '../api/notifications';
import { useAlert } from '../context/AlertContext';

interface Props {
  groupId: number;
  toUserId: number;
  userName: string;
  className?: string;
}

export default function SettlementReminderButton({
  groupId,
  toUserId,
  userName,
  className = '',
}: Props) {
  const [loading, setLoading] = useState(false);
  const { toast } = useAlert();

  const handleRemind = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);

    try {
      await sendSettlementReminderApi(groupId, toUserId);
      toast.success(`Payment reminder sent to ${userName}!`);
    } catch (err: any) {
      if (err?.response?.status === 429) {
        toast.warning('Reminder was already sent recently. Please wait a few minutes before reminding again.');
      } else {
        toast.error(err?.response?.data?.detail || 'Failed to send reminder.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <button
        onClick={handleRemind}
        disabled={loading}
        className={`auth-btn secondary ${className}`}
        style={{
          padding: '4px 10px',
          fontSize: '12px',
          borderRadius: '6px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(99, 102, 241, 0.1)',
          borderColor: 'rgba(99, 102, 241, 0.3)',
          color: '#818cf8',
          cursor: loading ? 'wait' : 'pointer',
        }}
        title={`Send polite settlement reminder to ${userName}`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {loading ? 'Sending...' : 'Remind'}
      </button>
    </div>
  );
}
