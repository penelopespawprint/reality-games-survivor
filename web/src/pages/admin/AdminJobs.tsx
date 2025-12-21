import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock, Play, CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw, Calendar, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Job {
  name: string;
  description: string;
  schedule: string;
  lastRun: string | null;
  nextRun: string | null;
  status: 'success' | 'failed' | 'running' | 'pending';
  enabled: boolean;
}

// Mock job data - in production this would come from pg_cron or a jobs table
const defaultJobs: Job[] = [
  {
    name: 'draft-finalize',
    description: 'Auto-complete incomplete drafts',
    schedule: 'Mar 2, 8pm PST (one-time)',
    lastRun: null,
    nextRun: '2026-03-02T20:00:00-08:00',
    status: 'pending',
    enabled: true,
  },
  {
    name: 'lock-picks',
    description: 'Lock all pending weekly picks',
    schedule: 'Wed 3pm PST (weekly)',
    lastRun: null,
    nextRun: null,
    status: 'pending',
    enabled: true,
  },
  {
    name: 'auto-pick',
    description: 'Fill missing picks with auto-select',
    schedule: 'Wed 3:05pm PST (weekly)',
    lastRun: null,
    nextRun: null,
    status: 'pending',
    enabled: true,
  },
  {
    name: 'pick-reminders',
    description: 'Send pick reminder notifications',
    schedule: 'Wed 12pm PST (weekly)',
    lastRun: null,
    nextRun: null,
    status: 'pending',
    enabled: true,
  },
  {
    name: 'results-notification',
    description: 'Send scoring results to players',
    schedule: 'Fri 12pm PST (weekly)',
    lastRun: null,
    nextRun: null,
    status: 'pending',
    enabled: true,
  },
  {
    name: 'open-waivers',
    description: 'Open waiver window for the week',
    schedule: 'Sat 12pm PST (weekly)',
    lastRun: null,
    nextRun: null,
    status: 'pending',
    enabled: true,
  },
  {
    name: 'process-waivers',
    description: 'Process waiver rankings (inverse snake)',
    schedule: 'Wed 2:55pm PST (weekly)',
    lastRun: null,
    nextRun: null,
    status: 'pending',
    enabled: true,
  },
  {
    name: 'weekly-summary',
    description: 'Send weekly standings summary',
    schedule: 'Sun 10am PST (weekly)',
    lastRun: null,
    nextRun: null,
    status: 'pending',
    enabled: true,
  },
];

export function AdminJobs() {
  const queryClient = useQueryClient();
  const [jobs, setJobs] = useState<Job[]>(defaultJobs);
  const [runningJob, setRunningJob] = useState<string | null>(null);

  // Mock run job
  const runJob = useMutation({
    mutationFn: async (jobName: string) => {
      setRunningJob(jobName);
      // Simulate job execution
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In production, this would call the actual job endpoint
      // const response = await fetch(`/api/admin/jobs/${jobName}/run`, { method: 'POST' });

      return { success: true };
    },
    onSuccess: (_, jobName) => {
      setJobs(prev => prev.map(job =>
        job.name === jobName
          ? { ...job, lastRun: new Date().toISOString(), status: 'success' as const }
          : job
      ));
      setRunningJob(null);
    },
    onError: (_, jobName) => {
      setJobs(prev => prev.map(job =>
        job.name === jobName
          ? { ...job, status: 'failed' as const }
          : job
      ));
      setRunningJob(null);
    },
  });

  const toggleJob = (jobName: string) => {
    setJobs(prev => prev.map(job =>
      job.name === jobName
        ? { ...job, enabled: !job.enabled }
        : job
    ));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-400" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-gold-400 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-burgundy-400" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-500/20 text-green-400';
      case 'failed':
        return 'bg-red-500/20 text-red-400';
      case 'running':
        return 'bg-gold-500/20 text-gold-400';
      default:
        return 'bg-burgundy-500/20 text-burgundy-300';
    }
  };

  const stats = {
    total: jobs.length,
    enabled: jobs.filter(j => j.enabled).length,
    success: jobs.filter(j => j.status === 'success').length,
    failed: jobs.filter(j => j.status === 'failed').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/admin"
          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Zap className="h-6 w-6 text-gold-500" />
            System Jobs
          </h1>
          <p className="text-burgundy-200">{jobs.length} scheduled jobs</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10 text-center">
          <p className="text-xl font-bold text-white">{stats.total}</p>
          <p className="text-burgundy-300 text-xs">Total</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-blue-400">{stats.enabled}</p>
          <p className="text-burgundy-300 text-xs">Enabled</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-green-400">{stats.success}</p>
          <p className="text-burgundy-300 text-xs">Success</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-red-400">{stats.failed}</p>
          <p className="text-burgundy-300 text-xs">Failed</p>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-3">
        {jobs.map((job) => (
          <div
            key={job.name}
            className={`bg-white/5 backdrop-blur-sm rounded-xl p-4 border transition-opacity ${
              job.enabled ? 'border-white/10' : 'border-white/5 opacity-50'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {getStatusIcon(runningJob === job.name ? 'running' : job.status)}
                <div>
                  <h3 className="text-white font-medium font-mono">{job.name}</h3>
                  <p className="text-burgundy-300 text-sm">{job.description}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadgeClass(runningJob === job.name ? 'running' : job.status)}`}>
                {runningJob === job.name ? 'running' : job.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-burgundy-300 mb-3">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{job.schedule}</span>
              </div>
              <div className="flex items-center gap-1">
                <RefreshCw className="h-4 w-4" />
                <span>
                  Last: {job.lastRun
                    ? new Date(job.lastRun).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })
                    : 'Never'}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => runJob.mutate(job.name)}
                disabled={runningJob === job.name || !job.enabled}
                className="flex-1 bg-gold-500/20 hover:bg-gold-500/30 disabled:bg-burgundy-700 disabled:text-burgundy-400 text-gold-400 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  job.enabled
                    ? 'bg-burgundy-700 hover:bg-burgundy-600 text-white'
                    : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                }`}
              >
                {job.enabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200">
            <p className="font-medium mb-1">About System Jobs</p>
            <p className="text-blue-200/80">
              Jobs are scheduled using Supabase pg_cron. Manual runs are useful for testing
              or recovering from failures. All times are in PST.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
