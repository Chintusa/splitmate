import React from 'react';
import { useAuth } from '../../auth/AuthContext';
import Avatar from '../ui/Avatar';
import NotificationBell from '../NotificationBell';
import Button from '../ui/Button';
import AppIcon from '../ui/AppIcon';

interface HeaderProps {
  onMenuToggle?: () => void;
  onAddExpenseClick?: () => void;
  onSearchChange?: (val: string) => void;
  searchQuery?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onMenuToggle,
  onAddExpenseClick,
  onSearchChange,
  searchQuery = '',
}) => {
  const { user } = useAuth();

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-surface/85 backdrop-blur-xl border-b border-surface-container-high/60 shadow-[0_1px_8px_rgba(0,0,0,0.03)] z-40">
      <div className="h-16 w-full px-4 sm:px-6 lg:px-space-xl flex items-center justify-between gap-3">
        {/* Left: Mobile hamburger + Workspace title + Live status */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <AppIcon name="menu" size={24} />
          </button>

          <div className="flex items-center gap-space-md">
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold tracking-tight">
              SplitMate Workspace
            </span>
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-lowest border border-surface-container-high/60 shadow-xs cursor-help"
              title="Real-time WebSocket active"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse" />
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                Live
              </span>
            </div>
          </div>
        </div>

        {/* Right: Search + Add Expense + Notifications + User Avatar */}
        <div className="flex items-center gap-2.5 sm:gap-space-md">
          {/* Search Bar */}
          <div className="relative hidden md:flex items-center">
            <AppIcon name="search" size={18} className="absolute left-3 text-on-surface-variant pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search transactions, groups..."
              className="h-10 pl-9 pr-12 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md border border-surface-container-high/60 placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-xs w-48 lg:w-64 transition-all"
            />
            <kbd className="absolute right-2.5 font-label-sm text-[11px] text-on-surface-variant bg-surface-container-low px-1.5 py-0.5 rounded border border-surface-container-high pointer-events-none">
              ⌘K
            </kbd>
          </div>

          {/* Add Expense Action Button */}
          <Button
            variant="primary"
            size="md"
            icon={<AppIcon name="add" size={20} />}
            onClick={onAddExpenseClick}
            className="shadow-sm"
          >
            <span className="hidden sm:inline">Add Expense</span>
          </Button>

          {/* In-app Notification Bell */}
          <NotificationBell />

          {/* Profile Avatar */}
          <Avatar
            name={user?.name || 'User'}
            size="sm"
            className="cursor-pointer shadow-xs"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
