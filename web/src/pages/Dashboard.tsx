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
  { rank: 2, name: 'John', totalPts: 112, pickInfo: 'Tom (10)' },
  { rank: 3, name: 'John', totalPts: 112, pickInfo: 'Tom (10)' },
  { rank: 4, name: 'John', totalPts: 112, pickInfo: 'Tom (10)' },
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
    <div className="min-h-screen bg-cream-200">
      <AppNav
        userName={profile?.display_name}
        userInitial={profile?.display_name?.charAt(0).toUpperCase()}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-neutral-800">
            Draft Experience
          </h1>
          <select className="week-selector">
            <option>Select Week</option>
            <option>Week 1</option>
            <option>Week 2</option>
            <option>Week 3</option>
          </select>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Leaderboard */}
          <div className="lg:col-span-2">
            <div className="card p-0 overflow-hidden">
              <div className="p-4 border-b border-cream-200">
                <h2 className="font-semibold text-neutral-800">Leaderboard</h2>
              </div>

              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Total Pts</th>
                    <th>Pick Info</th>
                  </tr>
                </thead>
                <tbody>
                  {mockLeaderboard.map((row, i) => (
                    <tr key={i} className="table-row">
                      <td>
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-burgundy-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                          </svg>
                          {row.rank}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="avatar avatar-sm bg-burgundy-500 flex items-center justify-center text-white text-xs font-medium">
                            {row.name.charAt(0)}
                          </div>
                          {row.name}
                        </div>
                      </td>
                      <td className="font-medium">{row.totalPts}</td>
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

              {/* Legend */}
              <div className="p-4 border-t border-cream-200 flex gap-6">
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
          <div className="space-y-6">
            {/* Season Info */}
            <div className="card">
              <h3 className="font-semibold text-neutral-800 mb-4">Season 50</h3>
              {activeSeason ? (
                <p className="text-sm text-neutral-500">{activeSeason.name}</p>
              ) : (
                <p className="text-sm text-neutral-500">Coming Feb 2026</p>
              )}

              <div className="mt-4 pt-4 border-t border-cream-200">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-neutral-600">Registration</span>
                  <span className="text-burgundy-500 font-medium">Opens Dec 19</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-600">Premiere</span>
                  <span className="text-neutral-800 font-medium">Feb 25, 2026</span>
                </div>
              </div>
            </div>

            {/* My Leagues */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-neutral-800">My Leagues</h3>
                <button className="text-burgundy-500 hover:text-burgundy-600 text-sm font-medium">
                  + Join
                </button>
              </div>

              {myLeagues && myLeagues.length > 0 ? (
                <div className="space-y-3">
                  {myLeagues.slice(0, 3).map((league) => (
                    <div
                      key={league.id}
                      className="flex items-center justify-between p-3 bg-cream-50 rounded-lg hover:bg-cream-100 transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="font-medium text-neutral-800 text-sm">{league.name}</p>
                        <p className="text-xs text-neutral-500">{league.code}</p>
                      </div>
                      {league.is_global && (
                        <span className="badge badge-burgundy text-xs">Global</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-500 text-center py-4">
                  No leagues joined yet
                </p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="card">
              <h3 className="font-semibold text-neutral-800 mb-4">Your Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-cream-50 rounded-lg">
                  <p className="text-2xl font-bold text-burgundy-500">—</p>
                  <p className="text-xs text-neutral-500 mt-1">Total Points</p>
                </div>
                <div className="text-center p-3 bg-cream-50 rounded-lg">
                  <p className="text-2xl font-bold text-burgundy-500">—</p>
                  <p className="text-xs text-neutral-500 mt-1">Best Rank</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
