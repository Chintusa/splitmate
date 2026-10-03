import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'live' | 'positive' | 'negative' | 'neutral' | 'info' | 'warning';
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  pulse = false,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  const variantClasses = {
    live: 'bg-surface-container-lowest text-tertiary border border-surface-container-high shadow-xs',
    positive: 'bg-surface-container-highest text-tertiary font-medium',
    negative: 'bg-error-container/60 text-error font-medium',
    neutral: 'bg-surface-container text-on-surface-variant font-medium',
    info: 'bg-secondary-fixed/50 text-secondary font-medium',
    warning: 'bg-amber-100 text-amber-800 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-label-sm ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {variant === 'live' && (
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-container opacity-75" />
          )}
          <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary-container" />
        </span>
      )}
      {children}
    </span>
  );
};

export default Badge;
