import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { AdminNavigation } from '@/components/AdminNavigation';
import { TimelineFeed } from '@/components/admin/TimelineFeed';
import { StatsGrid } from '@/components/admin/StatsGrid';
import { SystemHealthBanner } from '@/components/admin/SystemHealthBanner';
import { ActivityFeed } from '@/components/admin/ActivityFeed';
import { DraftStatsCard } from '@/components/admin/DraftStatsCard';
import { PaymentStatsCard } from '@/components/admin/PaymentStatsCard';
import { TriviaStatsCard } from '@/components/admin/TriviaStatsCard';
import { LeagueBreakdownCard } from '@/components/admin/LeagueBreakdownCard';
import {
  AlertTriangle,
  Clock,
  Users,
  Trophy,
  Settings,
  BarChart3,
  Calendar,
  Zap,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';

interface UserProfile {
  id: string;
  display_name: string;
  role: string;
}

interface Alert {
  type: 'error' | 'warning' | 'info';
  message: string;
  action?: { label: string; href: string };
}

export function AdminDashboard() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, role')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!user?.id,
  });

  // Fetch dashboard data
  const { data: timeline, isLoading: timelineLoading } = useQuery({
    queryKey: ['adminTimeline'],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(`${API_URL}/api/admin/dashboard/timeline`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch timeline');
      const data = await response.json();
      return data.timeline;
    },
    enabled: !!user?.id && profile?.role === 'admin',
    refetchInterval: 30000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(`${API_URL}/api/admin/dashboard/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: !!user?.id && profile?.role === 'admin',
    refetchInterval: 30000,
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ['adminActivity'],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(`${API_URL}/api/admin/dashboard/activity`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch activity');
      const data = await response.json();
      return data.activity;
    },
    enabled: !!user?.id && profile?.role === 'admin',
    refetchInterval: 30000,
  });

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['adminHealth'],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(`${API_URL}/api/admin/dashboard/system-health`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch system health');
      return response.json();
    },
    enabled: !!user?.id && profile?.role === 'admin',
    refetchInterval: 30000,
  });

  // Fetch failed emails count for alerts
  const { data: failedEmails } = useQuery({
    queryKey: ['failedEmailsCount'],
    queryFn: async () => {
      const { count } = await supabase
        .from('failed_emails')
        .select('*', { count: 'exact', head: true })
        .eq('retry_attempted', false);
      return count || 0;
    },
    enabled: !!user?.id && profile?.role === 'admin',
    refetchInterval: 60000,
  });

  // Fetch pending jobs for alerts
  const { data: pendingJobs } = useQuery({
    queryKey: ['pendingJobsCount'],
    queryFn: async () => {
      const { count } = await supabase
        .from('job_runs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      return count || 0;
    },
    enabled: !!user?.id && profile?.role === 'admin',
    refetchInterval: 60000,
  });

  // Build alerts from data
  const alerts: Alert[] = [];
  if (failedEmails && failedEmails > 0) {
    alerts.push({
      type: 'error',
      message: `${failedEmails} failed emails need attention`,
      action: { label: 'View Queue', href: '/admin/email-queue' },
    });
  }
  if (pendingJobs && pendingJobs > 0) {
    alerts.push({
      type: 'warning',
      message: `${pendingJobs} job failures in the last 24 hours`,
      action: { label: 'View Jobs', href: '/admin/jobs' },
    });
  }

  // Quick Actions - moved to top
  const quickActions = [
    {
      title: 'Score Episode',
      description: 'Enter scores for the latest episode',
      href: '/admin/scoring',
      icon: Zap,
      color: 'bg-burgundy-500',
    },
    {
      title: 'Analytics',
      description: 'Full platform metrics',
      href: '/admin/stats',
      icon: BarChart3,
      color: 'bg-purple-500',
    },
    {
      title: 'Manage Leagues',
      description: 'View all leagues',
      href: '/admin/leagues',
      icon: Trophy,
      color: 'bg-orange-500',
    },
    {
      title: 'Manage Users',
      description: 'User accounts',
      href: '/admin/users',
      icon: Users,
      color: 'bg-teal-500',
    },
  ];

  // Secondary admin links
  const adminLinks = [
    {
      title: 'Castaways',
      description: 'Add, edit, eliminate',
      href: '/admin/castaways',
      icon: '👥',
      color: 'bg-blue-500',
    },
    {
      title: 'Seasons',
      description: 'Manage seasons & episodes',
      href: '/admin/seasons',
      icon: '📅',
      color: 'bg-green-500',
    },
    {
      title: 'Scoring Rules',
      description: 'View & manage rules',
      href: '/admin/scoring-rules',
      icon: '✓',
      color: 'bg-purple-500',
    },
    {
      title: 'Job Monitor',
      description: 'Scheduled jobs',
      href: '/admin/jobs',
      icon: '⚙️',
      color: 'bg-indigo-500',
    },
    {
      title: 'Email Queue',
      description: 'Monitor emails',
      href: '/admin/email-queue',
      icon: '📧',
      color: 'bg-pink-500',
    },
    {
      title: 'Announcements',
      description: 'Dashboard messages',
      href: '/admin/announcements',
      icon: '📢',
      color: 'bg-amber-500',
    },
  ];

  // Check if user is admin
  if (profile && profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
        <AdminNavigation />
        <main className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-2xl shadow-elevated p-12">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-display text-neutral-800 mb-3">Access Denied</h1>
            <p className="text-neutral-500 mb-8">
              You don't have permission to access the admin dashboard.
            </p>
            <Link to="/dashboard" className="btn btn-primary">
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const isLoading = timelineLoading || statsLoading || activityLoading || healthLoading;

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <AdminNavigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div>
            <h1 className="text-3xl font-display text-neutral-800">Admin Command Center</h1>
            <p className="text-neutral-500 mt-1">Real-time platform monitoring and management</p>
          </div>
          <Link
            to="/dashboard"
            className="btn bg-white text-neutral-700 shadow-card hover:shadow-card-hover"
          >
            Back to App
          </Link>
        </div>

        {/* Alerts Bar */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-2 animate-fade-in">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-4 rounded-xl ${
                  alert.type === 'error'
                    ? 'bg-red-50 border border-red-200'
                    : alert.type === 'warning'
                      ? 'bg-amber-50 border border-amber-200'
                      : 'bg-blue-50 border border-blue-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle
                    className={`h-5 w-5 ${
                      alert.type === 'error'
                        ? 'text-red-500'
                        : alert.type === 'warning'
                          ? 'text-amber-500'
                          : 'text-blue-500'
                    }`}
                  />
                  <span
                    className={`font-medium ${
                      alert.type === 'error'
                        ? 'text-red-700'
                        : alert.type === 'warning'
                          ? 'text-amber-700'
                          : 'text-blue-700'
                    }`}
                  >
                    {alert.message}
                  </span>
                </div>
                {alert.action && (
                  <Link
                    to={alert.action.href}
                    className={`text-sm font-semibold px-3 py-1 rounded-lg ${
                      alert.type === 'error'
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : alert.type === 'warning'
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {alert.action.label}
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions - TOP OF PAGE */}
        <div className="mb-8 animate-slide-up">
          <h2 className="text-lg font-display text-neutral-800 mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                to={action.href}
                className="bg-white rounded-xl shadow-card hover:shadow-card-hover p-5 transition-all group"
              >
                <div
                  className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform`}
                >
                  <action.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-neutral-800 text-base mb-1">{action.title}</h3>
                <p className="text-xs text-neutral-500">{action.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* System Health Banner */}
        {health && <SystemHealthBanner health={health} />}

        {/* Loading state */}
        {isLoading && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="md:col-span-1">
              <div className="bg-white rounded-2xl shadow-card p-8 animate-pulse">
                <div className="h-6 bg-cream-200 rounded w-1/2 mb-6" />
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 bg-cream-100 rounded" />
                  ))}
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="bg-white rounded-2xl shadow-card p-8 animate-pulse">
                <div className="h-6 bg-cream-200 rounded w-1/3 mb-6" />
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-24 bg-cream-100 rounded" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {!isLoading && (
          <>
            {/* This Week Timeline + Stats Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {/* Timeline Feed (Left Column) */}
              <div className="md:col-span-1 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
                  <h3 className="text-lg font-display text-neutral-800 mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-burgundy-500" />
                    This Week
                  </h3>
                  {timeline && <TimelineFeed events={timeline} />}
                </div>
              </div>

              {/* Stats Grid (Right Column) */}
              <div className="md:col-span-2 space-y-6">
                <div className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
                  {stats && <StatsGrid stats={stats} />}
                </div>
              </div>
            </div>

            {/* Vitals Row - Connected Stats */}
            <div className="mb-8">
              <h2 className="text-lg font-display text-neutral-800 mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-500" />
                Real-time Vitals
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                  <DraftStatsCard />
                </div>
                <div className="animate-slide-up" style={{ animationDelay: '0.23s' }}>
                  <PaymentStatsCard />
                </div>
                <div className="animate-slide-up" style={{ animationDelay: '0.26s' }}>
                  <TriviaStatsCard />
                </div>
                <div className="animate-slide-up" style={{ animationDelay: '0.29s' }}>
                  <LeagueBreakdownCard />
                </div>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.32s' }}>
              {activity && <ActivityFeed activities={activity} />}
            </div>

            {/* Secondary Admin Links */}
            <div className="animate-slide-up" style={{ animationDelay: '0.35s' }}>
              <h2 className="text-lg font-display text-neutral-800 mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5 text-neutral-500" />
                Management
              </h2>
              <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
                {adminLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="bg-white rounded-xl shadow-card hover:shadow-card-hover p-4 transition-all group text-center"
                  >
                    <div
                      className={`w-10 h-10 ${link.color} rounded-lg flex items-center justify-center text-white text-xl mb-2 mx-auto group-hover:scale-110 transition-transform`}
                    >
                      {link.icon}
                    </div>
                    <h3 className="font-semibold text-neutral-800 text-sm mb-0.5">{link.title}</h3>
                    <p className="text-xs text-neutral-500">{link.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
