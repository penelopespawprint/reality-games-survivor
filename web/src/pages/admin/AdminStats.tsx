import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AdminNavigation } from '@/components/AdminNavigation';
import {
  DollarSign,
  Users,
  Trophy,
  MessageCircle,
  Tv,
  Server,
  TrendingUp,
  TrendingDown,
  Activity,
  Mail,
  Bell,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Loader2,
  PieChart,
  Flame,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';

// Types matching the backend
interface ComprehensiveStats {
  generatedAt: string;
  revenue: RevenueStats;
  userEngagement: UserEngagementStats;
  leagueAnalytics: LeagueAnalyticsStats;
  communication: CommunicationStats;
  gameProgress: GameProgressStats;
  systemMetrics: SystemMetrics;
}

interface RevenueStats {
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  monthOverMonthGrowth: number | null;
  averageDonation: number;
  totalPayments: number;
  paymentsByStatus: {
    completed: number;
    pending: number;
    failed: number;
    refunded: number;
  };
  revenueByLeague: Array<{
    leagueId: string;
    leagueName: string;
    totalAmount: number;
    paymentCount: number;
  }>;
}

interface UserEngagementStats {
  totalUsers: number;
  profilesComplete: number;
  profileCompletionRate: number;
  triviaStats: {
    started: number;
    completed: number;
    completionRate: number;
    averageScore: number;
    averageAttempts: number;
  };
  usersByRole: {
    players: number;
    commissioners: number;
    admins: number;
  };
  retentionStats: {
    activeToday: number;
    activeThisWeek: number;
    activeThisMonth: number;
    churned30Days: number;
  };
  signupsByDay: Array<{
    date: string;
    count: number;
  }>;
}

interface LeagueAnalyticsStats {
  totalLeagues: number;
  publicLeagues: number;
  privateLeagues: number;
  paidLeagues: number;
  freeLeagues: number;
  globalLeagueMembers: number;
  draftStats: {
    pending: number;
    inProgress: number;
    completed: number;
    completionRate: number;
  };
  memberDistribution: {
    min: number;
    max: number;
    average: number;
    median: number;
  };
  leaguesByStatus: {
    forming: number;
    drafting: number;
    active: number;
    completed: number;
  };
  topLeagues: Array<{
    id: string;
    name: string;
    memberCount: number;
    isPublic: boolean;
    requireDonation: boolean;
    donationAmount: number | null;
  }>;
}

interface CommunicationStats {
  chatStats: {
    totalMessages: number;
    messagesThisWeek: number;
    uniqueChatters: number;
    averageMessagesPerUser: number;
  };
  emailStats: {
    totalSent: number;
    sentToday: number;
    queueSize: number;
    failedCount: number;
    deliveryRate: number;
  };
  notificationPrefs: {
    emailEnabled: number;
    smsEnabled: number;
    pushEnabled: number;
    spoilerDelayEnabled: number;
  };
}

interface GameProgressStats {
  season: {
    id: string;
    name: string;
    number: number;
  } | null;
  episodes: {
    total: number;
    scored: number;
    remaining: number;
    nextAirDate: string | null;
  };
  castaways: {
    total: number;
    active: number;
    eliminated: number;
    winner: number;
  };
  picks: {
    totalThisWeek: number;
    lockedThisWeek: number;
    autoPickedThisWeek: number;
    pendingThisWeek: number;
  };
  scoring: {
    totalPointsAwarded: number;
    averagePointsPerEpisode: number;
    topScorer: {
      name: string;
      points: number;
    } | null;
  };
  tribeBreakdown: Array<{
    tribe: string;
    active: number;
    eliminated: number;
  }>;
}

interface SystemMetrics {
  database: {
    latencyMs: number;
    status: 'healthy' | 'degraded' | 'unhealthy';
  };
  jobs: {
    totalRuns24h: number;
    successRate: number;
    failures24h: number;
    lastFailure: string | null;
  };
  email: {
    queueSize: number;
    processingRate: number;
    failedToday: number;
  };
  storage: {
    avatarCount: number;
  };
}

// Helper components
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  status,
  className = '',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: typeof DollarSign;
  trend?: { value: number; label: string };
  status?: 'good' | 'warning' | 'critical';
  className?: string;
}) {
  const statusColors = {
    good: 'border-l-green-500',
    warning: 'border-l-yellow-500',
    critical: 'border-l-red-500',
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-card p-5 border-l-4 ${status ? statusColors[status] : 'border-l-transparent'} ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-neutral-500 mb-1">{title}</p>
          <p className="text-2xl font-display text-neutral-800 font-mono">{value}</p>
          {subtitle && <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="p-2 bg-cream-100 rounded-lg">
            <Icon className="h-5 w-5 text-neutral-600" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1">
          {trend.value >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          <span
            className={`text-sm font-semibold ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {Math.abs(trend.value).toFixed(1)}%
          </span>
          <span className="text-xs text-neutral-400">{trend.label}</span>
        </div>
      )}
    </div>
  );
}

function ProgressBar({
  value,
  max,
  label,
  color = 'burgundy',
}: {
  value: number;
  max: number;
  label?: string;
  color?: 'burgundy' | 'green' | 'blue' | 'orange' | 'red';
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const colors = {
    burgundy: 'bg-burgundy-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
  };

  return (
    <div>
      <div className="flex justify-between text-xs text-neutral-500 mb-1">
        <span>{label}</span>
        <span>
          {value}/{max} ({percentage.toFixed(0)}%)
        </span>
      </div>
      <div className="h-2 bg-cream-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors[color]} transition-all duration-500`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
}

function MiniBarChart({
  data,
  label,
}: {
  data: Array<{ date: string; count: number }>;
  label: string;
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bg-white rounded-xl shadow-card p-5">
      <h3 className="text-sm font-semibold text-neutral-700 mb-4">{label}</h3>
      <div className="flex items-end gap-1 h-24">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div
              className="w-full bg-burgundy-500 rounded-t transition-all hover:bg-burgundy-600"
              style={{
                height: `${(d.count / maxCount) * 100}%`,
                minHeight: d.count > 0 ? '4px' : '0',
              }}
              title={`${d.date}: ${d.count}`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-neutral-400 mt-2">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

export function AdminStats() {
  const {
    data: stats,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<ComprehensiveStats>({
    queryKey: ['admin-comprehensive-stats'],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(`${API_URL}/api/admin/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <AdminNavigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-burgundy-500" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        <AdminNavigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-700">Failed to load stats. Please try again.</p>
            <button onClick={() => refetch()} className="mt-4 btn btn-primary">
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <AdminNavigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="p-2 hover:bg-cream-200 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5 text-neutral-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-display text-neutral-800">Analytics Dashboard</h1>
              <p className="text-neutral-500 mt-1">
                Last updated: {new Date(stats.generatedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn bg-white shadow-card hover:shadow-card-hover flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Revenue Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-display text-neutral-800">Revenue & Payments</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Revenue"
              value={`$${stats.revenue.totalRevenue.toFixed(2)}`}
              icon={DollarSign}
              status="good"
            />
            <StatCard
              title="This Month"
              value={`$${stats.revenue.revenueThisMonth.toFixed(2)}`}
              trend={
                stats.revenue.monthOverMonthGrowth !== null
                  ? { value: stats.revenue.monthOverMonthGrowth, label: 'vs last month' }
                  : undefined
              }
            />
            <StatCard
              title="Average Donation"
              value={`$${stats.revenue.averageDonation.toFixed(2)}`}
              subtitle={`${stats.revenue.totalPayments} total payments`}
            />
            <StatCard
              title="Payment Status"
              value={stats.revenue.paymentsByStatus.completed}
              subtitle={`${stats.revenue.paymentsByStatus.pending} pending, ${stats.revenue.paymentsByStatus.failed} failed`}
              status={stats.revenue.paymentsByStatus.failed > 0 ? 'warning' : 'good'}
            />
          </div>

          {/* Revenue by League */}
          {stats.revenue.revenueByLeague.length > 0 && (
            <div className="mt-4 bg-white rounded-xl shadow-card p-5">
              <h3 className="text-sm font-semibold text-neutral-700 mb-3">Revenue by League</h3>
              <div className="space-y-2">
                {stats.revenue.revenueByLeague.slice(0, 5).map((league) => (
                  <div key={league.leagueId} className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">{league.leagueName}</span>
                    <span className="text-sm font-mono text-green-600">
                      ${league.totalAmount.toFixed(2)} ({league.paymentCount} payments)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* User Engagement Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-display text-neutral-800">User Engagement</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Users" value={stats.userEngagement.totalUsers} icon={Users} />
            <StatCard
              title="Profile Completion"
              value={`${stats.userEngagement.profileCompletionRate.toFixed(0)}%`}
              subtitle={`${stats.userEngagement.profilesComplete} complete`}
            />
            <StatCard
              title="Active This Week"
              value={stats.userEngagement.retentionStats.activeThisWeek}
              subtitle={`${stats.userEngagement.retentionStats.activeToday} today`}
            />
            <StatCard
              title="Churned (30d)"
              value={stats.userEngagement.retentionStats.churned30Days}
              status={stats.userEngagement.retentionStats.churned30Days > 10 ? 'warning' : 'good'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {/* Trivia Stats */}
            <div className="bg-white rounded-xl shadow-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="h-4 w-4 text-orange-500" />
                <h3 className="text-sm font-semibold text-neutral-700">Trivia Challenge</h3>
              </div>
              <div className="space-y-3">
                <ProgressBar
                  value={stats.userEngagement.triviaStats.completed}
                  max={stats.userEngagement.triviaStats.started || 1}
                  label="Completion Rate"
                  color="orange"
                />
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Avg Score</span>
                  <span className="font-mono">
                    {stats.userEngagement.triviaStats.averageScore.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Avg Attempts</span>
                  <span className="font-mono">
                    {stats.userEngagement.triviaStats.averageAttempts.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Users by Role */}
            <div className="bg-white rounded-xl shadow-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <PieChart className="h-4 w-4 text-purple-500" />
                <h3 className="text-sm font-semibold text-neutral-700">Users by Role</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-500">Players</span>
                  <span className="text-sm font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    {stats.userEngagement.usersByRole.players}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-500">Commissioners</span>
                  <span className="text-sm font-mono bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                    {stats.userEngagement.usersByRole.commissioners}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-500">Admins</span>
                  <span className="text-sm font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded">
                    {stats.userEngagement.usersByRole.admins}
                  </span>
                </div>
              </div>
            </div>

            {/* Signups Chart */}
            <MiniBarChart data={stats.userEngagement.signupsByDay} label="Signups (Last 14 Days)" />
          </div>
        </section>

        {/* League Analytics Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-amber-600" />
            <h2 className="text-xl font-display text-neutral-800">League Analytics</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Leagues"
              value={stats.leagueAnalytics.totalLeagues}
              subtitle={`${stats.leagueAnalytics.publicLeagues} public, ${stats.leagueAnalytics.privateLeagues} private`}
              icon={Trophy}
            />
            <StatCard
              title="Paid Leagues"
              value={stats.leagueAnalytics.paidLeagues}
              subtitle={`${stats.leagueAnalytics.freeLeagues} free`}
            />
            <StatCard
              title="Global League"
              value={stats.leagueAnalytics.globalLeagueMembers}
              subtitle="members"
            />
            <StatCard
              title="Avg League Size"
              value={stats.leagueAnalytics.memberDistribution.average.toFixed(1)}
              subtitle={`min: ${stats.leagueAnalytics.memberDistribution.min}, max: ${stats.leagueAnalytics.memberDistribution.max}`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Draft Status */}
            <div className="bg-white rounded-xl shadow-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-neutral-700">Draft Status</h3>
              </div>
              <div className="space-y-3">
                <ProgressBar
                  value={stats.leagueAnalytics.draftStats.completed}
                  max={stats.leagueAnalytics.totalLeagues || 1}
                  label="Completed"
                  color="green"
                />
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-cream-100 rounded-lg p-2">
                    <p className="text-lg font-mono text-neutral-800">
                      {stats.leagueAnalytics.draftStats.pending}
                    </p>
                    <p className="text-xs text-neutral-500">Pending</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-2">
                    <p className="text-lg font-mono text-yellow-700">
                      {stats.leagueAnalytics.draftStats.inProgress}
                    </p>
                    <p className="text-xs text-neutral-500">In Progress</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2">
                    <p className="text-lg font-mono text-green-700">
                      {stats.leagueAnalytics.draftStats.completed}
                    </p>
                    <p className="text-xs text-neutral-500">Completed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Leagues */}
            <div className="bg-white rounded-xl shadow-card p-5">
              <h3 className="text-sm font-semibold text-neutral-700 mb-3">Top Leagues by Size</h3>
              <div className="space-y-2">
                {stats.leagueAnalytics.topLeagues.slice(0, 5).map((league, i) => (
                  <div key={league.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400 w-4">{i + 1}.</span>
                      <span className="text-sm text-neutral-600 truncate max-w-[150px]">
                        {league.name}
                      </span>
                      {league.requireDonation && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          ${league.donationAmount}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-mono text-neutral-800">
                      {league.memberCount} members
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Communication Stats Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="h-5 w-5 text-teal-600" />
            <h2 className="text-xl font-display text-neutral-800">Communication</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Chat Messages"
              value={stats.communication.chatStats.totalMessages}
              subtitle={`${stats.communication.chatStats.messagesThisWeek} this week`}
              icon={MessageCircle}
            />
            <StatCard
              title="Unique Chatters"
              value={stats.communication.chatStats.uniqueChatters}
              subtitle={`${stats.communication.chatStats.averageMessagesPerUser.toFixed(1)} msgs/user`}
            />
            <StatCard
              title="Emails Sent"
              value={stats.communication.emailStats.totalSent}
              subtitle={`${stats.communication.emailStats.sentToday} today`}
              icon={Mail}
            />
            <StatCard
              title="Email Delivery"
              value={`${stats.communication.emailStats.deliveryRate.toFixed(1)}%`}
              subtitle={`${stats.communication.emailStats.failedCount} failed`}
              status={stats.communication.emailStats.deliveryRate < 95 ? 'warning' : 'good'}
            />
          </div>

          {/* Notification Preferences */}
          <div className="mt-4 bg-white rounded-xl shadow-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-purple-500" />
              <h3 className="text-sm font-semibold text-neutral-700">Notification Preferences</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-mono text-neutral-800">
                  {stats.communication.notificationPrefs.emailEnabled}
                </p>
                <p className="text-xs text-neutral-500">Email Enabled</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-mono text-neutral-800">
                  {stats.communication.notificationPrefs.smsEnabled}
                </p>
                <p className="text-xs text-neutral-500">SMS Enabled</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-mono text-neutral-800">
                  {stats.communication.notificationPrefs.pushEnabled}
                </p>
                <p className="text-xs text-neutral-500">Push Enabled</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-mono text-neutral-800">
                  {stats.communication.notificationPrefs.spoilerDelayEnabled}
                </p>
                <p className="text-xs text-neutral-500">Spoiler Delay</p>
              </div>
            </div>
          </div>
        </section>

        {/* Game Progress Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Tv className="h-5 w-5 text-burgundy-600" />
            <h2 className="text-xl font-display text-neutral-800">
              Game Progress
              {stats.gameProgress.season && (
                <span className="text-sm font-normal text-neutral-500 ml-2">
                  Season {stats.gameProgress.season.number}: {stats.gameProgress.season.name}
                </span>
              )}
            </h2>
          </div>

          {stats.gameProgress.season ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Episodes Scored"
                  value={`${stats.gameProgress.episodes.scored}/${stats.gameProgress.episodes.total}`}
                  subtitle={`${stats.gameProgress.episodes.remaining} remaining`}
                  icon={Tv}
                />
                <StatCard
                  title="Castaways Active"
                  value={stats.gameProgress.castaways.active}
                  subtitle={`${stats.gameProgress.castaways.eliminated} eliminated`}
                />
                <StatCard
                  title="Picks This Week"
                  value={stats.gameProgress.picks.totalThisWeek}
                  subtitle={`${stats.gameProgress.picks.lockedThisWeek} locked, ${stats.gameProgress.picks.autoPickedThisWeek} auto`}
                />
                <StatCard
                  title="Total Points"
                  value={stats.gameProgress.scoring.totalPointsAwarded.toLocaleString()}
                  subtitle={`${stats.gameProgress.scoring.averagePointsPerEpisode.toFixed(0)} avg/episode`}
                />
              </div>

              {/* Tribe Breakdown */}
              {stats.gameProgress.tribeBreakdown.length > 0 && (
                <div className="mt-4 bg-white rounded-xl shadow-card p-5">
                  <h3 className="text-sm font-semibold text-neutral-700 mb-3">Tribe Breakdown</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {stats.gameProgress.tribeBreakdown.map((tribe) => (
                      <div key={tribe.tribe} className="bg-cream-50 rounded-lg p-3">
                        <p className="text-sm font-semibold text-neutral-700">{tribe.tribe}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs text-green-600">{tribe.active} active</span>
                          <span className="text-xs text-red-600">{tribe.eliminated} out</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Scorer */}
              {stats.gameProgress.scoring.topScorer && (
                <div className="mt-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl shadow-card p-5 border border-amber-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                      <Trophy className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-amber-700">Current Leader</p>
                      <p className="text-lg font-display text-neutral-800">
                        {stats.gameProgress.scoring.topScorer.name} -{' '}
                        <span className="font-mono">
                          {stats.gameProgress.scoring.topScorer.points} pts
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-cream-100 rounded-xl p-8 text-center">
              <p className="text-neutral-500">No active season</p>
            </div>
          )}
        </section>

        {/* System Metrics Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Server className="h-5 w-5 text-slate-600" />
            <h2 className="text-xl font-display text-neutral-800">System Metrics</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Database Latency"
              value={`${stats.systemMetrics.database.latencyMs}ms`}
              icon={Clock}
              status={stats.systemMetrics.database.status === 'healthy' ? 'good' : 'warning'}
            />
            <StatCard
              title="Job Success Rate"
              value={`${stats.systemMetrics.jobs.successRate.toFixed(1)}%`}
              subtitle={`${stats.systemMetrics.jobs.totalRuns24h} runs (24h)`}
              status={stats.systemMetrics.jobs.successRate >= 95 ? 'good' : 'warning'}
            />
            <StatCard
              title="Email Queue"
              value={stats.systemMetrics.email.queueSize}
              subtitle={`${stats.systemMetrics.email.failedToday} failed today`}
              status={stats.systemMetrics.email.queueSize > 50 ? 'warning' : 'good'}
            />
            <StatCard
              title="Avatar Storage"
              value={stats.systemMetrics.storage.avatarCount}
              subtitle="uploaded avatars"
            />
          </div>

          {/* System Status Indicators */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div
              className={`rounded-xl p-4 flex items-center gap-3 ${
                stats.systemMetrics.database.status === 'healthy'
                  ? 'bg-green-50 border border-green-200'
                  : stats.systemMetrics.database.status === 'degraded'
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-red-50 border border-red-200'
              }`}
            >
              {stats.systemMetrics.database.status === 'healthy' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : stats.systemMetrics.database.status === 'degraded' ? (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <div>
                <p className="text-sm font-semibold text-neutral-700">Database</p>
                <p className="text-xs text-neutral-500 capitalize">
                  {stats.systemMetrics.database.status}
                </p>
              </div>
            </div>

            <div
              className={`rounded-xl p-4 flex items-center gap-3 ${
                stats.systemMetrics.jobs.failures24h === 0
                  ? 'bg-green-50 border border-green-200'
                  : stats.systemMetrics.jobs.failures24h < 5
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-red-50 border border-red-200'
              }`}
            >
              {stats.systemMetrics.jobs.failures24h === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : stats.systemMetrics.jobs.failures24h < 5 ? (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <div>
                <p className="text-sm font-semibold text-neutral-700">Jobs</p>
                <p className="text-xs text-neutral-500">
                  {stats.systemMetrics.jobs.failures24h} failures (24h)
                </p>
              </div>
            </div>

            <div
              className={`rounded-xl p-4 flex items-center gap-3 ${
                stats.systemMetrics.email.failedToday === 0
                  ? 'bg-green-50 border border-green-200'
                  : stats.systemMetrics.email.failedToday < 10
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-red-50 border border-red-200'
              }`}
            >
              {stats.systemMetrics.email.failedToday === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : stats.systemMetrics.email.failedToday < 10 ? (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <div>
                <p className="text-sm font-semibold text-neutral-700">Email</p>
                <p className="text-xs text-neutral-500">
                  {stats.systemMetrics.email.failedToday} failed today
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
