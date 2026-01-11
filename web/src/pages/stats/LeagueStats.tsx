/**
 * League Stats Page (Admin Only)
 *
 * Displays all 7 platform and league stats.
 */

import { Link } from 'react-router-dom';
import { AdminNavBar } from '@/components/AdminNavBar';
import {
  ArrowLeft,
  Globe,
  Sparkles,
  Trophy,
  Clock,
  Calendar,
  Timer,
  Zap,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  StatCard,
  HorizontalBarChart,
  BarChart,
  InsightCard,
  TwoColumnLeaderboard,
} from '@/components/stats';
import { useLeagueStats } from '@/lib/hooks/stats';
import { useQueryClient } from '@tanstack/react-query';

export function LeagueStats() {
  const queryClient = useQueryClient();
  const {
    leagueScoring,
    activityByDay,
    activityByHour,
    submissionSpeed,
    nailBiter,
    submissionTiming,
    isLoading,
    error,
  } = useLeagueStats();

  // Day name mapping
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['stats', 'leagues'] });
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
            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
              <Globe className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-neutral-800">League Stats</h1>
              <p className="text-sm text-neutral-500">7 stats about platform-wide trends</p>
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
          <div className="space-y-6">
            {/* Row 1: League Stats */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Stat 21: Nail Biter League */}
              <StatCard
                title="Nail Biter Leagues"
                subtitle="Most weeks decided by narrow margins"
                icon={<Sparkles className="h-5 w-5" />}
              >
                <HorizontalBarChart
                  data={
                    nailBiter?.leaderboard?.map((l) => ({
                      label: l.name,
                      value: l.nail_biter_weeks,
                      sublabel: `Closest: ${l.closest_margin} pts`,
                    })) || []
                  }
                  emptyMessage="Data available after more episodes"
                />
              </StatCard>

              {/* Stat 22: Highest/Lowest Scoring League */}
              <StatCard
                title="League Scoring"
                subtitle="Total points across all members"
                icon={<Trophy className="h-5 w-5" />}
              >
                <HorizontalBarChart
                  data={
                    leagueScoring?.leaderboard?.map((l) => ({
                      label: l.name,
                      value: l.total_points,
                      sublabel: `${l.member_count} members`,
                    })) || []
                  }
                  emptyMessage="Data available after episodes are scored"
                />
              </StatCard>
            </div>

            {/* Row 2: Timing Stats */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Stat 24: First Hour vs Last Hour */}
              <StatCard
                title="Submission Timing"
                subtitle="Picks in first vs last hour of window"
                icon={<Clock className="h-5 w-5" />}
              >
                <TwoColumnLeaderboard
                  leftTitle="Early Birds"
                  leftEntries={
                    submissionTiming?.early_birds?.map((e) => ({
                      id: e.user_id,
                      name: e.display_name,
                      value: e.ratio,
                      sublabel: `${e.first_hour_picks || 0}/${e.total_picks} picks`,
                    })) || []
                  }
                  leftColor="green"
                  rightTitle="Procrastinators"
                  rightEntries={
                    submissionTiming?.procrastinators?.map((e) => ({
                      id: e.user_id,
                      name: e.display_name,
                      value: e.ratio,
                      sublabel: `${e.last_hour_picks || 0}/${e.total_picks} picks`,
                    })) || []
                  }
                  rightColor="red"
                  valueFormatter={(v) => `${v}%`}
                  emptyMessage="Data available after more picks"
                />
              </StatCard>

              {/* Stat 27: Fastest/Slowest to Submit */}
              <StatCard
                title="Submission Speed"
                subtitle="Average time from window open to pick"
                icon={<Timer className="h-5 w-5" />}
              >
                <HorizontalBarChart
                  data={
                    submissionSpeed?.leaderboard?.map((e) => ({
                      label: e.display_name,
                      value: e.avg_hours_to_submit,
                      sublabel: `Fastest: ${e.fastest_submission.toFixed(1)}h`,
                    })) || []
                  }
                  valueFormatter={(v) => `${v.toFixed(1)}h`}
                  colorScale="green"
                  emptyMessage="Data available after more picks"
                />
              </StatCard>
            </div>

            {/* Row 3: Activity Insights */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Stat 25: Activity by Day */}
              <StatCard
                title="Activity by Day"
                subtitle="Platform activity throughout the week"
                icon={<Calendar className="h-5 w-5" />}
              >
                {activityByDay?.days && activityByDay.days.length > 0 ? (
                  <BarChart
                    data={activityByDay.days.map((d) => ({
                      label: dayNames[d.day] || d.day.toString(),
                      value: d.total,
                      color: d.day === 3 ? '#722F37' : undefined, // Highlight Wednesday
                    }))}
                  />
                ) : (
                  <div className="py-8 text-center text-neutral-500">
                    Data available after more activity
                  </div>
                )}
              </StatCard>

              {/* Stat 26: Activity by Hour */}
              <StatCard
                title="Activity by Hour"
                subtitle="When players are most active"
                icon={<Zap className="h-5 w-5" />}
              >
                {activityByHour?.hours && activityByHour.hours.length > 0 ? (
                  <BarChart
                    data={activityByHour.hours
                      .filter((h) => h.total > 0)
                      .map((h) => ({
                        label: `${h.hour}:00`,
                        value: h.total,
                      }))}
                    height={160}
                  />
                ) : (
                  <div className="py-8 text-center text-neutral-500">
                    Data available after more activity
                  </div>
                )}
              </StatCard>
            </div>

            {/* Insights Row */}
            {activityByDay?.days && activityByDay.days.length > 0 && (
              <div className="grid md:grid-cols-2 gap-6">
                <InsightCard
                  title="Peak Activity Day"
                  insight={`Players are most active on ${
                    dayNames[
                      activityByDay.days.reduce((max, d) => (d.total > max.total ? d : max)).day
                    ]
                  }, likely due to episode airings on Wednesday evenings.`}
                  color="teal"
                />
                <InsightCard
                  title="Pick Deadline Rush"
                  insight="Most pick submissions happen within the last few hours before the Wednesday deadline at 5 PM PST."
                  color="amber"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default LeagueStats;
