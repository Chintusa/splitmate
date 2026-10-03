import { api } from './client';
import { Activity } from '../types';

export async function getActivityApi(groupId: number): Promise<Activity[]> {
  const res = await api.get<Activity[]>(`/api/groups/${groupId}/activity`);
  return res.data;
}
