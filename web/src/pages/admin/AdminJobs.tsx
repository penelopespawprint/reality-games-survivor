import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock,
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Calendar,
  Zap,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Navigation } from '@/components/Navigation';

interface Job {
  name: string;
  description: string;
  schedule: string;
  lastRun: string | null;
  nextRun: string | null;
  status: 'success' | 'failed' | 'running' | 'pending';
  enabled: boolean;
}

// Job metadata (descriptions and schedules for display)
const jobMetadata: Record<string, { description: string; schedule: string }> = {
  'draft-finalize': {
    description: 'Auto-complete incomplete drafts',
    schedule: 'Mar 2, 8pm PST (one-time)',
  },
  'lock-picks': { description: 'Lock all pending weekly picks', schedule: 'Wed 3pm PST (weekly)' },
  'auto-pick': {
    description: 'Fill missing picks with auto-select',
    schedule: 'Wed 3:05pm PST (weekly)',
  },
  'pick-reminders': {
    description: 'Send pick reminder notifications',
    schedule: 'Wed 12pm PST (weekly)',
  },
  'results-notification': {
    description: 'Send scoring results to players',
    schedule: 'Fri 12pm PST (weekly)',
  },
  'weekly-summary': {
    description: 'Send weekly standings summary',
    schedule: 'Sun 10am PST (weekly)',
  },
  'draft-reminders': {
    description: 'Send draft reminder notifications',
    schedule: 'Daily 9am PST',
  },
};

const defaultJobs: Job[] = Object.entries(jobMetadata).map(([name, meta]) => ({
  name,
  description: meta.description,
  schedule: meta.schedule,
  lastRun: null,
  nextRun: null,
  status: 'pending' as const,
  enabled: true,
}));

export function AdminJobs() {
  const _queryClient = useQueryClient();
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [jobResults, setJobResults] = useState<
    Record<string, { status: 'success' | 'failed'; lastRun: string; message?: string }>
  >({});
  const [disabledJobs, setDisabledJobs] = useState<Set<string>>(new Set());

  // Fetch jobs status from API
  const {
    data: apiJobs,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['admin-jobs'],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/admin/jobs', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const data = await response.json();
      return data.jobs || [];
    },
  });

  // Merge API data with local state
  const jobs: Job[] = defaultJobs.map((job) => {
    const apiJob = apiJobs?.find((j: any) => j.name === job.name);
    const result = jobResults[job.name];
    const isDisabled = disabledJobs.has(job.name);
    return {
      ...job,
      lastRun: result?.lastRun || apiJob?.lastRun || job.lastRun,
      nextRun: apiJob?.nextRun || job.nextRun,
      status: runningJob === job.name ? 'running' : result?.status || apiJob?.status || job.status,
      enabled: !isDisabled && (apiJob?.enabled ?? job.enabled),
    };
  });

  // Run job mutation - calls real API
  const runJobMutation = useMutation({
    mutationFn: async (jobName: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`/api/admin/jobs/${jobName}/run`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to run job');
      }

      return response.json();
    },
    onMutate: (jobName) => {
      setRunningJob(jobName);
    },
    onSuccess: (data, jobName) => {
      setJobResults((prev) => ({
        ...prev,
        [jobName]: {
          status: 'success',
          lastRun: new Date().toISOString(),
          message: data.result ? JSON.stringify(data.result) : undefined,
        },
      }));
      setRunningJob(null);
      refetch();
    },
    onError: (error: Error, jobName) => {
      setJobResults((prev) => ({
        ...prev,
        [jobName]: {
          status: 'failed',
          lastRun: new Date().toISOString(),
          message: error.message,
        },
      }));
      setRunningJob(null);
    },
  });

  const toggleJob = (jobName: string) => {
    setDisabledJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobName)) {
        next.delete(jobName);
      } else {
        next.add(jobName);
      }
      return next;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-burgundy-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-neutral-400" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-600';
      case 'failed':
        return 'bg-red-100 text-red-600';
      case 'running':
        return 'bg-burgundy-100 text-burgundy-600';
      default:
        return 'bg-neutral-100 text-neutral-600';
    }
  };

  const stats = {
    total: jobs.length,
    enabled: jobs.filter((j) => j.enabled).length,
    success: jobs.filter((j) => j.status === 'success').length,
    failed: jobs.filter((j) => j.status === 'failed').length,
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/admin"
            className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
          >
            <ArrowLeft className="h-5 w-5 text-neutral-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold text-neutral-800 flex items-center gap-2">
              <Zap className="h-6 w-6 text-burgundy-500" />
              System Jobs
            </h1>
            <p className="text-neutral-500">{jobs.length} scheduled jobs</p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
          >
            <RefreshCw className={`h-5 w-5 text-neutral-600 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <div className="bg-white rounded-2xl shadow-card p-3 border border-cream-200 text-center">
            <p className="text-xl font-bold text-neutral-800">{stats.total}</p>
            <p className="text-neutral-500 text-xs">Total</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-blue-600">{stats.enabled}</p>
            <p className="text-neutral-500 text-xs">Enabled</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-green-600">{stats.success}</p>
            <p className="text-neutral-500 text-xs">Success</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-red-600">{stats.failed}</p>
            <p className="text-neutral-500 text-xs">Failed</p>
          </div>
        </div>

        {/* Jobs List */}
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.name}
              className={`bg-white rounded-2xl shadow-card p-4 border transition-opacity ${
                job.enabled ? 'border-cream-200' : 'border-cream-100 opacity-50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(runningJob === job.name ? 'running' : job.status)}
                  <div>
                    <h3 className="text-neutral-800 font-medium font-mono">{job.name}</h3>
                    <p className="text-neutral-500 text-sm">{job.description}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadgeClass(runningJob === job.name ? 'running' : job.status)}`}
                >
                  {runningJob === job.name ? 'running' : job.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm text-neutral-500 mb-3">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{job.schedule}</span>
                </div>
                <div className="flex items-center gap-1">
                  <RefreshCw className="h-4 w-4" />
                  <span>
                    Last:{' '}
                    {job.lastRun
                      ? new Date(job.lastRun).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })
                      : 'Never'}
                  </span>
                </div>
              </div>

              {/* Result message */}
              {jobResults[job.name]?.message && (
                <div
                  className={`text-xs p-2 rounded-lg mb-3 ${
                    jobResults[job.name].status === 'success'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {jobResults[job.name].status === 'success' ? '✓ ' : '✗ '}
                  {jobResults[job.name].message}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => runJobMutation.mutate(job.name)}
                  disabled={runningJob === job.name || !job.enabled}
                  className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {runningJob === job.name ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Run Now
                    </>
                  )}
                </button>
                <button
                  onClick={() => toggleJob(job.name)}
                  className={`btn ${
                    job.enabled ? 'btn-secondary' : 'bg-green-100 text-green-600 hover:bg-green-200'
                  } px-4`}
                >
                  {job.enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">About System Jobs</p>
              <p className="text-blue-600">
                Jobs are scheduled using Supabase pg_cron. Manual runs are useful for testing or
                recovering from failures. All times are in PST.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
