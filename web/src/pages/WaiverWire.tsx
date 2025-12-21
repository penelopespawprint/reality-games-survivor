import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowUp, ArrowDown, Check, Loader2, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Navigation } from '@/components/Navigation';

export default function WaiverWire() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const queryClient = useQueryClient();
  const [rankings, setRankings] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch league details
  const { data: league } = useQuery({
    queryKey: ['league', leagueId],
    queryFn: async () => {
      if (!leagueId) throw new Error('No league ID');
      const { data, error } = await supabase
        .from('leagues')
        .select('*, seasons(*)')
        .eq('id', leagueId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!leagueId,
  });

  // Fetch current episode for waiver window info
  const { data: currentEpisode } = useQuery({
    queryKey: ['current-episode', league?.season_id],
    queryFn: async () => {
      if (!league?.season_id) throw new Error('No season');
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .eq('season_id', league.season_id)
        .lte('waiver_opens_at', now)
        .gte('waiver_closes_at', now)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!league?.season_id,
  });

  // Fetch available castaways (eliminated, not on any roster in this league)
  const { data: availableCastaways } = useQuery({
    queryKey: ['available-castaways', leagueId],
    queryFn: async () => {
      if (!leagueId || !league?.season_id) throw new Error('Missing data');

      // Get all castaways for the season
      const { data: castaways, error: castawayError } = await supabase
        .from('castaways')
        .select('*')
        .eq('season_id', league.season_id)
        .eq('status', 'active');

      if (castawayError) throw castawayError;

      // Get rostered castaways in this league
      const { data: rostered, error: rosterError } = await supabase
        .from('rosters')
        .select('castaway_id')
        .eq('league_id', leagueId)
        .is('dropped_at', null);

      if (rosterError) throw rosterError;

      const rosteredIds = new Set(rostered?.map(r => r.castaway_id));
      return castaways?.filter(c => !rosteredIds.has(c.id)) || [];
    },
    enabled: !!leagueId && !!league?.season_id,
  });

  // Fetch my eliminated castaways (need replacement)
  const { data: myEliminated } = useQuery({
    queryKey: ['my-eliminated', leagueId],
    queryFn: async () => {
      if (!leagueId || !currentUser) throw new Error('Missing data');
      const { data, error } = await supabase
        .from('rosters')
        .select('*, castaways(*)')
        .eq('league_id', leagueId)
        .eq('user_id', currentUser.id)
        .is('dropped_at', null);

      if (error) throw error;
      return data?.filter(r => r.castaways?.status === 'eliminated') || [];
    },
    enabled: !!leagueId && !!currentUser,
  });

  // Fetch existing rankings
  const { data: existingRankings } = useQuery({
    queryKey: ['waiver-rankings', leagueId, currentEpisode?.id],
    queryFn: async () => {
      if (!leagueId || !currentUser || !currentEpisode) return null;
      const { data, error } = await (supabase as any)
        .from('waiver_rankings')
        .select('*')
        .eq('league_id', leagueId)
        .eq('user_id', currentUser.id)
        .eq('episode_id', currentEpisode.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.rankings) {
        setRankings(data.rankings as string[]);
      }
      return data;
    },
    enabled: !!leagueId && !!currentUser && !!currentEpisode,
  });

  // Submit rankings mutation
  const submitRankings = useMutation({
    mutationFn: async (newRankings: string[]) => {
      if (!leagueId || !currentUser || !currentEpisode) throw new Error('Missing data');

      const { error } = await (supabase as any)
        .from('waiver_rankings')
        .upsert({
          league_id: leagueId,
          user_id: currentUser.id,
          episode_id: currentEpisode.id,
          rankings: newRankings,
        }, {
          onConflict: 'league_id,user_id,episode_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['waiver-rankings'] });
    },
  });

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newRankings = [...rankings];
    [newRankings[index - 1], newRankings[index]] = [newRankings[index], newRankings[index - 1]];
    setRankings(newRankings);
    setHasChanges(true);
  };

  const moveDown = (index: number) => {
    if (index === rankings.length - 1) return;
    const newRankings = [...rankings];
    [newRankings[index], newRankings[index + 1]] = [newRankings[index + 1], newRankings[index]];
    setRankings(newRankings);
    setHasChanges(true);
  };

  const addToRankings = (castawayId: string) => {
    if (!rankings.includes(castawayId)) {
      setRankings([...rankings, castawayId]);
      setHasChanges(true);
    }
  };

  const removeFromRankings = (castawayId: string) => {
    setRankings(rankings.filter(id => id !== castawayId));
    setHasChanges(true);
  };

  const waiverOpen = !!currentEpisode;
  const needsWaiver = (myEliminated?.length || 0) > 0;

  if (!waiverOpen) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 p-4 pb-24">
          <div className="flex items-center gap-3 mb-6">
          <Link
            to={`/leagues/${leagueId}`}
            className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
          >
            <ArrowLeft className="h-5 w-5 text-neutral-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-neutral-800">Waiver Wire</h1>
            <p className="text-neutral-500">{league?.name}</p>
          </div>
        </div>

          <div className="bg-white rounded-2xl shadow-card p-8 border border-cream-200 text-center">
            <Clock className="h-12 w-12 text-burgundy-500 mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-2">Waiver Window Closed</h2>
            <p className="text-neutral-500">
              The waiver wire opens Saturday at 12pm PST after results are posted.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to={`/leagues/${leagueId}`}
            className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
          >
            <ArrowLeft className="h-5 w-5 text-neutral-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-neutral-800">Waiver Wire</h1>
            <p className="text-neutral-500">{league?.name}</p>
          </div>
        </div>

      {/* Status Alert */}
      {needsWaiver && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 font-medium">Replacement Needed</p>
            <p className="text-amber-700 text-sm">
              {myEliminated?.map(r => r.castaways?.name).join(', ')} {myEliminated?.length === 1 ? 'was' : 'were'} eliminated.
              Rank your preferences below.
            </p>
          </div>
        </div>
      )}

      {/* Waiver Deadline */}
      <div className="bg-white rounded-2xl shadow-card p-4 border border-cream-200 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-neutral-500 text-sm">Waiver closes</p>
            <p className="text-neutral-800 font-medium">
              {currentEpisode?.waiver_closes_at
                ? new Date(currentEpisode.waiver_closes_at).toLocaleString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : 'TBD'}
            </p>
          </div>
          {existingRankings && (
            <div className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              <span className="text-sm font-medium">Submitted</span>
            </div>
          )}
        </div>
      </div>

      {/* My Rankings */}
      <div className="bg-white rounded-2xl shadow-card p-4 border border-cream-200 mb-6">
        <h2 className="text-lg font-display font-bold text-neutral-800 mb-4">My Rankings</h2>

        {rankings.length > 0 ? (
          <div className="space-y-2 mb-4">
            {rankings.map((castawayId, index) => {
              const castaway = availableCastaways?.find(c => c.id === castawayId);
              return (
                <div
                  key={castawayId}
                  className="flex items-center gap-3 p-3 bg-cream-50 rounded-xl border border-cream-200"
                >
                  <span className="w-6 h-6 bg-burgundy-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-neutral-800 font-medium">{castaway?.name || 'Unknown'}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="p-1 hover:bg-cream-200 rounded disabled:opacity-30 transition-colors"
                    >
                      <ArrowUp className="h-4 w-4 text-neutral-500" />
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === rankings.length - 1}
                      className="p-1 hover:bg-cream-200 rounded disabled:opacity-30 transition-colors"
                    >
                      <ArrowDown className="h-4 w-4 text-neutral-500" />
                    </button>
                    <button
                      onClick={() => removeFromRankings(castawayId)}
                      className="p-1 hover:bg-red-100 rounded text-red-500 ml-2 transition-colors"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-neutral-500 text-center py-4 mb-4">
            Add castaways from the list below to rank your preferences.
          </p>
        )}

        <button
          onClick={() => submitRankings.mutate(rankings)}
          disabled={!hasChanges || submitRankings.isPending || rankings.length === 0}
          className="w-full btn btn-primary flex items-center justify-center gap-2"
        >
          {submitRankings.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Check className="h-5 w-5" />
              Submit Rankings
            </>
          )}
        </button>
      </div>

      {/* Available Castaways */}
      <div className="bg-white rounded-2xl shadow-card p-4 border border-cream-200">
        <h2 className="text-lg font-display font-bold text-neutral-800 mb-4">Available Castaways</h2>

        {availableCastaways && availableCastaways.length > 0 ? (
          <div className="space-y-2">
            {availableCastaways
              .filter(c => !rankings.includes(c.id))
              .map((castaway) => (
                <div
                  key={castaway.id}
                  className="flex items-center gap-3 p-3 bg-cream-50 rounded-xl border border-cream-200"
                >
                  <div className="flex-1">
                    <p className="text-neutral-800 font-medium">{castaway.name}</p>
                    <p className="text-neutral-500 text-sm">{castaway.tribe_original}</p>
                  </div>
                  <button
                    onClick={() => addToRankings(castaway.id)}
                    className="px-3 py-1 bg-burgundy-500 hover:bg-burgundy-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Add
                  </button>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-neutral-500 text-center py-4">
            No castaways available on waivers.
          </p>
        )}
        </div>
      </div>
    </>
  );
}
