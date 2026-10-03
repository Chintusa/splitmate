import React from 'react';
import defaultAvatar from '../../assets/stitch/profile/profile-avatar.png';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'active' | 'syncing' | 'offline' | 'owe' | 'none';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = 'User',
  size = 'md',
  status = 'none',
  className = '',
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const statusIndicatorClasses = {
    active: 'bg-tertiary-container ring-2 ring-surface-container-lowest',
    syncing: 'bg-amber-500 ring-2 ring-surface-container-lowest animate-pulse',
    offline: 'bg-outline ring-2 ring-surface-container-lowest',
    owe: 'bg-error ring-2 ring-surface-container-lowest',
    none: '',
  };

  const imageSrc = src || defaultAvatar;

  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover shadow-sm ring-1 ring-surface-container-high/60`}
          onError={(e) => {
            // fallback to initials if image fails
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-primary-fixed text-primary font-semibold flex items-center justify-center shadow-sm`}
        >
          {initials}
        </div>
      )}
      {status !== 'none' && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${statusIndicatorClasses[status]}`}
          title={status}
        />
      )}
    </div>
  );
};

export default Avatar;
