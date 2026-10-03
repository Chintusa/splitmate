import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import NotificationBell from './NotificationBell';
import '../pages/app.css';

export default function AppLayout() {
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

  return (
    <div className="app-container">
      <header className="app-navbar">
        <NavLink to="/" className="navbar-brand">
          <div className="navbar-logo-icon">S</div>
          <span className="navbar-logo-text">SplitMate</span>
        </NavLink>

        <nav className="navbar-nav">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Dashboard
          </NavLink>
          <NavLink to="/groups" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Groups
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Settings & Alerts
          </NavLink>
        </nav>

        <div className="navbar-actions">
          <NotificationBell />

          {user && (
            <div className="user-profile-pill">
              <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
              <span>{user.name}</span>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="auth-btn secondary"
            style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px' }}
          >
            Log out
          </button>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
