/**
 * Profile Setup Page
 *
 * First-time profile setup for new users after magic link signup.
 * Collects display name, favorite season, and notification preferences.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Loader2, Trophy, Bell } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { LoadingTorch } from '@/components/LoadingTorch';

const FAVORITE_SEASONS = [
  { value: '', label: 'Select a season (optional)' },
  { value: 'heroes-vs-villains', label: 'Heroes vs. Villains (S20)' },
  { value: 'cagayan', label: 'Cagayan (S28)' },
  { value: 'david-vs-goliath', label: 'David vs. Goliath (S37)' },
  { value: 'winners-at-war', label: 'Winners at War (S40)' },
  { value: 'pearl-islands', label: 'Pearl Islands (S7)' },
  { value: 'micronesia', label: 'Micronesia (S16)' },
  { value: 'cambodia', label: 'Cambodia (S31)' },
  { value: 'borneo', label: 'Borneo (S1)' },
  { value: 'other', label: 'Other' },
];

export default function ProfileSetup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [favoriteSeason, setFavoriteSeason] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user already has a display name
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
  });

  const updateProfile = useMutation({
    mutationFn: async (data: {
      display_name: string;
      favorite_season?: string;
      notification_email: boolean;
    }) => {
      const { error } = await supabase.from('users').update(data).eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      navigate('/dashboard');
    },
  });

  const handleNext = () => {
    if (step === 1) {
      if (!displayName.trim()) {
        setError('Please enter a display name');
        return;
      }
      if (displayName.trim().length < 2) {
        setError('Display name must be at least 2 characters');
        return;
      }
      setError('');
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await updateProfile.mutateAsync({
        display_name: displayName.trim(),
        favorite_season: favoriteSeason || undefined,
        notification_email: emailNotifications,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      setIsSubmitting(false);
    }
  };

  // Show loading torch while checking profile
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-200">
        <LoadingTorch />
      </div>
    );
  }

  // If user already has a display name, redirect to dashboard
  if (profile?.display_name) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-cream-100 to-cream-200 px-4 py-12">
      <div className="bg-white rounded-2xl shadow-float max-w-md w-full p-8 animate-slide-up">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="RGFL" className="h-16 w-auto" />
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-6">
          <div
            className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-burgundy-500' : 'bg-cream-300'}`}
          />
          <div
            className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-burgundy-500' : 'bg-cream-300'}`}
          />
        </div>

        {step === 1 && (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-burgundy-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-burgundy-600" />
              </div>
              <h1 className="font-display text-3xl text-neutral-800 mb-2">Welcome!</h1>
              <p className="text-neutral-500">What should we call you?</p>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="displayName"
                  className="block text-sm font-medium text-neutral-700 mb-2"
                >
                  Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 rounded-xl border border-cream-300 focus:border-burgundy-500 focus:ring-2 focus:ring-burgundy-500/20 outline-none transition-all"
                  autoFocus
                />
                <p className="text-xs text-neutral-500 mt-1">
                  This is how other players will see you
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleNext}
                disabled={!displayName.trim()}
                className="w-full bg-burgundy-500 hover:bg-burgundy-600 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-burgundy-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-8 w-8 text-burgundy-600" />
              </div>
              <h1 className="font-display text-3xl text-neutral-800 mb-2">Almost Done!</h1>
              <p className="text-neutral-500">Just a couple more questions</p>
            </div>

            <div className="space-y-6">
              <div>
                <label
                  htmlFor="favoriteSeason"
                  className="block text-sm font-medium text-neutral-700 mb-2"
                >
                  Favorite Survivor Season
                </label>
                <select
                  id="favoriteSeason"
                  value={favoriteSeason}
                  onChange={(e) => setFavoriteSeason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-cream-300 focus:border-burgundy-500 focus:ring-2 focus:ring-burgundy-500/20 outline-none transition-all bg-white"
                >
                  {FAVORITE_SEASONS.map((season) => (
                    <option key={season.value} value={season.value}>
                      {season.label}
                    </option>
                  ))}
                </select>
              </div>

              <div
                className="flex items-center justify-between cursor-pointer p-4 bg-cream-50 rounded-xl border border-cream-200 hover:bg-cream-100 transition-colors"
                onClick={() => setEmailNotifications(!emailNotifications)}
              >
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-neutral-400" />
                  <div>
                    <p className="text-neutral-800 font-medium">Email Notifications</p>
                    <p className="text-neutral-400 text-sm">Get reminders and results</p>
                  </div>
                </div>
                <div
                  className={`w-12 h-7 rounded-full p-1 transition-colors ${emailNotifications ? 'bg-burgundy-500' : 'bg-neutral-300'}`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${emailNotifications ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-cream-100 hover:bg-cream-200 text-neutral-700 font-semibold py-3 rounded-xl transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-burgundy-500 hover:bg-burgundy-600 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    "Let's Play!"
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
