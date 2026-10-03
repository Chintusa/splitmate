import React from 'react';
import AppIcon from './AppIcon';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, iconRight, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="font-label-sm text-label-sm font-semibold text-on-surface">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <span className="absolute left-3 text-outline pointer-events-none flex items-center justify-center">
              {typeof icon === 'string' ? <AppIcon name={icon} size={18} /> : icon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full h-10 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md border transition-all placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-sm ${
              icon ? 'pl-9' : 'pl-3'
            } ${iconRight ? 'pr-10' : 'pr-3'} ${
              error ? 'border-error focus:ring-error' : 'border-outline-variant/60 focus:border-primary'
            } ${className}`}
            {...props}
          />
          {iconRight && (
            <span className="absolute right-3 text-outline flex items-center justify-center">
              {typeof iconRight === 'string' ? <AppIcon name={iconRight} size={18} /> : iconRight}
            </span>
          )}
        </div>
        {error ? (
          <span className="font-body-sm text-body-sm text-error">{error}</span>
        ) : helperText ? (
          <span className="font-body-sm text-body-sm text-on-surface-variant">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
