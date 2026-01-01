import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Mail,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Clock,
  RotateCcw,
  Inbox,
  Send,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AdminNavigation } from '@/components/AdminNavigation';
import { apiWithAuth } from '@/lib/api';

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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await apiWithAuth<QueueStats>(
        '/admin/email-queue/stats',
        session.access_token
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return (
        response.data || {
          pending: 0,
          processing: 0,
          failed_today: 0,
          sent_today: 0,
          total_sent: 0,
        }
      );
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await apiWithAuth<{ failed_emails: FailedEmail[]; total: number }>(
        '/admin/failed-emails',
        session.access_token
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data || { failed_emails: [], total: 0 };
    },
    refetchInterval: 30000,
  });

  // Retry email mutation
  const retryMutation = useMutation({
    mutationFn: async (emailId: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await apiWithAuth<{ retry_success: boolean; message: string }>(
        `/admin/failed-emails/${emailId}/retry`,
        session.access_token,
        { method: 'POST' }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
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
      <AdminNavigation />
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
              <Mail className="h-6 w-6 text-burgundy-500" />
              Email Queue
            </h1>
            <p className="text-neutral-500">Monitor and manage email delivery</p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
          >
            <RefreshCw className={`h-5 w-5 text-neutral-600 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-2xl shadow-card p-4 border border-cream-200">
            <div className="flex items-center gap-2 text-neutral-500 text-sm mb-1">
              <Clock className="h-4 w-4" />
              Pending
            </div>
            <p className="text-2xl font-bold text-neutral-800">{stats?.pending || 0}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-card p-4 border border-cream-200">
            <div className="flex items-center gap-2 text-neutral-500 text-sm mb-1">
              <Loader2 className="h-4 w-4" />
              Processing
            </div>
            <p className="text-2xl font-bold text-neutral-800">{stats?.processing || 0}</p>
          </div>
          <div className="bg-green-50 rounded-2xl border border-green-200 p-4">
            <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
              <Send className="h-4 w-4" />
              Sent Today
            </div>
            <p className="text-2xl font-bold text-green-700">{stats?.sent_today || 0}</p>
          </div>
          <div className="bg-red-50 rounded-2xl border border-red-200 p-4">
            <div className="flex items-center gap-2 text-red-600 text-sm mb-1">
              <XCircle className="h-4 w-4" />
              Failed Today
            </div>
            <p className="text-2xl font-bold text-red-700">{stats?.failed_today || 0}</p>
          </div>
          <div className="bg-blue-50 rounded-2xl border border-blue-200 p-4">
            <div className="flex items-center gap-2 text-blue-600 text-sm mb-1">
              <Inbox className="h-4 w-4" />
              Total Sent
            </div>
            <p className="text-2xl font-bold text-blue-700">{stats?.total_sent || 0}</p>
          </div>
        </div>

        {/* Failed Emails - Pending Retry */}
        {pendingRetry.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-display font-bold text-neutral-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Needs Attention ({pendingRetry.length})
              </h2>
            </div>
            <div className="space-y-3">
              {pendingRetry.map((email) => (
                <div
                  key={email.id}
                  className="bg-white rounded-2xl shadow-card p-4 border border-amber-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-800 truncate">
                        {email.email_job.subject}
                      </p>
                      <p className="text-sm text-neutral-500 truncate">
                        To: {email.email_job.to_email}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                      Pending Retry
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-neutral-500">
                    <span>
                      Failed:{' '}
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
                      className="btn btn-primary py-1.5 px-3 text-sm"
                    >
                      {retryingId === email.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-4 w-4" />
                          Retry
                        </>
                      )}
                    </button>
                  </div>
                  {email.notes && (
                    <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg p-2">
                      {email.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Retried Emails */}
        {retriedEmails.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-display font-bold text-neutral-800 mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Retry History ({retriedEmails.length})
            </h2>
            <div className="space-y-2">
              {retriedEmails.map((email) => (
                <div
                  key={email.id}
                  className={`bg-white rounded-xl p-3 border ${
                    email.retry_succeeded ? 'border-green-200' : 'border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {email.retry_succeeded ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium text-neutral-800 text-sm">
                          {email.email_job.subject}
                        </p>
                        <p className="text-xs text-neutral-500">{email.email_job.to_email}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        email.retry_succeeded
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {email.retry_succeeded ? 'Sent' : 'Failed'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && pendingRetry.length === 0 && retriedEmails.length === 0 && (
          <div className="bg-white rounded-2xl shadow-card p-8 border border-cream-200 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-display font-bold text-neutral-800 mb-1">
              All Emails Delivered
            </h3>
            <p className="text-neutral-500">No failed emails in the queue.</p>
          </div>
        )}

        {/* Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">About Email Queue</p>
              <p className="text-blue-600">
                Emails are processed every 5 minutes. Failed emails are moved to a dead letter queue
                after 3 retry attempts. Use the Retry button to manually re-send failed emails.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
