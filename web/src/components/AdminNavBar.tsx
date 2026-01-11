/**
 * Admin Navigation Bar
 *
 * Secondary navigation bar shown below the main Navigation for admin users.
 * Provides quick access to admin functions organized by category.
 */

import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ChevronDown, Menu, X } from 'lucide-react';

export function AdminNavBar() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [communicateOpen, setCommunicateOpen] = useState(false);
  const [systemOpen, setSystemOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const manageRef = useRef<HTMLDivElement>(null);
  const communicateRef = useRef<HTMLDivElement>(null);
  const systemRef = useRef<HTMLDivElement>(null);

  // Close menus on route change
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

  // Fetch badge counts
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
    refetchInterval: 30000,
  });

  const isActive = (path: string) => {
    if (path === '/admin/command-center' || path === '/admin') {
      return location.pathname === path || location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const isManageActive = () =>
    isActive('/admin/castaways') || isActive('/admin/users') || isActive('/admin/seasons') ||
    isActive('/admin/faq') || isActive('/admin/content');

  const isCommunicateActive = () =>
    isActive('/admin/announcements') ||
    isActive('/admin/social') ||
    isActive('/admin/push') ||
    isActive('/admin/email-queue') ||
    isActive('/admin/sms');

  const isSystemActive = () =>
    isActive('/admin/jobs') || isActive('/admin/health') || isActive('/admin/stats');

  const mainNavItems = [
    { path: '/admin/command-center', label: 'Command Center' },
    { path: '/admin/leagues', label: 'Leagues' },
    { path: '/admin/scoring', label: 'Scoring' },
    { path: '/admin/scoring-rules', label: 'Rules' },
  ];

  const manageItems = [
    { path: '/admin/castaways', label: 'Castaways' },
    { path: '/admin/users', label: 'Users' },
    { path: '/admin/seasons', label: 'Seasons' },
    { path: '/admin/faq', label: 'FAQ Manager' },
    { path: '/admin/content', label: 'CMS (Legacy)' },
  ];

  const communicateItems = [
    { path: '/admin/announcements', label: 'Announcements' },
    { path: '/admin/social', label: 'Social Media' },
    { path: '/admin/email-queue', label: 'Email Queue', badgeKey: 'failedEmails' as const },
  ];

  const systemItems = [
    { path: '/admin/jobs', label: 'Job Monitor', badgeKey: 'failedJobs' as const },
    { path: '/admin/stats', label: 'Analytics' },
    { path: '/admin/fun-stats', label: 'Fun Stats' },
  ];

  const renderBadge = (count: number | undefined) => {
    if (!count || count === 0) return null;
    return (
      <span className="ml-1.5 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
        {count > 99 ? '99+' : count}
      </span>
    );
  };

  return (
    <div className="bg-neutral-900 border-b border-neutral-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-10">
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
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

          {/* Exit Admin link - desktop */}
          <Link
            to="/dashboard"
            className="hidden md:block text-sm text-neutral-400 hover:text-white transition-colors"
          >
            ← Exit Admin
          </Link>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-neutral-300 hover:text-white w-full flex items-center justify-between"
          >
            <span className="text-sm font-medium text-orange-400">Admin Menu</span>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div ref={mobileMenuRef} className="md:hidden border-t border-neutral-700 py-2">
            {mainNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block px-4 py-2 text-sm font-medium ${
                  isActive(item.path) ? 'bg-orange-500 text-white' : 'text-neutral-300'
                }`}
              >
                {item.label}
              </Link>
            ))}

            <div className="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider mt-2">
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
            <Link
              to="/dashboard"
              className="block px-4 py-2 text-sm text-neutral-400 hover:text-white"
            >
              ← Exit Admin
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
