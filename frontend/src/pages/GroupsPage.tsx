import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getGroupsApi, createGroupApi } from '../api/groups';
import { Group } from '../types';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import EmptyState from '../components/ui/EmptyState';

export default function GroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'owe' | 'owed' | 'settled'>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'highest' | 'alpha'>('recent');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchGroups = () => {
    setLoading(true);
    getGroupsApi()
      .then((data) => setGroups(data))
      .catch((err) => console.error('Failed to load groups', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const displayedGroups = useMemo(() => {
    const list = groups.filter((g) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = g.name.toLowerCase().includes(q);
        const matchesOwner = g.owner?.name?.toLowerCase().includes(q);
        const matchesMember = g.members?.some((m) => m.name.toLowerCase().includes(q));
        if (!matchesName && !matchesOwner && !matchesMember) return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'alpha') {
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }
      if (sortBy === 'highest') {
        const aMembers = a.members?.length || 0;
        const bMembers = b.members?.length || 0;
        if (bMembers !== aMembers) return bMembers - aMembers;
      }
      // 'recent' by default (highest id or newest created date first)
      const aDate = new Date(a.created_at || 0).getTime() || a.id;
      const bDate = new Date(b.created_at || 0).getTime() || b.id;
      return bDate - aDate;
    });
  }, [groups, search, sortBy]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setIsSubmitting(true);
    setCreateError(null);
    try {
      const created = await createGroupApi(newGroupName.trim());
      setIsCreateOpen(false);
      setNewGroupName('');
      fetchGroups();
      navigate(`/groups/${created.id}`);
    } catch (err: any) {
      setCreateError(err?.response?.data?.detail || err?.response?.data?.name?.[0] || 'Failed to create group.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-space-xl py-6 lg:py-space-xl flex flex-col gap-6 lg:gap-space-xl">
      {/* 1. Top Header Area */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="flex flex-col gap-1 max-w-2xl">
          <div className="flex items-center gap-1.5 text-primary font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[16px]">folder_shared</span>
            <span className="tracking-wider uppercase font-semibold">Workspace Directory</span>
            <span className="text-outline-variant">•</span>
            <span className="text-on-surface-variant font-medium">Live Sync Enabled</span>
          </div>
          <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight font-bold">
            My Groups
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
            Collaborative expense groups and shared tabs. Track real-time ledger distributions and instantaneous settlements.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="primary"
            size="md"
            icon={<span className="material-symbols-outlined text-[20px]">add</span>}
            onClick={() => setIsCreateOpen(true)}
          >
            Create Group
          </Button>
        </div>
      </div>

      {/* 2. Quick Ledger High-Level Aggregates Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl bg-surface-container-lowest border border-surface-container-high/60 shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="flex flex-col gap-1">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
              Active Groups
            </span>
            <span className="font-currency-display text-currency-display text-on-surface tabular-nums font-bold">
              {groups.length}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {groups.length === 1 ? '1 active group circle' : `${groups.length} active group circles`}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-[26px]">groups</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-surface-container-lowest border border-surface-container-high/60 shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="flex flex-col gap-1">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
              You Are Owed
            </span>
            <span className="font-currency-display text-currency-display text-tertiary tabular-nums font-bold">
              ₹0.00
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Across active member groups
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-tertiary shrink-0">
            <span className="material-symbols-outlined text-[26px]">arrow_downward_alt</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-surface-container-lowest border border-surface-container-high/60 shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="flex flex-col gap-1">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
              You Owe Others
            </span>
            <span className="font-currency-display text-currency-display text-error tabular-nums font-bold">
              ₹0.00
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              0 pending settlements
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-error shrink-0">
            <span className="material-symbols-outlined text-[26px]">arrow_upward_alt</span>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar & Search Utility */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high/60 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[260px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search groups by name or member..."
              className="w-full h-10 pl-9 pr-4 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline border border-surface-container-high/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition-all"
            />
          </div>

          {/* Filter Pills Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-label-md text-label-md shrink-0 transition-all font-medium ${
                filter === 'all'
                  ? 'bg-primary-container text-on-primary shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              All Groups ({groups.length})
            </button>
          </div>
        </div>

        {/* Sorting Selector */}
        <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
          <label htmlFor="sort-dropdown" className="font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap">
            Sort by:
          </label>
          <div className="relative">
            <select
              id="sort-dropdown"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none h-10 pl-3 pr-8 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md border border-surface-container-high/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs cursor-pointer"
            >
              <option value="recent">Recently Active</option>
              <option value="highest">Highest Balance</option>
              <option value="alpha">Alphabetical</option>
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-outline pointer-events-none">
              expand_more
            </span>
          </div>
        </div>
      </div>

      {/* 4. Groups Grid or Empty State */}
      {displayedGroups.length === 0 ? (
        <EmptyState
          icon="group_off"
          title="No groups found"
          description="Create your first group to start splitting bills and tracking shared balances with friends."
          actionText="Create Group"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedGroups.map((grp) => (
            <div
              key={grp.id}
              className="group flex flex-col justify-between rounded-2xl bg-surface-container-lowest border border-surface-container-high/60 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden relative"
            >
              {/* Visual Accent Stripe */}
              <div className="h-1.5 w-full bg-primary" />

              <div className="p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-primary-container shrink-0 shadow-xs">
                      <span className="material-symbols-outlined text-[24px]">group</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h2 className="font-headline-md text-headline-md text-on-surface font-semibold truncate group-hover:text-primary transition-colors">
                          {grp.name}
                        </h2>
                      </div>
                      <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">person</span>
                        Created by {grp.owner?.name || 'You'}
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-container-low text-on-surface-variant shrink-0">
                    {grp.members?.length || 1} members
                  </span>
                </div>

                {/* Balance Status Cardlet */}
                <div className="p-3.5 rounded-xl bg-surface-container-low flex items-center justify-between">
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Group Ledger Standing
                  </span>
                  <span className="font-mono tabular-nums font-bold text-tertiary text-sm">
                    Settled Up
                  </span>
                </div>

                {/* Member Avatars Stack */}
                <div className="flex items-center justify-between pt-1 border-t border-surface-container-high/40">
                  <div className="flex items-center -space-x-2 overflow-hidden py-1">
                    {grp.members?.slice(0, 4).map((member) => (
                      <Avatar
                        key={member.id}
                        name={member.name}
                        size="sm"
                        className="ring-2 ring-surface-container-lowest"
                      />
                    ))}
                    {(grp.members?.length || 0) > 4 && (
                      <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center font-label-sm text-label-sm text-on-surface-variant ring-2 ring-surface-container-lowest font-medium">
                        +{(grp.members?.length || 0) - 4}
                      </div>
                    )}
                  </div>

                  <Link
                    to={`/groups/${grp.id}`}
                    className="font-label-md text-label-md text-primary font-medium hover:underline flex items-center gap-1"
                  >
                    Open Workspace <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Create Group Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setCreateError(null);
        }}
        title="Create New Group"
        subtitle="Start a collaborative expense pool with your friends or flatmates"
        maxWidth="md"
        footer={
          <>
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="create-group-form"
              loading={isSubmitting}
            >
              Create Group
            </Button>
          </>
        }
      >
        <form id="create-group-form" onSubmit={handleCreate} className="flex flex-col gap-4">
          {createError && (
            <div className="p-3 rounded-lg bg-error-container text-error font-body-sm text-body-sm">
              {createError}
            </div>
          )}

          <Input
            label="Group Name"
            placeholder="e.g. Goa Trip 2024, Flat 402 Expenses"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            required
            autoFocus
          />

          <p className="font-body-sm text-body-sm text-on-surface-variant">
            You will be set as the Group Owner. You can add more members via email right inside the group workspace after creating it.
          </p>
        </form>
      </Modal>
    </div>
  );
}
