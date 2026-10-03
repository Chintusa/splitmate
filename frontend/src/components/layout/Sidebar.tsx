import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import SplitMateLogo from '../ui/SplitMateLogo';
import Avatar from '../ui/Avatar';
import AppIcon from '../ui/AppIcon';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: 'grid_view' },
    { label: 'My Groups', path: '/groups', icon: 'group' },
    { label: 'Activity', path: '/activity', icon: 'bolt' },
    { label: 'Settlements', path: '/settlements', icon: 'sync_alt' },
    { label: 'Personal History', path: '/personal-history', icon: 'receipt_long' },
    { label: 'Settings', path: '/settings', icon: 'settings' },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-surface-container-lowest border-r border-surface-container-high/60 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col">
        {/* Top Branding */}
        <div className="h-16 px-space-lg flex items-center justify-between border-b border-surface-container-high/40">
          <NavLink to="/dashboard" onClick={onClose} className="flex items-center gap-2">
            <SplitMateLogo size="md" />
          </NavLink>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high"
            >
              <AppIcon name="close" size={20} />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-space-xs px-space-md mt-space-md">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-space-sm px-space-md py-space-sm rounded-lg transition-colors font-label-md text-label-md ${
                  isActive
                    ? 'bg-primary-container text-on-primary font-medium shadow-xs'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`
              }
            >
              <AppIcon name={item.icon} size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User Profile Footer Card */}
      <div className="p-space-md m-space-md rounded-xl bg-surface-container-low border border-surface-container-high/40 flex items-center justify-between gap-space-xs">
        <div className="flex items-center gap-space-sm overflow-hidden min-w-0">
          <Avatar
            name={user?.name || 'User'}
            size="sm"
            status="active"
          />
          <div className="flex flex-col truncate">
            <span className="font-label-sm text-label-sm text-on-surface font-semibold truncate">
              {user?.name || 'User'}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
              {user?.email || ''}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container-highest transition-colors shrink-0"
          title="Log out"
          type="button"
        >
          <AppIcon name="logout" size={20} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 h-screen w-64 z-50">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative w-72 max-w-[80vw] h-full z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
