/**
 * League Stats Page (Admin Only)
 *
 * Displays all 7 platform and league stats.
 */

import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { AdminNavBar } from '@/components/AdminNavBar';
import { Footer } from '@/components/Footer';
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
} from 'lucide-react';
import {
  StatCard,
  HorizontalBarChart,
  BarChart,
  InsightCard,
  TwoColumnLeaderboard,
} from '@/components/stats';
import { useLeagueStats } from '@/lib/hooks/stats';

export function LeagueStats() {
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex flex-col">
      <Navigation />
      <AdminNavBar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/admin/fun-stats"
            className="inline-flex items-center gap-2 text-neutral-500 hover:text-burgundy-500 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Stats
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Globe className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-neutral-800">
                League & Platform Stats
              </h1>
              <p className="text-neutral-600">7 stats about leagues and platform-wide trends</p>
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
      </main>

      <Footer />
    </div>
  );
}

export default LeagueStats;
