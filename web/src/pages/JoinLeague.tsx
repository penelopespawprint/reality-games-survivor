import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Users, Lock, DollarSign, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { api, apiWithAuth } from '../lib/api';
import { Navigation } from '@/components/Navigation';

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

  // Fetch league by code via API (bypasses RLS) - with automatic retry
  const {
    data: leagueData,
    isLoading: leagueLoading,
    error: leagueError,
  } = useQuery({
    queryKey: ['league-by-code', code],
    queryFn: async () => {
      if (!code) throw new Error('No code provided');

      const result = await api<{
        league: League & { has_password: boolean; member_count: number };
      }>(`/leagues/code/${code.toUpperCase()}`);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data?.league;
    },
    enabled: !!code,
  });

  const league = leagueData;
  const memberCount = leagueData?.member_count;

  // Check if already a member via API - with automatic retry
  const { data: isMember } = useQuery({
    queryKey: ['is-member', league?.id, session?.user?.id],
    queryFn: async () => {
      if (!session?.access_token || !league?.id) return false;

      const result = await apiWithAuth<{ paid: boolean }>(
        `/leagues/${league.id}/join/status`,
        session.access_token
      );

      return result.data?.paid ?? false;
    },
    enabled: !!session?.access_token && !!league?.id,
  });

  // Join league mutation - with automatic retry
  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!session?.access_token || !league) {
        throw new Error('Not authenticated');
      }

      const result = await apiWithAuth<{ membership: unknown }>(
        `/leagues/${league.id}/join`,
        session.access_token,
        { method: 'POST', body: JSON.stringify({ password }) }
      );

      if (result.status === 402) {
        // Payment required - create checkout session and redirect to Stripe
        const checkoutResult = await apiWithAuth<{ checkout_url: string }>(
          `/leagues/${league.id}/join/checkout`,
          session.access_token,
          { method: 'POST' }
        );

        if (checkoutResult.error) {
          throw new Error(checkoutResult.error || 'Failed to create checkout session');
        }

        if (checkoutResult.data?.checkout_url) {
          window.location.href = checkoutResult.data.checkout_url;
        }
        return null;
      }

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
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
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
        </div>
      </>
    );
  }

  if (leagueError || !league) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-elevated p-8 border border-cream-200 max-w-md text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-display font-bold text-neutral-800 mb-2">
              League Not Found
            </h1>
            <p className="text-neutral-500 mb-6">
              The invite code "{code}" doesn't match any league. Check the code and try again.
            </p>
            <Link to="/dashboard" className="btn btn-primary inline-block">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (isMember) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-elevated p-8 border border-cream-200 max-w-md text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-display font-bold text-neutral-800 mb-2">
              Already a Member
            </h1>
            <p className="text-neutral-500 mb-6">You're already a member of {league.name}!</p>
            <Link to={`/leagues/${league.id}`} className="btn btn-primary inline-block">
              Go to League
            </Link>
          </div>
        </div>
      </>
    );
  }

  const isFull = memberCount !== undefined && memberCount >= league.max_players;

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-elevated p-8 border border-cream-200 max-w-md w-full">
          {/* League Info */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-display font-bold text-neutral-800 mb-2">{league.name}</h1>
            <p className="text-neutral-500">
              Season {league.seasons.number}: {league.seasons.name}
            </p>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-6 mb-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-burgundy-500">
                <Users className="h-5 w-5" />
                <span className="text-xl font-bold">
                  {memberCount}/{league.max_players}
                </span>
              </div>
              <p className="text-neutral-500 text-sm">Players</p>
            </div>

            {league.require_donation && league.donation_amount && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-burgundy-500">
                  <DollarSign className="h-5 w-5" />
                  <span className="text-xl font-bold">{league.donation_amount}</span>
                </div>
                <p className="text-neutral-500 text-sm">Entry Fee</p>
              </div>
            )}
          </div>

          {/* Donation Notes */}
          {league.donation_notes && (
            <div className="bg-cream-50 rounded-xl p-4 mb-6 border border-cream-200">
              <p className="text-neutral-600 text-sm">{league.donation_notes}</p>
            </div>
          )}

          {/* Join Form */}
          {isFull ? (
            <div className="text-center">
              <p className="text-red-500 mb-4">This league is full.</p>
              <Link to="/dashboard" className="btn btn-secondary inline-block">
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
              {/* Password field only if league requires one */}
              {leagueData?.has_password && (
                <div className="mb-6">
                  <label className="block text-neutral-700 text-sm font-medium mb-2">
                    <Lock className="h-4 w-4 inline mr-1" />
                    League Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="input"
                    required
                  />
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-6">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={joinMutation.isPending}
                className="w-full btn btn-primary flex items-center justify-center gap-2"
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
    </>
  );
}
