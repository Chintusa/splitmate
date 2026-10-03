import { api } from './client';
import { Settlement } from '../types';

export async function createSettlementApi(
  groupId: number,
  toUserId: number,
  amountMinor: number
): Promise<Settlement> {
  const res = await api.post<Settlement>(`/api/groups/${groupId}/settlements`, {
    to_user_id: toUserId,
    amount_minor: amountMinor,
  });
  return res.data;
}
