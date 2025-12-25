import { Link, useLocation } from 'react-router-dom';
import { Flame, Shield, Users, Trophy, Mail, Home, BookOpen } from 'lucide-react';

interface PlayerNavProps {
  profile: { display_name: string; role: string } | null;
  isAdmin: boolean;
  onSwitchToAdmin: () => void;
  onSignOut: () => void;
}

export function PlayerNav({ profile, isAdmin, onSwitchToAdmin, onSignOut }: PlayerNavProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/leagues', label: 'Leagues', icon: Users, excludeCreatePath: true },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { path: '/castaways', label: 'Castaways', icon: Flame },
    { path: '/how-to-play', label: 'How to Play', icon: BookOpen },
    { path: '/contact', label: 'Contact', icon: Mail },
  ];

  return (
    <nav
      className="bg-gradient-to-r from-cream-50 to-white border-b border-cream-200 shadow-sm sticky top-0 z-50"
      aria-label="Main navigation"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:ring-offset-2 rounded-lg"
            aria-label="RGFL - Go to Dashboard"
          >
            <img src="/logo.png" alt="" className="h-10 w-auto" aria-hidden="true" />
            <span className="sr-only">RGFL Survivor Fantasy League</span>
          </Link>

          <div className="hidden md:flex items-center gap-1" role="menubar" aria-label="Main menu">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const active = item.excludeCreatePath
                ? isActive(item.path) && !location.pathname.includes('/create')
                : isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:ring-offset-2 ${
                    active
                      ? 'bg-burgundy-500 text-white shadow-md'
                      : 'text-neutral-600 hover:bg-cream-100'
                  }`}
                  role="menuitem"
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {/* Admin View Toggle (only for admins) */}
            {isAdmin && (
              <button
                onClick={onSwitchToAdmin}
                className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label="Switch to admin view"
              >
                <Shield className="h-3 w-3" aria-hidden="true" />
                Admin
              </button>
            )}

            {/* User Menu */}
            <div className="relative group">
              <button
                className="flex items-center gap-2 p-2 text-neutral-600 hover:text-neutral-800 hover:bg-cream-100 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:ring-offset-2"
                aria-label={`User menu for ${profile?.display_name || 'User'}`}
                aria-haspopup="true"
              >
                <div className="w-8 h-8 bg-burgundy-100 rounded-full flex items-center justify-center" aria-hidden="true">
                  <span className="text-burgundy-600 font-semibold text-sm">
                    {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </button>
              <div
                className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-float border border-cream-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all"
                role="menu"
                aria-label="User menu"
              >
                <div className="p-4 border-b border-cream-100">
                  <p className="font-semibold text-neutral-800">{profile?.display_name || 'Survivor'}</p>
                  <p className="text-sm text-neutral-400">Fantasy Player</p>
                </div>
                <div className="p-2">
                  <Link
                    to="/profile"
                    className="block px-3 py-2 text-sm text-neutral-600 hover:bg-cream-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-500"
                    role="menuitem"
                  >
                    Profile Settings
                  </Link>
                  <Link
                    to="/profile/notifications"
                    className="block px-3 py-2 text-sm text-neutral-600 hover:bg-cream-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-500"
                    role="menuitem"
                  >
                    Notifications
                  </Link>
                  <Link
                    to="/profile/payments"
                    className="block px-3 py-2 text-sm text-neutral-600 hover:bg-cream-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-500"
                    role="menuitem"
                  >
                    Payment History
                  </Link>
                  <hr className="my-2 border-cream-100" aria-hidden="true" />
                  <button
                    onClick={onSignOut}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    role="menuitem"
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
