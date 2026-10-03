import { api } from './client';
import { DashboardSummary, HistoryItem, PaginatedResponse } from '../types';

export async function getDashboardApi(): Promise<DashboardSummary> {
  const res = await api.get<DashboardSummary>('/api/me/dashboard');
  return res.data;
}

export async function getHistoryApi(page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<HistoryItem>> {
  const res = await api.get<PaginatedResponse<HistoryItem>>('/api/me/history', {
    params: { page, page_size: pageSize },
  });
  return res.data;
}
