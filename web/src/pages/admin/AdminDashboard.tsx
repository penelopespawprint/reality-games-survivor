import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { TimelineFeed } from '@/components/admin/TimelineFeed';
import { StatsGrid } from '@/components/admin/StatsGrid';
import { SystemHealthBanner } from '@/components/admin/SystemHealthBanner';
import { ActivityFeed } from '@/components/admin/ActivityFeed';
import { NotificationPrefsWidget } from '@/components/admin/NotificationPrefsWidget';

const API_URL = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';

interface UserProfile {
  id: string;
  display_name: string;
  role: string;
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
    refetchInterval: 30000, // Refresh every 30 seconds
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

  const adminLinks = [
    {
      title: 'Score Episode',
      description: 'Enter scores for the latest episode',
      href: '/admin/scoring',
      icon: '📝',
      color: 'bg-burgundy-500',
    },
    {
      title: 'Manage Castaways',
      description: 'Add, edit, or eliminate castaways',
      href: '/admin/castaways',
      icon: '👥',
      color: 'bg-blue-500',
    },
    {
      title: 'Manage Seasons',
      description: 'Manage seasons and episodes',
      href: '/admin/seasons',
      icon: '📅',
      color: 'bg-green-500',
    },
    {
      title: 'Scoring Rules',
      description: 'View and manage scoring rules',
      href: '/admin/scoring-rules',
      icon: '✓',
      color: 'bg-purple-500',
    },
    {
      title: 'All Leagues',
      description: 'View and manage all leagues',
      href: '/admin/leagues',
      icon: '🏆',
      color: 'bg-orange-500',
    },
    {
      title: 'All Users',
      description: 'Manage user accounts',
      href: '/admin/users',
      icon: '👤',
      color: 'bg-teal-500',
    },
    {
      title: 'Job Monitor',
      description: 'View scheduled jobs and history',
      href: '/admin/jobs',
      icon: '⚙️',
      color: 'bg-indigo-500',
    },
    {
      title: 'Email Queue',
      description: 'Monitor email queue and failed emails',
      href: '/admin/email-queue',
      icon: '📧',
      color: 'bg-pink-500',
    },
  ];

  // Check if user is admin
  if (profile && profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-2xl shadow-elevated p-12">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
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
      <Navigation />

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
            {/* Timeline + Stats Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {/* Timeline Feed (Left Column) */}
              <div className="md:col-span-1 animate-slide-up">
                {timeline && <TimelineFeed events={timeline} />}
              </div>

              {/* Stats Grid + Notification Widget (Right Column) */}
              <div className="md:col-span-2 space-y-6">
                <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  {stats && <StatsGrid stats={stats} />}
                </div>
                <div className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
                  <NotificationPrefsWidget />
                </div>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              {activity && <ActivityFeed activities={activity} />}
            </div>

            {/* Admin Actions Grid */}
            <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <h2 className="text-lg font-display text-neutral-800 mb-4">Quick Actions</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {adminLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="bg-white rounded-xl shadow-card hover:shadow-card-hover p-5 transition-all group"
                  >
                    <div
                      className={`w-12 h-12 ${link.color} rounded-lg flex items-center justify-center text-white text-2xl mb-3 group-hover:scale-110 transition-transform`}
                    >
                      {link.icon}
                    </div>
                    <h3 className="font-semibold text-neutral-800 text-base mb-1">{link.title}</h3>
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
