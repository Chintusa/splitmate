import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import AppIcon from '../ui/AppIcon';
import { getGroupsApi, getGroupDetailApi } from '../../api/groups';
import { createExpenseApi } from '../../api/expenses';
import { useAuth } from '../../auth/AuthContext';
import { Group, User } from '../../types';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: any) => void;
  defaultGroupId?: number | string;
  groups?: Array<{ id: number | string; name: string }>;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  defaultGroupId,
  groups: propGroups,
}) => {
  const { user } = useAuth();
  const [availableGroups, setAvailableGroups] = useState<Array<{ id: number | string; name: string }>>(propGroups || []);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [groupId, setGroupId] = useState<number | string>(defaultGroupId || '');
  const [payerId, setPayerId] = useState<number>(user?.id || 0);
  const [splitType, setSplitType] = useState<'equal' | 'exact'>('equal');
  const [category, setCategory] = useState('dining');
  const [members, setMembers] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [exactShares, setExactShares] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available groups when opened
  useEffect(() => {
    if (isOpen) {
      setError(null);
      getGroupsApi()
        .then((data) => {
          if (data && data.length > 0) {
            setAvailableGroups(data);
            const targetId = defaultGroupId || data[0].id;
            setGroupId(targetId);
          } else {
            setAvailableGroups([]);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, defaultGroupId]);

  // Load selected group details to get member list
  useEffect(() => {
    if (groupId) {
      getGroupDetailApi(Number(groupId))
        .then((grp: Group) => {
          if (grp && grp.members) {
            setMembers(grp.members);
            setSelectedMembers(grp.members.map((m) => m.id));
            if (!payerId && user) {
              setPayerId(user.id);
            }
          }
        })
        .catch(() => {});
    }
  }, [groupId, user, payerId]);

  // Equal split rounding rule preview
  const equalSplitSharesPreview = useMemo(() => {
    const amountNum = parseFloat(amount);
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
  }, [amount, selectedMembers]);

  // Exact split sum check
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
    const parsed = parseFloat(amount);
    return !isNaN(parsed) && parsed > 0 ? Math.round(parsed * 100) : 0;
  }, [amount]);

  const exactSplitDifferenceMinor = expenseAmountMinor - exactSplitSum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    if (!groupId || availableGroups.length === 0) {
      setError('Please create or select a group before adding an expense.');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Amount must be positive.');
      return;
    }
    const amountMinor = Math.round(amountNum * 100);

    if (splitType === 'equal') {
      if (selectedMembers.length === 0) {
        setError('Please select at least one member to split this expense with.');
        return;
      }
    } else {
      if (exactSplitDifferenceMinor !== 0) {
        setError(
          `Shares add up to ₹${(exactSplitSum / 100).toFixed(2)}, expense is ₹${(amountMinor / 100).toFixed(2)} (Difference: ₹${(Math.abs(exactSplitDifferenceMinor) / 100).toFixed(2)}).`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (onSubmit) {
        await onSubmit({
          description: description.trim(),
          amount: amountNum,
          groupId: Number(groupId),
          splitType,
          category,
          date,
        });
      } else {
        const payload: any = {
          description: description.trim(),
          amount_minor: amountMinor,
          payer_id: payerId || user?.id || 1,
          date,
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

        await createExpenseApi(Number(groupId), payload);
      }

      setDescription('');
      setAmount('');
      setExactShares({});
      onClose();
      window.dispatchEvent(new CustomEvent('splitmate:expense-added'));
    } catch (err: any) {
      const backendErr = err?.response?.data;
      if (typeof backendErr === 'object' && backendErr !== null) {
        const detail = backendErr.detail || Object.values(backendErr).flat().join(' ');
        setError(detail || 'Failed to save expense.');
      } else {
        setError('Failed to save expense. Please check your inputs.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add an Expense"
      subtitle="Split costs with your group with automatic balance calculation"
      maxWidth="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={
              !description.trim() ||
              !amount ||
              parseFloat(amount) <= 0 ||
              (splitType === 'equal' && selectedMembers.length === 0) ||
              (splitType === 'exact' && exactSplitDifferenceMinor !== 0)
            }
            type="button"
          >
            Save Expense
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 rounded-lg bg-error-container/60 text-error font-body-sm text-body-sm">
            {error}
          </div>
        )}

        {/* Group Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="font-label-sm text-label-sm font-semibold text-on-surface">
            Choose Group
          </label>
          {availableGroups.length === 0 ? (
            <div className="p-3 rounded-lg bg-surface-container-low border border-surface-container-high text-on-surface-variant font-body-sm text-body-sm flex items-center justify-between">
              <span>No groups found yet. Create a group first!</span>
              <a
                href="/groups"
                onClick={onClose}
                className="text-primary font-medium hover:underline text-xs"
              >
                Go to Groups →
              </a>
            </div>
          ) : (
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-surface-container-lowest text-on-surface border border-outline-variant/60 font-body-md focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
            >
              {availableGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Description */}
        <Input
          label="Expense Description"
          placeholder="e.g. Dinner at Fisherman's Wharf, Villa Rental"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        {/* Amount & Date Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm font-semibold text-on-surface">
              Amount (INR ₹)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-on-surface-variant font-semibold text-sm pointer-events-none">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full h-10 pl-8 pr-3 rounded-lg bg-surface-container-lowest text-on-surface font-semibold tabular-nums border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm font-semibold text-on-surface">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-lg bg-surface-container-lowest text-on-surface border border-outline-variant/60 font-body-md focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
            />
          </div>
        </div>

        {/* Paid By */}
        {members.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm font-semibold text-on-surface">
              Paid By
            </label>
            <select
              value={payerId}
              onChange={(e) => setPayerId(parseInt(e.target.value, 10))}
              className="w-full h-10 px-3 rounded-lg bg-surface-container-lowest text-on-surface border border-outline-variant/60 font-body-md focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id === user?.id ? `You (${m.name})` : m.name}
                </option>
              ))}
            </select>
          </div>
        )}

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
                if (Object.keys(exactShares).length === 0 && members.length > 0 && amount) {
                  const parsed = parseFloat(amount);
                  if (!isNaN(parsed) && parsed > 0) {
                    const shareEach = (parsed / members.length).toFixed(2);
                    const initialMap: Record<number, string> = {};
                    members.forEach((m) => {
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
        {splitType === 'equal' && members.length > 0 && (
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-surface-container-low/60 border border-surface-container-high/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-on-surface">
                Included in Split ({selectedMembers.length}/{members.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  if (selectedMembers.length === members.length) {
                    setSelectedMembers([]);
                  } else {
                    setSelectedMembers(members.map((m) => m.id));
                  }
                }}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                {selectedMembers.length === members.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              {members.map((m) => {
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
              Deterministic rounding: remainder paisa (+1 unit) is assigned to the first members so shares sum exactly to ₹{parseFloat(amount || '0').toFixed(2)}.
            </p>
          </div>
        )}

        {/* Exact / Custom Split: Per-member share inputs & live sum validation */}
        {splitType === 'exact' && members.length > 0 && (
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
              {members.map((m) => {
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
  );
};

export default AddExpenseModal;
