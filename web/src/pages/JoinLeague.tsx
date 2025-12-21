import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Users, Lock, DollarSign, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface League {
  id: string;
  name: string;
  code: string;
  max_players: number;
  require_donation: boolean;
  donation_amount: number | null;
  donation_notes: string | null;
  status: string;
  seasons: {
    number: number;
    name: string;
  };
}

export default function JoinLeague() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Check if user is logged in
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  // Fetch league by code
  const { data: league, isLoading: leagueLoading, error: leagueError } = useQuery({
    queryKey: ['league', code],
    queryFn: async () => {
      if (!code) throw new Error('No code provided');

      const { data, error } = await supabase
        .from('leagues')
        .select('*, seasons(number, name)')
        .eq('code', code.toUpperCase())
        .single();

      if (error) throw error;
      return data as League;
    },
    enabled: !!code,
  });

  // Get member count
  const { data: memberCount } = useQuery({
    queryKey: ['league-members', league?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('league_members')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', league!.id);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!league?.id,
  });

  // Check if already a member
  const { data: isMember } = useQuery({
    queryKey: ['is-member', league?.id, session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id || !league?.id) return false;

      const { data, error } = await supabase
        .from('league_members')
        .select('id')
        .eq('league_id', league.id)
        .eq('user_id', session.user.id)
        .single();

      return !!data && !error;
    },
    enabled: !!session?.user?.id && !!league?.id,
  });

  // Join league mutation
  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!session?.access_token || !league) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/leagues/${league.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 402) {
          // Payment required - redirect to checkout
          window.location.href = data.checkout_url;
          return null;
        }
        throw new Error(data.error || 'Failed to join league');
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data) {
        navigate(`/leagues/${league!.id}`);
      }
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionLoading && !session && code) {
      navigate(`/login?redirect=/join/${code}`);
    }
  }, [session, sessionLoading, code, navigate]);

  if (sessionLoading || leagueLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  if (leagueError || !league) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 flex items-center justify-center px-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 max-w-md text-center">
          <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold text-white mb-2">
            League Not Found
          </h1>
          <p className="text-burgundy-200 mb-6">
            The invite code "{code}" doesn't match any league. Check the code and try again.
          </p>
          <Link
            to="/dashboard"
            className="inline-block bg-gold-500 hover:bg-gold-400 text-burgundy-900 font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (isMember) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 flex items-center justify-center px-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 max-w-md text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold text-white mb-2">
            Already a Member
          </h1>
          <p className="text-burgundy-200 mb-6">
            You're already a member of {league.name}!
          </p>
          <Link
            to={`/leagues/${league.id}`}
            className="inline-block bg-gold-500 hover:bg-gold-400 text-burgundy-900 font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Go to League
          </Link>
        </div>
      </div>
    );
  }

  const isFull = memberCount !== undefined && memberCount >= league.max_players;

  return (
    <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 flex items-center justify-center px-4">
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 max-w-md w-full">
        {/* League Info */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-display font-bold text-white mb-2">
            {league.name}
          </h1>
          <p className="text-burgundy-200">
            Season {league.seasons.number}: {league.seasons.name}
          </p>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-6 mb-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gold-500">
              <Users className="h-5 w-5" />
              <span className="text-xl font-bold">{memberCount}/{league.max_players}</span>
            </div>
            <p className="text-burgundy-300 text-sm">Players</p>
          </div>

          {league.require_donation && league.donation_amount && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gold-500">
                <DollarSign className="h-5 w-5" />
                <span className="text-xl font-bold">{league.donation_amount}</span>
              </div>
              <p className="text-burgundy-300 text-sm">Entry Fee</p>
            </div>
          )}
        </div>

        {/* Donation Notes */}
        {league.donation_notes && (
          <div className="bg-burgundy-800/50 rounded-lg p-4 mb-6">
            <p className="text-burgundy-200 text-sm">{league.donation_notes}</p>
          </div>
        )}

        {/* Join Form */}
        {isFull ? (
          <div className="text-center">
            <p className="text-red-400 mb-4">This league is full.</p>
            <Link
              to="/dashboard"
              className="inline-block bg-burgundy-700 hover:bg-burgundy-600 text-white py-2 px-6 rounded-lg transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              joinMutation.mutate();
            }}
          >
            {/* Password field if league has one */}
            <div className="mb-6">
              <label className="block text-burgundy-200 text-sm mb-2">
                <Lock className="h-4 w-4 inline mr-1" />
                League Password (if required)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg px-4 py-3 text-white placeholder-burgundy-400 focus:outline-none focus:border-gold-500"
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-6">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={joinMutation.isPending}
              className="w-full bg-gold-500 hover:bg-gold-400 disabled:bg-gold-600 text-burgundy-900 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {joinMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Joining...
                </>
              ) : league.require_donation ? (
                <>
                  <DollarSign className="h-5 w-5" />
                  Pay ${league.donation_amount} & Join
                </>
              ) : (
                'Join League'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
