/**
 * Stats Overview Page (Admin Only)
 *
 * Landing page for all fun stats, with links to category pages.
 */

import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { AdminNavBar } from '@/components/AdminNavBar';
import { Footer } from '@/components/Footer';
import {
  BarChart3,
  Users,
  Trophy,
  Globe,
  TrendingUp,
  Target,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

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
  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex flex-col">
      <Navigation />
      <AdminNavBar />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-burgundy-500 to-amber-500 rounded-2xl mb-4 shadow-lg">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-display font-bold text-neutral-800 mb-3">
            Fun Stats & Leaderboards
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Discover who's the luckiest player, which castaways were the biggest steals, and explore
            27 unique stats about your fantasy league.
          </p>
        </div>

        {/* Featured Stats Preview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-white rounded-2xl shadow-card border border-cream-200 p-4 text-center">
            <Target className="h-8 w-8 text-burgundy-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-neutral-800">27</p>
            <p className="text-sm text-neutral-500">Unique Stats</p>
          </div>
          <div className="bg-white rounded-2xl shadow-card border border-cream-200 p-4 text-center">
            <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-neutral-800">15</p>
            <p className="text-sm text-neutral-500">Player Stats</p>
          </div>
          <div className="bg-white rounded-2xl shadow-card border border-cream-200 p-4 text-center">
            <Trophy className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-neutral-800">5</p>
            <p className="text-sm text-neutral-500">Castaway Stats</p>
          </div>
          <div className="bg-white rounded-2xl shadow-card border border-cream-200 p-4 text-center">
            <Globe className="h-8 w-8 text-teal-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-neutral-800">7</p>
            <p className="text-sm text-neutral-500">League Stats</p>
          </div>
        </div>

        {/* Category Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
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
        <div className="bg-gradient-to-r from-burgundy-50 to-amber-50 rounded-2xl border border-burgundy-200 p-6 text-center">
          <h3 className="font-display font-bold text-burgundy-800 mb-2">
            Stats Update After Each Episode
          </h3>
          <p className="text-burgundy-700 max-w-xl mx-auto">
            All leaderboards and stats are calculated from real game data and update automatically
            after each episode is scored. Check back often to see how the rankings change!
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default StatsOverview;
