/**
 * Admin System Health Page
 *
 * Displays comprehensive system health information including:
 * - Service status (database, scheduler, email, etc.)
 * - Recent job failures
 * - Email delivery rates
 * - System metrics
 */

import { useQuery } from '@tanstack/react-query';
import { AdminNavigation } from '@/components/AdminNavigation';
import { Footer } from '@/components/Footer';
import { apiWithAuth } from '@/lib/api';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Activity,
  Database,
  Mail,
  Clock,
} from 'lucide-react';

interface HealthCheck {
  database: {
    status: 'pass' | 'warn' | 'fail';
    latencyMs?: number;
    error?: string;
  };
  scheduler: {
    status: 'pass' | 'warn' | 'fail';
    running: boolean;
    error?: string;
  };
  recentJobFailures: {
    status: 'pass' | 'warn' | 'fail';
    count: number;
    error?: string;
  };
}

interface SystemHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: HealthCheck;
}

export function AdminSystemHealth() {
  const {
    data: health,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'system-health'],
    queryFn: async () => {
      const response = await apiWithAuth('/api/admin/dashboard/system-health');
      return response as SystemHealthResponse;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: operationsData } = useQuery({
    queryKey: ['admin', 'analytics', 'operations'],
    queryFn: async () => {
      const response = await apiWithAuth('/api/admin/analytics/operations');
      return response;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warn':
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'fail':
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-neutral-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
      case 'healthy':
        return 'bg-green-500/10 border-green-500/30 text-green-400';
      case 'warn':
      case 'degraded':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
      case 'fail':
      case 'unhealthy':
        return 'bg-red-500/10 border-red-500/30 text-red-400';
      default:
        return 'bg-neutral-500/10 border-neutral-500/30 text-neutral-400';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <AdminNavigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">System Health</h1>
            <p className="text-neutral-400 mt-1">Monitor system status and service health</p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400">Failed to load system health data</p>
          </div>
        )}

        {/* Overall Status Banner */}
        {health && (
          <div className={`rounded-lg border p-6 mb-8 ${getStatusColor(health.status)}`}>
            <div className="flex items-center gap-4">
              {getStatusIcon(health.status)}
              <div>
                <h2 className="text-xl font-semibold capitalize">System {health.status}</h2>
                <p className="text-sm opacity-75">
                  Last checked: {new Date(health.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Service Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Database Status */}
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="h-5 w-5 text-blue-400" />
              <h3 className="font-semibold">Database</h3>
            </div>
            {health?.checks?.database ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Status</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(health.checks.database.status)}
                    <span className="capitalize">{health.checks.database.status}</span>
                  </div>
                </div>
                {health.checks.database.latencyMs !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Latency</span>
                    <span>{health.checks.database.latencyMs}ms</span>
                  </div>
                )}
                {health.checks.database.error && (
                  <p className="text-red-400 text-sm">{health.checks.database.error}</p>
                )}
              </div>
            ) : (
              <p className="text-neutral-500">Loading...</p>
            )}
          </div>

          {/* Scheduler Status */}
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-5 w-5 text-purple-400" />
              <h3 className="font-semibold">Scheduler</h3>
            </div>
            {health?.checks?.scheduler ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Status</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(health.checks.scheduler.status)}
                    <span className="capitalize">{health.checks.scheduler.status}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Running</span>
                  <span>{health.checks.scheduler.running ? 'Yes' : 'No'}</span>
                </div>
                {health.checks.scheduler.error && (
                  <p className="text-red-400 text-sm">{health.checks.scheduler.error}</p>
                )}
              </div>
            ) : (
              <p className="text-neutral-500">Loading...</p>
            )}
          </div>

          {/* Recent Job Failures */}
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              <h3 className="font-semibold">Job Failures (24h)</h3>
            </div>
            {health?.checks?.recentJobFailures ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Status</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(health.checks.recentJobFailures.status)}
                    <span className="capitalize">{health.checks.recentJobFailures.status}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Failed Jobs</span>
                  <span
                    className={
                      health.checks.recentJobFailures.count > 0 ? 'text-red-400' : 'text-green-400'
                    }
                  >
                    {health.checks.recentJobFailures.count}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-neutral-500">Loading...</p>
            )}
          </div>
        </div>

        {/* Email Performance */}
        {operationsData?.emailPerformance && (
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Mail className="h-5 w-5 text-teal-400" />
              <h3 className="font-semibold text-lg">Email Performance</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-neutral-400 text-sm mb-1">Delivery Rate</p>
                <p
                  className={`text-2xl font-bold ${
                    (operationsData.emailPerformance.delivery_rate || 0) >= 0.9
                      ? 'text-green-400'
                      : (operationsData.emailPerformance.delivery_rate || 0) >= 0.7
                        ? 'text-yellow-400'
                        : 'text-red-400'
                  }`}
                >
                  {Math.round((operationsData.emailPerformance.delivery_rate || 0) * 100)}%
                </p>
              </div>
              <div>
                <p className="text-neutral-400 text-sm mb-1">Total Sent</p>
                <p className="text-2xl font-bold">
                  {operationsData.emailPerformance.total_sent || 0}
                </p>
              </div>
              <div>
                <p className="text-neutral-400 text-sm mb-1">Failed</p>
                <p className="text-2xl font-bold text-red-400">
                  {operationsData.emailPerformance.failedCount || 0}
                </p>
              </div>
              <div>
                <p className="text-neutral-400 text-sm mb-1">Pending</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {operationsData.emailPerformance.pendingCount || 0}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recent Errors */}
        {operationsData?.errorLog && operationsData.errorLog.length > 0 && (
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-6">
            <h3 className="font-semibold text-lg mb-4">Recent Errors</h3>
            <div className="space-y-3">
              {operationsData.errorLog.map(
                (
                  error: { job_name: string; error_message: string; started_at: string },
                  index: number
                ) => (
                  <div
                    key={index}
                    className="bg-red-500/10 border border-red-500/20 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-red-400">{error.job_name}</span>
                      <span className="text-neutral-500 text-sm">
                        {new Date(error.started_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-300">{error.error_message}</p>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
