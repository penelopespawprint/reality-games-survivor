import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { AdminNavigation } from '@/components/AdminNavigation';
import { TimelineFeed } from '@/components/admin/TimelineFeed';
import { ActivityFeed } from '@/components/admin/ActivityFeed';
import { AlertTriangle, Users, Target, Trophy, Activity, RefreshCw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';

interface UserProfile {
  id: string;
  display_name: string;
  role: string;
}

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  actionLabel: string;
  actionHref: string;
}

interface VitalsData {
  activeUsers: { current: number; total: number };
  picksSubmitted: { current: number; total: number; percentage: number };
  leaguesActive: { current: number; total: number };
  systemHealth: 'healthy' | 'warning' | 'critical';
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
  const {
    data: dashboardData,
    isLoading,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      // Fetch all data in parallel
      const [timelineRes, activityRes, healthRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/dashboard/timeline`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/admin/dashboard/activity`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/admin/dashboard/system-health`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [timelineData, activityData, healthData] = await Promise.all([
        timelineRes.json(),
        activityRes.json(),
        healthRes.json(),
      ]);

      return {
        timeline: timelineData.timeline || [],
        activity: activityData.activity || [],
        health: healthData,
      };
    },
    enabled: !!user?.id && profile?.role === 'admin',
    refetchInterval: 60000, // 1 minute
    staleTime: 30000, // 30 seconds
  });

  // Fetch alerts (failed emails, job failures, pick deadlines)
  const { data: alerts = [] } = useQuery({
    queryKey: ['adminAlerts'],
    queryFn: async (): Promise<Alert[]> => {
      const alertsList: Alert[] = [];

      // Check failed emails
      const { count: failedEmails } = await supabase
        .from('failed_emails')
        .select('*', { count: 'exact', head: true })
        .eq('retry_attempted', false);

      if (failedEmails && failedEmails > 0) {
        alertsList.push({
          id: 'failed-emails',
          severity: failedEmails > 20 ? 'critical' : 'warning',
          title: `${failedEmails} failed emails`,
          message: 'Emails failed to deliver and need retry',
          actionLabel: 'Retry All',
          actionHref: '/admin/email-queue',
        });
      }

      // Check job failures in last 24 hours
      const { count: failedJobs } = await supabase
        .from('job_runs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (failedJobs && failedJobs > 0) {
        alertsList.push({
          id: 'failed-jobs',
          severity: 'warning',
          title: `${failedJobs} job failures`,
          message: 'Jobs failed in the last 24 hours',
          actionLabel: 'View Jobs',
          actionHref: '/admin/jobs',
        });
      }

      // Check upcoming pick deadline
      const { data: nextEpisode } = await supabase
        .from('episodes')
        .select('id, number, pick_deadline')
        .gt('pick_deadline', new Date().toISOString())
        .order('pick_deadline', { ascending: true })
        .limit(1)
        .single();

      if (nextEpisode) {
        const hoursUntil =
          (new Date(nextEpisode.pick_deadline).getTime() - Date.now()) / (1000 * 60 * 60);

        if (hoursUntil <= 24) {
          // Get pick submission rate
          const { count: submitted } = await supabase
            .from('weekly_picks')
            .select('*', { count: 'exact', head: true })
            .eq('episode_id', nextEpisode.id);

          const { count: eligible } = await supabase
            .from('league_members')
            .select('*', { count: 'exact', head: true });

          const rate = eligible ? ((submitted || 0) / eligible) * 100 : 0;

          alertsList.push({
            id: 'pick-deadline',
            severity: rate < 50 ? 'warning' : 'info',
            title: `Episode ${nextEpisode.number} locks in ${Math.round(hoursUntil)}h`,
            message: `${submitted || 0}/${eligible || 0} picks submitted (${Math.round(rate)}%)`,
            actionLabel: 'Send Reminder',
            actionHref: '/admin/email-queue',
          });
        }
      }

      // Sort by severity
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return alertsList.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    },
    enabled: !!user?.id && profile?.role === 'admin',
    refetchInterval: 60000,
  });

  // Fetch vitals
  const { data: vitals } = useQuery({
    queryKey: ['adminVitals'],
    queryFn: async (): Promise<VitalsData> => {
      // Active users (logged in last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: activeUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_sign_in_at', sevenDaysAgo);

      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Picks submitted for current episode
      const { data: currentEpisode } = await supabase
        .from('episodes')
        .select('id')
        .gt('pick_deadline', new Date().toISOString())
        .order('pick_deadline', { ascending: true })
        .limit(1)
        .single();

      let picksSubmitted = 0;
      let totalEligible = 0;

      if (currentEpisode) {
        const { count: submitted } = await supabase
          .from('weekly_picks')
          .select('*', { count: 'exact', head: true })
          .eq('episode_id', currentEpisode.id);
        picksSubmitted = submitted || 0;

        const { count: eligible } = await supabase
          .from('league_members')
          .select('*', { count: 'exact', head: true });
        totalEligible = eligible || 0;
      }

      // Active leagues (with picks this week)
      const { count: activeLeagues } = await supabase
        .from('leagues')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: totalLeagues } = await supabase
        .from('leagues')
        .select('*', { count: 'exact', head: true });

      // System health check
      const { count: failedEmails } = await supabase
        .from('failed_emails')
        .select('*', { count: 'exact', head: true })
        .eq('retry_attempted', false);

      const { count: failedJobs } = await supabase
        .from('job_runs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
      if ((failedEmails || 0) > 50 || (failedJobs || 0) > 5) {
        systemHealth = 'critical';
      } else if ((failedEmails || 0) > 10 || (failedJobs || 0) > 0) {
        systemHealth = 'warning';
      }

      return {
        activeUsers: { current: activeUsers || 0, total: totalUsers || 0 },
        picksSubmitted: {
          current: picksSubmitted,
          total: totalEligible,
          percentage: totalEligible > 0 ? Math.round((picksSubmitted / totalEligible) * 100) : 0,
        },
        leaguesActive: { current: activeLeagues || 0, total: totalLeagues || 0 },
        systemHealth,
      };
    },
    enabled: !!user?.id && profile?.role === 'admin',
    refetchInterval: 60000,
  });

  // Check if user is admin
  if (profile && profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-neutral-900">
        <AdminNavigation />
        <main className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="bg-neutral-800 rounded-2xl p-12 border border-neutral-700">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-900/30 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-display text-white mb-3">Access Denied</h1>
            <p className="text-neutral-400 mb-8">
              You don't have permission to access the admin dashboard.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Format last updated time
  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'never';

  return (
    <div className="min-h-screen bg-neutral-900">
      <AdminNavigation />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Refresh */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display text-white">Admin Dashboard</h1>
            <p className="text-neutral-400 text-sm mt-1">What needs my attention right now?</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-neutral-500">Updated {lastUpdated}</span>
            <button
              onClick={() => refetch()}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 1. ALERT BANNER */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center justify-between p-4 rounded-xl ${
                  alert.severity === 'critical'
                    ? 'bg-red-900/30 border border-red-800'
                    : alert.severity === 'warning'
                      ? 'bg-amber-900/30 border border-amber-800'
                      : 'bg-blue-900/30 border border-blue-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle
                    className={`h-5 w-5 ${
                      alert.severity === 'critical'
                        ? 'text-red-400'
                        : alert.severity === 'warning'
                          ? 'text-amber-400'
                          : 'text-blue-400'
                    }`}
                  />
                  <div>
                    <span
                      className={`font-medium ${
                        alert.severity === 'critical'
                          ? 'text-red-300'
                          : alert.severity === 'warning'
                            ? 'text-amber-300'
                            : 'text-blue-300'
                      }`}
                    >
                      {alert.title}
                    </span>
                    <p className="text-sm text-neutral-400">{alert.message}</p>
                  </div>
                </div>
                <Link
                  to={alert.actionHref}
                  className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
                    alert.severity === 'critical'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : alert.severity === 'warning'
                        ? 'bg-amber-600 text-white hover:bg-amber-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {alert.actionLabel}
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-neutral-800 rounded-xl p-6 animate-pulse">
                  <div className="h-4 bg-neutral-700 rounded w-1/2 mb-3" />
                  <div className="h-8 bg-neutral-700 rounded w-3/4" />
                </div>
              ))}
            </div>
            <div className="bg-neutral-800 rounded-xl p-6 animate-pulse">
              <div className="h-6 bg-neutral-700 rounded w-1/4 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-neutral-700 rounded" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {!isLoading && (
          <div className="space-y-6">
            {/* 2. VITALS GRID - 4 Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Active Users */}
              <div className="bg-neutral-800 rounded-xl p-5 border border-neutral-700">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-neutral-400">Active Users</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {vitals?.activeUsers.current || 0}
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  of {vitals?.activeUsers.total || 0} total (last 7 days)
                </div>
              </div>

              {/* Picks Submitted */}
              <div className="bg-neutral-800 rounded-xl p-5 border border-neutral-700">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-neutral-400">Picks Submitted</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {vitals?.picksSubmitted.percentage || 0}%
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  {vitals?.picksSubmitted.current || 0} of {vitals?.picksSubmitted.total || 0}{' '}
                  eligible
                </div>
              </div>

              {/* Leagues Active */}
              <div className="bg-neutral-800 rounded-xl p-5 border border-neutral-700">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  <span className="text-sm text-neutral-400">Leagues Active</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {vitals?.leaguesActive.current || 0}
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  of {vitals?.leaguesActive.total || 0} total leagues
                </div>
              </div>

              {/* System Health */}
              <div className="bg-neutral-800 rounded-xl p-5 border border-neutral-700">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-4 w-4 text-purple-400" />
                  <span className="text-sm text-neutral-400">System Health</span>
                </div>
                <div
                  className={`text-2xl font-bold ${
                    vitals?.systemHealth === 'healthy'
                      ? 'text-green-400'
                      : vitals?.systemHealth === 'warning'
                        ? 'text-amber-400'
                        : 'text-red-400'
                  }`}
                >
                  {vitals?.systemHealth === 'healthy'
                    ? '✓ Healthy'
                    : vitals?.systemHealth === 'warning'
                      ? '⚠ Warning'
                      : '✕ Critical'}
                </div>
                <Link
                  to="/admin/system/health"
                  className="text-xs text-neutral-500 hover:text-neutral-300 mt-1 block"
                >
                  View details →
                </Link>
              </div>
            </div>

            {/* 3. WEEKLY TIMELINE */}
            <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700">
              <h2 className="text-lg font-semibold text-white mb-4">Upcoming Events</h2>
              {dashboardData?.timeline && dashboardData.timeline.length > 0 ? (
                <TimelineFeed events={dashboardData.timeline} />
              ) : (
                <p className="text-neutral-500 text-sm">No upcoming events scheduled.</p>
              )}
            </div>

            {/* 4. ACTIVITY FEED */}
            <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700">
              <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
              {dashboardData?.activity && dashboardData.activity.length > 0 ? (
                <ActivityFeed activities={dashboardData.activity} />
              ) : (
                <p className="text-neutral-500 text-sm">No recent activity.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
