import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { AppNav } from '@/components/AppNav';

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

// Mock leaderboard data for demo
const mockLeaderboard = [
  { rank: 1, name: 'John', totalPts: 112, pickInfo: 'Tom (10)' },
  { rank: 2, name: 'Sarah', totalPts: 108, pickInfo: 'Lisa (8)' },
  { rank: 3, name: 'Mike', totalPts: 95, pickInfo: 'Dan (12)' },
  { rank: 4, name: 'Emily', totalPts: 89, pickInfo: 'Kim (6)' },
];

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
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
      <AppNav
        userName={profile?.display_name}
        userInitial={profile?.display_name?.charAt(0).toUpperCase()}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display text-neutral-800">
              Dashboard
            </h1>
            <p className="text-neutral-500 mt-1">Welcome back, {profile?.display_name || 'Survivor'}</p>
          </div>
          <select className="select px-4 py-2 bg-white border-cream-300 shadow-card rounded-xl text-sm">
            <option>Select Week</option>
            <option>Week 1</option>
            <option>Week 2</option>
            <option>Week 3</option>
          </select>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Leaderboard */}
          <div className="lg:col-span-2 animate-slide-up">
            <div className="bg-white rounded-2xl shadow-elevated overflow-hidden">
              <div className="p-5 border-b border-cream-100">
                <h2 className="font-semibold text-neutral-800">Leaderboard</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="table-header">
                      <th className="rounded-tl-none">Rank</th>
                      <th>Player</th>
                      <th>Total Pts</th>
                      <th className="rounded-tr-none">Pick Info</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockLeaderboard.map((row, i) => (
                      <tr key={i} className="table-row">
                        <td>
                          <span className="flex items-center gap-2 font-medium">
                            {row.rank}
                          </span>
                        </td>
                        <td className="font-medium text-neutral-800">{row.name}</td>
                        <td className="font-semibold text-burgundy-500">{row.totalPts}</td>
                        <td>
                          <span className="badge badge-success">
                            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {row.pickInfo}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="p-4 border-t border-cream-100 bg-cream-50/50 flex gap-6">
                <div className="legend-item">
                  <div className="legend-dot bg-green-500" />
                  <span>Active Pick</span>
                </div>
                <div className="legend-item">
                  <div className="legend-dot bg-amber-500" />
                  <span>Penalty Pick</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Quick Actions */}
          <div className="space-y-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {/* Season Info */}
            <div className="bg-white rounded-2xl shadow-elevated p-6">
              <h3 className="font-semibold text-neutral-800 mb-4">Season 50</h3>
              {activeSeason ? (
                <p className="text-sm text-neutral-500">{activeSeason.name}</p>
              ) : (
                <p className="text-sm text-neutral-500">Coming Feb 2026</p>
              )}

              <div className="mt-5 pt-5 border-t border-cream-100 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Registration</span>
                  <span className="text-burgundy-500 font-semibold">Opens Dec 19</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Premiere</span>
                  <span className="text-neutral-800 font-semibold">Feb 25, 2026</span>
                </div>
              </div>
            </div>

            {/* My Leagues */}
            <div className="bg-white rounded-2xl shadow-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-neutral-800">My Leagues</h3>
                <button className="text-burgundy-500 hover:text-burgundy-600 text-sm font-semibold transition-colors">
                  + Join
                </button>
              </div>

              {myLeagues && myLeagues.length > 0 ? (
                <div className="space-y-3">
                  {myLeagues.slice(0, 3).map((league) => (
                    <div
                      key={league.id}
                      className="flex items-center justify-between p-3 bg-cream-50 rounded-xl hover:bg-cream-100 hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div>
                        <p className="font-medium text-neutral-800 text-sm">{league.name}</p>
                        <p className="text-xs text-neutral-400 font-mono">{league.code}</p>
                      </div>
                      {league.is_global && (
                        <span className="badge badge-burgundy text-xs">Global</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-cream-50 rounded-xl">
                  <p className="text-sm text-neutral-500 mb-3">No leagues joined yet</p>
                  <button className="btn btn-primary btn-sm shadow-card">
                    Join a League
                  </button>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-2xl shadow-elevated p-6">
              <h3 className="font-semibold text-neutral-800 mb-4">Your Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-cream-50 to-cream-100 rounded-xl">
                  <p className="text-3xl font-display text-burgundy-500">—</p>
                  <p className="text-xs text-neutral-500 mt-2 font-medium">Total Points</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-cream-50 to-cream-100 rounded-xl">
                  <p className="text-3xl font-display text-burgundy-500">—</p>
                  <p className="text-xs text-neutral-500 mt-2 font-medium">Best Rank</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
