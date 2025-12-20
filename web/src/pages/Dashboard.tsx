import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  role: string;
}

interface Season {
  id: string;
  number: number;
  name: string;
  is_active: boolean;
}

interface League {
  id: string;
  name: string;
  code: string;
  status: string;
  is_global: boolean;
}

export function Dashboard() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!user?.id,
  });

  const { data: activeSeason } = useQuery({
    queryKey: ['active-season'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('is_active', true)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as Season | null;
    },
  });

  const { data: myLeagues } = useQuery({
    queryKey: ['my-leagues', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('league_members')
        .select(`
          league:leagues (
            id,
            name,
            code,
            status,
            is_global
          )
        `)
        .eq('user_id', user!.id);
      if (error) throw error;
      type LeagueResult = { league: League | null };
      const results = data as unknown as LeagueResult[];
      return results.map((r) => r.league).filter((l): l is League => l !== null);
    },
    enabled: !!user?.id,
  });

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-display text-white">
          Welcome back, {profile?.display_name ?? 'Survivor'}
        </h1>
        {activeSeason ? (
          <p className="text-neutral-400 mt-1">
            Season {activeSeason.number}: {activeSeason.name}
          </p>
        ) : (
          <p className="text-neutral-400 mt-1">No active season</p>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-neutral-400 text-sm">My Leagues</p>
          <p className="text-3xl font-semibold text-white mt-1">{myLeagues?.length ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-neutral-400 text-sm">Total Points</p>
          <p className="text-3xl font-semibold text-white mt-1">—</p>
        </div>
        <div className="card">
          <p className="text-neutral-400 text-sm">Best Rank</p>
          <p className="text-3xl font-semibold text-white mt-1">—</p>
        </div>
      </div>

      {/* My Leagues */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">My Leagues</h2>
          <button className="btn btn-primary text-sm">Join League</button>
        </div>

        {myLeagues && myLeagues.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myLeagues.map((league) => (
              <div key={league.id} className="card hover:border-neutral-700 transition-colors cursor-pointer">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{league.name}</h3>
                    <p className="text-neutral-400 text-sm mt-1">Code: {league.code}</p>
                  </div>
                  {league.is_global && (
                    <span className="px-2 py-1 bg-tribal-500/20 text-tribal-400 text-xs rounded-full">
                      Global
                    </span>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-neutral-800">
                  <span className="text-sm text-neutral-500 capitalize">{league.status}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <p className="text-neutral-400 mb-4">You haven't joined any leagues yet</p>
            <button className="btn btn-primary">Create or Join a League</button>
          </div>
        )}
      </div>
    </div>
  );
}
