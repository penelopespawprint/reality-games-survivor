/**
 * Player Stats Page
 *
 * Displays all 15 player performance stats.
 */

import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import {
  ArrowLeft,
  Target,
  Clover,
  Cloud,
  Clock,
  Bird,
  Shuffle,
  Lock,
  Armchair,
  Ghost,
  Sparkles,
  Crown,
  TrendingDown,
  Users,
  Zap,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { StatCard, HorizontalBarChart, TwoColumnLeaderboard, AwardList } from '@/components/stats';
import { usePlayerStats } from '@/lib/hooks/stats';

export function PlayerStats() {
  const { mostLeagues, isLoading, error } = usePlayerStats();

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/stats"
            className="inline-flex items-center gap-2 text-neutral-500 hover:text-burgundy-500 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Stats
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-burgundy-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Users className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-neutral-800">Player Stats</h1>
              <p className="text-neutral-600">
                15 stats about player performance, timing, and luck
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-600">{error}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Stat 1: Successful Pick Ratio */}
            <StatCard
              title="Successful Pick Ratio"
              subtitle="Starters who scored above episode average"
              icon={<Target className="h-5 w-5" />}
            >
              <HorizontalBarChart
                data={[]}
                valueFormatter={(v) => `${v}%`}
                emptyMessage="Data available after more episodes"
              />
            </StatCard>

            {/* Stat 2: Luckiest Player */}
            <StatCard
              title="Luckiest Player"
              subtitle="Points from castaways in their final episode"
              icon={<Clover className="h-5 w-5" />}
            >
              <HorizontalBarChart
                data={[]}
                colorScale="green"
                emptyMessage="Data available after eliminations"
              />
            </StatCard>

            {/* Stat 3: Unluckiest Player */}
            <StatCard
              title="Unluckiest Player"
              subtitle="Potential points lost to early eliminations"
              icon={<Cloud className="h-5 w-5" />}
            >
              <HorizontalBarChart
                data={[]}
                colorScale="red"
                emptyMessage="Data available after eliminations"
              />
            </StatCard>

            {/* Stat 4: Last-Minute Larry */}
            <StatCard
              title="Last-Minute Larry"
              subtitle="Picks submitted in final hour before lock"
              icon={<Clock className="h-5 w-5" />}
            >
              <HorizontalBarChart
                data={[]}
                valueFormatter={(v) => `${v}%`}
                emptyMessage="Data available after more picks"
              />
            </StatCard>

            {/* Stat 5: Early Bird */}
            <StatCard
              title="Early Bird"
              subtitle="Picks submitted within first hour"
              icon={<Bird className="h-5 w-5" />}
            >
              <HorizontalBarChart
                data={[]}
                valueFormatter={(v) => `${v}%`}
                colorScale="green"
                emptyMessage="Data available after more picks"
              />
            </StatCard>

            {/* Stat 6: Indecisive Award */}
            <StatCard
              title="Indecisive Award"
              subtitle="Most lineup changes before lock"
              icon={<Shuffle className="h-5 w-5" />}
            >
              <HorizontalBarChart data={[]} emptyMessage="Data available after more picks" />
            </StatCard>

            {/* Stat 7: Set It and Forget It */}
            <StatCard
              title="Set It and Forget It"
              subtitle="Never changed lineup after initial submission"
              icon={<Lock className="h-5 w-5" />}
            >
              <AwardList
                title=""
                recipients={[]}
                icon="star"
                emptyMessage="Data available after more picks"
              />
            </StatCard>

            {/* Stat 8: Benchwarmer Regret */}
            <StatCard
              title="Benchwarmer Regret"
              subtitle="Points left on the bench all season"
              icon={<Armchair className="h-5 w-5" />}
            >
              <HorizontalBarChart
                data={[]}
                colorScale="red"
                emptyMessage="Data available after more episodes"
              />
            </StatCard>

            {/* Stat 9: Curse Carrier */}
            <StatCard
              title="Curse Carrier"
              subtitle="Newly added castaways eliminated quickly"
              icon={<Ghost className="h-5 w-5" />}
            >
              <HorizontalBarChart
                data={[]}
                colorScale="red"
                emptyMessage="Data available after eliminations"
              />
            </StatCard>

            {/* Stat 10: Waiver Wire Wonder */}
            <StatCard
              title="Waiver Wire Wonder"
              subtitle="Points from undrafted castaways"
              icon={<Sparkles className="h-5 w-5" />}
            >
              <HorizontalBarChart
                data={[]}
                colorScale="green"
                emptyMessage="Data available after waivers"
              />
            </StatCard>

            {/* Stat 11: Comeback King/Queen */}
            <StatCard
              title="Comeback King/Queen"
              subtitle="Largest deficit overcome to win"
              icon={<Crown className="h-5 w-5" />}
            >
              <HorizontalBarChart data={[]} emptyMessage="Data available after season ends" />
            </StatCard>

            {/* Stat 12: Choke Artist */}
            <StatCard
              title="Choke Artist"
              subtitle="Largest lead blown (led but didn't win)"
              icon={<TrendingDown className="h-5 w-5" />}
            >
              <HorizontalBarChart
                data={[]}
                colorScale="red"
                emptyMessage="Data available after season ends"
              />
            </StatCard>

            {/* Stat 13: Most Leagues Joined */}
            <StatCard
              title="Platform Superfans"
              subtitle="Most leagues joined"
              icon={<Users className="h-5 w-5" />}
            >
              <HorizontalBarChart
                data={
                  mostLeagues?.leaderboard?.map((e) => ({
                    label: e.display_name,
                    value: e.league_count,
                  })) || []
                }
                emptyMessage="No data yet"
              />
            </StatCard>

            {/* Stat 14: Most Active Player */}
            <StatCard
              title="Most Active Player"
              subtitle="Composite engagement score"
              icon={<Zap className="h-5 w-5" />}
            >
              <HorizontalBarChart data={[]} emptyMessage="Data available after more activity" />
            </StatCard>

            {/* Stat 15: Most Improved / Declined */}
            <StatCard
              title="Improvement Trends"
              subtitle="Week over week point trends"
              icon={<TrendingUp className="h-5 w-5" />}
            >
              <TwoColumnLeaderboard
                leftTitle="Rising Stars"
                leftEntries={[]}
                rightTitle="Slumping"
                rightEntries={[]}
                emptyMessage="Data available after more episodes"
              />
            </StatCard>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default PlayerStats;
