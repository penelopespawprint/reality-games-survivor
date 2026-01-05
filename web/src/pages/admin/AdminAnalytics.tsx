import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Navigation } from '@/components/Navigation';
import { AdminNavBar } from '@/components/AdminNavBar';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  Zap,
  Clock,
  AlertTriangle,
  Mail,
  CheckCircle,
  XCircle,
  BarChart3,
  Target,
  Calendar,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';

async function apiWithAuth(endpoint: string) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `API error: ${response.status}`);
  }

  return response.json();
}

type Tab = 'executive' | 'engagement' | 'operations' | 'history';

interface ExecutiveData {
  healthScore: number;
  vitals: {
    totalUsers: number;
    activeUsers: number;
    retentionRate: number;
    activationRate: number;
    growthRate: number;
    newUsersThisWeek: number;
  };
  funnel: {
    signups: number;
    profileComplete: number;
    joinedLeague: number;
    madePick: number;
    week2Retention: number;
  };
  donations: {
    totalGross: number;
    totalStripeFee: number;
    totalRgflFee: number;
    totalNetToLeagues: number;
    donationCount: number;
    averageDonation: number;
    thisMonth: number;
    thisWeek: number;
    today: number;
  };
  topLeagues: Array<{
    id: string;
    name: string;
    memberCount: number;
    pickCount: number;
  }>;
}

interface EngagementData {
  episodeStatus: {
    episode: number;
    submitted: number;
    total: number;
    percentage: number;
  };
  cohorts: Array<{
    cohort_week: string;
    cohort_size: number;
    week_0: number;
    week_1: number;
    week_2: number;
    week_3: number;
    week_4: number;
  }>;
  segments: {
    power: number;
    casual: number;
    dormant: number;
    churned: number;
    new: number;
  };
  pickPatterns: {
    byDay: number[];
    dayLabels: string[];
  };
  atRiskUsers: Array<{
    id: string;
    display_name: string;
    email: string;
    last_active_at: string;
  }>;
}

interface OperationsData {
  systemStatus: 'healthy' | 'warning' | 'critical';
  emailPerformance: {
    total_sent: number;
    total_delivered: number;
    total_failed: number;
    delivery_rate: number;
    failedCount: number;
    pendingCount: number;
    recentFailures: Array<{
      id: string;
      to_email: string;
      subject: string;
      error_message: string;
      created_at: string;
    }>;
  };
  jobHistory: {
    recent: Array<{
      id: string;
      job_name: string;
      status: string;
      started_at: string;
      completed_at: string;
      duration_ms: number;
      error_message?: string;
    }>;
    failedCount: number;
  };
  errorLog: Array<{
    job_name: string;
    error_message: string;
    started_at: string;
  }>;
}

interface HistoryData {
  history: Record<string, Array<{ date: string; value: number }>>;
  stats: Array<{
    id: string;
    stat_name: string;
    stat_category: string;
    stat_value: number;
    recorded_at: string;
  }>;
  period: { days: number };
}

export function AdminAnalytics() {
  const [activeTab, setActiveTab] = useState<Tab>('executive');

  // Executive data
  const {
    data: executiveData,
    isLoading: executiveLoading,
    refetch: refetchExecutive,
  } = useQuery<ExecutiveData>({
    queryKey: ['admin-analytics-executive'],
    queryFn: () => apiWithAuth('/api/admin/analytics/executive') as Promise<ExecutiveData>,
    enabled: activeTab === 'executive',
    staleTime: 5 * 60 * 1000,
  });

  // Engagement data
  const {
    data: engagementData,
    isLoading: engagementLoading,
    refetch: refetchEngagement,
  } = useQuery<EngagementData>({
    queryKey: ['admin-analytics-engagement'],
    queryFn: () => apiWithAuth('/api/admin/analytics/engagement') as Promise<EngagementData>,
    enabled: activeTab === 'engagement',
    staleTime: 5 * 60 * 1000,
  });

  // Operations data
  const {
    data: operationsData,
    isLoading: operationsLoading,
    refetch: refetchOperations,
  } = useQuery<OperationsData>({
    queryKey: ['admin-analytics-operations'],
    queryFn: () => apiWithAuth('/api/admin/analytics/operations') as Promise<OperationsData>,
    enabled: activeTab === 'operations',
    staleTime: 30 * 1000,
  });

  // History data
  const [historyDays, setHistoryDays] = useState(30);
  const {
    data: historyData,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery<HistoryData>({
    queryKey: ['admin-analytics-history', historyDays],
    queryFn: () =>
      apiWithAuth(`/api/admin/analytics/history?days=${historyDays}`) as Promise<HistoryData>,
    enabled: activeTab === 'history',
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = () => {
    if (activeTab === 'executive') refetchExecutive();
    else if (activeTab === 'engagement') refetchEngagement();
    else if (activeTab === 'operations') refetchOperations();
    else refetchHistory();
  };

  const isLoading =
    (activeTab === 'executive' && executiveLoading) ||
    (activeTab === 'engagement' && engagementLoading) ||
    (activeTab === 'operations' && operationsLoading) ||
    (activeTab === 'history' && historyLoading);

  return (
    <>
      <Navigation />
      <AdminNavBar />
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 p-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
            >
              <ArrowLeft className="h-5 w-5 text-neutral-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-display font-bold text-neutral-800 flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-burgundy-500" />
                Analytics
              </h1>
              <p className="text-neutral-500">Business intelligence & metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/fun-stats"
              className="px-4 py-2 bg-burgundy-500 text-white rounded-lg shadow-card hover:bg-burgundy-600 flex items-center gap-2 text-sm font-medium"
            >
              <BarChart3 className="h-4 w-4" />
              Fun Stats
            </Link>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-4 py-2 bg-white rounded-lg shadow-card hover:shadow-card-hover flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-card border border-cream-200 p-1 mb-6 flex">
          <button
            onClick={() => setActiveTab('executive')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'executive'
                ? 'bg-burgundy-500 text-white'
                : 'text-neutral-600 hover:bg-cream-100'
            }`}
          >
            Executive
          </button>
          <button
            onClick={() => setActiveTab('engagement')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'engagement'
                ? 'bg-burgundy-500 text-white'
                : 'text-neutral-600 hover:bg-cream-100'
            }`}
          >
            Engagement
          </button>
          <button
            onClick={() => setActiveTab('operations')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'operations'
                ? 'bg-burgundy-500 text-white'
                : 'text-neutral-600 hover:bg-cream-100'
            }`}
          >
            Operations
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-burgundy-500 text-white'
                : 'text-neutral-600 hover:bg-cream-100'
            }`}
          >
            History
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
          </div>
        )}

        {/* Executive Tab */}
        {activeTab === 'executive' && executiveData && !isLoading && (
          <div className="space-y-6">
            {/* Health Score */}
            <div className="bg-white rounded-xl shadow-card p-6 border border-cream-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-800">Health Score</h3>
                  <p className="text-sm text-neutral-500">
                    Composite: retention 50%, activation 30%, growth 20%
                  </p>
                </div>
                <div
                  className={`text-4xl font-bold ${
                    executiveData.healthScore >= 70
                      ? 'text-green-600'
                      : executiveData.healthScore >= 40
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  }`}
                >
                  {executiveData.healthScore}
                </div>
              </div>
            </div>

            {/* Vitals Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-card border border-cream-200">
                <Users className="h-5 w-5 text-blue-500 mb-2" />
                <p className="text-2xl font-bold text-neutral-800">
                  {executiveData.vitals.totalUsers}
                </p>
                <p className="text-xs text-neutral-500">Total Users</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-card border border-cream-200">
                <Activity className="h-5 w-5 text-green-500 mb-2" />
                <p className="text-2xl font-bold text-neutral-800">
                  {executiveData.vitals.activeUsers}
                </p>
                <p className="text-xs text-neutral-500">Active (7d)</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-card border border-cream-200">
                <TrendingUp className="h-5 w-5 text-purple-500 mb-2" />
                <p className="text-2xl font-bold text-neutral-800">
                  {executiveData.vitals.retentionRate}%
                </p>
                <p className="text-xs text-neutral-500">Retention</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-card border border-cream-200">
                <Target className="h-5 w-5 text-orange-500 mb-2" />
                <p className="text-2xl font-bold text-neutral-800">
                  {executiveData.vitals.activationRate}%
                </p>
                <p className="text-xs text-neutral-500">Activation</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-card border border-cream-200">
                <TrendingUp className="h-5 w-5 text-teal-500 mb-2" />
                <p className="text-2xl font-bold text-neutral-800">
                  {executiveData.vitals.growthRate}%
                </p>
                <p className="text-xs text-neutral-500">Growth Rate</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-card border border-cream-200">
                <Calendar className="h-5 w-5 text-pink-500 mb-2" />
                <p className="text-2xl font-bold text-neutral-800">
                  {executiveData.vitals.newUsersThisWeek}
                </p>
                <p className="text-xs text-neutral-500">New This Week</p>
              </div>
            </div>

            {/* Funnel */}
            <div className="bg-white rounded-xl shadow-card p-6 border border-cream-200">
              <h3 className="text-lg font-semibold text-neutral-800 mb-4">User Funnel</h3>
              <div className="space-y-3">
                {[
                  { label: 'Signups', value: executiveData.funnel.signups, color: 'bg-blue-500' },
                  {
                    label: 'Profile Complete',
                    value: executiveData.funnel.profileComplete,
                    color: 'bg-green-500',
                  },
                  {
                    label: 'Joined League',
                    value: executiveData.funnel.joinedLeague,
                    color: 'bg-purple-500',
                  },
                  {
                    label: 'Made Pick',
                    value: executiveData.funnel.madePick,
                    color: 'bg-orange-500',
                  },
                  {
                    label: 'Week 2 Retention',
                    value: executiveData.funnel.week2Retention,
                    color: 'bg-teal-500',
                  },
                ].map((step) => (
                  <div key={step.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-neutral-600">{step.label}</span>
                      <span className="font-mono text-neutral-800">{step.value}</span>
                    </div>
                    <div className="h-2 bg-cream-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${step.color} transition-all`}
                        style={{
                          width: `${executiveData.funnel.signups > 0 ? (step.value / executiveData.funnel.signups) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Donations Summary */}
            {executiveData.donations.totalGross > 0 && (
              <div className="bg-white rounded-xl shadow-card p-6 border border-cream-200">
                <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  Donations
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-neutral-500">Gross</p>
                    <p className="text-xl font-bold text-neutral-800">
                      ${executiveData.donations.totalGross.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Stripe Fee</p>
                    <p className="text-xl font-bold text-red-600">
                      -${executiveData.donations.totalStripeFee.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">RGFL Fee (7%)</p>
                    <p className="text-xl font-bold text-orange-600">
                      -${executiveData.donations.totalRgflFee.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Net to Leagues</p>
                    <p className="text-xl font-bold text-green-600">
                      ${executiveData.donations.totalNetToLeagues.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Engagement Tab */}
        {activeTab === 'engagement' && engagementData && !isLoading && (
          <div className="space-y-6">
            {/* Episode Status */}
            <div className="bg-white rounded-xl shadow-card p-6 border border-cream-200">
              <h3 className="text-lg font-semibold text-neutral-800 mb-4">
                Episode {engagementData.episodeStatus.episode} Pick Status
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="h-4 bg-cream-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        engagementData.episodeStatus.percentage >= 70
                          ? 'bg-green-500'
                          : engagementData.episodeStatus.percentage >= 40
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${engagementData.episodeStatus.percentage}%` }}
                    />
                  </div>
                </div>
                <span className="text-lg font-bold text-neutral-800">
                  {engagementData.episodeStatus.submitted}/{engagementData.episodeStatus.total} (
                  {engagementData.episodeStatus.percentage}%)
                </span>
              </div>
            </div>

            {/* User Segments */}
            <div className="bg-white rounded-xl shadow-card p-6 border border-cream-200">
              <h3 className="text-lg font-semibold text-neutral-800 mb-4">User Segments</h3>
              <div className="grid grid-cols-5 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Zap className="h-6 w-6 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">
                    {engagementData.segments.power}
                  </p>
                  <p className="text-xs text-neutral-500">Power</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">
                    {engagementData.segments.casual}
                  </p>
                  <p className="text-xs text-neutral-500">Casual</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-yellow-600">
                    {engagementData.segments.dormant}
                  </p>
                  <p className="text-xs text-neutral-500">Dormant</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <TrendingDown className="h-6 w-6 text-red-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-600">
                    {engagementData.segments.churned}
                  </p>
                  <p className="text-xs text-neutral-500">Churned</p>
                </div>
                <div className="text-center p-4 bg-neutral-50 rounded-lg">
                  <Users className="h-6 w-6 text-neutral-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-neutral-600">
                    {engagementData.segments.new}
                  </p>
                  <p className="text-xs text-neutral-500">New</p>
                </div>
              </div>
            </div>

            {/* Pick Patterns */}
            <div className="bg-white rounded-xl shadow-card p-6 border border-cream-200">
              <h3 className="text-lg font-semibold text-neutral-800 mb-4">Pick Patterns by Day</h3>
              <div className="flex items-end gap-2 h-32">
                {engagementData.pickPatterns.byDay.map((count, i) => {
                  const max = Math.max(...engagementData.pickPatterns.byDay, 1);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-burgundy-500 rounded-t transition-all hover:bg-burgundy-600"
                        style={{
                          height: `${(count / max) * 100}%`,
                          minHeight: count > 0 ? '4px' : '0',
                        }}
                        title={`${engagementData.pickPatterns.dayLabels[i]}: ${count}`}
                      />
                      <span className="text-xs text-neutral-500 mt-1">
                        {engagementData.pickPatterns.dayLabels[i]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* At-Risk Users */}
            {engagementData.atRiskUsers.length > 0 && (
              <div className="bg-white rounded-xl shadow-card p-6 border border-cream-200">
                <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  At-Risk Users (7+ days inactive)
                </h3>
                <div className="space-y-2">
                  {engagementData.atRiskUsers.slice(0, 10).map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 bg-cream-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-neutral-800">{user.display_name}</p>
                        <p className="text-xs text-neutral-500">{user.email}</p>
                      </div>
                      <span className="text-xs text-neutral-500">
                        Last active:{' '}
                        {user.last_active_at
                          ? new Date(user.last_active_at).toLocaleDateString()
                          : 'Never'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Retention Cohorts */}
            {engagementData.cohorts.length > 0 && (
              <div className="bg-white rounded-xl shadow-card p-6 border border-cream-200">
                <h3 className="text-lg font-semibold text-neutral-800 mb-4">Retention Cohorts</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-neutral-500">
                        <th className="text-left py-2">Cohort</th>
                        <th className="text-center py-2">Size</th>
                        <th className="text-center py-2">Week 0</th>
                        <th className="text-center py-2">Week 1</th>
                        <th className="text-center py-2">Week 2</th>
                        <th className="text-center py-2">Week 3</th>
                        <th className="text-center py-2">Week 4</th>
                      </tr>
                    </thead>
                    <tbody>
                      {engagementData.cohorts.map((cohort, _i) => (
                        <tr key={cohort.cohort_week} className="border-t border-cream-100">
                          <td className="py-2 font-mono text-xs">
                            {new Date(cohort.cohort_week).toLocaleDateString()}
                          </td>
                          <td className="text-center py-2">{cohort.cohort_size}</td>
                          <td className="text-center py-2">{cohort.week_0}</td>
                          <td className="text-center py-2">{cohort.week_1}</td>
                          <td className="text-center py-2">{cohort.week_2}</td>
                          <td className="text-center py-2">{cohort.week_3}</td>
                          <td className="text-center py-2">{cohort.week_4}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Operations Tab */}
        {activeTab === 'operations' && operationsData && !isLoading && (
          <div className="space-y-6">
            {/* System Status */}
            <div
              className={`rounded-xl shadow-card p-6 border ${
                operationsData.systemStatus === 'healthy'
                  ? 'bg-green-50 border-green-200'
                  : operationsData.systemStatus === 'warning'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {operationsData.systemStatus === 'healthy' ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : operationsData.systemStatus === 'warning' ? (
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-500" />
                )}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-800">
                    System Status: {operationsData.systemStatus.toUpperCase()}
                  </h3>
                  <p className="text-sm text-neutral-600">
                    {operationsData.emailPerformance.failedCount} failed emails,{' '}
                    {operationsData.jobHistory.failedCount} failed jobs (24h)
                  </p>
                </div>
              </div>
            </div>

            {/* Email Performance */}
            <div className="bg-white rounded-xl shadow-card p-6 border border-cream-200">
              <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-500" />
                Email Performance (7d)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-neutral-500">Sent</p>
                  <p className="text-xl font-bold text-neutral-800">
                    {operationsData.emailPerformance.total_sent}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Delivered</p>
                  <p className="text-xl font-bold text-green-600">
                    {operationsData.emailPerformance.total_delivered}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Failed</p>
                  <p className="text-xl font-bold text-red-600">
                    {operationsData.emailPerformance.total_failed}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Delivery Rate</p>
                  <p
                    className={`text-xl font-bold ${operationsData.emailPerformance.delivery_rate >= 0.9 ? 'text-green-600' : 'text-yellow-600'}`}
                  >
                    {(operationsData.emailPerformance.delivery_rate * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Recent Failures */}
              {operationsData.emailPerformance.recentFailures.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-neutral-700 mb-2">Recent Failures</h4>
                  <div className="space-y-2">
                    {operationsData.emailPerformance.recentFailures.slice(0, 5).map((failure) => (
                      <div key={failure.id} className="p-2 bg-red-50 rounded-lg text-sm">
                        <p className="font-medium text-neutral-800">{failure.to_email}</p>
                        <p className="text-xs text-neutral-500">{failure.subject}</p>
                        <p className="text-xs text-red-600">{failure.error_message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Job History */}
            <div className="bg-white rounded-xl shadow-card p-6 border border-cream-200">
              <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-500" />
                Recent Job Runs
              </h3>
              <div className="space-y-2">
                {operationsData.jobHistory.recent.slice(0, 10).map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-2 bg-cream-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      {job.status === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : job.status === 'failed' ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                      )}
                      <span className="font-medium text-neutral-800">{job.job_name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                      <span>{job.duration_ms}ms</span>
                      <span>{new Date(job.started_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Error Log */}
            {operationsData.errorLog.length > 0 && (
              <div className="bg-white rounded-xl shadow-card p-6 border border-cream-200">
                <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Error Log
                </h3>
                <div className="space-y-2">
                  {operationsData.errorLog.map((error, i) => (
                    <div key={i} className="p-2 bg-red-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-neutral-800">{error.job_name}</span>
                        <span className="text-xs text-neutral-500">
                          {new Date(error.started_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-red-600 mt-1">{error.error_message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && historyData && !isLoading && (
          <div className="space-y-6">
            {/* Time Period Selector */}
            <div className="bg-white rounded-xl shadow-card p-4 border border-cream-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-800 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-burgundy-500" />
                  Historical Trends
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-500">Period:</span>
                  <select
                    value={historyDays}
                    onChange={(e) => setHistoryDays(Number(e.target.value))}
                    className="px-3 py-1.5 border border-cream-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={14}>Last 14 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={60}>Last 60 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Executive Stats History */}
            <div className="bg-white rounded-xl shadow-card p-6 border border-cream-200">
              <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                User Metrics Over Time
              </h3>
              <div className="space-y-6">
                {['total_users', 'active_users_7d', 'new_users_today'].map((statName) => {
                  const data = historyData.history[statName] || [];
                  if (data.length === 0) return null;
                  const maxValue = Math.max(...data.map((d) => d.value), 1);
                  const latestValue = data[data.length - 1]?.value || 0;
                  const oldestValue = data[0]?.value || 0;
                  const change =
                    oldestValue > 0 ? ((latestValue - oldestValue) / oldestValue) * 100 : 0;

                  return (
                    <div
                      key={statName}
                      className="border-b border-cream-100 pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-neutral-700 capitalize">
                          {statName.replace(/_/g, ' ')}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-neutral-800">{latestValue}</span>
                          {change !== 0 && (
                            <span
                              className={`flex items-center text-xs ${change > 0 ? 'text-green-600' : 'text-red-600'}`}
                            >
                              {change > 0 ? (
                                <TrendingUp className="h-3 w-3 mr-0.5" />
                              ) : (
                                <TrendingDown className="h-3 w-3 mr-0.5" />
                              )}
                              {Math.abs(change).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Mini Chart */}
                      <div className="flex items-end gap-1 h-16">
                        {data.map((point, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                            style={{
                              height: `${(point.value / maxValue) * 100}%`,
                              minHeight: point.value > 0 ? '2px' : '0',
                            }}
                            title={`${new Date(point.date).toLocaleDateString()}: ${point.value}`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Engagement Stats History */}
            <div className="bg-white rounded-xl shadow-card p-6 border border-cream-200">
              <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                Engagement Metrics Over Time
              </h3>
              <div className="space-y-6">
                {['total_picks', 'picks_today', 'total_trivia_answers'].map((statName) => {
                  const data = historyData.history[statName] || [];
                  if (data.length === 0) return null;
                  const maxValue = Math.max(...data.map((d) => d.value), 1);
                  const latestValue = data[data.length - 1]?.value || 0;

                  return (
                    <div
                      key={statName}
                      className="border-b border-cream-100 pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-neutral-700 capitalize">
                          {statName.replace(/_/g, ' ')}
                        </span>
                        <span className="text-lg font-bold text-neutral-800">{latestValue}</span>
                      </div>
                      {/* Mini Chart */}
                      <div className="flex items-end gap-1 h-16">
                        {data.map((point, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-green-500 rounded-t transition-all hover:bg-green-600"
                            style={{
                              height: `${(point.value / maxValue) * 100}%`,
                              minHeight: point.value > 0 ? '2px' : '0',
                            }}
                            title={`${new Date(point.date).toLocaleDateString()}: ${point.value}`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Operations Stats History */}
            <div className="bg-white rounded-xl shadow-card p-6 border border-cream-200">
              <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-500" />
                Operations Metrics Over Time
              </h3>
              <div className="space-y-6">
                {[
                  'emails_sent_today',
                  'emails_failed_today',
                  'jobs_run_today',
                  'jobs_failed_today',
                ].map((statName) => {
                  const data = historyData.history[statName] || [];
                  if (data.length === 0) return null;
                  const maxValue = Math.max(...data.map((d) => d.value), 1);
                  const latestValue = data[data.length - 1]?.value || 0;
                  const isError = statName.includes('failed');

                  return (
                    <div
                      key={statName}
                      className="border-b border-cream-100 pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-neutral-700 capitalize">
                          {statName.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={`text-lg font-bold ${isError && latestValue > 0 ? 'text-red-600' : 'text-neutral-800'}`}
                        >
                          {latestValue}
                        </span>
                      </div>
                      {/* Mini Chart */}
                      <div className="flex items-end gap-1 h-16">
                        {data.map((point, i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-t transition-all ${isError ? 'bg-red-500 hover:bg-red-600' : 'bg-purple-500 hover:bg-purple-600'}`}
                            style={{
                              height: `${(point.value / maxValue) * 100}%`,
                              minHeight: point.value > 0 ? '2px' : '0',
                            }}
                            title={`${new Date(point.date).toLocaleDateString()}: ${point.value}`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Raw Data Table */}
            <div className="bg-white rounded-xl shadow-card p-6 border border-cream-200">
              <h3 className="text-lg font-semibold text-neutral-800 mb-4">Recent Snapshots</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-neutral-500 border-b border-cream-100">
                      <th className="text-left py-2 pr-4">Date</th>
                      <th className="text-left py-2 pr-4">Metric</th>
                      <th className="text-left py-2 pr-4">Category</th>
                      <th className="text-right py-2">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.stats
                      .slice(-20)
                      .reverse()
                      .map((stat) => (
                        <tr key={stat.id} className="border-b border-cream-50 hover:bg-cream-50">
                          <td className="py-2 pr-4 font-mono text-xs">
                            {new Date(stat.recorded_at).toLocaleString()}
                          </td>
                          <td className="py-2 pr-4 capitalize">
                            {stat.stat_name.replace(/_/g, ' ')}
                          </td>
                          <td className="py-2 pr-4">
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full ${
                                stat.stat_category === 'executive'
                                  ? 'bg-blue-100 text-blue-700'
                                  : stat.stat_category === 'engagement'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-purple-100 text-purple-700'
                              }`}
                            >
                              {stat.stat_category}
                            </span>
                          </td>
                          <td className="py-2 text-right font-bold">{stat.stat_value}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
