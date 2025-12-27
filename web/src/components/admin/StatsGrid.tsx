interface DashboardStats {
  players: {
    total: number;
    activeThisWeek: number;
    newToday: number;
    newThisWeek: number;
    growthRate?: number;
  };
  leagues: {
    total: number;
    activeThisWeek: number;
    globalLeagueSize: number;
    averageSize: number;
  };
  game: {
    picksThisWeek: number;
    picksCompletionRate: number;
    castawaysRemaining: number;
    castawaysEliminated: number;
    episodesScored: number;
    totalEpisodes: number;
  };
  systemHealth: {
    dbResponseTimeMs: number;
    jobFailuresLast24h: number;
    emailQueueSize: number;
    failedEmailsCount: number;
  };
}

interface StatsGridProps {
  stats: DashboardStats;
}

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
  };
  progress?: {
    value: number;
    label: string;
  };
  status?: 'good' | 'warning' | 'critical';
}

function StatCard({ title, value, subtitle, trend, progress, status }: StatCardProps) {
  const statusColors = {
    good: 'text-green-600',
    warning: 'text-yellow-600',
    critical: 'text-red-600',
  };

  const progressColors = {
    good: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
  };

  return (
    <div className="bg-white rounded-xl shadow-card p-5">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <p className="text-sm text-neutral-500 mb-1">{title}</p>
          <p className="text-3xl font-display text-neutral-800 font-mono">{value}</p>
          {subtitle && <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>}
        </div>

        {trend && (
          <div
            className={`text-sm flex items-center gap-1 ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {trend.value >= 0 ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            )}
            <span className="font-semibold">{Math.abs(trend.value).toFixed(0)}%</span>
            <span className="text-neutral-400 text-xs">{trend.label}</span>
          </div>
        )}
      </div>

      {progress && (
        <div className="mt-3">
          <div className="h-2 bg-cream-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${progressColors[status || 'good']}`}
              style={{ width: `${Math.min(100, progress.value)}%` }}
            />
          </div>
          <p className="text-xs text-neutral-500 mt-1">{progress.label}</p>
        </div>
      )}

      {status && !progress && (
        <div className="mt-2">
          <span className={`text-xs font-semibold ${statusColors[status]}`}>
            {status === 'good' && '✓ Healthy'}
            {status === 'warning' && '⚠ Warning'}
            {status === 'critical' && '✕ Critical'}
          </span>
        </div>
      )}
    </div>
  );
}

export function StatsGrid({ stats }: StatsGridProps) {
  // Determine system health status
  const _getSystemHealthStatus = (): 'good' | 'warning' | 'critical' => {
    if (stats.systemHealth.jobFailuresLast24h >= 10 || stats.systemHealth.failedEmailsCount >= 20) {
      return 'critical';
    }
    if (
      stats.systemHealth.jobFailuresLast24h >= 5 ||
      stats.systemHealth.failedEmailsCount >= 10 ||
      stats.systemHealth.dbResponseTimeMs >= 1000
    ) {
      return 'warning';
    }
    return 'good';
  };

  const getPicksCompletionStatus = (): 'good' | 'warning' | 'critical' => {
    if (stats.game.picksCompletionRate >= 80) return 'good';
    if (stats.game.picksCompletionRate >= 50) return 'warning';
    return 'critical';
  };

  return (
    <div className="space-y-6">
      {/* Player Stats */}
      <div>
        <h2 className="text-lg font-display text-neutral-800 mb-3">Player Stats</h2>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            title="Total Users"
            value={stats.players.total}
            trend={
              stats.players.growthRate !== undefined
                ? { value: stats.players.growthRate, label: 'vs last week' }
                : undefined
            }
          />
          <StatCard
            title="Active This Week"
            value={stats.players.activeThisWeek}
            subtitle="Logged in last 7 days"
          />
          <StatCard title="New Today" value={stats.players.newToday} />
          <StatCard title="New This Week" value={stats.players.newThisWeek} />
        </div>
      </div>

      {/* League Stats */}
      <div>
        <h2 className="text-lg font-display text-neutral-800 mb-3">League Stats</h2>
        <div className="grid grid-cols-2 gap-4">
          <StatCard title="Total Leagues" value={stats.leagues.total} />
          <StatCard
            title="Active This Week"
            value={stats.leagues.activeThisWeek}
            subtitle="With picks submitted"
          />
          <StatCard
            title="Global League"
            value={stats.leagues.globalLeagueSize}
            subtitle="members"
          />
          <StatCard
            title="Average Size"
            value={stats.leagues.averageSize.toFixed(1)}
            subtitle="members per league"
          />
        </div>
      </div>

      {/* Game Stats */}
      <div>
        <h2 className="text-lg font-display text-neutral-800 mb-3">Game Stats</h2>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            title="Picks This Week"
            value={stats.game.picksThisWeek}
            progress={{
              value: stats.game.picksCompletionRate,
              label: `${stats.game.picksCompletionRate.toFixed(0)}% completion rate`,
            }}
            status={getPicksCompletionStatus()}
          />
          <StatCard
            title="Episodes Scored"
            value={`${stats.game.episodesScored}/${stats.game.totalEpisodes}`}
            progress={{
              value:
                stats.game.totalEpisodes > 0
                  ? (stats.game.episodesScored / stats.game.totalEpisodes) * 100
                  : 0,
              label: `${stats.game.totalEpisodes - stats.game.episodesScored} remaining`,
            }}
          />
          <StatCard
            title="Castaways Remaining"
            value={stats.game.castawaysRemaining}
            subtitle="Still in the game"
          />
          <StatCard
            title="Castaways Eliminated"
            value={stats.game.castawaysEliminated}
            subtitle="Voted out / quit"
          />
        </div>
      </div>

      {/* System Health */}
      <div>
        <h2 className="text-lg font-display text-neutral-800 mb-3">System Health</h2>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            title="Database Response"
            value={`${stats.systemHealth.dbResponseTimeMs}ms`}
            status={stats.systemHealth.dbResponseTimeMs < 1000 ? 'good' : 'warning'}
          />
          <StatCard
            title="Job Failures"
            value={stats.systemHealth.jobFailuresLast24h}
            subtitle="Last 24 hours"
            status={
              stats.systemHealth.jobFailuresLast24h >= 10
                ? 'critical'
                : stats.systemHealth.jobFailuresLast24h >= 5
                  ? 'warning'
                  : 'good'
            }
          />
          <StatCard
            title="Email Queue"
            value={stats.systemHealth.emailQueueSize}
            subtitle="Pending/processing"
            status={stats.systemHealth.emailQueueSize >= 100 ? 'warning' : 'good'}
          />
          <StatCard
            title="Failed Emails"
            value={stats.systemHealth.failedEmailsCount}
            subtitle="Needs retry"
            status={
              stats.systemHealth.failedEmailsCount >= 20
                ? 'critical'
                : stats.systemHealth.failedEmailsCount >= 10
                  ? 'warning'
                  : 'good'
            }
          />
        </div>
      </div>
    </div>
  );
}
