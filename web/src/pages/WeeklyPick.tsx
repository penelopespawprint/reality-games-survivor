/**
 * Weekly Pick Page
 *
 * Allows users to select their castaway pick for the current episode.
 * Refactored from 770 lines to use extracted sub-components.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { apiPost } from '@/lib/api';
import { Navigation } from '@/components/Navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import {
  PickCountdownBanner,
  PickWarnings,
  PickSelectionCard,
  PreviousPicksCard,
  DraftIncompleteCard,
  NoEpisodeCard,
  LockedPickCard,
} from '@/components/picks';
import { useLeague, useRoster } from '@/lib/hooks';

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

  // Use shared hooks
  const { data: league } = useLeague(leagueId);
  const { data: roster, isLoading: rosterLoading } = useRoster(leagueId, user?.id);

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
      return data;
    },
    enabled: !!league?.season_id,
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
      return data;
    },
    enabled: !!leagueId && !!user?.id,
  });

  // Fetch castaway stats
  const { data: castawayStats } = useQuery({
    queryKey: ['castawayStats', leagueId, user?.id],
    queryFn: async () => {
      if (!leagueId || !user?.id || !roster) throw new Error('Missing data');
      const castawayIds = roster.map((r) => r.castaway_id);

      const { data, error } = await supabase
        .from('weekly_picks')
        .select('castaway_id, points_earned')
        .eq('league_id', leagueId)
        .eq('user_id', user.id)
        .in('castaway_id', castawayIds)
        .in('status', ['locked', 'auto_picked']);

      if (error) throw error;

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

  const wasAutoPicked = previousPicks?.[0]?.status === 'auto_picked';

  // Submit pick mutation
  const submitPickMutation = useMutation({
    mutationFn: async (castawayId: string) => {
      if (!leagueId || !currentEpisode?.id) {
        throw new Error('Missing required data');
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await apiPost(
        `/leagues/${leagueId}/picks`,
        { castaway_id: castawayId, episode_id: currentEpisode.id },
        session.access_token
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['currentPick', leagueId, currentEpisode?.id, user?.id],
      });
      setShowSuccess(true);
      setMutationError(null);
      setTimeout(() => setShowSuccess(false), 3000);
    },
    onError: (error: Error) => {
      setMutationError(error.message || 'Failed to save pick. Please try again.');
      setShowSuccess(false);
    },
  });

  // Calculate countdown
  useEffect(() => {
    if (!currentEpisode?.picks_lock_at) return;

    const calculateTimeLeft = () => {
      const lockTime = new Date(currentEpisode.picks_lock_at).getTime();
      const now = Date.now();
      const diff = Math.max(0, lockTime - now);

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
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
  const timeExpired =
    currentEpisode?.picks_lock_at && new Date(currentEpisode.picks_lock_at) <= new Date();
  const isLocked = currentPick?.status === 'locked' || timeExpired;
  const activeCastaways = roster?.filter((r) => r.castaways?.status === 'active') || [];
  const isLoading = !league || rosterLoading;
  const draftCompleted = draftStatus?.draft_status === 'completed';

  // Urgency calculations
  const totalMinutesLeft = timeLeft.days * 24 * 60 + timeLeft.hours * 60 + timeLeft.minutes;
  const isVeryUrgent = totalMinutesLeft <= 30 && totalMinutesLeft > 0;
  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 2;

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

        {/* Conditional Content */}
        {!draftCompleted ? (
          <DraftIncompleteCard leagueId={leagueId!} />
        ) : !currentEpisode ? (
          <NoEpisodeCard leagueId={leagueId!} />
        ) : isLocked ? (
          <LockedPickCard
            leagueId={leagueId!}
            episode={currentEpisode}
            roster={roster}
            currentPickCastawayId={currentPick?.castaway_id}
          />
        ) : (
          <div className="space-y-6">
            <PickCountdownBanner episode={currentEpisode} timeLeft={timeLeft} />

            <PickWarnings
              wasAutoPicked={wasAutoPicked}
              pickSubmitted={pickSubmitted}
              isUrgent={isUrgent}
              isVeryUrgent={isVeryUrgent}
            />

            <PickSelectionCard
              roster={roster}
              activeCastaways={activeCastaways}
              selectedCastaway={selectedCastaway}
              currentPickCastawayId={currentPick?.castaway_id}
              pickSubmitted={pickSubmitted}
              showSuccess={showSuccess}
              mutationError={mutationError}
              isPending={submitPickMutation.isPending}
              castawayStats={castawayStats}
              onSelect={setSelectedCastaway}
              onSubmit={handleSubmitPick}
            />

            {previousPicks && previousPicks.length > 0 && (
              <PreviousPicksCard picks={previousPicks as any} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
