import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState, useEffect, useRef } from 'react';
import { Shield, UserCircle, Menu, X } from 'lucide-react';

interface UserProfile {
  id: string;
  display_name: string;
  role: 'player' | 'commissioner' | 'admin';
}

export function Navigation() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // View mode toggle for admins - persisted in localStorage
  const [viewMode, setViewMode] = useState<'admin' | 'player'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('adminViewMode') as 'admin' | 'player') || 'admin';
    }
    return 'admin';
  });

  // Update localStorage when view mode changes
  useEffect(() => {
    localStorage.setItem('adminViewMode', viewMode);
  }, [viewMode]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  // Handle sign out with localStorage cleanup
  const handleSignOut = async () => {
    try {
      localStorage.removeItem('adminViewMode');
      setMobileMenuOpen(false);
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
      // Force clear local state even if API fails
      window.location.href = '/';
    }
  };

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, role')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!user?.id,
  });

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isAdmin = profile?.role === 'admin';
  const showAdminNav = isAdmin && viewMode === 'admin';

  // Admin navigation - dramatically different styling
  if (user && showAdminNav) {
    return (
      <>
        {/* Very prominent Admin Mode Banner */}
        <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white py-3 px-4 sticky top-0 z-[60]">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                <Shield className="h-4 w-4" />
                <span className="font-bold text-sm tracking-wide">ADMIN CONTROL PANEL</span>
              </div>
              <span className="text-white/80 text-sm hidden sm:inline">
                Full system access enabled
              </span>
            </div>
            <button
              onClick={() => setViewMode('player')}
              className="flex items-center gap-2 bg-white text-orange-600 px-4 py-1.5 rounded-full font-semibold text-sm hover:bg-orange-50 transition-colors"
            >
              <UserCircle className="h-4 w-4" />
              Switch to Player View
            </button>
          </div>
        </div>
        <nav className="bg-cream-50 border-b-4 border-orange-400 shadow-lg sticky top-[52px] z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <Link to="/admin" className="flex items-center gap-3">
                <img src="/logo.png" alt="RGFL" className="h-8 w-auto" />
                <div className="flex items-center gap-2">
                  <span className="text-neutral-800 font-bold">RGFL</span>
                  <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                    ADMIN
                  </span>
                </div>
              </Link>

              <div className="hidden md:flex items-center gap-1">
                {[
                  { path: '/admin/seasons', label: 'Seasons' },
                  { path: '/admin/leagues', label: 'Leagues' },
                  { path: '/admin/users', label: 'Users' },
                  { path: '/admin/payments', label: 'Payments' },
                  { path: '/admin/scoring-rules', label: 'Scoring' },
                  { path: '/admin/jobs', label: 'Jobs' },
                ].map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? 'bg-orange-500 text-white'
                        : 'text-neutral-600 hover:text-orange-600 hover:bg-orange-50'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="flex items-center gap-3">
                {/* Mobile menu button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 text-neutral-600 hover:text-orange-600"
                  aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={mobileMenuOpen}
                >
                  {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
                <div className="text-right hidden sm:block">
                  <p className="text-neutral-800 text-sm font-medium">{profile?.display_name}</p>
                  <p className="text-orange-600 text-xs font-semibold">Administrator</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-neutral-500 hover:text-neutral-800 text-sm hidden sm:block"
                >
                  Sign out
                </button>
              </div>
            </div>

            {/* Mobile Admin Menu */}
            {mobileMenuOpen && (
              <div ref={mobileMenuRef} className="md:hidden border-t border-orange-200 py-2">
                {[
                  { path: '/admin/seasons', label: 'Seasons' },
                  { path: '/admin/leagues', label: 'Leagues' },
                  { path: '/admin/users', label: 'Users' },
                  { path: '/admin/payments', label: 'Payments' },
                  { path: '/admin/scoring-rules', label: 'Scoring' },
                  { path: '/admin/jobs', label: 'Jobs' },
                ].map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`block px-4 py-3 text-sm font-medium ${
                      isActive(item.path)
                        ? 'bg-orange-500 text-white'
                        : 'text-neutral-600 hover:bg-orange-50'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                <hr className="my-2 border-orange-200" />
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </nav>
      </>
    );
  }

  // Authenticated player navigation - clean, Survivor-themed
  if (user) {
    return (
      <nav className="bg-white border-b-2 border-burgundy-500 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src="/logo.png" alt="RGFL" className="h-10 w-auto" />
            </Link>

            <div className="hidden md:flex items-center">
              <Link
                to="/dashboard"
                className={`px-4 py-2 text-sm font-semibold tracking-wide uppercase transition-all ${
                  isActive('/dashboard')
                    ? 'text-burgundy-600'
                    : 'text-neutral-600 hover:text-burgundy-600 hover:bg-burgundy-50'
                }`}
              >
                Dashboard
              </Link>
              <span className="text-burgundy-300 mx-1">|</span>
              <Link
                to="/leagues"
                className={`px-4 py-2 text-sm font-semibold tracking-wide uppercase transition-all ${
                  isActive('/leagues') && !location.pathname.includes('/create')
                    ? 'text-burgundy-600'
                    : 'text-neutral-600 hover:text-burgundy-600 hover:bg-burgundy-50'
                }`}
              >
                Leagues
              </Link>
              <span className="text-burgundy-300 mx-1">|</span>
              <Link
                to="/leaderboard"
                className={`px-4 py-2 text-sm font-semibold tracking-wide uppercase transition-all ${
                  isActive('/leaderboard')
                    ? 'text-burgundy-600'
                    : 'text-neutral-600 hover:text-burgundy-600 hover:bg-burgundy-50'
                }`}
              >
                Leaderboard
              </Link>
              <span className="text-burgundy-300 mx-1">|</span>
              <Link
                to="/castaways"
                className={`px-4 py-2 text-sm font-semibold tracking-wide uppercase transition-all ${
                  isActive('/castaways')
                    ? 'text-burgundy-600'
                    : 'text-neutral-600 hover:text-burgundy-600 hover:bg-burgundy-50'
                }`}
              >
                Castaways
              </Link>
              <span className="text-burgundy-300 mx-1">|</span>
              <Link
                to="/how-to-play"
                className={`px-4 py-2 text-sm font-semibold tracking-wide uppercase transition-all ${
                  isActive('/how-to-play') || isActive('/scoring')
                    ? 'text-burgundy-600'
                    : 'text-neutral-600 hover:text-burgundy-600 hover:bg-burgundy-50'
                }`}
              >
                How to Play
              </Link>
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-neutral-600 hover:text-burgundy-600"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>

              {/* Admin View Toggle (only for admins) */}
              {isAdmin && (
                <button
                  onClick={() => setViewMode('admin')}
                  className="hidden sm:flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Shield className="h-3 w-3" />
                  Admin
                </button>
              )}

              {/* User Menu - Desktop */}
              <div className="relative group hidden md:block">
                <button
                  className="flex items-center gap-2 p-2 text-neutral-600 hover:text-neutral-800 hover:bg-burgundy-50 rounded-xl transition-all"
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 bg-burgundy-100 rounded-full flex items-center justify-center">
                    <span className="text-burgundy-600 font-semibold text-sm">
                      {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                </button>
                <div
                  className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-float border border-cream-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all"
                  role="menu"
                >
                  <div className="p-4 border-b border-cream-100">
                    <p className="font-semibold text-neutral-800">
                      {profile?.display_name || 'Survivor'}
                    </p>
                    <p className="text-sm text-neutral-400">Fantasy Player</p>
                  </div>
                  <div className="p-2">
                    <Link
                      to="/profile"
                      className="block px-3 py-2 text-sm text-neutral-600 hover:bg-burgundy-50 rounded-lg focus:bg-burgundy-50 focus:outline-none"
                      role="menuitem"
                    >
                      Profile Settings
                    </Link>
                    <Link
                      to="/profile/notifications"
                      className="block px-3 py-2 text-sm text-neutral-600 hover:bg-burgundy-50 rounded-lg focus:bg-burgundy-50 focus:outline-none"
                      role="menuitem"
                    >
                      Notifications
                    </Link>
                    <Link
                      to="/profile/payments"
                      className="block px-3 py-2 text-sm text-neutral-600 hover:bg-burgundy-50 rounded-lg focus:bg-burgundy-50 focus:outline-none"
                      role="menuitem"
                    >
                      Payment History
                    </Link>
                    <hr className="my-2 border-cream-100" />
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg focus:bg-red-50 focus:outline-none"
                      role="menuitem"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Menu - Player */}
          {mobileMenuOpen && (
            <div
              ref={mobileMenuRef}
              className="md:hidden border-t border-burgundy-100 py-2 bg-white"
            >
              <div className="px-4 py-3 border-b border-cream-100">
                <p className="font-semibold text-neutral-800">
                  {profile?.display_name || 'Survivor'}
                </p>
                <p className="text-sm text-neutral-400">Fantasy Player</p>
              </div>
              <Link
                to="/dashboard"
                className={`block px-4 py-3 text-sm font-semibold ${
                  isActive('/dashboard') ? 'text-burgundy-600 bg-burgundy-50' : 'text-neutral-600'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/leagues"
                className={`block px-4 py-3 text-sm font-semibold ${
                  isActive('/leagues') ? 'text-burgundy-600 bg-burgundy-50' : 'text-neutral-600'
                }`}
              >
                Leagues
              </Link>
              <Link
                to="/leaderboard"
                className={`block px-4 py-3 text-sm font-semibold ${
                  isActive('/leaderboard') ? 'text-burgundy-600 bg-burgundy-50' : 'text-neutral-600'
                }`}
              >
                Leaderboard
              </Link>
              <Link
                to="/castaways"
                className={`block px-4 py-3 text-sm font-semibold ${
                  isActive('/castaways') ? 'text-burgundy-600 bg-burgundy-50' : 'text-neutral-600'
                }`}
              >
                Castaways
              </Link>
              <Link
                to="/how-to-play"
                className={`block px-4 py-3 text-sm font-semibold ${
                  isActive('/how-to-play') ? 'text-burgundy-600 bg-burgundy-50' : 'text-neutral-600'
                }`}
              >
                How to Play
              </Link>
              <hr className="my-2 border-cream-100" />
              <Link to="/profile" className="block px-4 py-3 text-sm text-neutral-600">
                Profile Settings
              </Link>
              <Link
                to="/profile/notifications"
                className="block px-4 py-3 text-sm text-neutral-600"
              >
                Notifications
              </Link>
              {isAdmin && (
                <button
                  onClick={() => {
                    setViewMode('admin');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-orange-600 font-semibold"
                >
                  Switch to Admin View
                </button>
              )}
              <hr className="my-2 border-cream-100" />
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-3 text-sm text-red-600"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </nav>
    );
  }

  // Public/unauthenticated navigation
  return (
    <nav className="bg-white border-b-2 border-burgundy-500 shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="RGFL" className="h-10 w-auto" />
          </Link>

          <div className="hidden md:flex items-center">
            <Link
              to="/"
              className={`px-4 py-2 text-sm font-semibold tracking-wide uppercase transition-all ${
                location.pathname === '/'
                  ? 'text-burgundy-600'
                  : 'text-neutral-600 hover:text-burgundy-600 hover:bg-burgundy-50'
              }`}
            >
              Home
            </Link>
            <span className="text-burgundy-300 mx-1">|</span>
            <Link
              to="/how-to-play"
              className={`px-4 py-2 text-sm font-semibold tracking-wide uppercase transition-all ${
                isActive('/how-to-play') || isActive('/scoring')
                  ? 'text-burgundy-600'
                  : 'text-neutral-600 hover:text-burgundy-600 hover:bg-burgundy-50'
              }`}
            >
              How to Play
            </Link>
            <span className="text-burgundy-300 mx-1">|</span>
            <Link
              to="/castaways"
              className={`px-4 py-2 text-sm font-semibold tracking-wide uppercase transition-all ${
                isActive('/castaways')
                  ? 'text-burgundy-600'
                  : 'text-neutral-600 hover:text-burgundy-600 hover:bg-burgundy-50'
              }`}
            >
              Castaways
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-neutral-600 hover:text-burgundy-600"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <Link
              to="/login"
              className="hidden sm:block text-neutral-600 hover:text-burgundy-600 font-semibold text-sm uppercase tracking-wide"
            >
              Login
            </Link>
            <Link to="/signup" className="btn btn-primary shadow-elevated">
              Sign Up Free
            </Link>
          </div>
        </div>

        {/* Mobile Menu - Public */}
        {mobileMenuOpen && (
          <div ref={mobileMenuRef} className="md:hidden border-t border-burgundy-100 py-2 bg-white">
            <Link
              to="/"
              className={`block px-4 py-3 text-sm font-semibold ${
                location.pathname === '/' ? 'text-burgundy-600 bg-burgundy-50' : 'text-neutral-600'
              }`}
            >
              Home
            </Link>
            <Link
              to="/how-to-play"
              className={`block px-4 py-3 text-sm font-semibold ${
                isActive('/how-to-play') ? 'text-burgundy-600 bg-burgundy-50' : 'text-neutral-600'
              }`}
            >
              How to Play
            </Link>
            <Link
              to="/castaways"
              className={`block px-4 py-3 text-sm font-semibold ${
                isActive('/castaways') ? 'text-burgundy-600 bg-burgundy-50' : 'text-neutral-600'
              }`}
            >
              Castaways
            </Link>
            <hr className="my-2 border-cream-100" />
            <Link to="/login" className="block px-4 py-3 text-sm font-semibold text-neutral-600">
              Login
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
