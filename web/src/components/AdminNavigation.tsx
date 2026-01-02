import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState, useEffect, useRef } from 'react';
import { Shield, UserCircle, Menu, X, ChevronDown } from 'lucide-react';

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
  const [communicateOpen, setCommunicateOpen] = useState(false);
  const [systemOpen, setSystemOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const manageRef = useRef<HTMLDivElement>(null);
  const communicateRef = useRef<HTMLDivElement>(null);
  const systemRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setManageOpen(false);
    setCommunicateOpen(false);
    setSystemOpen(false);
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
      if (communicateRef.current && !communicateRef.current.contains(event.target as Node)) {
        setCommunicateOpen(false);
      }
      if (systemRef.current && !systemRef.current.contains(event.target as Node)) {
        setSystemOpen(false);
      }
    };
    if (mobileMenuOpen || manageOpen || communicateOpen || systemOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen, manageOpen, communicateOpen, systemOpen]);

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

  // Fetch badge counts for navigation
  const { data: badgeCounts } = useQuery({
    queryKey: ['admin', 'nav-badges'],
    queryFn: async () => {
      const [failedEmailsResult, failedJobsResult] = await Promise.all([
        supabase.from('failed_emails').select('*', { count: 'exact', head: true }),
        supabase
          .from('job_runs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'failed')
          .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);
      return {
        failedEmails: failedEmailsResult.count || 0,
        failedJobs: failedJobsResult.count || 0,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const displayName =
    profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || '';

  const isActive = (path: string) => {
    // Exact match for command center and dashboard
    if (path === '/admin/command-center' || path === '/admin/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const isManageActive = () => {
    return isActive('/admin/castaways') || isActive('/admin/users') || isActive('/admin/seasons');
  };

  const isCommunicateActive = () => {
    return (
      isActive('/admin/announcements') ||
      isActive('/admin/push') ||
      isActive('/admin/email-queue') ||
      isActive('/admin/sms')
    );
  };

  const isSystemActive = () => {
    return isActive('/admin/jobs') || isActive('/admin/health') || isActive('/admin/stats');
  };

  // Main nav items (top level)
  const mainNavItems = [
    { path: '/admin/command-center', label: 'Command Center' },
    { path: '/admin/dashboard', label: 'Dashboard' },
    { path: '/admin/leagues', label: 'Leagues' },
    { path: '/admin/scoring', label: 'Scoring' },
  ];

  // Manage dropdown items
  const manageItems = [
    { path: '/admin/castaways', label: 'Castaways' },
    { path: '/admin/users', label: 'Users' },
    { path: '/admin/seasons', label: 'Seasons' },
  ];

  // Communicate dropdown items
  const communicateItems = [
    { path: '/admin/announcements', label: 'Announcements' },
    { path: '/admin/push', label: 'Push Notifications' },
    { path: '/admin/email-queue', label: 'Email Queue', badgeKey: 'failedEmails' as const },
    { path: '/admin/sms', label: 'SMS' },
    { path: '/admin/content', label: 'Content CMS' },
  ];

  // System dropdown items
  const systemItems = [
    { path: '/admin/jobs', label: 'Job Monitor', badgeKey: 'failedJobs' as const },
    { path: '/admin/health', label: 'System Health' },
    { path: '/admin/stats', label: 'Analytics' },
  ];

  // Helper to render badge
  const renderBadge = (count: number | undefined) => {
    if (!count || count === 0) return null;
    return (
      <span className="ml-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
        {count > 99 ? '99+' : count}
      </span>
    );
  };

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
            {/* Logo - links to Command Center */}
            <Link to="/admin/command-center" className="flex items-center gap-2">
              <img src="/logo.png" alt="Admin" className="h-7 w-auto brightness-0 invert" />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {/* Command Center, Dashboard, Leagues, Scoring */}
              {mainNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-orange-500 text-white'
                      : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  {item.label}
                </Link>
              ))}

              {/* Manage Dropdown */}
              <div className="relative" ref={manageRef}>
                <button
                  onClick={() => {
                    setManageOpen(!manageOpen);
                    setCommunicateOpen(false);
                    setSystemOpen(false);
                  }}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
                    isManageActive()
                      ? 'bg-orange-500 text-white'
                      : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                  }`}
                >
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
                        className={`block px-3 py-2 text-sm ${
                          isActive(item.path)
                            ? 'text-orange-400 bg-neutral-700'
                            : 'text-neutral-300 hover:text-white hover:bg-neutral-700'
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Communicate Dropdown */}
              <div className="relative" ref={communicateRef}>
                <button
                  onClick={() => {
                    setCommunicateOpen(!communicateOpen);
                    setManageOpen(false);
                    setSystemOpen(false);
                  }}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
                    isCommunicateActive()
                      ? 'bg-orange-500 text-white'
                      : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  Communicate
                  {badgeCounts?.failedEmails ? renderBadge(badgeCounts.failedEmails) : null}
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${communicateOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {communicateOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-neutral-800 rounded-lg shadow-xl border border-neutral-700 min-w-[180px] z-50 py-1">
                    {communicateItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setCommunicateOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 text-sm ${
                          isActive(item.path)
                            ? 'text-orange-400 bg-neutral-700'
                            : 'text-neutral-300 hover:text-white hover:bg-neutral-700'
                        }`}
                      >
                        <span>{item.label}</span>
                        {item.badgeKey && renderBadge(badgeCounts?.[item.badgeKey])}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* System Dropdown */}
              <div className="relative" ref={systemRef}>
                <button
                  onClick={() => {
                    setSystemOpen(!systemOpen);
                    setManageOpen(false);
                    setCommunicateOpen(false);
                  }}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
                    isSystemActive()
                      ? 'bg-orange-500 text-white'
                      : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  System
                  {badgeCounts?.failedJobs ? renderBadge(badgeCounts.failedJobs) : null}
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${systemOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {systemOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-neutral-800 rounded-lg shadow-xl border border-neutral-700 min-w-[160px] z-50 py-1">
                    {systemItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSystemOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 text-sm ${
                          isActive(item.path)
                            ? 'text-orange-400 bg-neutral-700'
                            : 'text-neutral-300 hover:text-white hover:bg-neutral-700'
                        }`}
                      >
                        <span>{item.label}</span>
                        {item.badgeKey && renderBadge(badgeCounts?.[item.badgeKey])}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
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
                  className={`block px-4 py-2.5 text-sm font-medium ${
                    isActive(item.path) ? 'bg-orange-500 text-white' : 'text-neutral-300'
                  }`}
                >
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
                  className={`block px-6 py-2 text-sm ${
                    isActive(item.path) ? 'text-orange-400' : 'text-neutral-300'
                  }`}
                >
                  {item.label}
                </Link>
              ))}

              <div className="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider mt-2">
                Communicate
              </div>
              {communicateItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`block px-6 py-2 text-sm ${
                    isActive(item.path) ? 'text-orange-400' : 'text-neutral-300'
                  }`}
                >
                  {item.label}
                </Link>
              ))}

              <div className="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider mt-2">
                System
              </div>
              {systemItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`block px-6 py-2 text-sm ${
                    isActive(item.path) ? 'text-orange-400' : 'text-neutral-300'
                  }`}
                >
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
