import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { AppNav } from '@/components/AppNav';

interface LeagueMember {
  id: string;
  user_id: string;
  total_points: number;
  rank: number | null;
  users: {
    id: string;
    display_name: string;
  };
}

interface League {
  id: string;
  name: string;
  code: string;
  season_id: string;
}

interface UserProfile {
  id: string;
  display_name: string;
}

export function Leaderboard() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!user?.id,
  });

  const { data: league } = useQuery({
    queryKey: ['league', leagueId],
    queryFn: async () => {
      if (!leagueId) throw new Error('No league ID');
      const { data, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', leagueId)
        .single();
      if (error) throw error;
      return data as League;
    },
    enabled: !!leagueId,
  });

  const { data: members, isLoading } = useQuery({
    queryKey: ['leaderboard', leagueId],
    queryFn: async () => {
      if (!leagueId) throw new Error('No league ID');
      const { data, error } = await supabase
        .from('league_members')
        .select('id, user_id, total_points, rank, users(id, display_name)')
        .eq('league_id', leagueId)
        .order('total_points', { ascending: false });
      if (error) throw error;
      return data as LeagueMember[];
    },
    enabled: !!leagueId,
  });

  const getRankDisplay = (index: number) => {
    if (index === 0) return { emoji: '🥇', bg: 'bg-yellow-100', text: 'text-yellow-700' };
    if (index === 1) return { emoji: '🥈', bg: 'bg-gray-100', text: 'text-gray-700' };
    if (index === 2) return { emoji: '🥉', bg: 'bg-orange-100', text: 'text-orange-700' };
    return { emoji: null, bg: 'bg-cream-50', text: 'text-neutral-600' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
      <AppNav
        userName={profile?.display_name}
        userInitial={profile?.display_name?.charAt(0).toUpperCase()}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                to="/dashboard"
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-display text-neutral-800">
                Leaderboard
              </h1>
            </div>
            <p className="text-neutral-500">{league?.name || 'Loading...'}</p>
          </div>

          <div className="text-right">
            <p className="text-sm text-neutral-500">League Code</p>
            <p className="font-mono font-bold text-burgundy-600">{league?.code}</p>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white rounded-2xl shadow-elevated overflow-hidden animate-slide-up">
          <div className="p-6 border-b border-cream-100">
            <h2 className="font-semibold text-neutral-800">Standings</h2>
            <p className="text-sm text-neutral-500 mt-1">
              {members?.length || 0} players
            </p>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 mx-auto border-2 border-burgundy-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-neutral-500 mt-4">Loading standings...</p>
            </div>
          ) : members?.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-neutral-500">No players in this league yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-cream-100">
              {members?.map((member, index) => {
                const rankStyle = getRankDisplay(index);
                const isCurrentUser = member.user_id === user?.id;

                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-4 p-5 transition-colors ${
                      isCurrentUser ? 'bg-burgundy-50' : 'hover:bg-cream-50'
                    }`}
                  >
                    {/* Rank */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${rankStyle.bg} ${rankStyle.text}`}>
                      {rankStyle.emoji || index + 1}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1">
                      <p className={`font-semibold ${isCurrentUser ? 'text-burgundy-700' : 'text-neutral-800'}`}>
                        {member.users?.display_name}
                        {isCurrentUser && <span className="ml-2 text-xs text-burgundy-500">(You)</span>}
                      </p>
                    </div>

                    {/* Points */}
                    <div className="text-right">
                      <p className="text-2xl font-display text-neutral-800">
                        {member.total_points}
                      </p>
                      <p className="text-xs text-neutral-400">points</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Your Position Card */}
        {user && members && (
          <div className="mt-6 bg-gradient-to-r from-burgundy-500 to-burgundy-600 rounded-2xl p-6 text-white shadow-elevated animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-burgundy-100 text-sm">Your Position</p>
                <p className="text-3xl font-display mt-1">
                  #{members.findIndex(m => m.user_id === user.id) + 1}
                </p>
              </div>
              <div className="text-right">
                <p className="text-burgundy-100 text-sm">Your Points</p>
                <p className="text-3xl font-display mt-1">
                  {members.find(m => m.user_id === user.id)?.total_points || 0}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
