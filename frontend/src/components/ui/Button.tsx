import React from 'react';
import AppIcon from './AppIcon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost' | 'light';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium font-label-md rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer';

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-11 px-6 text-base gap-2.5',
  };

  const variantClasses = {
    primary:
      'bg-primary-container text-on-primary hover:bg-primary focus:ring-primary shadow-sm hover:shadow',
    secondary:
      'bg-surface-container-high text-on-surface hover:bg-surface-container-highest focus:ring-primary shadow-sm',
    outline:
      'bg-surface-container-lowest text-on-surface border border-outline-variant/60 hover:bg-surface-container-low focus:ring-primary shadow-sm',
    destructive:
      'bg-error text-on-error hover:opacity-90 focus:ring-error shadow-sm',
    ghost:
      'bg-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface focus:ring-primary',
    light:
      'bg-secondary-fixed text-on-secondary-fixed-variant hover:bg-secondary-fixed-dim focus:ring-secondary shadow-sm',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
      ) : (
        icon && (
          <span className="inline-flex shrink-0">
            {typeof icon === 'string' ? <AppIcon name={icon} size={18} /> : icon}
          </span>
        )
      )}
      <span>{children}</span>
      {iconRight && !loading && (
        <span className="inline-flex shrink-0">
          {typeof iconRight === 'string' ? <AppIcon name={iconRight} size={18} /> : iconRight}
        </span>
      )}
    </button>
  );
};

export default Button;
