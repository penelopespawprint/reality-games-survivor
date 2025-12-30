/**
 * Profile Page
 *
 * User account settings and preferences.
 * Refactored from 694 lines to use extracted sub-components.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { apiWithAuth } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import {
  PhoneVerificationPrompt,
  ProfileHeader,
  PhoneSection,
  NotificationsSection,
  SecuritySection,
  LogoutButton,
} from '@/components/profile';

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Profile state
  const [nameError, setNameError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Phone state
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneSuccess, setPhoneSuccess] = useState<string | null>(null);
  const [showVerification, setShowVerification] = useState(false);

  // Password state
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Fetch user profile
  const {
    data: user,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      const { data, error: queryError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (queryError) {
        console.error('Profile query error:', queryError);
        throw queryError;
      }
      return data;
    },
    retry: 2,
    retryDelay: 1000,
  });

  // Update profile mutation (display name, avatar)
  const updateProfile = useMutation({
    mutationFn: async (updates: { display_name?: string; avatar_url?: string }) => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      const { error } = await supabase.from('users').update(updates).eq('id', authUser.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
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

  // Update phone mutation
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
      setPasswordError(null);
      setPasswordSuccess('Password changed successfully!');
      setTimeout(() => setPasswordSuccess(null), 3000);
    },
    onError: (error: Error) => {
      setPasswordError(error.message);
      setPasswordSuccess(null);
    },
  });

  // Logout
  const handleLogout = async () => {
    try {
      localStorage.removeItem('adminViewMode');
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Force redirect even if API fails
      window.location.href = '/login';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold text-red-800 mb-2">
            Failed to Load Profile
          </h2>
          <p className="text-red-600 mb-4">
            {error instanceof Error
              ? error.message
              : 'An unexpected error occurred. Please try again.'}
          </p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-burgundy-600 text-white rounded-lg hover:bg-burgundy-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
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
      {!user?.phone_verified && <PhoneVerificationPrompt />}

      {/* Profile Info */}
      <ProfileHeader
        displayName={user?.display_name || ''}
        email={user?.email || ''}
        avatarUrl={user?.avatar_url || null}
        userId={user?.id || ''}
        onUpdateName={(name) => updateProfile.mutate({ display_name: name })}
        onUpdateAvatar={(url) => updateProfile.mutate({ avatar_url: url })}
        isUpdating={updateProfile.isPending}
        error={nameError}
        success={profileSuccess}
      />

      {/* Phone Number */}
      <PhoneSection
        currentPhone={user?.phone || null}
        isPhoneVerified={user?.phone_verified ?? false}
        onUpdatePhone={(phone) => updatePhone.mutate(phone)}
        onVerifyCode={(code) => verifyPhone.mutate(code)}
        onResendCode={() => resendCode.mutate()}
        isUpdating={updatePhone.isPending}
        isVerifying={verifyPhone.isPending}
        isResending={resendCode.isPending}
        error={phoneError}
        success={phoneSuccess}
        showVerification={showVerification}
        onShowVerification={setShowVerification}
      />

      {/* Notification Preferences */}
      <NotificationsSection
        emailEnabled={user?.notification_email ?? true}
        smsEnabled={user?.notification_sms ?? false}
        pushEnabled={user?.notification_push ?? true}
        phoneVerified={user?.phone_verified ?? false}
        onEmailChange={(enabled) => updateNotifications.mutate({ notification_email: enabled })}
        onSmsChange={(enabled) => updateNotifications.mutate({ notification_sms: enabled })}
        onPushChange={(enabled) => updateNotifications.mutate({ notification_push: enabled })}
      />

      {/* Security / Password */}
      <SecuritySection
        onChangePassword={(password) => changePassword.mutate(password)}
        isChanging={changePassword.isPending}
        error={passwordError}
        success={passwordSuccess}
      />

      {/* Logout Button */}
      <LogoutButton onLogout={handleLogout} />
    </div>
  );
}
