import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Mail, MessageSquare, Bell, Loader2 } from 'lucide-react';

interface NotificationStats {
  total_users: number;
  email_enabled: number;
  sms_enabled: number;
  push_enabled: number;
  all_disabled: number;
}

export function NotificationPrefsWidget() {
  const { data: stats, isLoading } = useQuery<NotificationStats>({
    queryKey: ['notification-prefs-stats'],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const apiUrl = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/admin/notification-preferences/stats`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
        <p className="text-neutral-500 text-center">Failed to load notification statistics</p>
      </div>
    );
  }

  const emailRate =
    stats.total_users > 0 ? ((stats.email_enabled / stats.total_users) * 100).toFixed(0) : '0';
  const smsRate =
    stats.total_users > 0 ? ((stats.sms_enabled / stats.total_users) * 100).toFixed(0) : '0';
  const pushRate =
    stats.total_users > 0 ? ((stats.push_enabled / stats.total_users) * 100).toFixed(0) : '0';

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
      <h3 className="text-lg font-display font-bold text-neutral-800 mb-1">
        Notification Preferences
      </h3>
      <p className="text-neutral-500 text-sm mb-6">User notification channel preferences</p>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-neutral-700 font-medium">Email</p>
              <p className="text-xs text-neutral-500">{emailRate}% of users</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-neutral-800">{stats.email_enabled}</p>
            <p className="text-xs text-neutral-500">enabled</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-neutral-700 font-medium">SMS</p>
              <p className="text-xs text-neutral-500">{smsRate}% of users</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-neutral-800">{stats.sms_enabled}</p>
            <p className="text-xs text-neutral-500">enabled</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-neutral-700 font-medium">Push</p>
              <p className="text-xs text-neutral-500">{pushRate}% of users</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-neutral-800">{stats.push_enabled}</p>
            <p className="text-xs text-neutral-500">enabled</p>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-cream-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-600">All channels disabled</span>
          <span className="font-medium text-neutral-800">{stats.all_disabled} users</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-neutral-600">Total users</span>
          <span className="font-medium text-neutral-800">{stats.total_users}</span>
        </div>
      </div>

      <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
        <p className="text-xs text-amber-800">
          <strong>Note:</strong> Users can manage preferences in their profile settings.
          Spoiler-safe notifications respect these settings.
        </p>
      </div>
    </div>
  );
}
