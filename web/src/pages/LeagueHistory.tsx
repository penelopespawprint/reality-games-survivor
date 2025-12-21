import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, History, Trophy, Calendar, Users, Crown, Medal, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function LeagueHistory() {
  const { id: leagueId } = useParams<{ id: string }>();

  // Fetch league details
  const { data: league, isLoading: leagueLoading } = useQuery({
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

  // Fetch past seasons for this league (via same league code or commissioner)
  const { data: pastSeasons, isLoading: historyLoading } = useQuery({
    queryKey: ['league-history', league?.commissioner_id],
    queryFn: async () => {
      if (!league?.commissioner_id) throw new Error('No commissioner');

      // Get leagues from past seasons by same commissioner with same name pattern
      const { data, error } = await supabase
        .from('leagues')
        .select(`
          *,
          seasons(*),
          league_members(
            total_points,
            rank,
            users(display_name, avatar_url)
          )
        `)
        .eq('commissioner_id', league.commissioner_id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!league?.commissioner_id,
  });

  // Fetch episode history for current league
  const { data: episodes } = useQuery({
    queryKey: ['league-episodes', leagueId],
    queryFn: async () => {
      if (!leagueId || !league?.season_id) throw new Error('Missing data');
      const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .eq('season_id', league.season_id)
        .eq('is_scored', true)
        .order('number', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!leagueId && !!league?.season_id,
  });

  const isLoading = leagueLoading || historyLoading;

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
          to={`/leagues/${leagueId}`}
          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <History className="h-6 w-6 text-gold-500" />
            League History
          </h1>
          <p className="text-burgundy-200">{league?.name}</p>
        </div>
      </div>

      {/* Current Season Episode History */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 mb-6">
        <div className="px-4 py-3 border-b border-white/10">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gold-500" />
            Season {league?.seasons?.number} Episodes
          </h2>
        </div>

        {episodes && episodes.length > 0 ? (
          <div className="divide-y divide-white/5">
            {episodes.map((episode: any) => (
              <Link
                key={episode.id}
                to={`/leagues/${leagueId}/episodes/${episode.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
              >
                <div className="w-10 h-10 bg-burgundy-700 rounded-lg flex items-center justify-center">
                  <span className="text-gold-500 font-bold">{episode.number}</span>
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">
                    Episode {episode.number}
                    {episode.title && `: ${episode.title}`}
                  </p>
                  <p className="text-burgundy-300 text-sm">
                    {new Date(episode.air_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <Trophy className="h-5 w-5 text-burgundy-400" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Calendar className="h-12 w-12 text-burgundy-400 mx-auto mb-4" />
            <p className="text-burgundy-200">No scored episodes yet.</p>
            <p className="text-burgundy-400 text-sm">Results will appear after the first episode is scored.</p>
          </div>
        )}
      </div>

      {/* Past Seasons */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
        <div className="px-4 py-3 border-b border-white/10">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold-500" />
            Past Seasons
          </h2>
        </div>

        {pastSeasons && pastSeasons.length > 0 ? (
          <div className="divide-y divide-white/5">
            {pastSeasons.map((pastLeague: any) => {
              const winner = pastLeague.league_members?.find((m: any) => m.rank === 1);
              const topThree = pastLeague.league_members
                ?.sort((a: any, b: any) => (a.rank || 999) - (b.rank || 999))
                .slice(0, 3);

              return (
                <div key={pastLeague.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-medium">{pastLeague.name}</h3>
                      <p className="text-burgundy-300 text-sm">
                        Season {pastLeague.seasons?.number}: {pastLeague.seasons?.name}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">
                      Completed
                    </span>
                  </div>

                  {/* Top 3 */}
                  {topThree && topThree.length > 0 && (
                    <div className="space-y-2">
                      {topThree.map((member: any, index: number) => (
                        <div
                          key={member.users?.display_name || index}
                          className={`flex items-center gap-3 p-2 rounded-lg ${
                            index === 0 ? 'bg-gold-500/10' : 'bg-burgundy-800/50'
                          }`}
                        >
                          <div className="w-6 h-6 flex items-center justify-center">
                            {index === 0 ? (
                              <Crown className="h-5 w-5 text-gold-500" />
                            ) : index === 1 ? (
                              <Medal className="h-5 w-5 text-gray-400" />
                            ) : (
                              <Medal className="h-5 w-5 text-amber-700" />
                            )}
                          </div>
                          {member.users?.avatar_url ? (
                            <img
                              src={member.users.avatar_url}
                              alt=""
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 bg-burgundy-700 rounded-full flex items-center justify-center">
                              <Users className="h-3 w-3 text-burgundy-400" />
                            </div>
                          )}
                          <span className={`flex-1 ${index === 0 ? 'text-gold-400 font-medium' : 'text-white'}`}>
                            {member.users?.display_name}
                          </span>
                          <span className={`font-bold ${index === 0 ? 'text-gold-500' : 'text-burgundy-300'}`}>
                            {member.total_points} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between text-sm text-burgundy-400">
                    <span>
                      {pastLeague.league_members?.length || 0} players
                    </span>
                    <span>
                      Finished {new Date(pastLeague.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <History className="h-12 w-12 text-burgundy-400 mx-auto mb-4" />
            <p className="text-burgundy-200">No past seasons found.</p>
            <p className="text-burgundy-400 text-sm">Previous league results will appear here.</p>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="mt-6 bg-gradient-to-r from-gold-500/10 to-amber-500/10 border border-gold-500/30 rounded-xl p-4">
        <h3 className="text-white font-medium mb-3 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-gold-500" />
          All-Time Stats
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-white">{(pastSeasons?.length || 0) + 1}</p>
            <p className="text-burgundy-300 text-xs">Seasons</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{episodes?.length || 0}</p>
            <p className="text-burgundy-300 text-xs">Episodes Scored</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">
              {pastSeasons?.reduce((sum: number, l: any) => sum + (l.league_members?.length || 0), 0) || 0}
            </p>
            <p className="text-burgundy-300 text-xs">Total Players</p>
          </div>
        </div>
      </div>
    </div>
  );
}
