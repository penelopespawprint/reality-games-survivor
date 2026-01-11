/**
 * Castaway Stats Page (Admin Only)
 *
 * Displays all 5 castaway performance stats.
 */

import { Link } from 'react-router-dom';
import { AdminNavBar } from '@/components/AdminNavBar';
import {
  ArrowLeft,
  Trophy,
  TrendingDown,
  TrendingUp,
  Activity,
  Gauge,
  Brain,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { StatCard, HorizontalBarChart, TwoColumnLeaderboard } from '@/components/stats';
import { useCastawayStats } from '@/lib/hooks/stats';
import { useQueryClient } from '@tanstack/react-query';

export function CastawayStats() {
  const queryClient = useQueryClient();
  const {
    scoringEfficiency,
    tribeScoring,
    biggestBust,
    biggestSteal,
    consistency,
    skillCorrelated,
    isLoading,
    error,
  } = useCastawayStats();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['stats', 'castaways'] });
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
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Trophy className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-neutral-800">Castaway Stats</h1>
              <p className="text-sm text-neutral-500">5 stats about castaway performance</p>
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
          <div className="grid md:grid-cols-2 gap-6">
            {/* Stat 16: Biggest Bust */}
            <StatCard
              title="Biggest Bust"
              subtitle="High draft pick, low points per episode"
              icon={<TrendingDown className="h-5 w-5" />}
            >
              <HorizontalBarChart
                data={
                  biggestBust?.leaderboard?.map((e) => ({
                    label: e.name,
                    value: e.points_per_episode,
                    sublabel: `Avg pick #${e.avg_draft_position}`,
                  })) || []
                }
                valueFormatter={(v) => `${v.toFixed(1)} PPE`}
                colorScale="red"
                emptyMessage="Data available after more episodes"
              />
            </StatCard>

            {/* Stat 17: Biggest Steal */}
            <StatCard
              title="Biggest Steal"
              subtitle="Late draft pick, high points per episode"
              icon={<TrendingUp className="h-5 w-5" />}
            >
              <HorizontalBarChart
                data={
                  biggestSteal?.leaderboard?.map((e) => ({
                    label: e.name,
                    value: e.points_per_episode,
                    sublabel: `Avg pick #${e.avg_draft_position}`,
                  })) || []
                }
                valueFormatter={(v) => `${v.toFixed(1)} PPE`}
                colorScale="green"
                emptyMessage="Data available after more episodes"
              />
            </StatCard>

            {/* Stat 18: Most Consistent / Most Volatile */}
            <StatCard
              title="Consistency Ratings"
              subtitle="Standard deviation of weekly scores"
              icon={<Activity className="h-5 w-5" />}
            >
              <TwoColumnLeaderboard
                leftTitle="Most Reliable"
                leftEntries={
                  consistency?.most_consistent?.map((e) => ({
                    id: e.castaway_id,
                    name: e.name,
                    value: e.std_dev,
                    sublabel: `Avg ${e.avg_points} pts`,
                  })) || []
                }
                leftColor="green"
                rightTitle="Wild Cards"
                rightEntries={
                  consistency?.most_volatile?.map((e) => ({
                    id: e.castaway_id,
                    name: e.name,
                    value: e.std_dev,
                    sublabel: `Avg ${e.avg_points} pts`,
                  })) || []
                }
                rightColor="red"
                valueFormatter={(v) => `±${v}`}
                emptyMessage="Data available after more episodes"
              />
            </StatCard>

            {/* Stat 19: Best/Worst Scoring Efficiency */}
            <StatCard
              title="Scoring Efficiency"
              subtitle="Points per episode played"
              icon={<Gauge className="h-5 w-5" />}
            >
              <HorizontalBarChart
                data={
                  scoringEfficiency?.leaderboard?.map((e) => ({
                    label: e.name,
                    value: e.efficiency,
                    sublabel: `${e.episodes_played} eps`,
                  })) || []
                }
                valueFormatter={(v) => v.toFixed(1)}
                emptyMessage="Data available after episodes are scored"
              />
            </StatCard>

            {/* Stat 20: Skill-Correlated Picks */}
            <StatCard
              title="Skill-Correlated Picks"
              subtitle="Castaways favored by top vs bottom players"
              icon={<Brain className="h-5 w-5" />}
            >
              <TwoColumnLeaderboard
                leftTitle="Smart Picks"
                leftEntries={
                  skillCorrelated?.smart_picks?.map((e) => ({
                    id: e.castaway_id,
                    name: e.name,
                    value: e.differential,
                    sublabel: `Top: ${e.top_player_ownership}% / Bot: ${e.bottom_player_ownership}%`,
                  })) || []
                }
                leftColor="green"
                rightTitle="Trap Picks"
                rightEntries={
                  skillCorrelated?.trap_picks?.map((e) => ({
                    id: e.castaway_id,
                    name: e.name,
                    value: Math.abs(e.differential),
                    sublabel: `Top: ${e.top_player_ownership}% / Bot: ${e.bottom_player_ownership}%`,
                  })) || []
                }
                rightColor="red"
                valueFormatter={(v) => `+${v}%`}
                emptyMessage="Data available after more picks"
              />
            </StatCard>

            {/* Bonus: Tribe Scoring */}
            <StatCard
              title="Tribe Scoring"
              subtitle="Total fantasy points by original tribe"
              icon={<Trophy className="h-5 w-5" />}
            >
              <HorizontalBarChart
                data={
                  tribeScoring?.tribes?.map((t) => ({
                    label: t.name,
                    value: t.total_points,
                    sublabel: `${t.castaway_count} castaways`,
                    color:
                      t.name === 'Vatu'
                        ? 'bg-purple-500'
                        : t.name === 'Kalo'
                          ? 'bg-teal-500'
                          : t.name === 'Cila'
                            ? 'bg-orange-500'
                            : 'bg-neutral-400',
                  })) || []
                }
                showRank={false}
                emptyMessage="Data available after episodes are scored"
              />
            </StatCard>
          </div>
        )}
      </div>
    </div>
  );
}

export default CastawayStats;
