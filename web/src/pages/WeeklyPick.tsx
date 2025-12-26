import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { getAvatarUrl } from '@/lib/avatar';
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Lock,
  Clock,
  ArrowLeft,
  Trophy,
  Target,
  TrendingUp,
} from 'lucide-react';

interface Castaway {
  id: string;
  name: string;
  photo_url?: string;
  status: string;
}

interface RosterEntry {
  id: string;
  castaway_id: string;
  castaways: Castaway;
}

interface WeeklyPick {
  id: string;
  episode_id: string;
  castaway_id: string | null;
  status: string;
  points_earned: number;
  episodes: {
    number: number;
    title: string | null;
  };
  castaways: Castaway | null;
}

interface Episode {
  id: string;
  number: number;
  title: string | null;
  air_date: string;
  picks_lock_at: string;
}

interface League {
  id: string;
  name: string;
  season_id: string;
}

interface CastawayStats {
  castaway_id: string;
  total_points: number;
  times_picked: number;
  avg_points: number;
}

export function WeeklyPick() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCastaway, setSelectedCastaway] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [showSuccess, setShowSuccess] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Fetch league
  const { data: league } = useQuery({
    queryKey: ['league', leagueId],
    queryFn: async () => {
      if (!leagueId) throw new Error('No league ID');
      const { data, error } = await supabase
        .from('leagues')
        .select('id, name, season_id')
        .eq('id', leagueId)
        .single();
      if (error) throw error;
      return data as League;
    },
    enabled: !!leagueId,
  });

  // Fetch current/next episode
  const { data: currentEpisode } = useQuery({
    queryKey: ['currentEpisode', league?.season_id],
    queryFn: async () => {
      if (!league?.season_id) throw new Error('No season ID');
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .eq('season_id', league.season_id)
        .gte('picks_lock_at', now)
        .order('air_date', { ascending: true })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as Episode | null;
    },
    enabled: !!league?.season_id,
  });

  // Fetch user's roster for this league
  const { data: roster, isLoading: rosterLoading } = useQuery({
    queryKey: ['roster', leagueId, user?.id],
    queryFn: async () => {
      if (!leagueId || !user?.id) throw new Error('Missing data');
      const { data, error } = await supabase
        .from('rosters')
        .select('id, castaway_id, castaways(*)')
        .eq('league_id', leagueId)
        .eq('user_id', user.id)
        .is('dropped_at', null);
      if (error) throw error;
      return data as RosterEntry[];
    },
    enabled: !!leagueId && !!user?.id,
  });

  // Check if draft is complete for this league
  const { data: draftStatus } = useQuery({
    queryKey: ['draftStatus', leagueId],
    queryFn: async () => {
      if (!leagueId) throw new Error('No league ID');
      const { data, error } = await supabase
        .from('leagues')
        .select('draft_status, status')
        .eq('id', leagueId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!leagueId,
  });

  // Fetch user's current pick for this episode
  const { data: currentPick } = useQuery({
    queryKey: ['currentPick', leagueId, currentEpisode?.id, user?.id],
    queryFn: async () => {
      if (!leagueId || !currentEpisode?.id || !user?.id) throw new Error('Missing data');
      const { data, error } = await supabase
        .from('weekly_picks')
        .select('*')
        .eq('league_id', leagueId)
        .eq('episode_id', currentEpisode.id)
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!leagueId && !!currentEpisode?.id && !!user?.id,
  });

  // Fetch previous picks
  const { data: previousPicks } = useQuery({
    queryKey: ['previousPicks', leagueId, user?.id],
    queryFn: async () => {
      if (!leagueId || !user?.id) throw new Error('Missing data');
      const { data, error } = await supabase
        .from('weekly_picks')
        .select(
          'id, episode_id, castaway_id, status, points_earned, episodes(number, title), castaways(*)'
        )
        .eq('league_id', leagueId)
        .eq('user_id', user.id)
        .neq('status', 'pending')
        .order('episodes(number)', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as WeeklyPick[];
    },
    enabled: !!leagueId && !!user?.id,
  });

  // Fetch castaway stats (total points earned when picked)
  const { data: castawayStats } = useQuery({
    queryKey: ['castawayStats', leagueId, user?.id],
    queryFn: async () => {
      if (!leagueId || !user?.id || !roster) throw new Error('Missing data');
      const castawayIds = roster.map((r) => r.castaway_id);

      // Get all picks for these castaways in this league
      const { data, error } = await supabase
        .from('weekly_picks')
        .select('castaway_id, points_earned')
        .eq('league_id', leagueId)
        .eq('user_id', user.id)
        .in('castaway_id', castawayIds)
        .in('status', ['locked', 'auto_picked']);

      if (error) throw error;

      // Aggregate stats per castaway
      const statsMap = new Map<string, CastawayStats>();
      castawayIds.forEach((id) => {
        statsMap.set(id, { castaway_id: id, total_points: 0, times_picked: 0, avg_points: 0 });
      });

      data?.forEach((pick) => {
        if (pick.castaway_id) {
          const stat = statsMap.get(pick.castaway_id);
          if (stat) {
            stat.total_points += pick.points_earned || 0;
            stat.times_picked += 1;
            stat.avg_points =
              stat.times_picked > 0 ? Math.round(stat.total_points / stat.times_picked) : 0;
          }
        }
      });

      return Array.from(statsMap.values());
    },
    enabled: !!leagueId && !!user?.id && !!roster && roster.length > 0,
  });

  // Check if user was auto-picked last episode
  const wasAutoPicked = previousPicks?.[0]?.status === 'auto_picked';

  // Submit pick mutation
  const submitPickMutation = useMutation({
    mutationFn: async (castawayId: string) => {
      if (!leagueId || !user?.id || !currentEpisode?.id) {
        throw new Error('Missing required data');
      }

      // Check if pick already exists
      if (currentPick) {
        const { data, error } = await supabase
          .from('weekly_picks')
          .update({ castaway_id: castawayId, picked_at: new Date().toISOString() })
          .eq('id', currentPick.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('weekly_picks')
          .insert({
            league_id: leagueId,
            user_id: user.id,
            episode_id: currentEpisode.id,
            castaway_id: castawayId,
            status: 'pending',
            picked_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['currentPick', leagueId, currentEpisode?.id, user?.id],
      });
      setShowSuccess(true);
      setMutationError(null);
      // Auto-dismiss success after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
    },
    onError: (error: Error) => {
      setMutationError(error.message || 'Failed to save pick. Please try again.');
      setShowSuccess(false);
    },
  });

  // Calculate countdown - update every second for urgency
  useEffect(() => {
    if (!currentEpisode?.picks_lock_at) return;

    const calculateTimeLeft = () => {
      const lockTime = new Date(currentEpisode.picks_lock_at).getTime();
      const now = Date.now();
      const diff = Math.max(0, lockTime - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [currentEpisode?.picks_lock_at]);

  // Set initial selection from current pick
  useEffect(() => {
    if (currentPick?.castaway_id) {
      setSelectedCastaway(currentPick.castaway_id);
    }
  }, [currentPick?.castaway_id]);

  const handleSubmitPick = () => {
    if (!selectedCastaway) return;
    setMutationError(null);
    submitPickMutation.mutate(selectedCastaway);
  };

  const pickSubmitted = !!currentPick?.castaway_id;
  // Check both status AND if time has expired
  const timeExpired =
    currentEpisode?.picks_lock_at && new Date(currentEpisode.picks_lock_at) <= new Date();
  const isLocked = currentPick?.status === 'locked' || timeExpired;
  const activeCastaways = roster?.filter((r) => r.castaways?.status === 'active') || [];
  const isLoading = !league || rosterLoading;

  // Draft and league status checks
  const draftCompleted = draftStatus?.draft_status === 'completed';
  const _leagueActive = draftStatus?.status === 'active';

  // Helper to get stats for a castaway
  const getStatsForCastaway = (castawayId: string): CastawayStats | undefined => {
    return castawayStats?.find((s) => s.castaway_id === castawayId);
  };

  // Urgency calculations
  const totalMinutesLeft = timeLeft.days * 24 * 60 + timeLeft.hours * 60 + timeLeft.minutes;
  const isVeryUrgent = totalMinutesLeft <= 30 && totalMinutesLeft > 0;
  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 2;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                to={`/leagues/${leagueId}`}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-display text-neutral-800">Weekly Pick</h1>
            </div>
            <p className="text-neutral-500">
              {currentEpisode ? `Episode ${currentEpisode.number}` : 'Loading...'} •{' '}
              {league?.name || 'Select your castaway'}
            </p>
          </div>
        </div>

        {/* Draft not completed */}
        {!draftCompleted ? (
          <div className="bg-white rounded-2xl shadow-elevated p-12 text-center animate-slide-up">
            <div className="w-20 h-20 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-display text-neutral-800 mb-3">
              Complete Your Draft First
            </h2>
            <p className="text-neutral-500 mb-8">
              You need to complete the draft before you can make weekly picks. Head to the draft
              room to select your castaways!
            </p>
            <Link to={`/leagues/${leagueId}/draft`} className="btn btn-primary shadow-card">
              Go to Draft Room
            </Link>
          </div>
        ) : !currentEpisode ? (
          <div className="bg-white rounded-2xl shadow-elevated p-12 text-center animate-slide-up">
            <div className="w-20 h-20 mx-auto mb-6 bg-cream-100 rounded-full flex items-center justify-center">
              <Clock className="w-10 h-10 text-neutral-400" />
            </div>
            <h2 className="text-2xl font-display text-neutral-800 mb-3">No Episode Scheduled</h2>
            <p className="text-neutral-500 mb-8">
              There are no upcoming episodes with open picks. Check back later!
            </p>
            <Link to={`/leagues/${leagueId}`} className="btn btn-primary shadow-card">
              Back to League
            </Link>
          </div>
        ) : isLocked ? (
          <div className="bg-white rounded-2xl shadow-elevated p-12 text-center animate-slide-up">
            <div className="w-20 h-20 mx-auto mb-6 bg-burgundy-100 rounded-full flex items-center justify-center">
              <Lock className="w-10 h-10 text-burgundy-600" />
            </div>
            <h2 className="text-2xl font-display text-neutral-800 mb-3">Picks Locked</h2>
            <p className="text-neutral-500 mb-2">
              Your pick for Episode {currentEpisode.number} is locked.
            </p>
            {currentPick?.castaway_id ? (
              <p className="text-lg font-semibold text-burgundy-600 mb-8">
                {roster?.find((r) => r.castaway_id === currentPick?.castaway_id)?.castaways?.name ||
                  'Unknown'}
              </p>
            ) : (
              <p className="text-lg font-semibold text-orange-600 mb-8">
                No pick submitted - auto-pick will be applied
              </p>
            )}
            <Link to={`/leagues/${leagueId}`} className="btn btn-primary shadow-card">
              Back to League
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Countdown Banner */}
            {(() => {
              const isUrgent = timeLeft.days === 0 && timeLeft.hours < 2;
              return (
                <div
                  className={`rounded-2xl p-6 text-white shadow-elevated animate-slide-up ${
                    isUrgent
                      ? 'bg-gradient-to-r from-orange-500 to-red-500'
                      : 'bg-gradient-to-r from-burgundy-500 to-burgundy-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p
                        className={`text-sm font-medium ${isUrgent ? 'text-orange-100' : 'text-burgundy-100'}`}
                      >
                        {isUrgent ? 'HURRY! Picks Lock In' : 'Picks Lock In'}
                      </p>
                      <div className="flex items-baseline gap-2 sm:gap-3 mt-2">
                        {timeLeft.days > 0 && (
                          <>
                            <div className="text-center">
                              <span className="text-3xl sm:text-4xl font-display">
                                {timeLeft.days}
                              </span>
                              <p className="text-xs text-burgundy-200 mt-1">days</p>
                            </div>
                            <span className="text-xl sm:text-2xl text-burgundy-200">:</span>
                          </>
                        )}
                        <div className="text-center">
                          <span className="text-3xl sm:text-4xl font-display">
                            {timeLeft.hours}
                          </span>
                          <p className="text-xs text-burgundy-200 mt-1">hours</p>
                        </div>
                        <span className="text-xl sm:text-2xl text-burgundy-200">:</span>
                        <div className="text-center">
                          <span className="text-3xl sm:text-4xl font-display">
                            {timeLeft.minutes}
                          </span>
                          <p className="text-xs text-burgundy-200 mt-1">min</p>
                        </div>
                        {isUrgent && (
                          <>
                            <span className="text-xl sm:text-2xl text-burgundy-200">:</span>
                            <div className="text-center">
                              <span className="text-3xl sm:text-4xl font-display">
                                {timeLeft.seconds}
                              </span>
                              <p className="text-xs text-burgundy-200 mt-1">sec</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm ${isUrgent ? 'text-orange-100' : 'text-burgundy-100'}`}
                      >
                        Episode airs
                      </p>
                      <p className="font-semibold text-lg">
                        {new Date(currentEpisode.air_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Auto-Pick Warning */}
            {wasAutoPicked && (
              <div
                className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 animate-slide-up"
                style={{ animationDelay: '0.05s' }}
              >
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">You were auto-picked last episode</p>
                  <p className="text-sm text-amber-700">
                    You didn't submit a pick in time, so the system picked for you. Make sure to
                    submit your pick before the deadline!
                  </p>
                </div>
              </div>
            )}

            {/* No Pick Warning */}
            {!pickSubmitted && !isVeryUrgent && isUrgent && (
              <div
                className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3 animate-slide-up"
                style={{ animationDelay: '0.05s' }}
              >
                <Clock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-800">Don't forget to pick!</p>
                  <p className="text-sm text-orange-700">
                    If you don't submit a pick, the system will auto-select your highest-ranked
                    active castaway.
                  </p>
                </div>
              </div>
            )}

            {/* Very Urgent Warning */}
            {!pickSubmitted && isVeryUrgent && (
              <div className="bg-red-50 border border-red-300 rounded-2xl p-4 flex items-start gap-3 animate-pulse">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Less than 30 minutes left!</p>
                  <p className="text-sm text-red-700">
                    Submit your pick now or you'll be auto-picked!
                  </p>
                </div>
              </div>
            )}

            {/* Pick Selection */}
            <div
              className="bg-white rounded-2xl shadow-elevated overflow-hidden animate-slide-up"
              style={{ animationDelay: '0.1s' }}
            >
              <div className="p-6 border-b border-cream-100">
                <h2 className="font-semibold text-neutral-800">Select Your Castaway</h2>
                <p className="text-sm text-neutral-500 mt-1">
                  Choose which player from your roster to play this week
                </p>
              </div>

              <div className="p-6 space-y-4">
                {activeCastaways.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-800 mb-2">
                      No Active Castaways
                    </h3>
                    <p className="text-neutral-500 mb-4">
                      {roster && roster.length > 0
                        ? 'All your castaways have been eliminated. Your season has ended.'
                        : "Your roster is empty. This shouldn't happen - please contact support."}
                    </p>
                  </div>
                ) : (
                  activeCastaways.map((entry) => {
                    const stats = getStatsForCastaway(entry.castaway_id);
                    return (
                      <button
                        key={entry.id}
                        onClick={() => setSelectedCastaway(entry.castaway_id)}
                        className={`w-full p-5 rounded-xl border-2 transition-all text-left flex items-center gap-5 ${
                          selectedCastaway === entry.castaway_id
                            ? 'border-burgundy-500 bg-burgundy-50 shadow-card'
                            : 'border-cream-200 bg-cream-50 hover:border-cream-300 hover:shadow-sm'
                        }`}
                      >
                        {/* Photo */}
                        <img
                          src={getAvatarUrl(
                            entry.castaways?.name || 'Unknown',
                            entry.castaways?.photo_url
                          )}
                          alt={entry.castaways?.name || 'Castaway'}
                          className="w-16 h-16 rounded-xl object-cover"
                        />

                        {/* Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3
                              className={`font-semibold text-lg ${
                                selectedCastaway === entry.castaway_id
                                  ? 'text-burgundy-700'
                                  : 'text-neutral-800'
                              }`}
                            >
                              {entry.castaways?.name}
                            </h3>
                            <span
                              className={`badge text-xs ${
                                entry.castaways?.status === 'active'
                                  ? 'badge-success'
                                  : 'bg-neutral-100 text-neutral-500'
                              }`}
                            >
                              {entry.castaways?.status?.toUpperCase()}
                            </span>
                          </div>

                          {/* Castaway Stats */}
                          {stats && stats.times_picked > 0 && (
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1 text-neutral-500">
                                <Trophy className="w-3.5 h-3.5" />
                                <span>{stats.total_points} pts total</span>
                              </div>
                              <div className="flex items-center gap-1 text-neutral-500">
                                <Target className="w-3.5 h-3.5" />
                                <span>{stats.times_picked}x picked</span>
                              </div>
                              <div className="flex items-center gap-1 text-neutral-500">
                                <TrendingUp className="w-3.5 h-3.5" />
                                <span>{stats.avg_points} avg</span>
                              </div>
                            </div>
                          )}
                          {(!stats || stats.times_picked === 0) && (
                            <p className="text-sm text-neutral-400">Not yet picked this season</p>
                          )}
                        </div>

                        {/* Selection indicator */}
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            selectedCastaway === entry.castaway_id
                              ? 'border-burgundy-500 bg-burgundy-500'
                              : 'border-cream-300'
                          }`}
                        >
                          {selectedCastaway === entry.castaway_id && (
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Submit */}
              <div className="p-6 border-t border-cream-100 bg-cream-50/50">
                {/* Success Message */}
                {showSuccess && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-green-800">Pick Saved!</p>
                      <p className="text-sm text-green-600">You can change it until picks lock.</p>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {mutationError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-red-800">Failed to Save</p>
                      <p className="text-sm text-red-600">{mutationError}</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSubmitPick}
                  disabled={!selectedCastaway || submitPickMutation.isPending}
                  className={`w-full btn ${
                    selectedCastaway
                      ? 'btn-primary shadow-card'
                      : 'bg-cream-200 text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  {submitPickMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : pickSubmitted ? (
                    'Update Pick'
                  ) : selectedCastaway ? (
                    'Confirm Pick'
                  ) : (
                    'Select a Castaway'
                  )}
                </button>
                {pickSubmitted && !showSuccess && (
                  <p className="text-center text-sm text-neutral-500 mt-3">
                    Current pick:{' '}
                    <span className="font-medium text-neutral-700">
                      {
                        roster?.find((r) => r.castaway_id === currentPick?.castaway_id)?.castaways
                          ?.name
                      }
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Previous Picks */}
            {previousPicks && previousPicks.length > 0 && (
              <div
                className="bg-white rounded-2xl shadow-elevated p-6 animate-slide-up"
                style={{ animationDelay: '0.2s' }}
              >
                <h3 className="font-semibold text-neutral-800 mb-4">Previous Picks</h3>
                <div className="space-y-3">
                  {previousPicks.map((pick) => (
                    <div
                      key={pick.id}
                      className="flex items-center justify-between p-3 bg-cream-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-neutral-500">
                          Ep {pick.episodes?.number}
                        </span>
                        <span className="font-medium text-neutral-800">
                          {pick.castaways?.name || 'Unknown'}
                        </span>
                      </div>
                      <span
                        className={`badge ${pick.points_earned >= 0 ? 'badge-success' : 'bg-red-100 text-red-700'}`}
                      >
                        {pick.points_earned >= 0 ? '+' : ''}
                        {pick.points_earned} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
