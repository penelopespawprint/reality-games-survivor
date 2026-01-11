/**
 * Profile Setup Page
 *
 * First-time profile setup for new users after magic link signup.
 * Single-screen setup collecting display name (required) and optional info.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Loader2, Bell, Smartphone, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type UserInsert = Database['public']['Tables']['users']['Insert'];

const ALL_SURVIVOR_SEASONS = [
  { value: '', label: 'Select a season (optional)' },
  { value: 'borneo', label: 'Borneo (S1)' },
  { value: 'australian-outback', label: 'The Australian Outback (S2)' },
  { value: 'africa', label: 'Africa (S3)' },
  { value: 'marquesas', label: 'Marquesas (S4)' },
  { value: 'thailand', label: 'Thailand (S5)' },
  { value: 'amazon', label: 'The Amazon (S6)' },
  { value: 'pearl-islands', label: 'Pearl Islands (S7)' },
  { value: 'all-stars', label: 'All-Stars (S8)' },
  { value: 'vanuatu', label: 'Vanuatu (S9)' },
  { value: 'palau', label: 'Palau (S10)' },
  { value: 'guatemala', label: 'Guatemala (S11)' },
  { value: 'panama', label: 'Panama (S12)' },
  { value: 'cook-islands', label: 'Cook Islands (S13)' },
  { value: 'fiji', label: 'Fiji (S14)' },
  { value: 'china', label: 'China (S15)' },
  { value: 'micronesia', label: 'Micronesia (S16)' },
  { value: 'gabon', label: 'Gabon (S17)' },
  { value: 'tocantins', label: 'Tocantins (S18)' },
  { value: 'samoa', label: 'Samoa (S19)' },
  { value: 'heroes-vs-villains', label: 'Heroes vs. Villains (S20)' },
  { value: 'nicaragua', label: 'Nicaragua (S21)' },
  { value: 'redemption-island', label: 'Redemption Island (S22)' },
  { value: 'south-pacific', label: 'South Pacific (S23)' },
  { value: 'one-world', label: 'One World (S24)' },
  { value: 'philippines', label: 'Philippines (S25)' },
  { value: 'caramoan', label: 'Caramoan (S26)' },
  { value: 'blood-vs-water', label: 'Blood vs. Water (S27)' },
  { value: 'cagayan', label: 'Cagayan (S28)' },
  { value: 'san-juan-del-sur', label: 'San Juan del Sur (S29)' },
  { value: 'worlds-apart', label: 'Worlds Apart (S30)' },
  { value: 'cambodia', label: 'Cambodia (S31)' },
  { value: 'kaoh-rong', label: 'Kaôh Rōng (S32)' },
  { value: 'millennials-vs-gen-x', label: 'Millennials vs. Gen X (S33)' },
  { value: 'game-changers', label: 'Game Changers (S34)' },
  { value: 'heroes-healers-hustlers', label: 'Heroes vs. Healers vs. Hustlers (S35)' },
  { value: 'ghost-island', label: 'Ghost Island (S36)' },
  { value: 'david-vs-goliath', label: 'David vs. Goliath (S37)' },
  { value: 'edge-of-extinction', label: 'Edge of Extinction (S38)' },
  { value: 'island-of-the-idols', label: 'Island of the Idols (S39)' },
  { value: 'winners-at-war', label: 'Winners at War (S40)' },
  { value: '41', label: 'Survivor 41 (S41)' },
  { value: '42', label: 'Survivor 42 (S42)' },
  { value: '43', label: 'Survivor 43 (S43)' },
  { value: '44', label: 'Survivor 44 (S44)' },
  { value: '45', label: 'Survivor 45 (S45)' },
  { value: '46', label: 'Survivor 46 (S46)' },
  { value: '47', label: 'Survivor 47 (S47)' },
  { value: '48', label: 'Survivor 48 (S48)' },
  { value: '49', label: 'Survivor 49 (S49)' },
  { value: '50', label: 'Survivor 50: In the Hands of the Fans (S50)' },
];

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, profile: authProfile, refreshProfile, loading: authLoading } = useAuth();

  // Required fields
  const [firstName, setFirstName] = useState('');
  const [lastInitial, setLastInitial] = useState('');

  // Optional fields (always visible now)
  const [hometown, setHometown] = useState('');
  const [favoriteCastaway, setFavoriteCastaway] = useState('');
  const [favoriteSeason, setFavoriteSeason] = useState('');
  const [season50WinnerPrediction, setSeason50WinnerPrediction] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  
  // Phone number (optional)
  const [phone, setPhone] = useState('');
  const [smsNotifications, setSmsNotifications] = useState(false);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: season50Castaways } = useQuery({
    queryKey: ['season-50-castaways'],
    queryFn: async () => {
      const { data: season } = await supabase
        .from('seasons')
        .select('id')
        .eq('number', 50)
        .single();
      if (!season) return [];
      const { data, error } = await supabase
        .from('castaways')
        .select('id, name')
        .eq('season_id', season.id)
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fallback profile fetch if auth profile hasn't loaded yet
  const { data: fallbackProfile } = useQuery({
    queryKey: ['profile-setup-fallback', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('users')
        .select('display_name, email, profile_setup_complete')
        .eq('id', user.id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116' && (error as any)?.status !== 406) throw error;
      return data;
    },
    enabled: !!user && !authProfile,
    staleTime: 60_000,
  });

  const effectiveProfile = useMemo(
    () => authProfile ?? fallbackProfile,
    [authProfile, fallbackProfile]
  );

  const SkeletonBlock = ({ className = '' }: { className?: string }) => (
    <div className={`animate-pulse bg-cream-200 rounded-lg ${className}`} />
  );

  const renderSkeleton = () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-cream-100 to-cream-200 px-4 py-12">
      <div className="bg-white rounded-2xl shadow-float max-w-md w-full p-8">
        <div className="flex justify-center mb-6">
          <SkeletonBlock className="h-16 w-32 rounded-2xl" />
        </div>
        <SkeletonBlock className="h-8 w-40 mx-auto mb-2" />
        <SkeletonBlock className="h-4 w-56 mx-auto mb-6" />
        <div className="space-y-4">
          <div>
            <SkeletonBlock className="h-4 w-24 mb-2" />
            <SkeletonBlock className="h-11 w-full" />
          </div>
          <SkeletonBlock className="h-10 w-full" />
        </div>
      </div>
    </div>
  );

  const updateProfile = useMutation({
    mutationFn: async (data: {
      display_name: string;
      hometown?: string;
      favorite_castaway?: string;
      favorite_season?: string;
      season_50_winner_prediction?: string;
      notification_email: boolean;
      phone?: string;
      notification_sms?: boolean;
    }) => {
      const updateData: Record<string, unknown> = {
        display_name: data.display_name,
        notification_email: data.notification_email,
        profile_setup_complete: true,
      };

      if (data.hometown) updateData.hometown = data.hometown;
      if (data.favorite_castaway) updateData.favorite_castaway = data.favorite_castaway;
      if (data.favorite_season) updateData.favorite_season = data.favorite_season;
      if (data.season_50_winner_prediction)
        updateData.season_50_winner_prediction = data.season_50_winner_prediction;
      if (data.phone) updateData.phone = data.phone;
      if (data.notification_sms !== undefined) updateData.notification_sms = data.notification_sms;

      // Fetch existing role if present to avoid losing it
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', user!.id)
        .maybeSingle();

      // Build upsert payload
      const updateDataWithId: UserInsert = {
        id: user!.id,
        email: user!.email || '',
        display_name: data.display_name,
        notification_email: data.notification_email,
        ...updateData,
      };

      // Preserve role if user exists
      if (existingUser?.role) {
        updateDataWithId.role = existingUser.role;
      }

      // Upsert to avoid duplicate-key issues when the row already exists
      const { error } = await supabase.from('users').upsert(updateDataWithId, { onConflict: 'id' });

      if (error) {
        console.error('Profile update error:', error);
        throw new Error(error.message || 'Update failed');
      }
    },
    onSuccess: async () => {
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      const redirect = searchParams.get('redirect') || '/dashboard';
      const safeRedirect = redirect === '/profile/setup' ? '/dashboard' : redirect;
      navigate(safeRedirect, { replace: true });
    },
  });

  // Compute display name from first name and last initial
  const displayName = `${firstName.trim()}${lastInitial.trim() ? ` ${lastInitial.trim().charAt(0).toUpperCase()}.` : ''}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!firstName.trim()) {
      setError('Please enter your first name');
      return;
    }
    if (firstName.trim().length < 2) {
      setError('First name must be at least 2 characters');
      return;
    }
    if (!lastInitial.trim()) {
      setError('Please enter your last initial');
      return;
    }
    if (!/^[A-Za-z]$/.test(lastInitial.trim())) {
      setError('Last initial must be a single letter');
      return;
    }

    // Check if localStorage is working
    try {
      localStorage.setItem('storage-test', 'test');
      localStorage.removeItem('storage-test');
    } catch {
      setError(
        'Your browser is blocking local storage. Please disable "Incognito" mode or allow cookies/storage for this site.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Double check session before proceeding
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!currentSession) {
        throw new Error('Your session has expired. Please log in again.');
      }

      await updateProfile.mutateAsync({
        display_name: displayName.trim(),
        hometown: hometown.trim() || undefined,
        favorite_castaway: favoriteCastaway.trim() || undefined,
        favorite_season: favoriteSeason || undefined,
        season_50_winner_prediction: season50WinnerPrediction || undefined,
        notification_email: emailNotifications,
        phone: phone.trim() || undefined,
        notification_sms: smsNotifications,
      });
    } catch (err: any) {
      console.error('Submit error:', err);

      const message = err?.message || (typeof err === 'string' ? err : 'Unknown error');

      if (
        message.toLowerCase().includes('jwt') ||
        message.toLowerCase().includes('session') ||
        message.toLowerCase().includes('auth')
      ) {
        setError('Your login session has expired. Please refresh the page to log in again.');
      } else if (message.includes('check your connection')) {
        setError(`Connection issue: ${message}. If this persists, try logging out and back in.`);
      } else {
        setError(message);
      }

      setIsSubmitting(false);
    }
  };

  // Redirect to login if auth has finished loading but there's no user
  useEffect(() => {
    const hasTokenInUrl = window.location.hash.includes('access_token');
    if (!authLoading && !user && !hasTokenInUrl) {
      navigate('/login?redirect=/profile/setup', { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Show skeleton while auth is initializing or no user yet
  const hasTokenInUrl = window.location.hash.includes('access_token');
  if (authLoading || !user || hasTokenInUrl) {
    return renderSkeleton();
  }

  // Check if user has completed profile setup
  if (effectiveProfile?.profile_setup_complete) {
    const redirect = searchParams.get('redirect') || '/dashboard';
    const safeRedirect = redirect === '/profile/setup' ? '/dashboard' : redirect;
    navigate(safeRedirect, { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-cream-100 to-cream-200 px-4 py-12">
      <div className="bg-white rounded-2xl shadow-float max-w-md w-full p-8 animate-slide-up">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="RGFL" className="h-16 w-auto" />
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-burgundy-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-burgundy-600" />
          </div>
          <h1 className="font-display text-3xl text-neutral-800 mb-2">Welcome!</h1>
          <p className="text-neutral-500">Let's set up your profile</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Required: Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Your Name <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full px-4 py-3 rounded-xl border border-cream-300 focus:border-burgundy-500 focus:ring-2 focus:ring-burgundy-500/20 outline-none transition-all"
                  autoFocus
                />
              </div>
              <div className="w-20">
                <input
                  type="text"
                  value={lastInitial}
                  onChange={(e) => setLastInitial(e.target.value.slice(0, 1))}
                  placeholder="L"
                  maxLength={1}
                  className="w-full px-4 py-3 rounded-xl border border-cream-300 focus:border-burgundy-500 focus:ring-2 focus:ring-burgundy-500/20 outline-none transition-all text-center uppercase"
                />
              </div>
            </div>
            {displayName && firstName.trim() && lastInitial.trim() && (
              <p className="text-sm text-neutral-500 mt-2">
                You'll appear as:{' '}
                <span className="font-semibold text-neutral-800">{displayName}</span>
              </p>
            )}
            <p className="text-xs text-neutral-400 mt-1">
              Privacy: Only your first name and last initial are shown to other players
            </p>
          </div>

          {/* Notifications Section */}
          <div className="space-y-3">
            <p className="text-sm text-neutral-500 font-medium">Notifications</p>
            
            {/* Email Notifications Toggle */}
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

            {/* SMS Section */}
            <div className="p-4 bg-gradient-to-r from-burgundy-50 to-amber-50 rounded-xl border border-burgundy-200">
              <div className="flex items-center gap-3 mb-3">
                <MessageSquare className="h-5 w-5 text-burgundy-500" />
                <div>
                  <p className="text-neutral-800 font-medium">SMS Picks & Notifications</p>
                  <p className="text-neutral-400 text-sm">Text "PICK [name]" to make picks on the go!</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-1">
                    Phone Number (optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-neutral-400" />
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 555-5555"
                      className="flex-1 px-4 py-2 rounded-lg border border-cream-300 focus:border-burgundy-500 focus:ring-2 focus:ring-burgundy-500/20 outline-none transition-all"
                    />
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    We'll send a verification code to confirm your number
                  </p>
                </div>

                {phone && (
                  <div
                    className="flex items-center justify-between cursor-pointer p-3 bg-white rounded-lg border border-cream-200 hover:bg-cream-50 transition-colors"
                    onClick={() => setSmsNotifications(!smsNotifications)}
                  >
                    <div>
                      <p className="text-neutral-800 font-medium text-sm">SMS Reminders</p>
                      <p className="text-neutral-400 text-xs">Get pick reminders via text</p>
                    </div>
                    <div
                      className={`w-10 h-6 rounded-full p-0.5 transition-colors ${smsNotifications ? 'bg-burgundy-500' : 'bg-neutral-300'}`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${smsNotifications ? 'translate-x-4' : 'translate-x-0'}`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Optional Fields - All Visible */}
          <div className="space-y-4">
            <p className="text-sm text-neutral-500 font-medium">Optional Information</p>
            <div>
              <label htmlFor="hometown" className="block text-sm font-medium text-neutral-700 mb-2">
                Hometown
              </label>
              <input
                id="hometown"
                type="text"
                value={hometown}
                onChange={(e) => setHometown(e.target.value)}
                placeholder="e.g., Los Angeles, CA"
                className="w-full px-4 py-3 rounded-xl border border-cream-300 focus:border-burgundy-500 focus:ring-2 focus:ring-burgundy-500/20 outline-none transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="favoriteCastaway"
                className="block text-sm font-medium text-neutral-700 mb-2"
              >
                Favorite Castaway
              </label>
              <input
                id="favoriteCastaway"
                type="text"
                value={favoriteCastaway}
                onChange={(e) => setFavoriteCastaway(e.target.value)}
                placeholder="e.g., Parvati Shallow"
                className="w-full px-4 py-3 rounded-xl border border-cream-300 focus:border-burgundy-500 focus:ring-2 focus:ring-burgundy-500/20 outline-none transition-all"
              />
            </div>

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
                {ALL_SURVIVOR_SEASONS.map((season) => (
                  <option key={season.value} value={season.value}>
                    {season.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="season50Winner"
                className="block text-sm font-medium text-neutral-700 mb-2"
              >
                🏆 Who Will Win Season 50?
              </label>
              <select
                id="season50Winner"
                value={season50WinnerPrediction}
                onChange={(e) => setSeason50WinnerPrediction(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-cream-300 focus:border-burgundy-500 focus:ring-2 focus:ring-burgundy-500/20 outline-none transition-all bg-white"
              >
                <option value="">Make your prediction (optional)</option>
                {season50Castaways?.map((castaway) => (
                  <option key={castaway.id} value={castaway.id}>
                    {castaway.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-neutral-500 mt-1">
                Just for fun! Lock in your prediction before the season starts.
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !firstName.trim() || !lastInitial.trim()}
            className="w-full bg-burgundy-500 hover:bg-burgundy-600 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
        </form>
      </div>
    </div>
  );
}
