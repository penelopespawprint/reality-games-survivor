import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Bell, Phone, Mail, Smartphone, Loader2, Check, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);

  // Fetch user profile
  const { data: user, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Update notifications mutation
  const updateNotifications = useMutation({
    mutationFn: async (updates: { notification_email?: boolean; notification_sms?: boolean; notification_push?: boolean }) => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', authUser.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });

  // Update phone mutation
  const updatePhone = useMutation({
    mutationFn: async (newPhone: string) => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('users')
        .update({ phone: newPhone, phone_verified: false })
        .eq('id', authUser.id);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      setShowVerification(true);
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
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
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-white">Profile</h1>
        <p className="text-burgundy-200">Manage your account settings</p>
      </div>

      {/* Profile Info */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gold-500 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-burgundy-900" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">{user?.display_name}</h2>
            <p className="text-burgundy-200">{user?.email}</p>
          </div>
        </div>

        {/* Email display */}
        <div className="flex items-center gap-3 p-3 bg-burgundy-800/50 rounded-lg">
          <Mail className="h-5 w-5 text-gold-500" />
          <div className="flex-1">
            <p className="text-white">{user?.email}</p>
            <p className="text-burgundy-300 text-sm">Primary email</p>
          </div>
          <Check className="h-5 w-5 text-green-400" />
        </div>
      </div>

      {/* Phone Number */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6">
        <h3 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
          <Phone className="h-5 w-5 text-gold-500" />
          Phone Number
        </h3>
        <p className="text-burgundy-200 text-sm mb-4">
          Add your phone for SMS picks and notifications. Text PICK [name] to make picks!
        </p>

        {user?.phone ? (
          <div className="flex items-center gap-3 p-3 bg-burgundy-800/50 rounded-lg mb-4">
            <Smartphone className="h-5 w-5 text-gold-500" />
            <div className="flex-1">
              <p className="text-white">{user.phone}</p>
              <p className="text-burgundy-300 text-sm">
                {user.phone_verified ? 'Verified' : 'Not verified'}
              </p>
            </div>
            {user.phone_verified && <Check className="h-5 w-5 text-green-400" />}
          </div>
        ) : null}

        <div className="flex gap-2">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 555-5555"
            className="flex-1 bg-burgundy-800 border border-burgundy-600 rounded-lg px-4 py-2 text-white placeholder-burgundy-400 focus:outline-none focus:border-gold-500"
          />
          <button
            onClick={() => updatePhone.mutate(phone)}
            disabled={!phone || updatePhone.isPending}
            className="bg-gold-500 hover:bg-gold-400 disabled:bg-burgundy-600 text-burgundy-900 font-bold px-4 py-2 rounded-lg transition-colors"
          >
            {updatePhone.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Update'}
          </button>
        </div>

        {showVerification && (
          <div className="mt-4 p-4 bg-burgundy-800/50 rounded-lg">
            <p className="text-burgundy-200 text-sm mb-2">Enter the verification code sent to your phone:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="flex-1 bg-burgundy-800 border border-burgundy-600 rounded-lg px-4 py-2 text-white text-center tracking-widest placeholder-burgundy-400 focus:outline-none focus:border-gold-500"
              />
              <button className="bg-gold-500 hover:bg-gold-400 text-burgundy-900 font-bold px-4 py-2 rounded-lg transition-colors">
                Verify
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notification Preferences */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6">
        <h3 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-gold-500" />
          Notifications
        </h3>

        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-burgundy-300" />
              <div>
                <p className="text-white">Email Notifications</p>
                <p className="text-burgundy-300 text-sm">Reminders, results, and updates</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={user?.notification_email ?? true}
              onChange={(e) => updateNotifications.mutate({ notification_email: e.target.checked })}
              className="w-5 h-5 rounded bg-burgundy-700 border-burgundy-500 text-gold-500 focus:ring-gold-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-burgundy-300" />
              <div>
                <p className="text-white">SMS Notifications</p>
                <p className="text-burgundy-300 text-sm">Pick reminders and urgent alerts</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={user?.notification_sms ?? false}
              onChange={(e) => updateNotifications.mutate({ notification_sms: e.target.checked })}
              disabled={!user?.phone_verified}
              className="w-5 h-5 rounded bg-burgundy-700 border-burgundy-500 text-gold-500 focus:ring-gold-500 disabled:opacity-50"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-burgundy-300" />
              <div>
                <p className="text-white">Push Notifications</p>
                <p className="text-burgundy-300 text-sm">Real-time updates on your device</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={user?.notification_push ?? true}
              onChange={(e) => updateNotifications.mutate({ notification_push: e.target.checked })}
              className="w-5 h-5 rounded bg-burgundy-700 border-burgundy-500 text-gold-500 focus:ring-gold-500"
            />
          </label>
        </div>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-200 font-bold py-3 rounded-lg transition-colors"
      >
        <LogOut className="h-5 w-5" />
        Log Out
      </button>
    </div>
  );
}
