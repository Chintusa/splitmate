import { api } from './client';
import { Expense, PaginatedResponse } from '../types';

export interface CreateExpensePayload {
  description: string;
  amount_minor: number;
  payer_id: number;
  date: string;
  split_type: 'equal' | 'exact';
  split_member_ids?: number[];
  shares?: Record<string, number>;
}

export async function getExpensesApi(
  groupId: number,
  page: number = 1,
  pageSize: number = 10,
  sort: 'date' | 'amount' = 'date',
  order: 'asc' | 'desc' = 'desc'
): Promise<PaginatedResponse<Expense>> {
  const res = await api.get<PaginatedResponse<Expense>>(`/api/groups/${groupId}/expenses`, {
    params: { page, page_size: pageSize, sort, order },
  });
  return res.data;
}

export async function createExpenseApi(groupId: number, payload: CreateExpensePayload): Promise<Expense> {
  const res = await api.post<Expense>(`/api/groups/${groupId}/expenses`, payload);
  return res.data;
}

export async function updateExpenseApi(
  groupId: number,
  expenseId: number,
  payload: CreateExpensePayload
): Promise<Expense> {
  const res = await api.put<Expense>(`/api/groups/${groupId}/expenses/${expenseId}`, payload);
  return res.data;
}

export async function deleteExpenseApi(groupId: number, expenseId: number): Promise<void> {
  await api.delete(`/api/groups/${groupId}/expenses/${expenseId}`);
}
