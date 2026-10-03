import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import KpiCard from '../components/ui/KpiCard';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { useAuth } from '../auth/AuthContext';
import { getGroupsApi, getGroupBalancesApi } from '../api/groups';
import { createSettlementApi } from '../api/settlements';
import { getHistoryApi } from '../api/dashboard';
import { sendSettlementReminderApi } from '../api/notifications';
import { Group, SimplifiedDebt, Settlement } from '../types';
import { useAlert } from '../context/AlertContext';

interface DebtWithGroup extends SimplifiedDebt {
  groupId: number;
  groupName: string;
}

export const SettlementsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useAlert();

  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [debts, setDebts] = useState<DebtWithGroup[]>([]);
  const [settlementHistory, setSettlementHistory] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  // Settlement Modal state
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtWithGroup | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Reminder alert
  const [reminderStatus, setReminderStatus] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [groups, historyRes] = await Promise.all([
        getGroupsApi(),
        getHistoryApi(1, 50),
      ]);

      // Collect simplified debts from all user's groups
      const allDebts: DebtWithGroup[] = [];
      await Promise.all(
        groups.map(async (grp) => {
          try {
            const bals = await getGroupBalancesApi(grp.id);
            if (bals.simplified_debts) {
              bals.simplified_debts.forEach((sd) => {
                allDebts.push({
                  ...sd,
                  groupId: grp.id,
                  groupName: grp.name,
                });
              });
            }
          } catch (e) {
            console.error(`Failed to load balances for group ${grp.id}:`, e);
          }
        })
      );
      setDebts(allDebts);

      // Extract settlements from history
      const settlements: Settlement[] = (historyRes.items || [])
        .filter((item) => item.type === 'settlement')
        .map((item) => item.data as Settlement);
      setSettlementHistory(settlements);
    } catch (err) {
      console.error('Error loading settlements data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const [debtSort, setDebtSort] = useState<'highest' | 'lowest' | 'name'>('highest');
  const [historySort, setHistorySort] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  const debtsYouOwe = useMemo(() => {
    const list = debts.filter((d) => d.from_user_id === user?.id);
    return list.sort((a, b) => {
      if (debtSort === 'lowest') return a.amount_minor - b.amount_minor;
      if (debtSort === 'name') return a.to_user_name.localeCompare(b.to_user_name);
      return b.amount_minor - a.amount_minor;
    });
  }, [debts, user, debtSort]);

  const debtsOwedToYou = useMemo(() => {
    const list = debts.filter((d) => d.to_user_id === user?.id);
    return list.sort((a, b) => {
      if (debtSort === 'lowest') return a.amount_minor - b.amount_minor;
      if (debtSort === 'name') return a.from_user_name.localeCompare(b.from_user_name);
      return b.amount_minor - a.amount_minor;
    });
  }, [debts, user, debtSort]);

  const sortedHistory = useMemo(() => {
    const list = [...settlementHistory];
    return list.sort((a, b) => {
      if (historySort === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (historySort === 'highest') {
        return b.amount_minor - a.amount_minor;
      }
      if (historySort === 'lowest') {
        return a.amount_minor - b.amount_minor;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [settlementHistory, historySort]);

  const totalOweMinor = useMemo(() => {
    return debtsYouOwe.reduce((sum, d) => sum + d.amount_minor, 0);
  }, [debtsYouOwe]);

  const totalOwedMinor = useMemo(() => {
    return debtsOwedToYou.reduce((sum, d) => sum + d.amount_minor, 0);
  }, [debtsOwedToYou]);

  const handleOpenSettle = (debt: DebtWithGroup) => {
    setSelectedDebt(debt);
    setSettleAmount((debt.amount_minor / 100).toFixed(2));
    setModalError(null);
    setSettleModalOpen(true);
  };

  const handleConfirmSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt || !settleAmount) return;
    setIsSubmitting(true);
    setModalError(null);

    try {
      const amountMinor = Math.round(parseFloat(settleAmount) * 100);
      await createSettlementApi(selectedDebt.groupId, selectedDebt.to_user_id, amountMinor);
      setSettleModalOpen(false);
      setSelectedDebt(null);
      toast.success('Settlement payment recorded successfully.');
      await loadData();
    } catch (err: any) {
      setModalError(err?.response?.data?.detail || 'Failed to record settlement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReminder = async (debt: DebtWithGroup) => {
    try {
      await sendSettlementReminderApi(debt.groupId, debt.from_user_id);
      toast.success(`Payment reminder sent to ${debt.from_user_name}!`);
    } catch (err: any) {
      if (err?.response?.status === 429) {
        toast.warning('Reminder was already sent recently. Please wait a few minutes before reminding again.');
      } else {
        toast.error(err?.response?.data?.detail || 'Failed to send reminder.');
      }
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-space-xl py-6 md:py-8 flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-high/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-label-sm text-primary tracking-wider uppercase font-semibold">
              Debt Resolution Hub
            </span>
            <span className="text-on-surface-variant text-[10px]">•</span>
            <span className="font-label-sm text-label-sm text-tertiary-container flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[15px]">auto_fix_high</span>
              Min-flow Simplified
            </span>
          </div>
          <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight font-bold mt-1">
            Settlements & Balances
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Resolve pending balances with minimum transaction hops using mathematical graph simplification.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex p-1 bg-surface-container-lowest border border-surface-container-high/60 rounded-xl shadow-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg font-label-md text-label-md font-medium transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-primary-container text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Pending Debts ({debtsYouOwe.length + debtsOwedToYou.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg font-label-md text-label-md font-medium transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-primary-container text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Settled History ({settlementHistory.length})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Total You Need to Pay"
          amount={`₹${(totalOweMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle={`${debtsYouOwe.length} simplified payments`}
          badgeText="Outbound"
          type="owe"
          icon={<span className="material-symbols-outlined text-[20px]">arrow_outward</span>}
        />
        <KpiCard
          title="Total You Will Receive"
          amount={`₹${(totalOwedMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle={`${debtsOwedToYou.length} incoming settlements`}
          badgeText="Inbound"
          type="owed"
          icon={<span className="material-symbols-outlined text-[20px]">arrow_downward</span>}
        />
        <KpiCard
          title="Optimal Transactions"
          amount={`${debts.length} Paths`}
          subtitle="Min-flow graph simplification"
          badgeText="Active"
          type="net"
          icon={<span className="material-symbols-outlined text-[20px]">insights</span>}
        />
      </div>

      {reminderStatus && (
        <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-on-surface flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">info</span>
            <span className="font-label-md text-label-md">{reminderStatus}</span>
          </div>
          <button
            type="button"
            onClick={() => setReminderStatus(null)}
            className="text-on-surface-variant hover:text-on-surface cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Sorting Control Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest p-3.5 rounded-xl border border-surface-container-high/60 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">
            {activeTab === 'pending' ? 'account_tree' : 'history'}
          </span>
          <span className="font-label-md text-label-md text-on-surface font-semibold">
            {activeTab === 'pending'
              ? 'Graph-Optimized Pending Transfers'
              : 'Historical Payment Ledger'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="settle-sort" className="font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap">
            Sort by:
          </label>
          {activeTab === 'pending' ? (
            <select
              id="settle-sort"
              value={debtSort}
              onChange={(e) => setDebtSort(e.target.value as any)}
              className="h-9 px-3 rounded-lg bg-surface-container-low border border-surface-container-high text-on-surface font-label-sm text-label-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
              <option value="name">Counterparty Name (A-Z)</option>
            </select>
          ) : (
            <select
              id="settle-sort"
              value={historySort}
              onChange={(e) => setHistorySort(e.target.value as any)}
              className="h-9 px-3 rounded-lg bg-surface-container-low border border-surface-container-high text-on-surface font-label-sm text-label-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
            </select>
          )}
        </div>
      </div>

      {activeTab === 'pending' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* LEFT: You Owe */}
          <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-surface-container-high/60 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high/40">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-error" />
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  You Owe ({debtsYouOwe.length})
                </h2>
              </div>
              <span className="font-mono tabular-nums font-bold text-error text-base">
                ₹{(totalOweMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {debtsYouOwe.length === 0 ? (
              <EmptyState
                icon="check_circle"
                title="All settled up!"
                description="You do not owe anyone any money across your groups."
              />
            ) : (
              <div className="flex flex-col gap-3">
                {debtsYouOwe.map((debt, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 flex items-center justify-between gap-3 hover:border-error/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={debt.to_user_name} size="md" />
                      <div className="truncate">
                        <div className="font-label-md text-label-md text-on-surface font-semibold truncate">
                          Pay {debt.to_user_name}
                        </div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1.5 truncate">
                          <span className="material-symbols-outlined text-[14px]">group</span>
                          <span className="truncate">{debt.groupName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="font-mono tabular-nums font-bold text-error text-base">
                          ₹{(debt.amount_minor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="font-label-sm text-[11px] text-on-surface-variant">direct owe</div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenSettle(debt)}
                      >
                        Settle Up
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: You Are Owed */}
          <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-surface-container-high/60 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high/40">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary-container" />
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Owed to You ({debtsOwedToYou.length})
                </h2>
              </div>
              <span className="font-mono tabular-nums font-bold text-tertiary-container text-base">
                ₹{(totalOwedMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {debtsOwedToYou.length === 0 ? (
              <EmptyState
                icon="savings"
                title="No pending claims"
                description="Nobody owes you money in your groups right now."
              />
            ) : (
              <div className="flex flex-col gap-3">
                {debtsOwedToYou.map((debt, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 flex items-center justify-between gap-3 hover:border-tertiary-container/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={debt.from_user_name} size="md" />
                      <div className="truncate">
                        <div className="font-label-md text-label-md text-on-surface font-semibold truncate">
                          {debt.from_user_name} owes you
                        </div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1.5 truncate">
                          <span className="material-symbols-outlined text-[14px]">group</span>
                          <span className="truncate">{debt.groupName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="font-mono tabular-nums font-bold text-tertiary-container text-base">
                          +₹{(debt.amount_minor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="font-label-sm text-[11px] text-on-surface-variant">claimable</div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSendReminder(debt)}
                      >
                        Remind
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Settled History Ledger */
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container-high/60 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-surface-container-high/40">
            <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
              Historical Settlements
            </h2>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {settlementHistory.length} recorded payments
            </span>
          </div>

          {settlementHistory.length === 0 ? (
            <EmptyState
              icon="receipt_long"
              title="No settlement history yet"
              description="Settlement payments between group members will appear here once recorded."
              actionText="View Groups"
              onAction={() => navigate('/groups')}
            />
          ) : (
            <div className="flex flex-col divide-y divide-surface-container-high/40">
              {sortedHistory.map((item) => (
                <div
                  key={item.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container-low/40 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-label-md text-label-md text-on-surface font-semibold">
                          {item.from_user?.name || 'Someone'} paid {item.to_user?.name || 'someone'}
                        </span>
                        <Badge variant="positive">Completed</Badge>
                      </div>
                      <div className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2 mt-0.5">
                        <span>{new Date(item.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono tabular-nums font-bold text-on-surface text-base sm:text-lg">
                      ₹{(item.amount_minor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settle Modal */}
      <Modal
        isOpen={settleModalOpen}
        onClose={() => setSettleModalOpen(false)}
        title="Record Settlement"
        subtitle={selectedDebt ? `Settle debt to ${selectedDebt.to_user_name} in ${selectedDebt.groupName}` : 'Record payment'}
        footer={
          <>
            <Button variant="outline" onClick={() => setSettleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmSettlement}
              loading={isSubmitting}
            >
              Confirm Settlement
            </Button>
          </>
        }
      >
        <form onSubmit={handleConfirmSettlement} className="flex flex-col gap-4">
          {modalError && (
            <div className="p-3 rounded-xl bg-error-container/60 text-xs text-error">
              {modalError}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm font-semibold text-on-surface">
              Paying To
            </label>
            <input
              type="text"
              readOnly
              value={selectedDebt?.to_user_name || ''}
              className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface border border-outline-variant/60 font-body-md cursor-not-allowed"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm font-semibold text-on-surface">
              Amount (INR ₹)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={settleAmount}
              onChange={(e) => setSettleAmount(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-lg bg-surface-container-lowest text-on-surface border border-outline-variant/60 font-body-md focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
            />
          </div>
          <p className="text-xs text-on-surface-variant">
            This will record the payment and update min-flow debt simplification across all members.
          </p>
        </form>
      </Modal>
    </div>
  );
};

export default SettlementsPage;
