import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getDashboardApi } from '../api/dashboard';
import { getGroupsApi } from '../api/groups';
import { DashboardSummary, Group } from '../types';
import { formatCurrency, formatRelativeTime } from '../utils/formatters';
import Avatar from '../components/ui/Avatar';
import KpiCard from '../components/ui/KpiCard';
import AppIcon from '../components/ui/AppIcon';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const outletContext = useOutletContext<{ openAddExpense?: () => void } | null>();

  const [counterpartyTab, setCounterpartyTab] = useState<'person' | 'group'>('person');
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDashboardApi(),
      getGroupsApi(),
    ])
      .then(([dash, grps]) => {
        setData(dash);
        setGroups(grps);
      })
      .catch((err) => {
        console.error('Failed to load dashboard:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalOwe = data ? data.total_owed_by_me / 100 : 0;
  const totalOwed = data ? data.total_owed_to_me / 100 : 0;
  const netBalance = data ? data.net_balance / 100 : 0;
  const groupCount = data ? data.group_count : 0;

  // Ratio percentages
  const totalFlow = totalOwe + totalOwed;
  const owePercent = totalFlow > 0 ? Math.round((totalOwe / totalFlow) * 100) : 50;
  const owedPercent = 100 - owePercent;

  return (
    <div className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-space-xl py-6 lg:py-space-xl flex flex-col gap-6 lg:gap-space-xl">
      {/* 1. Greeting & Quick Range Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-label-sm text-primary tracking-wider uppercase font-semibold">
              Workspace Overview
            </span>
            <span className="text-on-surface-variant text-[10px]">•</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse" />
              Synced just now
            </span>
          </div>
          <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight font-bold">
            {user?.name ? `Welcome back, ${user.name.split(' ')[0]}` : 'Welcome to SplitMate'}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Here's your real-time expense overview across {groupCount} active groups.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <div className="relative inline-flex items-center">
            <button
              type="button"
              className="h-10 px-4 bg-surface-container-lowest border border-surface-container-high/60 shadow-xs rounded-lg font-label-md text-label-md text-on-surface flex items-center gap-2 hover:bg-surface-container-low transition-all"
            >
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">calendar_today</span>
              <span>This Month (Oct 2024)</span>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant ml-1">expand_more</span>
            </button>
          </div>
          <button
            type="button"
            className="h-10 px-4 bg-surface-container-lowest border border-surface-container-high/60 shadow-xs rounded-lg font-label-md text-label-md text-on-surface flex items-center gap-1.5 hover:bg-surface-container-low transition-colors"
            title="Export monthly summary"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* 2. Top KPI Summary Cards (Grid of 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total You Owe"
          amount={`₹${totalOwe.toLocaleString('en-IN')}`}
          subtitle="Across 2 groups (Goa, Flats)"
          badgeText="2 debts"
          type="owe"
          icon={<span className="material-symbols-outlined text-[20px]">arrow_outward</span>}
        />
        <KpiCard
          title="You Are Owed"
          amount={`₹${totalOwed.toLocaleString('en-IN')}`}
          subtitle="From 4 friends in 3 groups"
          badgeText="4 claims"
          type="owed"
          icon={<span className="material-symbols-outlined text-[20px]">arrow_downward</span>}
        />
        <KpiCard
          title="Net Position"
          amount={`${netBalance >= 0 ? '+' : ''}₹${netBalance.toLocaleString('en-IN')}`}
          subtitle="Overall healthy standing"
          badgeText="+12.4%"
          type="net"
          icon={<span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>}
        />
        <KpiCard
          title="Active Groups"
          amount={groupCount}
          subtitle="2 pending settlement"
          actionText="Manage"
          onAction={() => navigate('/groups')}
          type="neutral"
          icon={<span className="material-symbols-outlined text-[20px]">groups</span>}
        />
      </div>

      {/* 3. Middle Section: 7 Cols Left, 5 Cols Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Balance Breakdown & Cashflow (7 Cols) */}
        <div className="lg:col-span-7 bg-surface-container-lowest p-6 rounded-2xl border border-surface-container-high/60 shadow-xs flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                Cashflow & Counterparties
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Real-time ledger breakdown against peers
              </p>
            </div>
            {/* Toggle Pills */}
            <div className="flex p-0.5 bg-surface-container-low rounded-lg text-on-surface-variant text-label-sm font-label-sm">
              <button
                type="button"
                onClick={() => setCounterpartyTab('person')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  counterpartyTab === 'person'
                    ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                By Person
              </button>
              <button
                type="button"
                onClick={() => setCounterpartyTab('group')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  counterpartyTab === 'group'
                    ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                By Group
              </button>
            </div>
          </div>

          {/* Ratio bar */}
          <div className="bg-surface-container-low p-4 rounded-xl flex flex-col gap-2 border border-surface-container-high/40">
            <div className="flex justify-between items-center text-body-sm font-body-sm">
              <span className="flex items-center gap-1.5 text-error font-medium">
                <span className="w-2 h-2 rounded-full bg-error" /> You Owe: ₹{totalOwe.toLocaleString('en-IN')} ({owePercent}%)
              </span>
              <span className="flex items-center gap-1.5 text-tertiary font-medium">
                <span className="w-2 h-2 rounded-full bg-tertiary-container" /> Owed to You: ₹{totalOwed.toLocaleString('en-IN')} ({owedPercent}%)
              </span>
            </div>
            <div className="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden flex">
              <div
                className="h-full bg-error rounded-l-full transition-all duration-500"
                style={{ width: `${owePercent}%` }}
              />
              <div
                className="h-full bg-tertiary-container rounded-r-full transition-all duration-500"
                style={{ width: `${owedPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-on-surface-variant font-label-sm pt-0.5">
              <span>₹0 Baseline</span>
              <span>Total Flow ₹{(totalOwe + totalOwed).toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Groups list or Empty State */}
          {groups.length === 0 ? (
            <div className="p-8 rounded-xl bg-surface-container-low border border-surface-container-high/40 text-center flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[36px] text-primary">savings</span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">All Settled Up</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
                You have no open counterparties or pending balances. Create your first group to start splitting bills.
              </p>
              <Link
                to="/groups"
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-medium hover:bg-primary transition-colors shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>Create Group</span>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {groups.map((grp) => (
                <div
                  key={grp.id}
                  className="p-4 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 border bg-surface-container-low hover:bg-surface-container border-surface-container-high/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      {grp.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">
                          {grp.name}
                        </span>
                        <span className="font-label-sm text-[11px] text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full font-medium shrink-0">
                          {grp.members?.length || 1} members
                        </span>
                      </div>
                      <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                        Created by {grp.owner?.id === user?.id ? 'You' : grp.owner?.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <Link
                      to={`/groups/${grp.id}`}
                      className="px-3.5 py-1.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-medium border border-surface-container-high/60 transition-colors shadow-xs flex items-center gap-1"
                    >
                      <span>Open</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1 text-body-sm text-on-surface-variant border-t border-surface-container-high/40">
            <span>{groupCount === 0 ? '0 counterparties' : `Active in ${groupCount} groups`}</span>
            <Link
              to="/groups"
              className="font-label-md text-label-md text-primary font-medium hover:underline flex items-center gap-1"
            >
              View All Groups <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </Link>
          </div>
        </div>

        {/* RIGHT: Live Alert & High-Priority Settlement (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Featured Priority Debt Card */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container-high/60 shadow-xs flex flex-col justify-between relative overflow-hidden">
            <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${groupCount > 0 && totalOwe > 0 ? 'bg-error' : 'bg-emerald-600'}`} />

            {/* Card Header */}
            <div className="flex items-center justify-between gap-3 mb-4 pl-1">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-10 h-10 rounded-xl ${
                  groupCount > 0 && totalOwe > 0
                    ? 'bg-error-container/60 text-error'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                } flex items-center justify-center shrink-0 shadow-2xs`}>
                  <AppIcon name={groupCount > 0 && totalOwe > 0 ? 'priority_high' : 'verified'} size={20} />
                </span>
                <div className="min-w-0">
                  <span className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider leading-none mb-1">
                    Settlement Status
                  </span>
                  <h3 className="text-base font-bold text-on-surface truncate leading-snug">
                    {groupCount > 0 && totalOwe > 0 ? (data?.group_where_i_owe_most?.name || 'Active Debt') : 'Zero Outstanding Debts'}
                  </h3>
                </div>
              </div>

              {/* Status Badge */}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 ${
                groupCount > 0 && totalOwe > 0
                  ? 'bg-error-container/60 text-error border border-error/20'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  groupCount > 0 && totalOwe > 0 ? 'bg-error' : 'bg-emerald-600'
                }`} />
                <span>{groupCount > 0 && totalOwe > 0 ? 'Payment Due' : 'All Clear'}</span>
              </span>
            </div>

            <div className="bg-surface-container-low p-4 rounded-xl mb-4 flex flex-col gap-1 border border-surface-container-high/40 text-center">
              <span className="font-body-sm text-body-sm text-on-surface-variant">Your Outstanding Balance</span>
              <div className="flex items-baseline justify-center">
                <span className={`font-display-lg text-display-lg tabular-nums tracking-tight font-bold ${
                  groupCount > 0 && totalOwe > 0 ? 'text-error' : 'text-on-surface'
                }`}>
                  ₹{totalOwe.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                {groupCount > 0 && totalOwe > 0 ? 'Due across active expenses' : 'You don\'t owe any money across your circles.'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => navigate('/groups')}
                className="flex-1 h-11 px-4 rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-colors font-label-md text-label-md flex items-center justify-center gap-1.5 shadow-xs font-medium"
              >
                <span className="material-symbols-outlined text-[18px]">group</span>
                <span>{groupCount > 0 ? 'View Groups' : 'Explore Groups'}</span>
              </button>
            </div>
          </div>

          {/* Mini Tips Widget */}
          <div className="bg-surface-container-low p-4 rounded-2xl border border-surface-container-high/60 flex items-center gap-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-surface-container-lowest text-primary flex items-center justify-center shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-[22px]">auto_mode</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Auto Debt Simplification
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Enabled: Mathematical graph reduction automatically simplifies circular debts.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Section: Recent Real-time Activity Table */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container-high/60 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
              Recent Real-time Activity
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Live audit log across your synchronized expense circles
            </p>
          </div>
          <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
            <span className="w-2 h-2 rounded-full bg-tertiary-container animate-ping" />
            <span>Real-time feed</span>
          </div>
        </div>

        {/* Activity rows */}
        {!data?.recent_activities || data.recent_activities.length === 0 ? (
          <div className="p-8 rounded-xl bg-surface-container-low border border-surface-container-high/40 text-center flex flex-col items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-[32px] text-on-surface-variant">history_toggle_off</span>
            <span className="font-label-md text-label-md text-on-surface font-medium">No recent activity</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">When expenses or settlements occur in your groups, they will appear here in real-time.</span>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-surface-container-high/60">
            {data.recent_activities.map((act) => (
              <div
                key={act.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container-low px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface-container-low text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">bolt</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-body-md text-body-md text-on-surface font-semibold">
                        {act.actor?.name || 'Someone'}
                      </span>
                      <span className="font-body-md text-body-md text-on-surface">
                        {act.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-body-sm text-on-surface-variant mt-0.5">
                      <span>{act.created_at}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
