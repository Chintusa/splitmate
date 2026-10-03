import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  getGroupDetailApi,
  getGroupBalancesApi,
  addMemberApi,
  deleteGroupApi,
} from '../api/groups';
import {
  getExpensesApi,
  createExpenseApi,
  updateExpenseApi,
  deleteExpenseApi,
} from '../api/expenses';
import { createSettlementApi } from '../api/settlements';
import { getActivityApi } from '../api/activity';
import { Group, GroupBalances, Expense, Activity } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useWebSocket } from '../hooks/useWebSocket';
import SettlementReminderButton from '../components/SettlementReminderButton';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import AppIcon from '../components/ui/AppIcon';
import { useAlert } from '../context/AlertContext';

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const groupId = parseInt(id || '1', 10);
  const { user } = useAuth();
  const { confirm, toast } = useAlert();

  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'balances' | 'activity' | 'members'>('overview');
  const [group, setGroup] = useState<Group | null>(null);
  const [balances, setBalances] = useState<GroupBalances | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Sorting & Search for expenses
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseSort, setExpenseSort] = useState<'newest' | 'oldest' | 'highest' | 'lowest' | 'alpha'>('newest');

  // Modals
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expensePayerId, setExpensePayerId] = useState<number>(user?.id || 0);
  const [splitType, setSplitType] = useState<'equal' | 'exact'>('equal');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [exactShares, setExactShares] = useState<Record<number, string>>({});

  const [showSettle, setShowSettle] = useState(false);
  const [settleToId, setSettleToId] = useState<number>(0);
  const [settleToName, setSettleToName] = useState<string>('');
  const [settleAmount, setSettleAmount] = useState<string>('');

  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    if (!groupId) return;
    Promise.all([
      getGroupDetailApi(groupId),
      getGroupBalancesApi(groupId),
      getExpensesApi(groupId, 1, 50),
      getActivityApi(groupId).catch(() => []),
    ])
      .then(([grp, bals, exps, acts]) => {
        setGroup(grp);
        setBalances(bals);
        setExpenses(exps.items);
        setActivities(acts);
        if (!expensePayerId && user) {
          setExpensePayerId(user.id);
        }
      })
      .catch((err) => {
        console.error('Failed to load group details', err);
      })
      .finally(() => setLoading(false));
  }, [groupId, user, expensePayerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time updates via WebSocket
  useWebSocket(groupId, () => {
    loadData();
  });

  const displayedExpenses = useMemo(() => {
    const list = expenses.filter((e) => {
      if (expenseSearch.trim()) {
        const q = expenseSearch.toLowerCase();
        return (
          e.description.toLowerCase().includes(q) ||
          e.payer.name.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return list.sort((a, b) => {
      if (expenseSort === 'oldest') {
        const aDate = new Date(a.date).getTime() || a.id;
        const bDate = new Date(b.date).getTime() || b.id;
        return aDate - bDate;
      }
      if (expenseSort === 'highest') {
        return b.amount_minor - a.amount_minor;
      }
      if (expenseSort === 'lowest') {
        return a.amount_minor - b.amount_minor;
      }
      if (expenseSort === 'alpha') {
        return a.description.localeCompare(b.description, undefined, { sensitivity: 'base' });
      }
      // 'newest' default
      const aDate = new Date(a.date).getTime() || a.id;
      const bDate = new Date(b.date).getTime() || b.id;
      return bDate - aDate;
    });
  }, [expenses, expenseSearch, expenseSort]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail.trim()) return;
    setModalLoading(true);
    setModalError(null);
    try {
      await addMemberApi(groupId, memberEmail.trim());
      setMemberEmail('');
      setShowAddMember(false);
      toast.success('Member added to group successfully.');
      loadData();
    } catch (err: any) {
      setModalError(err?.response?.data?.detail || 'Failed to add member.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setExpenseDesc('');
    setExpenseAmount('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setExpensePayerId(user?.id || group?.members?.[0]?.id || 0);
    setSplitType('equal');
    setSelectedMembers(group?.members?.map((m) => m.id) || (user ? [user.id] : []));
    setExactShares({});
    setModalError(null);
    setShowAddExpense(true);
  };

  const handleStartEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setExpenseDesc(exp.description);
    setExpenseAmount((exp.amount_minor / 100).toFixed(2));
    setExpenseDate(exp.date);
    setExpensePayerId(exp.payer.id);

    const splitCount = exp.splits?.length || 1;
    const baseShare = Math.floor(exp.amount_minor / splitCount);
    const isLikelyEqual = exp.splits?.every(
      (s) => Math.abs(s.share_minor - baseShare) <= 1
    );

    const memberIds = exp.splits?.map((s) => s.user.id) || [];
    setSelectedMembers(memberIds);

    const sharesMap: Record<number, string> = {};
    exp.splits?.forEach((s) => {
      sharesMap[s.user.id] = (s.share_minor / 100).toFixed(2);
    });
    setExactShares(sharesMap);
    setSplitType(isLikelyEqual ? 'equal' : 'exact');
    setModalError(null);
    setShowAddExpense(true);
  };

  // Real-time equal split shares preview based on deterministic rounding rule
  const equalSplitSharesPreview = useMemo(() => {
    const amountNum = parseFloat(expenseAmount);
    if (isNaN(amountNum) || amountNum <= 0 || selectedMembers.length === 0) {
      return {};
    }
    const totalMinor = Math.round(amountNum * 100);
    const sortedIds = [...selectedMembers].sort((a, b) => a - b);
    const base = Math.floor(totalMinor / sortedIds.length);
    const rem = totalMinor % sortedIds.length;
    const preview: Record<number, number> = {};
    sortedIds.forEach((uid, index) => {
      preview[uid] = base + (index < rem ? 1 : 0);
    });
    return preview;
  }, [expenseAmount, selectedMembers]);

  // Real-time exact split sum check
  const exactSplitSum = useMemo(() => {
    let sum = 0;
    Object.values(exactShares).forEach((val) => {
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed > 0) {
        sum += Math.round(parsed * 100);
      }
    });
    return sum;
  }, [exactShares]);

  const expenseAmountMinor = useMemo(() => {
    const parsed = parseFloat(expenseAmount);
    return !isNaN(parsed) && parsed > 0 ? Math.round(parsed * 100) : 0;
  }, [expenseAmount]);

  const exactSplitDifferenceMinor = expenseAmountMinor - exactSplitSum;

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc.trim() || !expenseAmount) return;

    const amountNum = parseFloat(expenseAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setModalError('Please enter a valid positive amount.');
      return;
    }
    const amountMinor = Math.round(amountNum * 100);

    if (splitType === 'equal') {
      if (selectedMembers.length === 0) {
        setModalError('Please select at least one member to split the expense with.');
        return;
      }
    } else {
      if (exactSplitDifferenceMinor !== 0) {
        setModalError(
          `Shares add up to ₹${(exactSplitSum / 100).toFixed(2)}, expense is ₹${(amountMinor / 100).toFixed(2)} (Difference: ₹${(Math.abs(exactSplitDifferenceMinor) / 100).toFixed(2)}).`
        );
        return;
      }
    }

    setModalLoading(true);
    setModalError(null);
    try {
      const payload: any = {
        description: expenseDesc.trim(),
        amount_minor: amountMinor,
        payer_id: expensePayerId || user!.id,
        date: expenseDate,
        split_type: splitType,
      };

      if (splitType === 'equal') {
        payload.split_member_ids = selectedMembers;
      } else {
        const sharesPayload: Record<string, number> = {};
        Object.entries(exactShares).forEach(([uid, val]) => {
          const num = parseFloat(val);
          if (!isNaN(num) && num > 0) {
            sharesPayload[uid] = Math.round(num * 100);
          }
        });
        payload.shares = sharesPayload;
      }

      if (editingExpense) {
        await updateExpenseApi(groupId, editingExpense.id, payload);
        toast.success('Expense updated and balances recalculated.');
      } else {
        await createExpenseApi(groupId, payload);
        toast.success('Expense recorded and balances updated.');
      }

      setShowAddExpense(false);
      setEditingExpense(null);
      loadData();
    } catch (err: any) {
      const backendErr = err?.response?.data;
      if (typeof backendErr === 'object' && backendErr !== null) {
        const detail = backendErr.detail || Object.values(backendErr).flat().join(' ');
        setModalError(detail || 'Failed to save expense.');
      } else {
        setModalError('Failed to save expense. Please check your inputs.');
      }
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId: number) => {
    const isConfirmed = await confirm({
      title: 'Delete Expense',
      message: 'Are you sure you want to delete this expense? All balances and split allocations will be recalculated.',
      confirmText: 'Delete Expense',
      danger: true,
    });
    if (!isConfirmed) return;

    try {
      await deleteExpenseApi(groupId, expenseId);
      toast.success('Expense deleted successfully.');
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to delete expense.');
    }
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleAmount) return;
    setModalLoading(true);
    setModalError(null);
    try {
      const amountMinor = Math.round(parseFloat(settleAmount) * 100);
      await createSettlementApi(groupId, settleToId || 2, amountMinor);
      setShowSettle(false);
      setSettleAmount('');
      toast.success('Settlement recorded successfully.');
      loadData();
    } catch (err: any) {
      setModalError(err?.response?.data?.detail || 'Failed to record settlement.');
    } finally {
      setModalLoading(false);
    }
  };

  const groupName = group?.name || 'Group Workspace';
  const memberCount = group?.members?.length || 1;
  const ownerName = group?.owner?.name || user?.name || 'You';
  const totalGroupSpendMinor = expenses.reduce((sum, e) => sum + e.amount_minor, 0);
  const myNetMinor = balances?.net_balances?.find((b) => b.user_id === user?.id)?.net_minor || 0;
  const isPositive = myNetMinor >= 0;

  return (
    <div className="flex flex-col w-full pb-16">
      {/* 1. Visual Header Canvas with Ambient Backdrop */}
      <div className="relative w-full overflow-hidden bg-surface-container-low px-4 sm:px-6 lg:px-space-xl pt-6 lg:pt-space-xl pb-6 lg:pb-space-lg border-b border-surface-container-high/60">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/3 w-80 h-80 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto flex flex-col gap-5">
          {/* Breadcrumb & Real-time Live Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md">
              <Link to="/groups" className="hover:text-primary transition-colors flex items-center gap-1 font-medium">
                <span className="material-symbols-outlined text-[16px]">groups</span>
                <span>My Groups</span>
              </Link>
              <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
              <span className="text-on-surface font-headline-sm text-headline-sm font-semibold">{groupName}</span>
              <span className="ml-2 px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-semibold tracking-wide uppercase">
                Vacation
              </span>
            </div>

            {/* Live Sync Pill */}
            <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-1.5 rounded-full shadow-xs border border-surface-container-high/60">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-container opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary" />
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                Real-time updates active for {groupName}
              </span>
              <span className="font-label-sm text-label-sm text-outline pl-1">· Socket #4092</span>
            </div>
          </div>

          {/* Main Group Title & Quick Action Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              {/* Vibrant Group Identity Badge */}
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-on-primary shadow-md shrink-0">
                <span className="material-symbols-outlined text-[34px]">luggage</span>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-surface-container-lowest flex items-center justify-center shadow-xs border border-surface-container-high/60">
                  <span className="material-symbols-outlined text-secondary text-[14px]">flight</span>
                </div>
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2.5">
                  <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight truncate font-bold">
                    {groupName}
                  </h1>
                  <span className="px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                    Private ID #GOA-884
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-on-surface-variant font-body-sm text-body-sm mt-1">
                  <span className="flex items-center gap-1 font-medium text-on-surface">
                    <span className="material-symbols-outlined text-[16px] text-primary">group</span>
                    {memberCount} members
                  </span>
                  <span>•</span>
                  <span>Created by <strong className="text-on-surface font-medium">{ownerName}</strong></span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                    Active since Oct 2024
                  </span>
                  <span>•</span>
                  <span className="text-secondary font-medium">Baga Beach, North Goa</span>
                </div>
              </div>
            </div>

            {/* Action Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="primary"
                size="md"
                icon={<span className="material-symbols-outlined text-[20px]">add_circle</span>}
                onClick={handleOpenAddExpense}
              >
                Add Expense
              </Button>
              <Button
                variant="light"
                size="md"
                icon={<span className="material-symbols-outlined text-[18px]">currency_rupee</span>}
                onClick={() => setShowSettle(true)}
              >
                Settle Up
              </Button>
              <Button
                variant="outline"
                size="md"
                icon={<span className="material-symbols-outlined text-[18px]">person_add</span>}
                onClick={() => setShowAddMember(true)}
              >
                Manage Members
              </Button>
            </div>
          </div>

          {/* KPI Financial Summary Cards (Bento 3-Card Array) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* 1. Total Spend */}
            <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container-high/60 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider">Total Group Spend</span>
                <span className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                </span>
              </div>
              <div className="my-2">
                <span className="font-currency-display text-currency-display text-on-surface tabular-nums font-bold">
                  ₹{(totalGroupSpendMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-body-sm text-on-surface-variant pt-1 border-t border-surface-container-high/40">
                <span>{expenses.length} recorded expense{expenses.length === 1 ? '' : 's'}</span>
              </div>
            </div>

            {/* 2. Your Net Balance */}
            <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container-high/60 shadow-xs flex flex-col justify-between relative overflow-hidden">
              <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${isPositive ? 'bg-tertiary-container' : 'bg-error'}`} />
              <div className="flex items-center justify-between text-on-surface-variant pl-1">
                <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider">Your Net Balance</span>
                <span className={`px-2 py-0.5 rounded-full font-label-sm text-[11px] font-medium ${
                  myNetMinor === 0 ? 'bg-surface-container text-on-surface-variant' : isPositive ? 'bg-tertiary/10 text-tertiary-container' : 'bg-error-container text-error'
                }`}>
                  {myNetMinor === 0 ? 'Settled Up' : isPositive ? 'You are owed' : 'You owe'}
                </span>
              </div>
              <div className="my-2 pl-1">
                <span className={`font-display-lg text-display-lg tabular-nums font-bold ${
                  myNetMinor === 0 ? 'text-on-surface' : isPositive ? 'text-tertiary' : 'text-error'
                }`}>
                  {isPositive && myNetMinor > 0 ? '+' : ''}₹{(myNetMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-body-sm text-on-surface-variant pt-1 border-t border-surface-container-high/40 pl-1">
                <span>{myNetMinor === 0 ? 'All settled in this group' : isPositive ? 'Pending collection' : 'Pending payment'}</span>
                {myNetMinor < 0 && (
                  <button
                    type="button"
                    onClick={() => setShowSettle(true)}
                    className="font-label-sm text-label-sm text-primary font-semibold hover:underline flex items-center gap-0.5"
                  >
                    Settle <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                )}
              </div>
            </div>

            {/* 3. Total Settled */}
            <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container-high/60 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider">Group Status</span>
                <span className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                </span>
              </div>
              <div className="my-2">
                <span className="font-currency-display text-currency-display text-on-surface tabular-nums font-bold">
                  {balances?.simplified_debts?.length || 0} Open Debts
                </span>
              </div>
              <div className="flex items-center justify-between text-body-sm text-on-surface-variant pt-1 border-t border-surface-container-high/40">
                <span>Min-flow simplification enabled</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Workspace Navigation Tabs */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-space-xl pt-6">
        <div className="flex items-center gap-1 border-b border-surface-container-high/80 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: 'grid_view' },
            { id: 'expenses', label: 'Expenses', icon: 'receipt_long', badge: `${expenses.length}` },
            { id: 'balances', label: 'Balances', icon: 'account_balance_wallet' },
            { id: 'activity', label: 'Activity', icon: 'bolt' },
            { id: 'members', label: 'Members', icon: 'groups', badge: `${memberCount}` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-label-md text-label-md font-semibold transition-all shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-primary-container text-primary-container'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${
                    activeTab === tab.id
                      ? 'bg-primary-container text-on-primary'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Main Workspace Body: Left 8 cols, Right 4 cols */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-space-xl pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (8 cols): Active Tab Views */}
        <section className="lg:col-span-8 flex flex-col gap-6">
          {/* OVERVIEW / EXPENSES VIEW */}
          {(activeTab === 'overview' || activeTab === 'expenses') && (
            <>
              {/* Filter and Sort bar */}
              <div className="bg-surface-container-lowest p-4 rounded-2xl border border-surface-container-high/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline pointer-events-none">
                    search
                  </span>
                  <input
                    type="text"
                    value={expenseSearch}
                    onChange={(e) => setExpenseSearch(e.target.value)}
                    placeholder="Search expenses by title or payer..."
                    className="w-full h-10 pl-9 pr-4 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md border border-surface-container-high/60 placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={expenseSort}
                    onChange={(e) => setExpenseSort(e.target.value as any)}
                    className="h-10 px-3 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md border border-surface-container-high/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs cursor-pointer"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="highest">Highest Amount</option>
                    <option value="lowest">Lowest Amount</option>
                    <option value="alpha">Alphabetical (A-Z)</option>
                  </select>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<span className="material-symbols-outlined text-[18px]">add</span>}
                    onClick={handleOpenAddExpense}
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Expense stream cards */}
              {expenses.length === 0 ? (
                <div className="bg-surface-container-lowest rounded-2xl p-10 border border-surface-container-high/60 shadow-xs flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-4">
                    <span className="material-symbols-outlined text-[32px]">receipt_long</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">No expenses recorded yet</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm mt-1 mb-6">
                    Add your first shared expense in this group. SplitMate will automatically split the bill and track who owes whom.
                  </p>
                  <Button
                    variant="primary"
                    size="md"
                    icon={<span className="material-symbols-outlined text-[20px]">add_circle</span>}
                    onClick={handleOpenAddExpense}
                  >
                    Add First Expense
                  </Button>
                </div>
              ) : displayedExpenses.length === 0 ? (
                <div className="bg-surface-container-lowest rounded-2xl p-8 border border-surface-container-high/60 text-center text-on-surface-variant font-body-md">
                  No expenses match your search query.
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-3">
                    {displayedExpenses.map((exp) => {
                      const mySplit = exp.splits?.find((s) => s.user.id === user?.id);
                      const isPayer = exp.payer.id === user?.id;
                      const yourShare = mySplit ? mySplit.share_minor : 0;
                      return (
                        <div
                          key={exp.id}
                          className="group bg-surface-container-lowest hover:bg-surface-container-low/50 rounded-2xl p-4 sm:p-5 border border-surface-container-high/60 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-4 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-primary-container shrink-0 group-hover:scale-105 transition-transform">
                              <span className="material-symbols-outlined text-[24px]">receipt</span>
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">
                                  {exp.description}
                                </span>
                                {isPayer ? (
                                  <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-[11px] font-semibold">
                                    You Paid
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-error-container text-error font-label-sm text-[11px] font-semibold">
                                    Shared
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-on-surface-variant font-body-sm text-body-sm">
                                <span className="text-on-surface font-medium">Paid by {isPayer ? 'You' : exp.payer.name}</span>
                                <span>•</span>
                                <span>{exp.date}</span>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 text-on-surface-variant">
                                  <span className="material-symbols-outlined text-[14px]">splitscreen</span>
                                  Split equally ({exp.splits?.length || 1} people)
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-3 sm:pt-0">
                            <div className="flex flex-col sm:items-end">
                              <span className="font-currency-md text-currency-md text-on-surface font-bold tabular-nums">
                                ₹{(exp.amount_minor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                              <span
                                className={`font-body-sm text-body-sm font-semibold tabular-nums ${
                                  isPayer ? 'text-tertiary' : 'text-error'
                                }`}
                              >
                                {isPayer
                                  ? `You lent ₹${((exp.amount_minor - yourShare) / 100).toFixed(2)}`
                                  : `Your share ₹${(yourShare / 100).toFixed(2)}`}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              {(exp.created_by?.id === user?.id || group?.owner?.id === user?.id) && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditExpense(exp)}
                                  className="w-8 h-8 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary-fixed/30 transition-colors flex items-center justify-center cursor-pointer"
                                  title="Edit expense"
                                >
                                  <AppIcon name="edit" size={16} />
                                </button>
                              )}
                              {(exp.created_by?.id === user?.id || group?.owner?.id === user?.id) && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteExpense(exp.id)}
                                  className="w-8 h-8 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-colors flex items-center justify-center cursor-pointer"
                                  title="Delete expense"
                                >
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Controls */}
                  <div className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container-high/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Showing <strong className="text-on-surface">1–{expenses.length}</strong> of <strong className="text-on-surface">{expenses.length}</strong> expense{expenses.length === 1 ? '' : 's'} · Page 1 of 1
                    </span>
                  </div>
                </>
              )}
            </>
          )}

          {/* BALANCES TAB */}
          {activeTab === 'balances' && (
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container-high/60 shadow-xs flex flex-col gap-4">
              <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                Group Balance Breakdown
              </h2>
              {(!balances?.net_balances || balances.net_balances.length === 0) ? (
                <div className="p-6 text-center text-on-surface-variant font-body-md">
                  No member balances to display yet.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {balances.net_balances.map((m) => {
                    const isYou = m.user_id === user?.id;
                    return (
                      <div
                        key={m.user_id}
                        className="p-4 rounded-xl bg-surface-container-low flex items-center justify-between border border-surface-container-high/40"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar name={m.user_name} size="md" status={m.net_minor >= 0 ? 'active' : 'owe'} />
                          <div className="flex flex-col">
                            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                              {m.user_name} {isYou && '(You)'}
                            </span>
                            <span className="font-body-sm text-body-sm text-on-surface-variant">{m.user_email}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span
                            className={`font-currency-md text-currency-md tabular-nums font-bold ${
                              m.net_minor > 0 ? 'text-tertiary' : m.net_minor < 0 ? 'text-error' : 'text-outline'
                            }`}
                          >
                            {m.net_minor > 0
                              ? `+₹${(m.net_minor / 100).toFixed(2)}`
                              : m.net_minor < 0
                              ? `-₹${(Math.abs(m.net_minor) / 100).toFixed(2)}`
                              : '₹0.00'}
                          </span>
                          {m.net_minor < 0 && !isYou && (
                            <SettlementReminderButton
                              groupId={groupId}
                              toUserId={m.user_id}
                              userName={m.user_name}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ACTIVITY TAB */}
          {activeTab === 'activity' && (
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container-high/60 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                    Group Activity Audit Trail
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Reverse-chronological log of expenses, settlements, and member changes
                  </p>
                </div>
                <span className="font-label-sm text-xs bg-surface-container-high px-2.5 py-1 rounded-full text-on-surface-variant font-medium">
                  {activities.length} {activities.length === 1 ? 'event' : 'events'}
                </span>
              </div>
              {activities.length === 0 ? (
                <div className="p-8 text-center text-on-surface-variant font-body-md bg-surface-container-low rounded-xl">
                  No activity recorded yet for this group.
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-surface-container-high/60">
                  {activities.map((act) => {
                    const actorName = act.actor?.id === user?.id ? 'You' : act.actor?.name || 'A member';
                    let icon = 'history';
                    let title = '';
                    let subtext = '';
                    let amountMinor: number | undefined;

                    switch (act.type) {
                      case 'expense_added':
                        icon = 'receipt_long';
                        title = `${actorName} added expense "${act.payload?.description || 'Expense'}"`;
                        amountMinor = act.payload?.amount_minor;
                        if (act.payload?.payer_name) {
                          subtext = `Paid by ${act.payload.payer_name}`;
                        }
                        break;
                      case 'expense_edited':
                        icon = 'edit_note';
                        title = `${actorName} edited expense "${act.payload?.description || 'Expense'}"`;
                        amountMinor = act.payload?.amount_minor;
                        break;
                      case 'expense_deleted':
                        icon = 'delete';
                        title = `${actorName} deleted expense "${act.payload?.description || 'Expense'}"`;
                        amountMinor = act.payload?.amount_minor;
                        break;
                      case 'member_added':
                        icon = 'person_add';
                        title = `${actorName} added ${act.payload?.user_name || 'a member'} to the group`;
                        break;
                      case 'member_removed':
                        icon = 'person_remove';
                        title = `${actorName} removed ${act.payload?.user_name || 'a member'} from the group`;
                        break;
                      case 'settlement_created':
                        icon = 'handshake';
                        title = `${act.payload?.from_user_name || 'Member'} paid ${act.payload?.to_user_name || 'Member'}`;
                        amountMinor = act.payload?.amount_minor;
                        subtext = 'Direct Settlement';
                        break;
                      default:
                        title = `${actorName} performed an action`;
                        break;
                    }

                    return (
                      <div key={act.id} className="py-4 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                            <span className="material-symbols-outlined text-[20px]">{icon}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-body-md text-body-md text-on-surface font-semibold">
                              {title}
                            </span>
                            {subtext && (
                              <span className="font-body-sm text-body-sm text-on-surface-variant">
                                {subtext}
                              </span>
                            )}
                            <span className="font-label-sm text-[12px] text-outline mt-1">
                              {formatDate(act.created_at)}
                            </span>
                          </div>
                        </div>
                        {amountMinor !== undefined && (
                          <div className="text-right shrink-0">
                            <span className="font-mono tabular-nums font-semibold text-on-surface text-base">
                              {formatCurrency(amountMinor)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* MEMBERS TAB */}
          {activeTab === 'members' && (
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container-high/60 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                    Group Members ({group?.members?.length || 0})
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Manage member permissions and invite co-travelers
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<span className="material-symbols-outlined text-[18px]">person_add</span>}
                  onClick={() => setShowAddMember(true)}
                >
                  Add Member
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {group?.members?.map((m) => {
                  const isOwner = group.owner?.id === m.id;
                  const isYou = user?.id === m.id;
                  return (
                    <div key={m.id} className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/40 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar name={m.name} size="md" />
                        <div className="flex flex-col">
                          <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                            {m.name} {isYou && '(You)'}
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">{m.email}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        isOwner ? 'bg-secondary-fixed text-on-secondary-fixed-variant' : 'bg-surface-container-high text-on-surface-variant'
                      }`}>
                        {isOwner ? 'Owner' : 'Member'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN (4 cols): Simplified Settlements & Active Roster (Screen 5) */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          {/* Card 1: Simplified Debts (Min-Flow) */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container-high/60 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Simplified Debts</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-[11px] font-semibold">
                Min-Flow Algo
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              Debts are reduced across the group using optimal min-cash-flow graph settlement.
            </p>

            <div className="flex flex-col gap-3 pt-1">
              {(!balances?.simplified_debts || balances.simplified_debts.length === 0) ? (
                <div className="p-4 rounded-xl bg-surface-container-low text-center flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-[28px] text-tertiary">task_alt</span>
                  <span className="text-body-sm font-medium text-on-surface">All debts are settled!</span>
                  <span className="text-xs text-on-surface-variant">No pending payments between group members.</span>
                </div>
              ) : (
                balances.simplified_debts.map((debt, idx) => {
                  const iAmDebtor = debt.from_user_id === user?.id;
                  const iAmCreditor = debt.to_user_id === user?.id;
                  const amountFormatted = (debt.amount_minor / 100).toFixed(2);
                  return (
                    <div key={idx} className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/40 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-label-sm text-[11px] font-semibold">
                            {debt.from_user_name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="material-symbols-outlined text-[16px] text-outline">trending_flat</span>
                          <div className="w-7 h-7 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center font-label-sm text-[11px] font-semibold">
                            {debt.to_user_name.slice(0, 2).toUpperCase()}
                          </div>
                        </div>
                        <span className={`font-currency-md text-currency-md font-bold tabular-nums ${iAmDebtor ? 'text-error' : iAmCreditor ? 'text-tertiary' : 'text-on-surface'}`}>
                          ₹{amountFormatted}
                        </span>
                      </div>
                      <span className="text-body-sm text-on-surface-variant font-medium">
                        {iAmDebtor ? (
                          <>You owe <strong className="text-on-surface">{debt.to_user_name}</strong></>
                        ) : iAmCreditor ? (
                          <><strong className="text-on-surface">{debt.from_user_name}</strong> owes you</>
                        ) : (
                          <>{debt.from_user_name} owes <strong className="text-on-surface">{debt.to_user_name}</strong></>
                        )}
                      </span>
                      {iAmDebtor && (
                        <button
                          type="button"
                          onClick={() => {
                            setSettleToId(debt.to_user_id);
                            setSettleToName(debt.to_user_name);
                            setSettleAmount(amountFormatted);
                            setShowSettle(true);
                          }}
                          className="w-full h-9 bg-primary-container hover:bg-primary text-on-primary rounded-lg font-label-md text-label-md flex items-center justify-center gap-1.5 transition-all shadow-xs font-semibold cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                          <span>Settle ₹{amountFormatted}</span>
                        </button>
                      )}
                      {iAmCreditor && (
                        <SettlementReminderButton
                          groupId={groupId}
                          toUserId={debt.from_user_id}
                          userName={debt.from_user_name}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Card 2: Active Group Members Roster */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container-high/60 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Members & Net Balance
              </h3>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                {balances?.net_balances?.length || group?.members?.length || 0} in group
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {balances?.net_balances?.map((m) => {
                const isYou = m.user_id === user?.id;
                const isOwner = group?.owner?.id === m.user_id;
                return (
                  <div
                    key={m.user_id}
                    className="p-2.5 rounded-xl hover:bg-surface-container-low transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={m.user_name} size="sm" />
                      <div className="flex flex-col truncate">
                        <div className="flex items-center gap-1">
                          <span className="font-label-md text-label-md text-on-surface font-medium truncate">
                            {m.user_name}
                          </span>
                          {isYou && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-semibold uppercase">
                              You
                            </span>
                          )}
                          {isOwner && (
                            <span className="text-[10px] bg-secondary-fixed text-on-secondary-fixed-variant px-1.5 py-0.2 rounded font-medium">
                              Admin
                            </span>
                          )}
                        </div>
                        <span className="font-body-sm text-[11px] text-on-surface-variant truncate">
                          {m.user_email}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`font-currency-md text-currency-md tabular-nums font-semibold shrink-0 ${
                        m.net_minor > 0 ? 'text-tertiary' : m.net_minor < 0 ? 'text-error' : 'text-outline'
                      }`}
                    >
                      {m.net_minor > 0
                        ? `+₹${(m.net_minor / 100).toFixed(2)}`
                        : m.net_minor < 0
                        ? `-₹${(Math.abs(m.net_minor) / 100).toFixed(2)}`
                        : '₹0.00'}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowAddMember(true)}
              className="w-full py-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center justify-center gap-1.5 transition-colors font-medium border border-surface-container-high/60 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>Invite Another Friend</span>
            </button>
          </div>

          {/* Card 3: Group Destination Visual Card */}
          <div className="relative bg-surface-container-lowest rounded-2xl p-4 border border-surface-container-high/60 shadow-xs overflow-hidden flex flex-col gap-3">
            <div className="relative w-full h-36 rounded-xl overflow-hidden bg-gradient-to-r from-teal-700 to-emerald-900 flex items-end p-4 text-white">
              <div className="relative z-10">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-200">
                  Trip Destination
                </span>
                <h4 className="font-headline-sm text-headline-sm font-bold text-white">
                  North Goa Coastal Retreat
                </h4>
              </div>
            </div>
            <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm px-1">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary">pin_drop</span>
                Vagator & Baga
              </span>
              <span className="font-medium text-on-surface">5 Days remaining</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        title="Add Member"
        subtitle={`Invite a new friend to split expenses in ${groupName}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddMember(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddMember}
              loading={modalLoading}
            >
              Add Member
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddMember} className="flex flex-col gap-4">
          {modalError && (
            <div className="p-3 rounded-xl bg-error-container/60 text-xs text-error">
              {modalError}
            </div>
          )}
          <Input
            label="Member Email Address"
            type="email"
            placeholder="friend@example.com"
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
            required
            autoFocus
            helperText="An email invitation will be sent to notify them about this group."
          />
        </form>
      </Modal>

      {/* Add / Edit Expense Modal */}
      <Modal
        isOpen={showAddExpense}
        onClose={() => {
          setShowAddExpense(false);
          setEditingExpense(null);
        }}
        title={editingExpense ? 'Edit Expense' : 'Add Expense'}
        subtitle={
          editingExpense
            ? `Update expense details and recalculate balances in ${groupName}`
            : `Record a shared cost in ${groupName}`
        }
        maxWidth="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddExpense(false);
                setEditingExpense(null);
              }}
              type="button"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveExpense}
              loading={modalLoading}
              disabled={
                !expenseDesc.trim() ||
                !expenseAmount ||
                parseFloat(expenseAmount) <= 0 ||
                (splitType === 'equal' && selectedMembers.length === 0) ||
                (splitType === 'exact' && exactSplitDifferenceMinor !== 0)
              }
              type="button"
            >
              {editingExpense ? 'Update Expense' : 'Save Expense'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveExpense} className="flex flex-col gap-4">
          {modalError && (
            <div className="p-3 rounded-xl bg-error-container/60 text-xs text-error font-medium">
              {modalError}
            </div>
          )}

          {/* Description */}
          <Input
            label="Expense Description"
            placeholder="e.g. Fisherman's Wharf, Villa Rental, Cab"
            value={expenseDesc}
            onChange={(e) => setExpenseDesc(e.target.value)}
            required
            autoFocus
          />

          {/* Amount & Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm font-semibold text-on-surface">
                Total Amount (INR ₹)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-on-surface-variant font-semibold text-sm pointer-events-none">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  required
                  className="w-full h-10 pl-8 pr-3 rounded-lg bg-surface-container-lowest text-on-surface font-semibold tabular-nums border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm font-semibold text-on-surface">
                Expense Date
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg bg-surface-container-lowest text-on-surface border border-outline-variant/60 font-body-md focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
              />
            </div>
          </div>

          {/* Paid By */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm font-semibold text-on-surface">
              Paid By
            </label>
            <select
              value={expensePayerId}
              onChange={(e) => setExpensePayerId(parseInt(e.target.value, 10))}
              className="w-full h-10 px-3 rounded-lg bg-surface-container-lowest text-on-surface border border-outline-variant/60 font-body-md focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
            >
              {group?.members && group.members.length > 0 ? (
                group.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id === user?.id ? `You (${m.name})` : m.name}
                  </option>
                ))
              ) : (
                <option value={user?.id || 1}>You ({user?.name || 'You'})</option>
              )}
            </select>
          </div>

          {/* Split Method Toggle */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="font-label-sm text-label-sm font-semibold text-on-surface">
                Split Method
              </label>
              <span className="text-[11px] text-on-surface-variant font-medium">
                {splitType === 'equal' ? 'Equal split across chosen members' : 'Specify exact share per person'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 p-1 bg-surface-container-low rounded-xl border border-surface-container-high/60">
              <button
                type="button"
                onClick={() => setSplitType('equal')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  splitType === 'equal'
                    ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <AppIcon name="splitscreen" size={16} />
                <span>Equal Split</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSplitType('exact');
                  // Initialize exact shares if empty
                  if (Object.keys(exactShares).length === 0 && group?.members && expenseAmount) {
                    const parsed = parseFloat(expenseAmount);
                    if (!isNaN(parsed) && parsed > 0) {
                      const shareEach = (parsed / group.members.length).toFixed(2);
                      const initialMap: Record<number, string> = {};
                      group.members.forEach((m) => {
                        initialMap[m.id] = shareEach;
                      });
                      setExactShares(initialMap);
                    }
                  }
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  splitType === 'exact'
                    ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <AppIcon name="receipt" size={16} />
                <span>Exact / Custom Split</span>
              </button>
            </div>
          </div>

          {/* Equal Split: Member Selection & Share Preview */}
          {splitType === 'equal' && (
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-surface-container-low/60 border border-surface-container-high/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-on-surface">
                  Included in Split ({selectedMembers.length}/{group?.members?.length || 1})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedMembers.length === (group?.members?.length || 0)) {
                      setSelectedMembers([]);
                    } else {
                      setSelectedMembers(group?.members?.map((m) => m.id) || []);
                    }
                  }}
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  {selectedMembers.length === (group?.members?.length || 0) ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                {group?.members?.map((m) => {
                  const isSelected = selectedMembers.includes(m.id);
                  const shareMinor = equalSplitSharesPreview[m.id] || 0;
                  return (
                    <label
                      key={m.id}
                      className={`flex items-center justify-between p-2 rounded-lg border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-surface-container-lowest border-primary/40'
                          : 'bg-surface-container-lowest/50 border-surface-container-high/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMembers((prev) => [...prev, m.id]);
                            } else {
                              setSelectedMembers((prev) => prev.filter((id) => id !== m.id));
                            }
                          }}
                          className="w-4 h-4 rounded text-primary focus:ring-primary"
                        />
                        <span className="text-xs font-medium text-on-surface truncate">
                          {m.id === user?.id ? `You (${m.name})` : m.name}
                        </span>
                      </div>
                      <span className="font-mono text-xs tabular-nums font-semibold text-on-surface-variant shrink-0">
                        {isSelected && shareMinor > 0
                          ? `₹${(shareMinor / 100).toFixed(2)}`
                          : '₹0.00'}
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="text-[11px] text-on-surface-variant mt-1">
                Deterministic rounding: any remainder paisa (+1 unit) is assigned to the first members so shares sum exactly to ₹{parseFloat(expenseAmount || '0').toFixed(2)}.
              </p>
            </div>
          )}

          {/* Exact / Custom Split: Per-member share inputs & live sum validation */}
          {splitType === 'exact' && (
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-surface-container-low/60 border border-surface-container-high/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-on-surface">
                  Enter Share for Each Member
                </span>
                <span className="font-mono text-xs tabular-nums font-semibold text-on-surface">
                  Target: ₹{expenseAmountMinor > 0 ? (expenseAmountMinor / 100).toFixed(2) : '0.00'}
                </span>
              </div>

              {/* Live Balance Status Bar */}
              <div
                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 font-medium ${
                  exactSplitDifferenceMinor === 0 && expenseAmountMinor > 0
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <AppIcon
                    name={exactSplitDifferenceMinor === 0 && expenseAmountMinor > 0 ? 'check_circle' : 'warning'}
                    size={16}
                  />
                  <span className="truncate">
                    {exactSplitDifferenceMinor === 0 && expenseAmountMinor > 0
                      ? 'Shares perfectly equal total expense amount.'
                      : `Shares add up to ₹${(exactSplitSum / 100).toFixed(2)}, expense is ₹${(expenseAmountMinor / 100).toFixed(2)}`}
                  </span>
                </div>
                {exactSplitDifferenceMinor !== 0 && (
                  <span className="font-mono tabular-nums shrink-0 font-bold">
                    {exactSplitDifferenceMinor > 0
                      ? `₹${(exactSplitDifferenceMinor / 100).toFixed(2)} left`
                      : `+₹${(Math.abs(exactSplitDifferenceMinor) / 100).toFixed(2)} over`}
                  </span>
                )}
              </div>

              {/* Members inputs */}
              <div className="flex flex-col gap-2 mt-1">
                {group?.members?.map((m) => {
                  const currentVal = exactShares[m.id] || '';
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-3 p-2 rounded-lg bg-surface-container-lowest border border-surface-container-high/60"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar name={m.name} size="sm" />
                        <span className="text-xs font-medium text-on-surface truncate">
                          {m.id === user?.id ? `You (${m.name})` : m.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 w-32">
                        <span className="text-xs text-on-surface-variant font-semibold">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={currentVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExactShares((prev) => ({
                              ...prev,
                              [m.id]: val,
                            }));
                          }}
                          className="w-full h-8 px-2 rounded-md bg-surface-container-low text-on-surface text-xs font-semibold tabular-nums border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Record Settlement Modal */}
      <Modal
        isOpen={showSettle}
        onClose={() => setShowSettle(false)}
        title="Record Settlement"
        subtitle={`Record a debt payment in ${groupName}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowSettle(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSettle}
              loading={modalLoading}
            >
              Record Payment
            </Button>
          </>
        }
      >
        <form onSubmit={handleSettle} className="flex flex-col gap-4">
          {modalError && (
            <div className="p-3 rounded-xl bg-error-container/60 text-xs text-error">
              {modalError}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm font-semibold text-on-surface">
              Paying To
            </label>
            {settleToName && settleToId ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-container-low text-on-surface border border-surface-container-high font-body-md">
                <span className="font-semibold">{settleToName}</span>
                <button
                  type="button"
                  onClick={() => { setSettleToName(''); setSettleToId(0); }}
                  className="text-xs text-primary hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <select
                value={settleToId}
                onChange={(e) => {
                  const mId = parseInt(e.target.value, 10);
                  setSettleToId(mId);
                  const found = group?.members?.find((m) => m.id === mId);
                  if (found) setSettleToName(found.name);
                }}
                className="w-full h-10 px-3 rounded-lg bg-surface-container-lowest text-on-surface border border-outline-variant/60 font-body-md focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
              >
                <option value={0} disabled>Select member to pay...</option>
                {group?.members?.filter((m) => m.id !== user?.id).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.email})
                  </option>
                ))}
              </select>
            )}
          </div>
          <Input
            label="Amount (INR ₹)"
            type="number"
            step="0.01"
            min="0.01"
            value={settleAmount}
            onChange={(e) => setSettleAmount(e.target.value)}
            required
            autoFocus
          />
          <p className="text-xs text-on-surface-variant">
            Both you and {settleToName} will receive email & in-app confirmations upon payment recording.
          </p>
        </form>
      </Modal>
    </div>
  );
}
