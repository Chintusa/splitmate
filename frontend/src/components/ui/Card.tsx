import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  accent?: 'none' | 'primary' | 'positive' | 'negative' | 'secondary';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  accent = 'none',
  padding = 'lg',
  className = '',
  ...props
}) => {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const accentBars = {
    none: null,
    primary: <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-primary-container" />,
    positive: <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-tertiary-container" />,
    negative: <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-error" />,
    secondary: <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-secondary" />,
  };

  return (
    <div
      className={`relative bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-high/60 overflow-hidden ${paddingClasses[padding]} ${className}`}
      {...props}
    >
      {accentBars[accent]}
      {children}
    </div>
  );
};

export default Card;
