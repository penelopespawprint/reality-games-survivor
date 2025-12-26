import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Bell,
  Phone,
  Mail,
  Smartphone,
  Loader2,
  Check,
  LogOut,
  AlertCircle,
  RefreshCw,
  Pencil,
  Globe,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { apiWithAuth } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneSuccess, setPhoneSuccess] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Common timezone options
  const TIMEZONE_OPTIONS = [
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Paris', label: 'Central European (CET)' },
    { value: 'Asia/Tokyo', label: 'Japan (JST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  ];

  // Fetch user profile
  const { data: user, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
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

  // Update profile mutation (display name, timezone)
  const updateProfile = useMutation({
    mutationFn: async (updates: { display_name?: string; timezone?: string }) => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      const { error } = await supabase.from('users').update(updates).eq('id', authUser.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setIsEditingName(false);
      setNameError(null);
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => setProfileSuccess(null), 3000);
    },
    onError: (error: Error) => {
      setNameError(error.message);
      setProfileSuccess(null);
    },
  });

  // Update notifications mutation
  const updateNotifications = useMutation({
    mutationFn: async (updates: {
      notification_email?: boolean;
      notification_sms?: boolean;
      notification_push?: boolean;
    }) => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      const { error } = await supabase.from('users').update(updates).eq('id', authUser.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });

  // Update phone mutation - uses API to send verification SMS
  const updatePhone = useMutation({
    mutationFn: async (newPhone: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const result = await apiWithAuth<{
        user: unknown;
        verification_sent: boolean;
        message: string;
      }>('/me/phone', session.access_token, {
        method: 'PATCH',
        body: JSON.stringify({ phone: newPhone }),
      });

      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      setShowVerification(true);
      setPhoneError(null);
      setPhoneSuccess(data?.message || 'Verification code sent!');
      setPhone('');
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
    onError: (error: Error) => {
      setPhoneError(error.message);
      setPhoneSuccess(null);
    },
  });

  // Verify phone code mutation
  const verifyPhone = useMutation({
    mutationFn: async (code: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const result = await apiWithAuth<{ verified: boolean; message: string }>(
        '/me/verify-phone',
        session.access_token,
        { method: 'POST', body: JSON.stringify({ code }) }
      );

      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      setShowVerification(false);
      setVerificationCode('');
      setPhoneError(null);
      setPhoneSuccess(data?.message || 'Phone verified!');
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
    onError: (error: Error) => {
      setPhoneError(error.message);
      setPhoneSuccess(null);
    },
  });

  // Resend verification code mutation
  const resendCode = useMutation({
    mutationFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const result = await apiWithAuth<{ sent: boolean; message: string }>(
        '/me/resend-code',
        session.access_token,
        { method: 'POST' }
      );

      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      setPhoneError(null);
      setPhoneSuccess(data?.message || 'New code sent!');
    },
    onError: (error: Error) => {
      setPhoneError(error.message);
      setPhoneSuccess(null);
    },
  });

  // Change password mutation
  const changePassword = useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
    onSuccess: () => {
      setShowPasswordChange(false);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError(null);
      setPasswordSuccess('Password changed successfully!');
      setTimeout(() => setPasswordSuccess(null), 3000);
    },
    onError: (error: Error) => {
      setPasswordError(error.message);
      setPasswordSuccess(null);
    },
  });

  const handlePasswordChange = () => {
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    setPasswordError(null);
    changePassword.mutate(newPassword);
  };

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-neutral-800">Profile</h1>
        <p className="text-neutral-500">Manage your account settings</p>
      </div>

      {/* Phone Verification Prompt */}
      {!user?.phone_verified && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-full">
              <Smartphone className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-amber-800">Add Your Phone Number</h3>
              <p className="text-sm text-amber-700 mt-1">
                Verify your phone to receive SMS pick reminders and use text commands like "PICK
                Boston Rob" to submit picks on the go!
              </p>
              <a
                href="#phone-section"
                className="inline-flex items-center gap-1 text-sm font-medium text-amber-800 hover:text-amber-900 mt-2"
              >
                <Phone className="h-4 w-4" />
                Set up phone below
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Profile Info */}
      <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-burgundy-500 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            {isEditingName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter display name"
                  className="input flex-1"
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (displayName.trim()) {
                      updateProfile.mutate({ display_name: displayName.trim() });
                    }
                  }}
                  disabled={!displayName.trim() || updateProfile.isPending}
                  className="btn btn-primary"
                >
                  {updateProfile.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditingName(false);
                    setDisplayName('');
                    setNameError(null);
                  }}
                  className="btn btn-secondary"
                  disabled={updateProfile.isPending}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-display font-bold text-neutral-800">
                  {user?.display_name}
                </h2>
                <button
                  onClick={() => {
                    setDisplayName(user?.display_name || '');
                    setIsEditingName(true);
                  }}
                  className="p-1 text-neutral-400 hover:text-burgundy-500 transition-colors"
                  title="Edit display name"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}
            <p className="text-neutral-500">{user?.email}</p>
          </div>
        </div>

        {/* Error/Success Messages for profile */}
        {nameError && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {nameError}
          </div>
        )}
        {profileSuccess && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
            <Check className="h-4 w-4 flex-shrink-0" />
            {profileSuccess}
          </div>
        )}

        {/* Email display */}
        <div className="flex items-center gap-3 p-3 bg-cream-50 rounded-xl border border-cream-200">
          <Mail className="h-5 w-5 text-burgundy-500" />
          <div className="flex-1">
            <p className="text-neutral-800">{user?.email}</p>
            <p className="text-neutral-400 text-sm">Primary email</p>
          </div>
          <Check className="h-5 w-5 text-green-500" />
        </div>
      </div>

      {/* Timezone */}
      <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200 mb-6">
        <h3 className="text-lg font-display font-bold text-neutral-800 mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-burgundy-500" />
          Timezone
        </h3>
        <p className="text-neutral-500 text-sm mb-4">
          Set your timezone to see correct episode air times and pick deadlines.
        </p>
        <select
          value={user?.timezone || 'America/Los_Angeles'}
          onChange={(e) => updateProfile.mutate({ timezone: e.target.value })}
          className="w-full p-3 border border-cream-200 rounded-xl focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500 bg-cream-50"
        >
          {TIMEZONE_OPTIONS.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      {/* Phone Number */}
      <div
        id="phone-section"
        className="bg-white rounded-2xl shadow-card p-6 border border-cream-200 mb-6 scroll-mt-4"
      >
        <h3 className="text-lg font-display font-bold text-neutral-800 mb-4 flex items-center gap-2">
          <Phone className="h-5 w-5 text-burgundy-500" />
          Phone Number
        </h3>
        <p className="text-neutral-500 text-sm mb-4">
          Add your phone for SMS picks and notifications. Text PICK [name] to make picks!
        </p>

        {user?.phone ? (
          <div className="flex items-center gap-3 p-3 bg-cream-50 rounded-xl border border-cream-200 mb-4">
            <Smartphone className="h-5 w-5 text-burgundy-500" />
            <div className="flex-1">
              <p className="text-neutral-800">{user.phone}</p>
              <p
                className={`text-sm ${user.phone_verified ? 'text-green-600' : 'text-orange-500'}`}
              >
                {user.phone_verified ? 'Verified' : 'Not verified - enter code below'}
              </p>
            </div>
            {user.phone_verified ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <button
                onClick={() => setShowVerification(true)}
                className="text-sm text-burgundy-600 hover:text-burgundy-700 font-medium"
              >
                Verify
              </button>
            )}
          </div>
        ) : null}

        <div className="flex gap-2">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 555-5555"
            className="input flex-1"
          />
          <button
            onClick={() => updatePhone.mutate(phone)}
            disabled={!phone || updatePhone.isPending}
            className="btn btn-primary"
          >
            {updatePhone.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Update'}
          </button>
        </div>

        {/* Error/Success Messages */}
        {phoneError && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {phoneError}
          </div>
        )}
        {phoneSuccess && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
            <Check className="h-4 w-4 flex-shrink-0" />
            {phoneSuccess}
          </div>
        )}

        {showVerification && (
          <div className="mt-4 p-4 bg-cream-50 rounded-xl border border-cream-200">
            <p className="text-neutral-500 text-sm mb-2">
              Enter the verification code sent to your phone:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                maxLength={6}
                className="input flex-1 text-center tracking-widest font-mono text-lg"
              />
              <button
                onClick={() => verifyPhone.mutate(verificationCode)}
                disabled={verificationCode.length !== 6 || verifyPhone.isPending}
                className="btn btn-primary"
              >
                {verifyPhone.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify'}
              </button>
            </div>
            <button
              onClick={() => resendCode.mutate()}
              disabled={resendCode.isPending}
              className="mt-3 flex items-center gap-2 text-sm text-burgundy-600 hover:text-burgundy-700 disabled:opacity-50"
            >
              {resendCode.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Resend code
            </button>
          </div>
        )}
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200 mb-6">
        <h3 className="text-lg font-display font-bold text-neutral-800 mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-burgundy-500" />
          Notifications
        </h3>

        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer p-3 bg-cream-50 rounded-xl border border-cream-200 hover:bg-cream-100 transition-colors">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-neutral-400" />
              <div>
                <p className="text-neutral-800 font-medium">Email Notifications</p>
                <p className="text-neutral-400 text-sm">Reminders, results, and updates</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={user?.notification_email ?? true}
              onChange={(e) => updateNotifications.mutate({ notification_email: e.target.checked })}
              className="w-5 h-5 rounded bg-cream-100 border-cream-300 text-burgundy-500 focus:ring-burgundy-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer p-3 bg-cream-50 rounded-xl border border-cream-200 hover:bg-cream-100 transition-colors">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-neutral-400" />
              <div>
                <p className="text-neutral-800 font-medium">SMS Notifications</p>
                <p className="text-neutral-400 text-sm">Pick reminders and urgent alerts</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={user?.notification_sms ?? false}
              onChange={(e) => updateNotifications.mutate({ notification_sms: e.target.checked })}
              disabled={!user?.phone_verified}
              className="w-5 h-5 rounded bg-cream-100 border-cream-300 text-burgundy-500 focus:ring-burgundy-500 disabled:opacity-50"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer p-3 bg-cream-50 rounded-xl border border-cream-200 hover:bg-cream-100 transition-colors">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-neutral-400" />
              <div>
                <p className="text-neutral-800 font-medium">Push Notifications</p>
                <p className="text-neutral-400 text-sm">Real-time updates on your device</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={user?.notification_push ?? true}
              onChange={(e) => updateNotifications.mutate({ notification_push: e.target.checked })}
              className="w-5 h-5 rounded bg-cream-100 border-cream-300 text-burgundy-500 focus:ring-burgundy-500"
            />
          </label>
        </div>
      </div>

      {/* Security / Password */}
      <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200 mb-6">
        <h3 className="text-lg font-display font-bold text-neutral-800 mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-burgundy-500" />
          Security
        </h3>

        {/* Success Message */}
        {passwordSuccess && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
            <Check className="h-4 w-4 flex-shrink-0" />
            {passwordSuccess}
          </div>
        )}

        {!showPasswordChange ? (
          <button
            onClick={() => setShowPasswordChange(true)}
            className="w-full flex items-center justify-between p-3 bg-cream-50 rounded-xl border border-cream-200 hover:bg-cream-100 transition-colors text-left"
          >
            <div>
              <p className="text-neutral-800 font-medium">Change Password</p>
              <p className="text-neutral-400 text-sm">Update your account password</p>
            </div>
            <Lock className="h-5 w-5 text-neutral-400" />
          </button>
        ) : (
          <div className="space-y-4">
            {/* Error Message */}
            {passwordError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {passwordError}
              </div>
            )}

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="input w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-neutral-400 text-xs mt-1">Must be at least 8 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="input w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handlePasswordChange}
                disabled={!newPassword || !confirmPassword || changePassword.isPending}
                className="btn btn-primary flex-1"
              >
                {changePassword.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Update Password'
                )}
              </button>
              <button
                onClick={() => {
                  setShowPasswordChange(false);
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError(null);
                }}
                disabled={changePassword.isPending}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold py-3 rounded-xl transition-colors"
      >
        <LogOut className="h-5 w-5" />
        Log Out
      </button>
    </div>
  );
}
