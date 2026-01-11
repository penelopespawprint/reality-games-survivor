import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Mail,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  RotateCcw,
  Send,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AdminNavBar } from '@/components/AdminNavBar';

const API_URL = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';

async function apiWithAuth(endpoint: string, options?: RequestInit) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options?.headers,
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

interface FailedEmail {
  id: string;
  email_job: {
    to_email: string;
    subject: string;
    html: string;
    text?: string;
  };
  failed_at: string;
  retry_attempted: boolean;
  retry_succeeded: boolean;
  retry_at: string | null;
  notes: string | null;
}

interface QueueStats {
  pending: number;
  processing: number;
  failed_today: number;
  sent_today: number;
  total_sent: number;
}

export function AdminEmailQueue() {
  const queryClient = useQueryClient();
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Fetch queue stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-email-stats'],
    queryFn: async () => {
      const response = await apiWithAuth('/api/admin/email-queue/stats');
      return (response || {
        pending: 0,
        processing: 0,
        failed_today: 0,
        sent_today: 0,
        total_sent: 0,
      }) as QueueStats;
    },
    refetchInterval: 30000,
  });

  // Fetch failed emails
  const {
    data: failedEmails,
    isLoading: emailsLoading,
    refetch,
  } = useQuery({
    queryKey: ['admin-failed-emails'],
    queryFn: async () => {
      const response = await apiWithAuth('/api/admin/failed-emails');
      return (response || { failed_emails: [], total: 0 }) as {
        failed_emails: FailedEmail[];
        total: number;
      };
    },
    refetchInterval: 30000,
  });

  // Retry email mutation
  const retryMutation = useMutation({
    mutationFn: async (emailId: string) => {
      return apiWithAuth(`/api/admin/failed-emails/${emailId}/retry`, { method: 'POST' });
    },
    onMutate: (emailId) => {
      setRetryingId(emailId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-failed-emails'] });
      queryClient.invalidateQueries({ queryKey: ['admin-email-stats'] });
      setRetryingId(null);
    },
    onError: () => {
      setRetryingId(null);
    },
  });

  const isLoading = statsLoading || emailsLoading;
  const pendingRetry = failedEmails?.failed_emails?.filter((e) => !e.retry_attempted) || [];
  const retriedEmails = failedEmails?.failed_emails?.filter((e) => e.retry_attempted) || [];

  return (
    <>
      <AdminNavBar />
      <div className="min-h-screen bg-neutral-900 p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/admin"
            className="p-2 bg-neutral-800 rounded-xl hover:bg-neutral-700 transition-all border border-neutral-700"
          >
            <ArrowLeft className="h-5 w-5 text-neutral-400" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
              <Mail className="h-6 w-6 text-orange-400" />
              Email Dashboard
            </h1>
            <p className="text-neutral-400">Track outgoing messages</p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 bg-neutral-800 rounded-xl hover:bg-neutral-700 transition-all border border-neutral-700"
          >
            <RefreshCw className={`h-5 w-5 text-neutral-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats - Two rows on mobile, one row on desktop */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Row 1: Waiting & Sending */}
          <div className="bg-neutral-800 rounded-2xl p-4 border border-neutral-700">
            <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
              <Clock className="h-4 w-4" />
              Waiting
            </div>
            <p className="text-2xl font-bold text-white">{stats?.pending || 0}</p>
          </div>
          <div className="bg-neutral-800 rounded-2xl p-4 border border-neutral-700">
            <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
              <Loader2 className="h-4 w-4" />
              Sending
            </div>
            <p className="text-2xl font-bold text-white">{stats?.processing || 0}</p>
          </div>

          {/* Row 2: Delivered & Issues */}
          <div className="bg-green-900/30 rounded-2xl border border-green-700/50 p-4">
            <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
              <Send className="h-4 w-4" />
              Delivered Today
            </div>
            <p className="text-2xl font-bold text-green-400">{stats?.sent_today || 0}</p>
          </div>
          <div className="bg-red-900/30 rounded-2xl border border-red-700/50 p-4">
            <div className="flex items-center gap-2 text-red-400 text-sm mb-1">
              <XCircle className="h-4 w-4" />
              Issues Today
            </div>
            <p className="text-2xl font-bold text-red-400">{stats?.failed_today || 0}</p>
          </div>
        </div>

        {/* Total sent - full width */}
        <div className="bg-gradient-to-r from-orange-600/20 to-burgundy-600/20 rounded-2xl border border-orange-500/30 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-300 text-sm mb-1">All-Time Delivered</p>
              <p className="text-3xl font-bold text-white">{stats?.total_sent?.toLocaleString() || 0}</p>
            </div>
            <Sparkles className="h-8 w-8 text-orange-400" />
          </div>
        </div>

        {/* Failed Emails - Needs Attention */}
        {pendingRetry.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-display font-bold text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Needs Attention ({pendingRetry.length})
            </h2>
            <div className="space-y-3">
              {pendingRetry.map((email) => (
                <div
                  key={email.id}
                  className="bg-neutral-800 rounded-2xl p-4 border border-amber-500/50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {email.email_job.subject}
                      </p>
                      <p className="text-sm text-neutral-400 truncate">
                        To: {email.email_job.to_email}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Needs Retry
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">
                      {new Date(email.failed_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                    <button
                      onClick={() => retryMutation.mutate(email.id)}
                      disabled={retryingId === email.id}
                      className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-1.5 px-3 rounded-lg text-sm font-medium transition-colors"
                    >
                      {retryingId === email.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-4 w-4" />
                          Resend
                        </>
                      )}
                    </button>
                  </div>
                  {email.notes && (
                    <p className="mt-2 text-xs text-red-400 bg-red-900/30 rounded-lg p-2 border border-red-700/50">
                      {email.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Retry History */}
        {retriedEmails.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-display font-bold text-white mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              Recent Retries ({retriedEmails.length})
            </h2>
            <div className="space-y-2">
              {retriedEmails.map((email) => (
                <div
                  key={email.id}
                  className={`bg-neutral-800 rounded-xl p-3 border ${
                    email.retry_succeeded ? 'border-green-700/50' : 'border-red-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {email.retry_succeeded ? (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-400" />
                      )}
                      <div>
                        <p className="font-medium text-white text-sm">
                          {email.email_job.subject}
                        </p>
                        <p className="text-xs text-neutral-500">{email.email_job.to_email}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        email.retry_succeeded
                          ? 'bg-green-900/50 text-green-400 border border-green-700/50'
                          : 'bg-red-900/50 text-red-400 border border-red-700/50'
                      }`}
                    >
                      {email.retry_succeeded ? 'Delivered' : 'Failed'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && pendingRetry.length === 0 && retriedEmails.length === 0 && (
          <div className="bg-neutral-800 rounded-2xl p-8 border border-neutral-700 text-center">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
            <h3 className="text-lg font-display font-bold text-white mb-1">
              All Clear!
            </h3>
            <p className="text-neutral-400">All emails have been delivered successfully.</p>
          </div>
        )}
      </div>
    </>
  );
}
