/**
 * Player Stats Page (Admin Only)
 *
 * Displays all 15 player performance stats.
 */

import { Link } from 'react-router-dom';
import { AdminNavBar } from '@/components/AdminNavBar';
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
  RefreshCw,
} from 'lucide-react';
import { StatCard, HorizontalBarChart, TwoColumnLeaderboard, AwardList } from '@/components/stats';
import { usePlayerStats } from '@/lib/hooks/stats';
import { useQueryClient } from '@tanstack/react-query';

export function PlayerStats() {
  const queryClient = useQueryClient();
  const {
    mostLeagues,
    lastMinuteLarry,
    earlyBird,
    successfulPickRatio,
    mostActive,
    improvementTrend,
    luckiestPlayer,
    unluckiestPlayer,
    curseCarrier,
    benchwarmerRegret,
    indecisive,
    setAndForget,
    waiverWonder,
    comebackRoyalty,
    chokeArtist,
    isLoading,
    error,
  } = usePlayerStats();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['stats', 'players'] });
  };

  return (
    <div className="min-h-screen bg-cream-50">
      <AdminNavBar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/admin/fun-stats"
              className="p-2 bg-white border border-cream-200 rounded-xl hover:bg-cream-50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-neutral-600" />
            </Link>
            <div className="w-12 h-12 bg-burgundy-100 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-burgundy-600" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-neutral-800">Player Stats</h1>
              <p className="text-sm text-neutral-500">15 stats about player performance</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-cream-200 rounded-xl hover:bg-cream-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
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
                data={
                  successfulPickRatio?.leaderboard?.map((e) => ({
                    label: e.display_name,
                    value: e.ratio,
                    sublabel: `${e.successful_picks}/${e.total_picks} picks`,
                  })) || []
                }
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
                data={
                  luckiestPlayer?.leaderboard?.map((e) => ({
                    label: e.display_name,
                    value: e.luck_points,
                    sublabel: `${e.castaways_count} elimination(s)`,
                  })) || []
                }
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
                data={
                  unluckiestPlayer?.leaderboard?.map((e) => ({
                    label: e.display_name,
                    value: e.missed_points,
                    sublabel: `${e.eliminations_count} castaway(s)`,
                  })) || []
                }
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
                data={
                  lastMinuteLarry?.leaderboard?.map((e) => ({
                    label: e.display_name,
                    value: e.ratio,
                    sublabel: `${e.last_minute_picks}/${e.total_picks} picks`,
                  })) || []
                }
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
                data={
                  earlyBird?.leaderboard?.map((e) => ({
                    label: e.display_name,
                    value: e.ratio,
                    sublabel: `${e.early_picks}/${e.total_picks} picks`,
                  })) || []
                }
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
              <HorizontalBarChart
                data={
                  indecisive?.leaderboard?.map((e) => ({
                    label: e.display_name,
                    value: e.total_changes,
                    sublabel: `${e.episodes_changed} episode(s)`,
                  })) || []
                }
                emptyMessage="Data available after more picks"
              />
            </StatCard>

            {/* Stat 7: Set It and Forget It */}
            <StatCard
              title="Set It and Forget It"
              subtitle="Never changed lineup after initial submission"
              icon={<Lock className="h-5 w-5" />}
            >
              <AwardList
                title=""
                recipients={
                  setAndForget?.users?.map((u) => ({
                    id: u.user_id,
                    name: u.display_name,
                    sublabel: `${u.episodes_played} episodes`,
                  })) || []
                }
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
                data={
                  benchwarmerRegret?.leaderboard?.map((e) => ({
                    label: e.display_name,
                    value: e.bench_points,
                    sublabel: `${e.bench_points} pts wasted`,
                  })) || []
                }
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
                data={
                  curseCarrier?.leaderboard?.map((e) => ({
                    label: e.display_name,
                    value: e.cursed_castaways,
                    sublabel: `${e.curse_rate}% curse rate`,
                  })) || []
                }
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
                data={
                  waiverWonder?.leaderboard?.map((e) => ({
                    label: e.display_name,
                    value: e.waiver_points,
                    sublabel: `${e.undrafted_castaways} castaway(s)`,
                  })) || []
                }
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
              <HorizontalBarChart
                data={
                  comebackRoyalty?.leaderboard?.map((e) => ({
                    label: e.display_name,
                    value: e.max_deficit,
                    sublabel: `Week ${e.deficit_week} - ${e.league_name}`,
                  })) || []
                }
                colorScale="green"
                emptyMessage="Data available after more episodes"
              />
            </StatCard>

            {/* Stat 12: Choke Artist */}
            <StatCard
              title="Choke Artist"
              subtitle="Largest lead blown (led but didn't win)"
              icon={<TrendingDown className="h-5 w-5" />}
            >
              <HorizontalBarChart
                data={
                  chokeArtist?.leaderboard?.map((e) => ({
                    label: e.display_name,
                    value: e.max_lead,
                    sublabel: `Week ${e.lead_week} - #${e.final_position} in ${e.league_name}`,
                  })) || []
                }
                colorScale="red"
                emptyMessage="Data available after more episodes"
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
              <HorizontalBarChart
                data={
                  mostActive?.leaderboard?.map((e) => ({
                    label: e.display_name,
                    value: e.composite_score,
                    sublabel: `${e.picks_count} picks, ${e.messages_count} msgs`,
                  })) || []
                }
                emptyMessage="Data available after more activity"
              />
            </StatCard>

            {/* Stat 15: Most Improved / Declined */}
            <StatCard
              title="Improvement Trends"
              subtitle="Week over week point trends"
              icon={<TrendingUp className="h-5 w-5" />}
            >
              <TwoColumnLeaderboard
                leftTitle="Rising Stars"
                leftEntries={
                  improvementTrend?.most_improved?.map((e) => ({
                    id: e.user_id,
                    name: e.display_name,
                    value: e.improvement || 0,
                    sublabel: `${e.first_half_avg} → ${e.second_half_avg}`,
                  })) || []
                }
                leftColor="green"
                rightTitle="Slumping"
                rightEntries={
                  improvementTrend?.most_declined?.map((e) => ({
                    id: e.user_id,
                    name: e.display_name,
                    value: e.decline || Math.abs(e.improvement || 0),
                    sublabel: `${e.first_half_avg} → ${e.second_half_avg}`,
                  })) || []
                }
                rightColor="red"
                valueFormatter={(v) => (v >= 0 ? `+${v}` : `${v}`)}
                emptyMessage="Data available after more episodes"
              />
            </StatCard>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlayerStats;
