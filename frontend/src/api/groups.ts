import { api } from './client';
import { Group, GroupBalances } from '../types';

export async function getGroupsApi(): Promise<Group[]> {
  const res = await api.get<Group[]>('/api/groups');
  return res.data;
}

export async function createGroupApi(name: string): Promise<Group> {
  const res = await api.post<Group>('/api/groups', { name });
  return res.data;
}

export async function getGroupDetailApi(id: number): Promise<Group> {
  const res = await api.get<Group>(`/api/groups/${id}`);
  return res.data;
}

export async function deleteGroupApi(id: number): Promise<void> {
  await api.delete(`/api/groups/${id}`);
}

export async function addMemberApi(groupId: number, email: string): Promise<void> {
  await api.post(`/api/groups/${groupId}/members`, { email });
}

export async function removeMemberApi(groupId: number, userId: number): Promise<void> {
  await api.delete(`/api/groups/${groupId}/members/${userId}`);
}

export async function getGroupBalancesApi(groupId: number): Promise<GroupBalances> {
  const res = await api.get<GroupBalances>(`/api/groups/${groupId}/balances`);
  return res.data;
}
