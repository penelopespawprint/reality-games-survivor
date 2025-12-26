import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Crown, Share2, Loader2, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useState } from 'react';

export default function PublicLeaderboard() {
  const { code } = useParams<{ code: string }>();
  const [copied, setCopied] = useState(false);

  // Fetch league by code
  const {
    data: league,
    isLoading: leagueLoading,
    error,
  } = useQuery({
    queryKey: ['public-league', code],
    queryFn: async () => {
      if (!code) throw new Error('No league code');
      const { data, error } = await supabase
        .from('leagues')
        .select('*, seasons(*)')
        .eq('code', code)
        .eq('is_public', true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!code,
  });

  // Fetch league members with standings
  const { data: members } = useQuery({
    queryKey: ['public-league-members', league?.id],
    queryFn: async () => {
      if (!league?.id) throw new Error('No league ID');
      const { data, error } = await supabase
        .from('league_members')
        .select('*, users(display_name, avatar_url)')
        .eq('league_id', league.id)
        .order('total_points', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!league?.id,
  });

  const shareUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (leagueLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex items-center justify-center p-4">
        <div className="text-center">
          <Trophy className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold text-neutral-800 mb-2">
            Leaderboard Not Found
          </h1>
          <p className="text-neutral-500 mb-6">This league doesn't exist or isn't public.</p>
          <Link to="/" className="btn btn-primary inline-block">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-cream-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-display font-bold text-neutral-800">{league.name}</h1>
              <p className="text-neutral-500 text-sm">
                Season {league.seasons?.number} • {members?.length || 0} players
              </p>
            </div>
            <button
              onClick={shareUrl}
              className="flex items-center gap-2 px-3 py-2 bg-burgundy-100 hover:bg-burgundy-200 text-burgundy-600 rounded-xl transition-colors"
            >
              <Share2 className="h-4 w-4" />
              {copied ? 'Copied!' : 'Share'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4">
        {/* Top 3 Podium */}
        {members && members.length >= 3 && (
          <div className="flex items-end justify-center gap-2 mb-8 pt-8">
            {/* 2nd Place */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-2 border border-gray-300">
                <span className="text-2xl">🥈</span>
              </div>
              <p className="text-neutral-800 font-medium text-sm truncate max-w-20">
                {members[1]?.users?.display_name}
              </p>
              <p className="text-neutral-500 text-xs">{members[1]?.total_points || 0} pts</p>
              <div className="w-20 h-20 bg-gray-200 rounded-t-xl mt-2" />
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center -mt-8">
              <Crown className="h-8 w-8 text-burgundy-500 mb-1" />
              <div className="w-20 h-20 bg-burgundy-100 rounded-full flex items-center justify-center mb-2 border-2 border-burgundy-500">
                <span className="text-3xl">🥇</span>
              </div>
              <p className="text-neutral-800 font-bold text-sm truncate max-w-24">
                {members[0]?.users?.display_name}
              </p>
              <p className="text-burgundy-500 text-xs font-medium">
                {members[0]?.total_points || 0} pts
              </p>
              <div className="w-24 h-28 bg-burgundy-100 rounded-t-xl mt-2" />
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-2 border border-amber-300">
                <span className="text-2xl">🥉</span>
              </div>
              <p className="text-neutral-800 font-medium text-sm truncate max-w-20">
                {members[2]?.users?.display_name}
              </p>
              <p className="text-neutral-500 text-xs">{members[2]?.total_points || 0} pts</p>
              <div className="w-20 h-16 bg-amber-100 rounded-t-xl mt-2" />
            </div>
          </div>
        )}

        {/* Full Standings */}
        <div className="bg-white rounded-2xl shadow-card border border-cream-200">
          <div className="px-4 py-3 border-b border-cream-200">
            <h2 className="text-lg font-display font-bold text-neutral-800 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-burgundy-500" />
              Full Standings
            </h2>
          </div>

          <div className="divide-y divide-cream-100">
            {members?.map((member: any, index: number) => (
              <div
                key={member.id}
                className={`flex items-center gap-3 px-4 py-3 ${index < 3 ? 'bg-burgundy-50' : ''}`}
              >
                <div className="w-8 h-8 flex items-center justify-center">
                  {index === 0 ? (
                    <Crown className="h-5 w-5 text-burgundy-500" />
                  ) : (
                    <span
                      className={`font-bold ${
                        index < 3 ? 'text-burgundy-500' : 'text-neutral-400'
                      }`}
                    >
                      {index + 1}
                    </span>
                  )}
                </div>

                {member.users?.avatar_url ? (
                  <img
                    src={member.users.avatar_url}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-cream-100 rounded-full flex items-center justify-center border border-cream-200">
                    <Users className="h-4 w-4 text-neutral-400" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-neutral-800 font-medium truncate">
                    {member.users?.display_name}
                  </p>
                </div>

                <p
                  className={`font-bold ${index === 0 ? 'text-burgundy-500' : 'text-neutral-800'}`}
                >
                  {member.total_points || 0}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Join CTA */}
        <div className="mt-6 bg-burgundy-50 border border-burgundy-200 rounded-2xl p-6 text-center">
          <h3 className="text-neutral-800 font-display font-bold mb-2">Join the Competition</h3>
          <p className="text-neutral-600 text-sm mb-4">
            Create your own league and compete with friends!
          </p>
          <Link to="/signup" className="btn btn-primary inline-block">
            Sign Up Free
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-neutral-500 text-sm pb-8">
          <p>Reality Games Fantasy League</p>
          <p>
            Season {league.seasons?.number}: {league.seasons?.name}
          </p>
        </div>
      </div>
    </div>
  );
}
