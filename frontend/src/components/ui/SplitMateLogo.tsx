import React from 'react';

export interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'default' | 'light';
}

export const SplitMateLogo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  variant = 'default',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const isLight = variant === 'light';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`${iconSizes[size]} rounded-xl flex items-center justify-center relative shadow-sm shrink-0 ${
          isLight
            ? 'bg-white/15 border border-white/25 backdrop-blur-md'
            : 'bg-primary-container'
        }`}
      >
        <svg
          viewBox="0 0 36 36"
          className="w-full h-full p-1.5"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 18H26M18 10V26"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="2.5" fill="#CCFBF1" />
          <circle cx="24" cy="24" r="2.5" fill="#CCFBF1" />
        </svg>
      </div>
      {showText && (
        <span
          className={`font-bold tracking-tight ${textSizes[size]} ${
            isLight ? 'text-white' : 'text-on-surface'
          }`}
          style={{ letterSpacing: '-0.02em' }}
        >
          Split<span className={isLight ? 'text-teal-200' : 'text-primary-container'}>Mate</span>
        </span>
      )}
    </div>
  );
};

export default SplitMateLogo;
