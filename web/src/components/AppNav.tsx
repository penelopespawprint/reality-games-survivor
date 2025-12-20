import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

interface AppNavProps {
  userName?: string;
  userInitial?: string;
}

export function AppNav({ userName }: AppNavProps) {
  const location = useLocation();
  const { signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-cream-200/50 sticky top-0 z-10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src="/logo.png" alt="RGFL" className="h-9 w-auto" />
          </Link>

          {/* Center Nav Links */}
          <div className="hidden md:flex items-center gap-8">
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

          {/* Right Side - Notifications & User */}
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <button className="p-2.5 text-neutral-500 hover:text-neutral-700 hover:bg-cream-100 rounded-xl transition-all">
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
              <button className="p-2.5 text-neutral-500 hover:text-neutral-700 hover:bg-cream-100 rounded-xl transition-all">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-float border border-cream-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform group-hover:translate-y-0 translate-y-1">
                <div className="p-4 border-b border-cream-100">
                  <p className="font-semibold text-neutral-800">{userName || 'Survivor'}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">Player</p>
                </div>
                <div className="p-2">
                  <Link
                    to="/profile"
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-neutral-600 hover:bg-cream-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Profile Settings
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-neutral-600 hover:bg-cream-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
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
