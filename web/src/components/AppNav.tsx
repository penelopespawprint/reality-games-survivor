import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

interface AppNavProps {
  userName?: string;
  userInitial?: string;
}

export function AppNav({ userName, userInitial }: AppNavProps) {
  const location = useLocation();
  const { signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-cream-300 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src="/logo.png" alt="RGFL" className="h-8 w-auto" />
          </Link>

          {/* Center Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/dashboard"
              className={isActive('/dashboard') ? 'nav-link-active' : 'nav-link'}
            >
              Home
            </Link>
            <Link
              to="/draft"
              className={isActive('/draft') ? 'nav-link-active' : 'nav-link'}
            >
              Snake Draft
            </Link>
            <Link
              to="/picks"
              className={isActive('/picks') ? 'nav-link-active' : 'nav-link'}
            >
              Weekly Picks
            </Link>
            <Link
              to="/league"
              className={isActive('/league') ? 'nav-link-active' : 'nav-link'}
            >
              League
            </Link>
          </div>

          {/* Right Side - Notifications & Avatar */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button className="notification-bell">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </button>

            {/* User Menu Dropdown */}
            <div className="relative group">
              <button className="p-2 text-neutral-600 hover:text-neutral-800 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-elevated border border-cream-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="p-3 border-b border-cream-200">
                  <p className="font-medium text-neutral-800 text-sm">{userName || 'Survivor'}</p>
                </div>
                <div className="p-2">
                  <Link
                    to="/profile"
                    className="block px-3 py-2 text-sm text-neutral-600 hover:bg-cream-50 rounded-md"
                  >
                    Profile Settings
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="w-full text-left px-3 py-2 text-sm text-neutral-600 hover:bg-cream-50 rounded-md"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
