import React from 'react';
import AppIcon from './AppIcon';

export interface KpiCardProps {
  title: string;
  amount: string | number;
  subtitle: string;
  badgeText?: string;
  type?: 'owe' | 'owed' | 'net' | 'neutral';
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  amount,
  subtitle,
  badgeText,
  type = 'neutral',
  icon,
  actionText,
  onAction,
}) => {
  const accentBorder = {
    owe: 'bg-error',
    owed: 'bg-tertiary-container',
    net: 'bg-primary-container',
    neutral: 'bg-secondary',
  }[type];

  const amountColor = {
    owe: 'text-error',
    owed: 'text-tertiary',
    net: 'text-primary',
    neutral: 'text-on-surface',
  }[type];

  const iconBg = {
    owe: 'bg-error-container/60 text-error',
    owed: 'bg-surface-container-highest text-tertiary',
    net: 'bg-primary-fixed text-primary',
    neutral: 'bg-secondary-fixed text-secondary',
  }[type];

  const badgeStyle = {
    owe: 'text-error bg-error-container/40',
    owed: 'text-tertiary bg-surface-container-highest',
    net: 'text-tertiary bg-surface-container-high',
    neutral: 'text-secondary bg-secondary-fixed/50',
  }[type];

  return (
    <div className="relative bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-surface-container-high/60 overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${accentBorder}`} />
      
      <div className="flex items-start justify-between mb-space-md pl-1">
        <div className="flex flex-col">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
            {title}
          </span>
          <span className={`font-currency-display text-currency-display ${amountColor} mt-space-xs tabular-nums font-bold`}>
            {amount}
          </span>
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
            {typeof icon === 'string' ? <AppIcon name={icon} size={20} /> : icon}
          </div>
        )}
      </div>

      <div className="pt-space-xs flex items-center justify-between pl-1">
        <span className="font-body-sm text-body-sm text-on-surface-variant truncate mr-2">
          {subtitle}
        </span>
        {badgeText && (
          <span className={`font-label-sm text-label-sm px-2 py-0.5 rounded-full shrink-0 font-medium ${badgeStyle}`}>
            {badgeText}
          </span>
        )}
        {actionText && (
          <button
            type="button"
            onClick={onAction}
            className="font-label-sm text-label-sm text-secondary hover:underline flex items-center font-medium shrink-0"
          >
            {actionText} <span className="material-symbols-outlined text-[14px] ml-0.5">arrow_forward</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default KpiCard;
