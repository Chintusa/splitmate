import { api } from './client';
import { NotificationItem, NotificationPreference } from '../types';

export interface NotificationsListResponse {
  items: NotificationItem[];
  page: number;
  page_size: number;
  total: number;
  unread_count: number;
}

export async function getNotificationsApi(
  page: number = 1,
  pageSize: number = 20,
  unreadOnly: boolean = false
): Promise<NotificationsListResponse> {
  const params: Record<string, any> = { page, page_size: pageSize };
  if (unreadOnly) {
    params.unread_only = true;
  }
  const res = await api.get<NotificationsListResponse>('/api/notifications', { params });
  return res.data;
}

export async function getUnreadCountApi(): Promise<{ unread_count: number }> {
  const res = await api.get<{ unread_count: number }>('/api/notifications/unread-count');
  return res.data;
}

export async function markNotificationReadApi(id: number): Promise<NotificationItem> {
  const res = await api.post<NotificationItem>(`/api/notifications/${id}/read`);
  return res.data;
}

export async function markAllNotificationsReadApi(): Promise<{ detail: string; updated_count: number }> {
  const res = await api.post<{ detail: string; updated_count: number }>('/api/notifications/read-all');
  return res.data;
}

export async function getNotificationPreferencesApi(): Promise<NotificationPreference> {
  const res = await api.get<NotificationPreference>('/api/notifications/preferences');
  return res.data;
}

export async function updateNotificationPreferencesApi(
  data: Partial<NotificationPreference>
): Promise<NotificationPreference> {
  const res = await api.put<NotificationPreference>('/api/notifications/preferences', data);
  return res.data;
}

export async function sendSettlementReminderApi(
  groupId: number,
  toUserId: number
): Promise<{ detail: string }> {
  const res = await api.post<{ detail: string }>(`/api/groups/${groupId}/remind-settlement`, {
    to_user_id: toUserId,
  });
  return res.data;
}
