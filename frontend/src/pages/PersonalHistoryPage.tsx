import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../components/ui/Badge';
import KpiCard from '../components/ui/KpiCard';
import EmptyState from '../components/ui/EmptyState';
import { useAuth } from '../auth/AuthContext';
import { getHistoryApi } from '../api/dashboard';
import { HistoryItem, Expense, Settlement } from '../types';
import { useRealtimeUpdate } from '../context/RealtimeContext';

export const PersonalHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<'all' | 'paid' | 'share' | 'settlement'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest_impact' | 'highest_total'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    getHistoryApi(1, 100)
      .then((res) => {
        setHistoryItems(res.items || []);
      })
      .catch((err) => {
        console.error('Failed to load personal history:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useRealtimeUpdate(() => {
    loadData();
  });

  const parsedTransactions = useMemo(() => {
    return historyItems.map((item, index) => {
      const isExpense = item.type === 'expense';
      const exp = isExpense ? (item.data as Expense) : null;
      const setl = !isExpense ? (item.data as Settlement) : null;

      let type: 'paid_for_all' | 'your_share' | 'settlement_received' | 'settlement_sent' = 'your_share';
      let title = '';
      let totalAmountMinor = 0;
      let yourImpactMinor = 0;

      if (isExpense && exp) {
        title = exp.description;
        totalAmountMinor = exp.amount_minor;
        const isPayer = exp.payer.id === user?.id;
        const mySplit = exp.splits?.find((s) => s.user.id === user?.id);
        const myShareMinor = mySplit ? mySplit.share_minor : 0;

        if (isPayer) {
          type = 'paid_for_all';
          // You paid the total, your net credit from others is (total - your share)
          yourImpactMinor = +(totalAmountMinor - myShareMinor);
        } else {
          type = 'your_share';
          yourImpactMinor = -myShareMinor;
        }
      } else if (setl) {
        totalAmountMinor = setl.amount_minor;
        if (setl.to_user.id === user?.id) {
          type = 'settlement_received';
          title = `Settlement from ${setl.from_user.name}`;
          yourImpactMinor = +totalAmountMinor;
        } else {
          type = 'settlement_sent';
          title = `Settled with ${setl.to_user.name}`;
          yourImpactMinor = -totalAmountMinor;
        }
      }

      const date = new Date(item.created_at).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      return {
        id: `tx-${index}`,
        type,
        title,
        groupName: item.group_name || 'Group',
        totalAmountMinor,
        yourImpactMinor,
        date,
        rawDate: item.created_at,
      };
    });
  }, [historyItems, user]);

  const kpis = useMemo(() => {
    let outOfPocketMinor = 0;
    let trueCostMinor = 0;
    let reimbursedMinor = 0;

    historyItems.forEach((item) => {
      if (item.type === 'expense') {
        const exp = item.data as Expense;
        if (exp.payer.id === user?.id) {
          outOfPocketMinor += exp.amount_minor;
        }
        const mySplit = exp.splits?.find((s) => s.user.id === user?.id);
        if (mySplit) {
          trueCostMinor += mySplit.share_minor;
        }
      } else {
        const setl = item.data as Settlement;
        if (setl.to_user.id === user?.id) {
          reimbursedMinor += setl.amount_minor;
        }
      }
    });

    const netImpactMinor = outOfPocketMinor - trueCostMinor + reimbursedMinor;

    return {
      outOfPocket: (outOfPocketMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      trueCost: (trueCostMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      reimbursed: (reimbursedMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      netImpact: `${netImpactMinor >= 0 ? '+' : ''}₹${(netImpactMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      isPositive: netImpactMinor >= 0,
    };
  }, [historyItems, user]);

  const filteredItems = useMemo(() => {
    const list = parsedTransactions.filter((item) => {
      if (typeFilter === 'paid' && item.type !== 'paid_for_all') return false;
      if (typeFilter === 'share' && item.type !== 'your_share') return false;
      if (typeFilter === 'settlement' && !item.type.startsWith('settlement')) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.title.toLowerCase().includes(q) || item.groupName.toLowerCase().includes(q);
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'oldest') {
        const aDate = new Date(a.rawDate || 0).getTime();
        const bDate = new Date(b.rawDate || 0).getTime();
        return aDate - bDate;
      }
      if (sortBy === 'highest_impact') {
        return Math.abs(b.yourImpactMinor) - Math.abs(a.yourImpactMinor);
      }
      if (sortBy === 'highest_total') {
        return b.totalAmountMinor - a.totalAmountMinor;
      }
      // 'newest' default
      const aDate = new Date(a.rawDate || 0).getTime();
      const bDate = new Date(b.rawDate || 0).getTime();
      return bDate - aDate;
    });
  }, [parsedTransactions, typeFilter, searchQuery, sortBy]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-space-xl py-6 md:py-8 flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-high/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-label-sm text-primary tracking-wider uppercase font-semibold">
              Personal Ledger
            </span>
            <span className="text-on-surface-variant text-[10px]">•</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              All groups & direct shares
            </span>
          </div>
          <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight font-bold mt-1">
            Personal Expense History
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Full individual audit of your payments, assigned splits, and net cashflow impacts.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="self-start sm:self-auto h-10 px-4 bg-surface-container-lowest border border-surface-container-high/60 shadow-xs rounded-lg font-label-md text-label-md text-on-surface flex items-center gap-1.5 hover:bg-surface-container-low transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Out-of-Pocket Paid"
          amount={`₹${kpis.outOfPocket}`}
          subtitle="Fronted for groups"
          badgeText="Total Fronted"
          type="owed"
          icon={<span className="material-symbols-outlined text-[20px]">credit_card</span>}
        />
        <KpiCard
          title="Your True Cost"
          amount={`₹${kpis.trueCost}`}
          subtitle="Your personal share"
          badgeText="Consumption"
          type="neutral"
          icon={<span className="material-symbols-outlined text-[20px]">person</span>}
        />
        <KpiCard
          title="Reimbursed to You"
          amount={`₹${kpis.reimbursed}`}
          subtitle="Settlements received"
          badgeText="Inbound"
          type="net"
          icon={<span className="material-symbols-outlined text-[20px]">savings</span>}
        />
        <KpiCard
          title="Net Receivable"
          amount={kpis.netImpact}
          subtitle="Pending collection"
          badgeText={kpis.isPositive ? 'Surplus' : 'Deficit'}
          type={kpis.isPositive ? 'owed' : 'owe'}
          icon={<span className="material-symbols-outlined text-[20px]">{kpis.isPositive ? 'trending_up' : 'trending_down'}</span>}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface-container-lowest p-3.5 rounded-xl border border-surface-container-high/60 shadow-xs">
        {/* Type Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm font-medium transition-all cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-primary-container text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            All Items
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('paid')}
            className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm font-medium transition-all cursor-pointer ${
              typeFilter === 'paid'
                ? 'bg-primary-container text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            Paid by You
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('share')}
            className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm font-medium transition-all cursor-pointer ${
              typeFilter === 'share'
                ? 'bg-primary-container text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            Your Share
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('settlement')}
            className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm font-medium transition-all cursor-pointer ${
              typeFilter === 'settlement'
                ? 'bg-primary-container text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            Settlements
          </button>
        </div>

        {/* Sort & Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-9 px-3 rounded-lg bg-surface-container-low border border-surface-container-high text-on-surface font-label-sm text-label-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest_impact">Highest Net Impact</option>
            <option value="highest_total">Highest Total Bill</option>
          </select>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-[16px] text-on-surface-variant pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search personal ledger..."
              className="h-9 pl-8 pr-3 w-full sm:w-56 rounded-lg bg-surface-container-low border border-surface-container-high text-on-surface font-body-sm text-body-sm placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Transactions List */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon="account_balance_wallet"
          title="No personal transactions found"
          description={
            historyItems.length === 0
              ? 'You have not recorded or participated in any shared expenses yet.'
              : 'There are no transactions matching your search or filter criteria.'
          }
          actionText={historyItems.length === 0 ? 'Create First Group' : 'Clear Filters'}
          onAction={() => {
            if (historyItems.length === 0) {
              navigate('/groups');
            } else {
              setTypeFilter('all');
              setSearchQuery('');
            }
          }}
        />
      ) : (
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high/60 shadow-xs divide-y divide-surface-container-high/40 overflow-hidden">
          {filteredItems.map((item) => {
            const isPositive = item.yourImpactMinor > 0;
            return (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container-low/40 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      item.type === 'paid_for_all'
                        ? 'bg-primary/10 text-primary'
                        : item.type === 'settlement_received'
                        ? 'bg-tertiary-fixed/30 text-tertiary-container'
                        : item.type === 'settlement_sent'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-error/10 text-error'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {item.type === 'paid_for_all'
                        ? 'credit_card'
                        : item.type === 'settlement_received'
                        ? 'savings'
                        : item.type === 'settlement_sent'
                        ? 'payments'
                        : 'pie_chart'}
                    </span>
                  </div>

                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <span className="font-label-md text-label-md text-on-surface font-semibold truncate">
                        {item.title}
                      </span>
                      <Badge variant={item.type === 'paid_for_all' ? 'info' : item.type === 'settlement_received' ? 'positive' : 'neutral'}>
                        {item.type === 'paid_for_all' ? 'Lent' : item.type === 'settlement_received' ? 'Received' : item.type === 'settlement_sent' ? 'Sent' : 'Split'}
                      </Badge>
                    </div>

                    <div className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2 mt-0.5">
                      <span>{item.groupName}</span>
                      <span>•</span>
                      <span>{item.date}</span>
                      <span>•</span>
                      <span>
                        Total bill: ₹{(item.totalAmountMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0 pl-14 sm:pl-0">
                  <div
                    className={`font-mono tabular-nums font-bold text-base sm:text-lg ${
                      isPositive ? 'text-tertiary-container' : 'text-error'
                    }`}
                  >
                    {isPositive ? '+' : ''}₹
                    {(Math.abs(item.yourImpactMinor) / 100).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <div className="font-label-sm text-[11px] text-on-surface-variant">
                    {item.type === 'paid_for_all'
                      ? 'You are owed'
                      : item.type === 'your_share'
                      ? 'You owe'
                      : item.type === 'settlement_received'
                      ? 'Received'
                      : 'Paid out'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PersonalHistoryPage;
