import { supabaseAdmin } from '../config/supabase.js';
import { getJobHistory, getJobStats, getTrackedJobs } from '../jobs/index.js';
import { getQueueStats } from '../config/email.js';
import { seasonConfig } from '../lib/season-config.js';
import { DateTime } from 'luxon';
import { formatTimeUntil, measureDbLatency } from '../lib/shared-utils.js';

interface TimelineEvent {
  type: 'episode' | 'deadline' | 'job' | 'waiver';
  title: string;
  description: string;
  timestamp: string;
  status: 'upcoming' | 'in-progress' | 'completed';
  actionUrl?: string;
  icon?: string;
  metadata?: Record<string, any>;
}

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

interface ActivityItem {
  type:
    | 'user_signup'
    | 'league_created'
    | 'draft_completed'
    | 'pick_submitted'
    | 'payment_received'
    | 'admin_action';
  message: string;
  user?: {
    id: string;
    display_name: string;
  };
  timestamp: string;
  icon: string;
  metadata?: Record<string, any>;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: boolean;
    jobs: boolean;
    emailQueue: boolean;
  };
  lastCheckTime: string;
  issues: string[];
}

/**
 * Get timeline of upcoming events
 */
export async function getTimeline(): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = [];
  const now = DateTime.now().setZone('America/Los_Angeles');

  try {
    // Get active season
    const season = await seasonConfig.loadCurrentSeason();
    if (!season) {
      return events;
    }

    // 1. Draft Deadline
    const draftDeadline = await seasonConfig.getDraftDeadline();
    if (draftDeadline && draftDeadline > now) {
      events.push({
        type: 'deadline',
        title: 'Draft Deadline',
        description: `All drafts auto-complete at ${draftDeadline.toFormat('h:mm a')} PST`,
        timestamp: draftDeadline.toISO()!,
        status: 'upcoming',
        icon: '⏰',
        metadata: { timeUntil: formatTimeUntil(draftDeadline, now) },
      });
    }

    // 2. Next 3 episodes
    const { data: upcomingEpisodes } = await supabaseAdmin
      .from('episodes')
      .select('*')
      .eq('season_id', season.id)
      .gte('air_date', now.toISO()!)
      .order('air_date', { ascending: true })
      .limit(3);

    if (upcomingEpisodes) {
      for (const episode of upcomingEpisodes) {
        const airDate = DateTime.fromISO(episode.air_date, { zone: 'America/Los_Angeles' });
        const picksLockAt = episode.picks_lock_at
          ? DateTime.fromISO(episode.picks_lock_at, { zone: 'America/Los_Angeles' })
          : airDate.set({ hour: 15, minute: 0 });

        events.push({
          type: 'episode',
          title: `Episode ${episode.number} Airs`,
          description: `Picks lock ${picksLockAt.toFormat('EEE h:mm a')} PST`,
          timestamp: airDate.toISO()!,
          status: 'upcoming',
          actionUrl: `/admin/scoring?episode=${episode.id}`,
          icon: '📺',
          metadata: { timeUntil: formatTimeUntil(airDate, now), episodeNumber: episode.number },
        });
      }
    }

    // 3. Scheduled jobs - next run times
    const jobSchedules = [
      { name: 'lock-picks', day: 3, hour: 15, minute: 0, description: 'Lock Weekly Picks' },
      { name: 'auto-pick', day: 3, hour: 15, minute: 5, description: 'Auto-Pick Missing' },
      {
        name: 'pick-reminders',
        day: 3,
        hour: 12,
        minute: 0,
        description: 'Pick Reminder Emails',
      },
      {
        name: 'results-notification',
        day: 5,
        hour: 12,
        minute: 0,
        description: 'Episode Results Posted',
      },
      {
        name: 'weekly-summary',
        day: 0,
        hour: 10,
        minute: 0,
        description: 'Weekly Summary Emails',
      },
      {
        name: 'email-queue-processor',
        description: 'Email Queue Processor (every 5 min)',
        isRecurring: true,
      },
    ];

    for (const job of jobSchedules) {
      if (job.isRecurring) {
        // For recurring jobs like email processor, just show next run is soon
        const nextRun = now.plus({ minutes: 5 });
        events.push({
          type: 'job',
          title: job.description,
          description: 'Runs continuously every 5 minutes',
          timestamp: nextRun.toISO()!,
          status: 'upcoming',
          icon: '⚙️',
          metadata: { jobName: job.name, recurring: true },
        });
      } else {
        // Calculate next run for weekly jobs
        let nextRun = now.set({ hour: job.hour, minute: job.minute, second: 0, millisecond: 0 });

        // Find the next occurrence of this day of week
        const targetDay = job.day!;
        const currentDay = now.weekday === 7 ? 0 : now.weekday; // Convert Luxon weekday to JS (0=Sun)

        if (currentDay > targetDay || (currentDay === targetDay && now > nextRun)) {
          // Move to next week
          nextRun = nextRun.plus({ weeks: 1 });
        }

        // Adjust to target weekday
        const daysUntilTarget = (targetDay - currentDay + 7) % 7;
        if (daysUntilTarget > 0) {
          nextRun = nextRun.plus({ days: daysUntilTarget });
        }

        events.push({
          type: 'job',
          title: job.description,
          description: `Scheduled for ${nextRun.toFormat('EEE h:mm a')} PST`,
          timestamp: nextRun.toISO()!,
          status: 'upcoming',
          icon: '⚙️',
          metadata: { timeUntil: formatTimeUntil(nextRun, now), jobName: job.name },
        });
      }
    }

    // 4. Waiver windows
    // Saturday 12pm - Wednesday 3pm
    let nextWaiverOpen = now.set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
    const currentDay = now.weekday === 7 ? 0 : now.weekday;

    if (currentDay < 6 || (currentDay === 6 && now.hour < 12)) {
      // Before Saturday 12pm - next Saturday
      const daysUntilSat = (6 - currentDay + 7) % 7;
      nextWaiverOpen = nextWaiverOpen.plus({ days: daysUntilSat });
    } else if (currentDay === 6 && now.hour >= 12) {
      // After Saturday 12pm - already open, show close time
      const nextWaiverClose = now.set({ hour: 15, minute: 0, second: 0, millisecond: 0 });
      const daysUntilWed = (3 - currentDay + 7) % 7;
      const closeTime = nextWaiverClose.plus({ days: daysUntilWed });

      events.push({
        type: 'waiver',
        title: 'Waiver Window Closes',
        description: `Window closes ${closeTime.toFormat('EEE h:mm a')} PST`,
        timestamp: closeTime.toISO()!,
        status: 'in-progress',
        icon: '🔄',
        metadata: { timeUntil: formatTimeUntil(closeTime, now), action: 'close' },
      });
    } else {
      // After Saturday - next Saturday
      nextWaiverOpen = nextWaiverOpen.plus({ weeks: 1 });
    }

    // Add waiver open event if not currently open
    if (currentDay < 6 || (currentDay === 6 && now.hour < 12)) {
      events.push({
        type: 'waiver',
        title: 'Waiver Window Opens',
        description: `Window opens ${nextWaiverOpen.toFormat('EEE h:mm a')} PST`,
        timestamp: nextWaiverOpen.toISO()!,
        status: 'upcoming',
        icon: '🔄',
        metadata: { timeUntil: formatTimeUntil(nextWaiverOpen, now), action: 'open' },
      });
    }
  } catch (error) {
    console.error('Error building timeline:', error);
  }

  // Sort by timestamp
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return events;
}

/**
 * Get comprehensive dashboard stats
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const now = DateTime.now().setZone('America/Los_Angeles');
  const todayStart = now.startOf('day').toISO()!;
  const weekStart = now.startOf('week').toISO()!;
  const lastWeekStart = now.minus({ weeks: 1 }).startOf('week').toISO()!;

  try {
    // Player stats
    const [totalUsers, activeThisWeek, newToday, newThisWeek, newLastWeek] = await Promise.all([
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
      supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('last_sign_in_at', weekStart),
      supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart),
      supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', weekStart),
      supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', lastWeekStart)
        .lt('created_at', weekStart),
    ]);

    // Calculate growth rate
    const growthRate =
      newLastWeek.count && newLastWeek.count > 0
        ? ((newThisWeek.count! - newLastWeek.count) / newLastWeek.count) * 100
        : undefined;

    // League stats
    const [totalLeagues, leaguesWithActivity, globalLeague, allLeaguesWithMembers] =
      await Promise.all([
        supabaseAdmin.from('leagues').select('id', { count: 'exact', head: true }),
        supabaseAdmin
          .from('weekly_picks')
          .select('league_id', { count: 'exact', head: true })
          .gte('created_at', weekStart),
        supabaseAdmin.from('leagues').select('id').eq('is_global', true).single(),
        supabaseAdmin.from('leagues').select(`
          id,
          league_members (count)
        `),
      ]);

    // Get global league size
    let globalLeagueSize = 0;
    if (globalLeague.data) {
      const { count } = await supabaseAdmin
        .from('league_members')
        .select('id', { count: 'exact', head: true })
        .eq('league_id', globalLeague.data.id);
      globalLeagueSize = count || 0;
    }

    // Calculate average league size
    const totalMembers =
      allLeaguesWithMembers.data?.reduce((sum, league: any) => {
        return sum + (league.league_members?.[0]?.count || 0);
      }, 0) || 0;
    const averageSize =
      totalLeagues.count && totalLeagues.count > 0 ? totalMembers / totalLeagues.count : 0;

    // Game stats - get current season
    const season = await seasonConfig.loadCurrentSeason();
    let gameStats = {
      picksThisWeek: 0,
      picksCompletionRate: 0,
      castawaysRemaining: 0,
      castawaysEliminated: 0,
      episodesScored: 0,
      totalEpisodes: 0,
    };

    if (season) {
      const [
        picksThisWeek,
        totalPlayersThisWeek,
        castawaysRemaining,
        castawaysEliminated,
        episodesScored,
        totalEpisodes,
      ] = await Promise.all([
        supabaseAdmin
          .from('weekly_picks')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', weekStart),
        supabaseAdmin
          .from('league_members')
          .select('id', { count: 'exact', head: true }),
        supabaseAdmin
          .from('castaways')
          .select('id', { count: 'exact', head: true })
          .eq('season_id', season.id)
          .eq('status', 'active'),
        supabaseAdmin
          .from('castaways')
          .select('id', { count: 'exact', head: true })
          .eq('season_id', season.id)
          .eq('status', 'eliminated'),
        supabaseAdmin
          .from('episodes')
          .select('id', { count: 'exact', head: true })
          .eq('season_id', season.id)
          .eq('is_scored', true),
        supabaseAdmin
          .from('episodes')
          .select('id', { count: 'exact', head: true })
          .eq('season_id', season.id),
      ]);

      const completionRate =
        totalPlayersThisWeek.count && totalPlayersThisWeek.count > 0
          ? (picksThisWeek.count! / totalPlayersThisWeek.count) * 100
          : 0;

      gameStats = {
        picksThisWeek: picksThisWeek.count || 0,
        picksCompletionRate: completionRate,
        castawaysRemaining: castawaysRemaining.count || 0,
        castawaysEliminated: castawaysEliminated.count || 0,
        episodesScored: episodesScored.count || 0,
        totalEpisodes: totalEpisodes.count || 0,
      };
    }

    // System health stats
    const dbResponseTimeMs = await measureDbLatency();

    // Job failures in last 24h
    const last24h = now.minus({ hours: 24 }).toJSDate();
    const jobHistory = getJobHistory(100);
    const jobFailuresLast24h = jobHistory.filter(
      (exec) => !exec.success && exec.startTime >= last24h
    ).length;

    // Email queue stats
    const queueStats = await getQueueStats();
    const emailQueueSize = queueStats.pending + queueStats.processing;

    // Failed emails count
    const { count: failedEmailsCount } = await supabaseAdmin
      .from('failed_emails')
      .select('id', { count: 'exact', head: true })
      .eq('retry_attempted', false);

    return {
      players: {
        total: totalUsers.count || 0,
        activeThisWeek: activeThisWeek.count || 0,
        newToday: newToday.count || 0,
        newThisWeek: newThisWeek.count || 0,
        growthRate,
      },
      leagues: {
        total: totalLeagues.count || 0,
        activeThisWeek: leaguesWithActivity.count || 0,
        globalLeagueSize,
        averageSize: Math.round(averageSize * 10) / 10,
      },
      game: gameStats,
      systemHealth: {
        dbResponseTimeMs,
        jobFailuresLast24h,
        emailQueueSize,
        failedEmailsCount: failedEmailsCount || 0,
      },
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    throw error;
  }
}

/**
 * Get recent platform activity
 */
export async function getRecentActivity(limit: number = 20): Promise<ActivityItem[]> {
  const activities: ActivityItem[] = [];
  const now = DateTime.now();

  try {
    // Get recent user signups
    const { data: recentSignups } = await supabaseAdmin
      .from('users')
      .select('id, display_name, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentSignups) {
      for (const user of recentSignups) {
        activities.push({
          type: 'user_signup',
          message: `${user.display_name} joined the platform`,
          user: { id: user.id, display_name: user.display_name },
          timestamp: user.created_at,
          icon: '👤',
        });
      }
    }

    // Get recent league creations
    const { data: recentLeagues } = await supabaseAdmin
      .from('leagues')
      .select(
        `
        id,
        name,
        created_at,
        users:commissioner_id (
          id,
          display_name
        )
      `
      )
      .eq('is_global', false)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentLeagues) {
      for (const league of recentLeagues as any) {
        activities.push({
          type: 'league_created',
          message: `${league.users?.display_name || 'Someone'} created "${league.name}" league`,
          user: league.users
            ? { id: league.users.id, display_name: league.users.display_name }
            : undefined,
          timestamp: league.created_at,
          icon: '🏆',
          metadata: { leagueId: league.id, leagueName: league.name },
        });
      }
    }

    // Get recent payments
    const { data: recentPayments } = await supabaseAdmin
      .from('payments')
      .select(
        `
        id,
        amount,
        created_at,
        users (
          id,
          display_name
        ),
        leagues (
          id,
          name
        )
      `
      )
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentPayments) {
      for (const payment of recentPayments as any) {
        activities.push({
          type: 'payment_received',
          message: `${payment.users?.display_name || 'Someone'} paid $${(payment.amount / 100).toFixed(2)} for "${payment.leagues?.name || 'league'}"`,
          user: payment.users
            ? { id: payment.users.id, display_name: payment.users.display_name }
            : undefined,
          timestamp: payment.created_at,
          icon: '💰',
          metadata: {
            amount: payment.amount,
            leagueId: payment.leagues?.id,
            leagueName: payment.leagues?.name,
          },
        });
      }
    }

    // Get recent admin scoring actions (finalized episodes)
    const { data: recentScoring } = await supabaseAdmin
      .from('episodes')
      .select('id, number, title, updated_at')
      .eq('is_scored', true)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (recentScoring) {
      for (const episode of recentScoring) {
        activities.push({
          type: 'admin_action',
          message: `Episode ${episode.number} scoring finalized`,
          timestamp: episode.updated_at,
          icon: '✅',
          metadata: { episodeId: episode.id, episodeNumber: episode.number },
        });
      }
    }
  } catch (error) {
    console.error('Error getting recent activity:', error);
  }

  // Sort by timestamp (most recent first)
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return activities.slice(0, limit);
}

/**
 * Get draft status overview
 */
export async function getDraftStats() {
  try {
    const [pending, inProgress, completed, totalLeagues] = await Promise.all([
      supabaseAdmin
        .from('leagues')
        .select('id', { count: 'exact', head: true })
        .eq('draft_status', 'pending')
        .eq('is_global', false),
      supabaseAdmin
        .from('leagues')
        .select('id', { count: 'exact', head: true })
        .eq('draft_status', 'in_progress')
        .eq('is_global', false),
      supabaseAdmin
        .from('leagues')
        .select('id', { count: 'exact', head: true })
        .eq('draft_status', 'completed')
        .eq('is_global', false),
      supabaseAdmin
        .from('leagues')
        .select('id', { count: 'exact', head: true })
        .eq('is_global', false),
    ]);

    // Get leagues awaiting draft (pending with 2+ members)
    const { data: leaguesAwaitingDraft } = await supabaseAdmin
      .from('leagues')
      .select(`
        id,
        name,
        code,
        league_members (count)
      `)
      .eq('draft_status', 'pending')
      .eq('is_global', false);

    const awaitingDraft = leaguesAwaitingDraft?.filter(
      (l: any) => (l.league_members?.[0]?.count || 0) >= 2
    ).length || 0;

    return {
      pending: pending.count || 0,
      inProgress: inProgress.count || 0,
      completed: completed.count || 0,
      total: totalLeagues.count || 0,
      awaitingDraft,
    };
  } catch (error) {
    console.error('Error getting draft stats:', error);
    throw error;
  }
}

/**
 * Get payment/revenue stats
 */
export async function getPaymentStats() {
  const now = DateTime.now().setZone('America/Los_Angeles');
  const todayStart = now.startOf('day').toISO()!;
  const weekStart = now.startOf('week').toISO()!;
  const monthStart = now.startOf('month').toISO()!;

  try {
    const [
      totalPayments,
      completedPayments,
      pendingPayments,
      failedPayments,
      todayRevenue,
      weekRevenue,
      monthRevenue,
      allTimeRevenue,
    ] = await Promise.all([
      supabaseAdmin.from('payments').select('id', { count: 'exact', head: true }),
      supabaseAdmin
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed'),
      supabaseAdmin
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabaseAdmin
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed'),
      supabaseAdmin
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', todayStart),
      supabaseAdmin
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', weekStart),
      supabaseAdmin
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', monthStart),
      supabaseAdmin.from('payments').select('amount').eq('status', 'completed'),
    ]);

    const sumAmounts = (data: any[] | null) =>
      data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    return {
      totalPayments: totalPayments.count || 0,
      byStatus: {
        completed: completedPayments.count || 0,
        pending: pendingPayments.count || 0,
        failed: failedPayments.count || 0,
      },
      revenue: {
        today: sumAmounts(todayRevenue.data) / 100,
        thisWeek: sumAmounts(weekRevenue.data) / 100,
        thisMonth: sumAmounts(monthRevenue.data) / 100,
        allTime: sumAmounts(allTimeRevenue.data) / 100,
      },
    };
  } catch (error) {
    console.error('Error getting payment stats:', error);
    throw error;
  }
}

/**
 * Get trivia engagement stats
 */
export async function getTriviaStats() {
  try {
    // Get users who have attempted trivia
    const { data: triviaProgress } = await supabaseAdmin
      .from('trivia_progress')
      .select('user_id, questions_answered, questions_correct');

    const totalAttempts = triviaProgress?.length || 0;
    const completedTrivia = triviaProgress?.filter((p) => p.questions_correct >= 24).length || 0;
    const inProgress = triviaProgress?.filter(
      (p) => p.questions_answered > 0 && p.questions_correct < 24
    ).length || 0;

    // Calculate average questions answered
    const avgQuestionsAnswered =
      totalAttempts > 0
        ? triviaProgress!.reduce((sum, p) => sum + p.questions_answered, 0) / totalAttempts
        : 0;

    // Calculate average questions correct
    const avgQuestionsCorrect =
      totalAttempts > 0
        ? triviaProgress!.reduce((sum, p) => sum + p.questions_correct, 0) / totalAttempts
        : 0;

    // Get total users for completion rate
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true });

    const completionRate = totalUsers && totalUsers > 0 ? (completedTrivia / totalUsers) * 100 : 0;

    return {
      totalAttempts,
      completedTrivia,
      inProgress,
      completionRate: Math.round(completionRate * 10) / 10,
      avgQuestionsAnswered: Math.round(avgQuestionsAnswered * 10) / 10,
      avgQuestionsCorrect: Math.round(avgQuestionsCorrect * 10) / 10,
    };
  } catch (error) {
    console.error('Error getting trivia stats:', error);
    throw error;
  }
}

/**
 * Get league breakdown by type
 */
export async function getLeagueBreakdown() {
  try {
    const [publicLeagues, privateLeagues, paidLeagues, freeLeagues] = await Promise.all([
      supabaseAdmin
        .from('leagues')
        .select('id', { count: 'exact', head: true })
        .eq('is_public', true)
        .eq('is_global', false),
      supabaseAdmin
        .from('leagues')
        .select('id', { count: 'exact', head: true })
        .eq('is_public', false)
        .eq('is_global', false),
      supabaseAdmin
        .from('leagues')
        .select('id', { count: 'exact', head: true })
        .eq('require_donation', true)
        .eq('is_global', false),
      supabaseAdmin
        .from('leagues')
        .select('id', { count: 'exact', head: true })
        .eq('require_donation', false)
        .eq('is_global', false),
    ]);

    return {
      byVisibility: {
        public: publicLeagues.count || 0,
        private: privateLeagues.count || 0,
      },
      byPayment: {
        paid: paidLeagues.count || 0,
        free: freeLeagues.count || 0,
      },
    };
  } catch (error) {
    console.error('Error getting league breakdown:', error);
    throw error;
  }
}

/**
 * Get notification stats
 */
export async function getNotificationStats() {
  try {
    const [emailEnabled, smsEnabled, pushEnabled, totalUsers] = await Promise.all([
      supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('email_notifications', true),
      supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('sms_notifications', true),
      supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('push_notifications', true),
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
    ]);

    return {
      email: {
        enabled: emailEnabled.count || 0,
        percentage:
          totalUsers.count && totalUsers.count > 0
            ? Math.round(((emailEnabled.count || 0) / totalUsers.count) * 100)
            : 0,
      },
      sms: {
        enabled: smsEnabled.count || 0,
        percentage:
          totalUsers.count && totalUsers.count > 0
            ? Math.round(((smsEnabled.count || 0) / totalUsers.count) * 100)
            : 0,
      },
      push: {
        enabled: pushEnabled.count || 0,
        percentage:
          totalUsers.count && totalUsers.count > 0
            ? Math.round(((pushEnabled.count || 0) / totalUsers.count) * 100)
            : 0,
      },
      totalUsers: totalUsers.count || 0,
    };
  } catch (error) {
    console.error('Error getting notification stats:', error);
    throw error;
  }
}

/**
 * Get system health status
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const now = DateTime.now();
  const issues: string[] = [];
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  try {
    // Check database
    const dbResponseTimeMs = await measureDbLatency();

    const dbHealthy = dbResponseTimeMs < 1000;
    if (!dbHealthy) {
      issues.push(`Database slow (${dbResponseTimeMs}ms)`);
      status = 'degraded';
    }

    // Check jobs
    const last24h = now.minus({ hours: 24 }).toJSDate();
    const jobHistory = getJobHistory(100);
    const recentFailures = jobHistory.filter(
      (exec) => !exec.success && exec.startTime >= last24h
    );
    const jobsHealthy = recentFailures.length < 5;

    if (!jobsHealthy) {
      issues.push(`${recentFailures.length} job failures in last 24h`);
      status = recentFailures.length >= 10 ? 'unhealthy' : 'degraded';
    }

    // Check email queue
    const queueStats = await getQueueStats();
    const emailQueueHealthy = queueStats.failed_today < 10 && queueStats.pending < 100;

    if (!emailQueueHealthy) {
      if (queueStats.failed_today >= 10) {
        issues.push(`${queueStats.failed_today} failed emails today`);
      }
      if (queueStats.pending >= 100) {
        issues.push(`${queueStats.pending} emails pending`);
      }
      status = queueStats.failed_today >= 20 ? 'unhealthy' : 'degraded';
    }

    return {
      status,
      checks: {
        database: dbHealthy,
        jobs: jobsHealthy,
        emailQueue: emailQueueHealthy,
      },
      lastCheckTime: now.toISO()!,
      issues,
    };
  } catch (error) {
    console.error('Error checking system health:', error);
    return {
      status: 'unhealthy',
      checks: {
        database: false,
        jobs: false,
        emailQueue: false,
      },
      lastCheckTime: now.toISO()!,
      issues: ['Health check failed'],
    };
  }
}
