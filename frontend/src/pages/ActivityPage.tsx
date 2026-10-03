import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { useAuth } from '../auth/AuthContext';
import { getHistoryApi } from '../api/dashboard';
import { getGroupsApi } from '../api/groups';
import { HistoryItem, Expense, Settlement, Group } from '../types';

export const ActivityPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [filterType, setFilterType] = useState<'all' | 'expense' | 'settlement'>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getHistoryApi(1, 50),
      getGroupsApi(),
    ])
      .then(([historyRes, groupsRes]) => {
        setHistoryItems(historyRes.items || []);
        setGroups(groupsRes || []);
      })
      .catch((err) => {
        console.error('Failed to load activity:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const parsedActivities = useMemo(() => {
    return historyItems.map((item, index) => {
      const isExpense = item.type === 'expense';
      const exp = isExpense ? (item.data as Expense) : null;
      const setl = !isExpense ? (item.data as Settlement) : null;

      const actorName = isExpense ? exp?.payer?.name || 'Someone' : setl?.from_user?.name || 'Someone';
      const actorEmail = isExpense ? exp?.payer?.email || '' : setl?.from_user?.email || '';
      const description = isExpense
        ? `added "${exp?.description || 'Expense'}"`
        : `settled payment to ${setl?.to_user?.name || 'someone'}`;
      const amountMinor = isExpense ? exp?.amount_minor || 0 : setl?.amount_minor || 0;
      const groupId = isExpense ? exp?.group_id || 0 : setl?.group_id || 0;
      const rawDate = item.created_at;
      const timestamp = new Date(item.created_at).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      return {
        id: `act-${index}`,
        type: item.type,
        actorName,
        actorEmail,
        groupName: item.group_name || 'Group',
        groupId,
        description,
        amountMinor,
        timestamp,
        rawDate,
      };
    });
  }, [historyItems]);

  const filteredActivities = useMemo(() => {
    const list = parsedActivities.filter((item) => {
      // Type filter
      if (filterType === 'expense' && item.type !== 'expense') return false;
      if (filterType === 'settlement' && item.type !== 'settlement') return false;

      // Group filter
      if (selectedGroup !== 'all' && item.groupName !== selectedGroup) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesActor = item.actorName.toLowerCase().includes(q);
        const matchesGroup = item.groupName.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        if (!matchesActor && !matchesGroup && !matchesDesc) return false;
      }

      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'oldest') {
        const aDate = new Date(a.rawDate || 0).getTime();
        const bDate = new Date(b.rawDate || 0).getTime();
        return aDate - bDate;
      }
      if (sortBy === 'highest') {
        return b.amountMinor - a.amountMinor;
      }
      if (sortBy === 'lowest') {
        return a.amountMinor - b.amountMinor;
      }
      // 'newest' default
      const aDate = new Date(a.rawDate || 0).getTime();
      const bDate = new Date(b.rawDate || 0).getTime();
      return bDate - aDate;
    });
  }, [parsedActivities, filterType, selectedGroup, searchQuery, sortBy]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-space-xl py-6 md:py-8 flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-high/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-label-sm text-primary tracking-wider uppercase font-semibold">
              Live Audit Trail
            </span>
            <span className="text-on-surface-variant text-[10px]">•</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse" />
              Real-time feed
            </span>
          </div>
          <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight font-bold mt-1">
            Activity Log
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Chronological audit of all expenses and settlements recorded across your groups.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="self-start sm:self-auto h-10 px-4 bg-surface-container-lowest border border-surface-container-high/60 shadow-xs rounded-lg font-label-md text-label-md text-on-surface flex items-center gap-2 hover:bg-surface-container-low transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          <span>{loading ? 'Refreshing...' : 'Refresh Feed'}</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface-container-lowest p-3.5 rounded-xl border border-surface-container-high/60 shadow-xs">
        {/* Type Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm font-medium transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-primary-container text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            All Activity
          </button>
          <button
            type="button"
            onClick={() => setFilterType('expense')}
            className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm font-medium transition-all cursor-pointer ${
              filterType === 'expense'
                ? 'bg-primary-container text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            Expenses
          </button>
          <button
            type="button"
            onClick={() => setFilterType('settlement')}
            className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm font-medium transition-all cursor-pointer ${
              filterType === 'settlement'
                ? 'bg-primary-container text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            Settlements
          </button>
        </div>

        {/* Group Selector, Sort & Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="h-9 px-3 rounded-lg bg-surface-container-low border border-surface-container-high text-on-surface font-label-sm text-label-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.name}>{g.name}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-9 px-3 rounded-lg bg-surface-container-low border border-surface-container-high text-on-surface font-label-sm text-label-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Amount</option>
            <option value="lowest">Lowest Amount</option>
          </select>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-[16px] text-on-surface-variant pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search activity..."
              className="h-9 pl-8 pr-3 w-40 sm:w-52 rounded-lg bg-surface-container-low border border-surface-container-high text-on-surface font-body-sm text-body-sm placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Activity Timeline List */}
      {filteredActivities.length === 0 ? (
        <EmptyState
          icon="event_busy"
          title="No activity found"
          description={
            historyItems.length === 0
              ? 'There are no recorded expenses or settlements yet. Create your first group and record an expense to begin.'
              : 'There are no events matching your selected filter criteria.'
          }
          actionText={historyItems.length === 0 ? 'Go to Groups' : 'Clear Filters'}
          onAction={() => {
            if (historyItems.length === 0) {
              navigate('/groups');
            } else {
              setFilterType('all');
              setSelectedGroup('all');
              setSearchQuery('');
            }
          }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filteredActivities.map((act) => (
            <div
              key={act.id}
              className="bg-surface-container-lowest p-4 sm:p-5 rounded-2xl border border-surface-container-high/60 shadow-xs hover:border-primary/40 transition-all flex items-start gap-4"
            >
              {/* Actor Avatar */}
              <Avatar name={act.actorName} size="md" className="shrink-0 mt-0.5" />

              {/* Main Activity Details */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-label-md text-label-md text-on-surface font-semibold">
                      {act.actorName}
                    </span>
                    <Badge variant={act.type === 'expense' ? 'info' : 'positive'}>
                      {act.type === 'expense' ? 'Expense' : 'Settlement'}
                    </Badge>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    {act.timestamp}
                  </span>
                </div>

                <p className="font-body-md text-body-md text-on-surface mt-1">
                  {act.description}
                </p>

                <div className="flex items-center gap-3 mt-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/groups/${act.groupId}`)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-low hover:bg-surface-container-high text-primary font-label-sm text-label-sm font-medium transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">group</span>
                    <span>{act.groupName}</span>
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  </button>
                </div>
              </div>

              {/* Amount if present */}
              {act.amountMinor !== undefined && act.amountMinor > 0 && (
                <div className="shrink-0 text-right">
                  <div className="font-mono tabular-nums font-bold text-on-surface text-base sm:text-lg">
                    ₹{(act.amountMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="font-label-sm text-label-sm text-on-surface-variant">
                    {act.type === 'expense' ? 'Total' : 'Settled'}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityPage;
