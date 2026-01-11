/**
 * Stats Overview Page (Admin Only)
 *
 * Landing page for all fun stats, with links to category pages.
 */

import { Link } from 'react-router-dom';
import { AdminNavBar } from '@/components/AdminNavBar';
import {
  BarChart3,
  Users,
  Trophy,
  Globe,
  TrendingUp,
  Target,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const statCategories = [
  {
    title: 'Player Stats',
    description: '15 stats about player performance, timing, and luck',
    icon: Users,
    href: '/admin/fun-stats/players',
    color: 'bg-burgundy-500',
    highlights: ['Successful Pick Ratio', 'Luckiest Player', 'Comeback King/Queen'],
  },
  {
    title: 'Castaway Stats',
    description: '5 stats about castaway value and performance',
    icon: Trophy,
    href: '/admin/fun-stats/castaways',
    color: 'bg-amber-500',
    highlights: ['Biggest Bust', 'Biggest Steal', 'Most Consistent'],
  },
  {
    title: 'League Stats',
    description: '7 stats about leagues and platform-wide trends',
    icon: Globe,
    href: '/admin/fun-stats/leagues',
    color: 'bg-teal-500',
    highlights: ['Nail Biter League', 'Most Active Time', 'Tribe Scoring'],
  },
];

export function StatsOverview() {
  const queryClient = useQueryClient();

  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['stats'] });
  };

  return (
    <div className="min-h-screen bg-cream-50">
      <AdminNavBar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header with Actions */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-burgundy-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-burgundy-600" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-neutral-800">Fun Stats</h1>
              <p className="text-sm text-neutral-500">27 unique stats about your fantasy league</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshAll}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-cream-200 rounded-xl hover:bg-cream-50 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh All
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-cream-200 p-4 text-center">
            <Target className="h-6 w-6 text-burgundy-500 mx-auto mb-2" />
            <p className="text-xl font-bold text-neutral-800">27</p>
            <p className="text-xs text-neutral-500">Total Stats</p>
          </div>
          <div className="bg-white rounded-xl border border-cream-200 p-4 text-center">
            <TrendingUp className="h-6 w-6 text-green-500 mx-auto mb-2" />
            <p className="text-xl font-bold text-neutral-800">15</p>
            <p className="text-xs text-neutral-500">Player Stats</p>
          </div>
          <div className="bg-white rounded-xl border border-cream-200 p-4 text-center">
            <Trophy className="h-6 w-6 text-amber-500 mx-auto mb-2" />
            <p className="text-xl font-bold text-neutral-800">5</p>
            <p className="text-xs text-neutral-500">Castaway Stats</p>
          </div>
          <div className="bg-white rounded-xl border border-cream-200 p-4 text-center">
            <Globe className="h-6 w-6 text-teal-500 mx-auto mb-2" />
            <p className="text-xl font-bold text-neutral-800">7</p>
            <p className="text-xs text-neutral-500">League Stats</p>
          </div>
        </div>

        {/* Category Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {statCategories.map((category) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.href}
                to={category.href}
                className="group bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden hover:shadow-elevated transition-all hover:-translate-y-1"
              >
                <div className={`${category.color} p-6`}>
                  <Icon className="h-10 w-10 text-white mb-3" />
                  <h2 className="text-2xl font-display font-bold text-white">{category.title}</h2>
                </div>
                <div className="p-5">
                  <p className="text-neutral-600 mb-4">{category.description}</p>
                  <div className="space-y-2 mb-4">
                    {category.highlights.map((highlight) => (
                      <div key={highlight} className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        <span className="text-sm text-neutral-700">{highlight}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-burgundy-500 font-medium group-hover:gap-2 transition-all">
                    View All Stats
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Info Box */}
        <div className="bg-burgundy-50 rounded-2xl border border-burgundy-200 p-6">
          <h3 className="font-semibold text-burgundy-800 mb-2">
            Stats Update After Each Episode
          </h3>
          <p className="text-sm text-burgundy-700">
            All leaderboards and stats are calculated from real game data and update automatically
            after each episode is scored.
          </p>
        </div>
      </div>
    </div>
  );
}

export default StatsOverview;
