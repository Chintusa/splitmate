import React from 'react';
import Button from './Button';
import AppIcon from './AppIcon';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  const renderIcon = () => {
    if (!icon) {
      return <AppIcon name="folder_open" size={32} />;
    }
    if (typeof icon === 'string') {
      return <AppIcon name={icon} size={32} />;
    }
    return icon;
  };

  return (
    <div
      className={`p-space-xl rounded-xl bg-surface-container-lowest border border-dashed border-outline-variant flex flex-col items-center justify-center text-center max-w-md mx-auto my-6 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary-container mb-4 shadow-inner">
        {renderIcon()}
      </div>
      <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
        {title}
      </h3>
      <p className="font-body-md text-body-md text-on-surface-variant mt-1.5 mb-6 max-w-xs leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
