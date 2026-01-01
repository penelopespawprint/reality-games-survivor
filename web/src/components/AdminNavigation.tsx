import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState, useEffect, useRef } from 'react';
import {
  Shield,
  UserCircle,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  Trophy,
  Zap,
  Users,
  Palmtree,
  MessageSquare,
  Bell,
  Mail,
  MessageCircle,
  Settings,
} from 'lucide-react';

interface UserProfile {
  id: string;
  display_name: string;
  role: 'player' | 'commissioner' | 'admin';
  avatar_url?: string;
}

export function AdminNavigation() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const manageRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setManageOpen(false);
  }, [location.pathname]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
      if (manageRef.current && !manageRef.current.contains(event.target as Node)) {
        setManageOpen(false);
      }
    };
    if (mobileMenuOpen || manageOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen, manageOpen]);

  const handleSignOut = async () => {
    try {
      localStorage.removeItem('adminViewMode');
      setMobileMenuOpen(false);
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
      window.location.href = '/';
    }
  };

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, role, avatar_url')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!user?.id,
  });

  const displayName =
    profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || '';

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const isManageActive = () => {
    return (
      isActive('/admin/leagues') ||
      isActive('/admin/castaways') ||
      isActive('/admin/users') ||
      isActive('/admin/seasons')
    );
  };

  // Main nav items
  const mainNavItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { path: '/admin/scoring', label: 'Scoring', icon: Zap },
  ];

  // Manage dropdown items
  const manageItems = [
    { path: '/admin/leagues', label: 'Leagues', icon: Trophy },
    { path: '/admin/castaways', label: 'Castaways', icon: Palmtree },
    { path: '/admin/users', label: 'Players', icon: Users },
    { path: '/admin/seasons', label: 'Seasons', icon: Settings },
  ];

  // Communication items
  const commItems = [
    { path: '/admin/announcements', label: 'Announcements', icon: MessageSquare },
    { path: '/admin/push', label: 'Push Notifications', icon: Bell },
    { path: '/admin/email-queue', label: 'Email Queue', icon: Mail },
    { path: '/admin/sms', label: 'SMS', icon: MessageCircle },
  ];

  return (
    <>
      {/* Admin Mode Banner */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white py-2 px-4 sticky top-0 z-[60]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
              <Shield className="h-4 w-4" />
              <span className="font-bold text-sm tracking-wide">ADMIN</span>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 bg-white text-orange-600 px-4 py-1.5 rounded-full font-semibold text-sm hover:bg-orange-50 transition-colors"
          >
            <UserCircle className="h-4 w-4" />
            Exit Admin
          </Link>
        </div>
      </div>

      {/* Admin Navigation */}
      <nav className="bg-neutral-900 border-b border-neutral-700 shadow-lg sticky top-[40px] z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            {/* Logo */}
            <Link to="/admin" className="flex items-center gap-2">
              <img src="/logo.png" alt="Admin" className="h-7 w-auto brightness-0 invert" />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {/* Dashboard & Scoring */}
              {mainNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    item.exact
                      ? location.pathname === item.path
                        ? 'bg-orange-500 text-white'
                        : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                      : isActive(item.path)
                        ? 'bg-orange-500 text-white'
                        : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}

              {/* Manage Dropdown */}
              <div className="relative" ref={manageRef}>
                <button
                  onClick={() => setManageOpen(!manageOpen)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isManageActive()
                      ? 'bg-orange-500 text-white'
                      : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  Manage
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${manageOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {manageOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-neutral-800 rounded-lg shadow-xl border border-neutral-700 min-w-[160px] z-50 py-1">
                    {manageItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setManageOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 text-sm ${
                          isActive(item.path)
                            ? 'text-orange-400 bg-neutral-700'
                            : 'text-neutral-300 hover:text-white hover:bg-neutral-700'
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="w-px h-6 bg-neutral-700 mx-2" />

              {/* Communication Items */}
              {commItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive(item.path)
                      ? 'bg-orange-500 text-white'
                      : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-neutral-300 hover:text-white"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              {/* User info */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-neutral-300 text-sm">{displayName || 'Admin'}</span>
                <button
                  onClick={handleSignOut}
                  className="text-neutral-500 hover:text-neutral-300 text-xs"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div ref={mobileMenuRef} className="md:hidden border-t border-neutral-700 py-2">
              {mainNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium ${
                    item.exact
                      ? location.pathname === item.path
                        ? 'bg-orange-500 text-white'
                        : 'text-neutral-300'
                      : isActive(item.path)
                        ? 'bg-orange-500 text-white'
                        : 'text-neutral-300'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}

              <div className="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Manage
              </div>
              {manageItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-6 py-2 text-sm ${
                    isActive(item.path) ? 'text-orange-400' : 'text-neutral-300'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}

              <div className="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider mt-2">
                Communication
              </div>
              {commItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-6 py-2 text-sm ${
                    isActive(item.path) ? 'text-orange-400' : 'text-neutral-300'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}

              <hr className="my-2 border-neutral-700" />
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-neutral-800"
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
