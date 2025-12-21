import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bell, Mail, MessageSquare, Smartphone, Check, Loader2, Settings, Trash2, MailOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Notifications() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'notifications' | 'settings'>('notifications');

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch user profile with notification preferences
  const { data: profile } = useQuery({
    queryKey: ['user-profile', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) throw new Error('No user');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.id,
  });

  // Fetch notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) throw new Error('No user');
      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('sent_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.id,
  });

  // Mark as read mutation
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!currentUser?.id) throw new Error('No user');
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', currentUser.id)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Update notification preferences
  const updatePreferences = useMutation({
    mutationFn: async (prefs: { notification_email?: boolean; notification_sms?: boolean; notification_push?: boolean }) => {
      if (!currentUser?.id) throw new Error('No user');
      const { error } = await supabase
        .from('users')
        .update(prefs)
        .eq('id', currentUser.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });

  const unreadCount = notifications?.filter((n: any) => !n.read_at).length || 0;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-5 w-5 text-blue-400" />;
      case 'sms':
        return <MessageSquare className="h-5 w-5 text-green-400" />;
      case 'push':
        return <Smartphone className="h-5 w-5 text-purple-400" />;
      default:
        return <Bell className="h-5 w-5 text-gold-500" />;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/profile"
          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-gold-500" />
            Notifications
          </h1>
          {unreadCount > 0 && (
            <p className="text-burgundy-200">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
            className="text-gold-400 text-sm hover:text-gold-300"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'notifications'
              ? 'bg-gold-500 text-burgundy-900'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          <Bell className="h-4 w-4 inline mr-2" />
          Inbox
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'settings'
              ? 'bg-gold-500 text-burgundy-900'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          <Settings className="h-4 w-4 inline mr-2" />
          Preferences
        </button>
      </div>

      {activeTab === 'notifications' ? (
        /* Notifications List */
        <div className="space-y-3">
          {notifications && notifications.length > 0 ? (
            notifications.map((notification: any) => (
              <div
                key={notification.id}
                className={`bg-white/5 backdrop-blur-sm rounded-xl p-4 border transition-colors ${
                  notification.read_at
                    ? 'border-white/10 opacity-75'
                    : 'border-gold-500/30 bg-gold-500/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-burgundy-800 rounded-lg">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    {notification.subject && (
                      <p className="text-white font-medium mb-1">{notification.subject}</p>
                    )}
                    <p className="text-burgundy-200 text-sm">{notification.body}</p>
                    <p className="text-burgundy-400 text-xs mt-2">
                      {formatTime(notification.sent_at)}
                    </p>
                  </div>
                  {!notification.read_at && (
                    <button
                      onClick={() => markAsRead.mutate(notification.id)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Mark as read"
                    >
                      <MailOpen className="h-4 w-4 text-gold-400" />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 text-center">
              <Bell className="h-12 w-12 text-burgundy-400 mx-auto mb-4" />
              <p className="text-burgundy-200">No notifications yet.</p>
              <p className="text-burgundy-400 text-sm mt-1">
                You'll receive updates about picks, scores, and league activity here.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Notification Preferences */
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="text-lg font-display font-bold text-white">
              Notification Preferences
            </h2>
            <p className="text-burgundy-300 text-sm">
              Choose how you want to receive updates
            </p>
          </div>

          <div className="divide-y divide-white/5">
            {/* Email Notifications */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Email Notifications</p>
                  <p className="text-burgundy-300 text-sm">
                    Receive updates via email
                  </p>
                </div>
              </div>
              <button
                onClick={() => updatePreferences.mutate({ notification_email: !profile?.notification_email })}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  profile?.notification_email ? 'bg-gold-500' : 'bg-burgundy-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    profile?.notification_email ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* SMS Notifications */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-white font-medium">SMS Notifications</p>
                  <p className="text-burgundy-300 text-sm">
                    Get text messages for urgent updates
                  </p>
                  {!profile?.phone_verified && (
                    <p className="text-amber-400 text-xs mt-1">
                      Verify your phone number to enable
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => updatePreferences.mutate({ notification_sms: !profile?.notification_sms })}
                disabled={!profile?.phone_verified}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  profile?.notification_sms ? 'bg-gold-500' : 'bg-burgundy-600'
                } ${!profile?.phone_verified ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    profile?.notification_sms ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Push Notifications */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Smartphone className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Push Notifications</p>
                  <p className="text-burgundy-300 text-sm">
                    Real-time alerts on your device
                  </p>
                </div>
              </div>
              <button
                onClick={() => updatePreferences.mutate({ notification_push: !profile?.notification_push })}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  profile?.notification_push ? 'bg-gold-500' : 'bg-burgundy-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    profile?.notification_push ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Types Info */}
      {activeTab === 'settings' && (
        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <h3 className="text-white font-medium mb-3">What You'll Receive</h3>
          <ul className="space-y-2 text-sm text-blue-200">
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <span>Pick reminders before deadlines</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <span>Episode scoring results and standings updates</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <span>Waiver wire alerts when your castaway is eliminated</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <span>League activity and member updates</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
