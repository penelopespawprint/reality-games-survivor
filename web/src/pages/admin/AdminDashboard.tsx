import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';

interface Stats {
  users: number;
  leagues: number;
  castaways: number;
  episodes: number;
  scoringRules: number;
}

interface Season {
  id: string;
  number: number;
  name: string;
  is_active: boolean;
  premiere_at: string;
}

interface Episode {
  id: string;
  number: number;
  title: string | null;
  air_date: string;
  is_scored: boolean;
}

interface UserProfile {
  id: string;
  display_name: string;
  role: string;
}

export function AdminDashboard() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, role')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!user?.id,
  });

  const { data: activeSeason } = useQuery({
    queryKey: ['activeSeason'],
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

  const { data: upcomingEpisode } = useQuery({
    queryKey: ['upcomingEpisode', activeSeason?.id],
    queryFn: async () => {
      if (!activeSeason?.id) return null;
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .eq('season_id', activeSeason.id)
        .gte('air_date', now)
        .order('air_date', { ascending: true })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as Episode | null;
    },
    enabled: !!activeSeason?.id,
  });

  const { data: stats } = useQuery({
    queryKey: ['adminStats', activeSeason?.id],
    queryFn: async () => {
      const [users, leagues, castaways, episodes, scoringRules] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('leagues').select('id', { count: 'exact', head: true }),
        activeSeason?.id
          ? supabase
              .from('castaways')
              .select('id', { count: 'exact', head: true })
              .eq('season_id', activeSeason.id)
          : { count: 0 },
        activeSeason?.id
          ? supabase
              .from('episodes')
              .select('id', { count: 'exact', head: true })
              .eq('season_id', activeSeason.id)
          : { count: 0 },
        activeSeason?.id
          ? supabase
              .from('scoring_rules')
              .select('id', { count: 'exact', head: true })
              .eq('season_id', activeSeason.id)
          : { count: 0 },
      ]);

      return {
        users: users.count || 0,
        leagues: leagues.count || 0,
        castaways: castaways.count || 0,
        episodes: episodes.count || 0,
        scoringRules: scoringRules.count || 0,
      } as Stats;
    },
  });

  const adminLinks = [
    {
      title: 'Score Episode',
      description: 'Enter scores for the latest episode',
      href: '/admin/scoring',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      color: 'bg-burgundy-500',
    },
    {
      title: 'Manage Castaways',
      description: 'Add, edit, or eliminate castaways',
      href: '/admin/castaways',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      color: 'bg-blue-500',
    },
    {
      title: 'Manage Seasons',
      description: 'Manage seasons and episodes',
      href: '/admin/seasons',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      color: 'bg-green-500',
    },
    {
      title: 'Scoring Rules',
      description: 'View and manage scoring rules',
      href: '/admin/scoring-rules',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
      color: 'bg-purple-500',
    },
    {
      title: 'All Leagues',
      description: 'View and manage all leagues',
      href: '/admin/leagues',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
      color: 'bg-orange-500',
    },
    {
      title: 'All Users',
      description: 'Manage user accounts',
      href: '/admin/users',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
      color: 'bg-teal-500',
    },
  ];

  // Check if user is admin
  if (profile && profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-2xl shadow-elevated p-12">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-display text-neutral-800 mb-3">Access Denied</h1>
            <p className="text-neutral-500 mb-8">
              You don't have permission to access the admin dashboard.
            </p>
            <Link to="/dashboard" className="btn btn-primary">
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
      <Navigation />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-2xl font-display text-neutral-800">Admin Dashboard</h1>
            <p className="text-neutral-500">
              {activeSeason
                ? `Season ${activeSeason.number}: ${activeSeason.name}`
                : 'No active season'}
            </p>
          </div>
          <Link
            to="/dashboard"
            className="btn bg-white text-neutral-700 shadow-card hover:shadow-card-hover"
          >
            Back to App
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 animate-slide-up">
          <div className="bg-white rounded-xl shadow-card p-5 text-center">
            <p className="text-3xl font-display text-neutral-800">{stats?.users || 0}</p>
            <p className="text-sm text-neutral-500 mt-1">Users</p>
          </div>
          <div className="bg-white rounded-xl shadow-card p-5 text-center">
            <p className="text-3xl font-display text-neutral-800">{stats?.leagues || 0}</p>
            <p className="text-sm text-neutral-500 mt-1">Leagues</p>
          </div>
          <div className="bg-white rounded-xl shadow-card p-5 text-center">
            <p className="text-3xl font-display text-neutral-800">{stats?.castaways || 0}</p>
            <p className="text-sm text-neutral-500 mt-1">Castaways</p>
          </div>
          <div className="bg-white rounded-xl shadow-card p-5 text-center">
            <p className="text-3xl font-display text-neutral-800">{stats?.episodes || 0}</p>
            <p className="text-sm text-neutral-500 mt-1">Episodes</p>
          </div>
          <div className="bg-white rounded-xl shadow-card p-5 text-center">
            <p className="text-3xl font-display text-neutral-800">{stats?.scoringRules || 0}</p>
            <p className="text-sm text-neutral-500 mt-1">Rules</p>
          </div>
        </div>

        {/* Upcoming Episode Alert */}
        {upcomingEpisode && (
          <div className="bg-gradient-to-r from-burgundy-500 to-burgundy-600 rounded-2xl p-6 text-white mb-8 animate-slide-up shadow-elevated">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-burgundy-100 text-sm font-medium">Next Episode</p>
                <p className="text-2xl font-display mt-1">
                  Episode {upcomingEpisode.number}: {upcomingEpisode.title || 'TBD'}
                </p>
                <p className="text-burgundy-100 mt-2">
                  {new Date(upcomingEpisode.air_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <Link
                to={`/admin/scoring?episode=${upcomingEpisode.id}`}
                className="btn bg-white text-burgundy-600 hover:bg-cream-50 shadow-lg"
              >
                Enter Scores
              </Link>
            </div>
          </div>
        )}

        {/* Admin Links Grid */}
        <div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="bg-white rounded-2xl shadow-card hover:shadow-card-hover p-6 transition-all group"
            >
              <div
                className={`w-14 h-14 ${link.color} rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}
              >
                {link.icon}
              </div>
              <h3 className="font-semibold text-neutral-800 text-lg">{link.title}</h3>
              <p className="text-sm text-neutral-500 mt-1">{link.description}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
