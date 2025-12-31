/**
 * Comprehensive Admin Stats Service
 * 
 * Provides detailed analytics across all platform dimensions
 */

import { supabaseAdmin } from '../config/supabase.js';
import { DateTime } from 'luxon';
import { getQueueStats } from '../config/email.js';
import { getJobHistory } from '../jobs/index.js';
import { measureDbLatency } from '../lib/shared-utils.js';

// ============================================================================
// Type Definitions
// ============================================================================

export interface RevenueStats {
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  monthOverMonthGrowth: number | null;
  averageDonation: number;
  totalPayments: number;
  paymentsByStatus: {
    completed: number;
    pending: number;
    failed: number;
    refunded: number;
  };
  revenueByLeague: Array<{
    leagueId: string;
    leagueName: string;
    totalAmount: number;
    paymentCount: number;
  }>;
}

export interface UserEngagementStats {
  totalUsers: number;
  profilesComplete: number;
  profileCompletionRate: number;
  triviaStats: {
    started: number;
    completed: number;
    completionRate: number;
    averageScore: number;
    averageAttempts: number;
  };
  usersByRole: {
    players: number;
    commissioners: number;
    admins: number;
  };
  retentionStats: {
    activeToday: number;
    activeThisWeek: number;
    activeThisMonth: number;
    churned30Days: number;
  };
  signupsByDay: Array<{
    date: string;
    count: number;
  }>;
}

export interface LeagueAnalyticsStats {
  totalLeagues: number;
  publicLeagues: number;
  privateLeagues: number;
  paidLeagues: number;
  freeLeagues: number;
  globalLeagueMembers: number;
  draftStats: {
    pending: number;
    inProgress: number;
    completed: number;
    completionRate: number;
  };
  memberDistribution: {
    min: number;
    max: number;
    average: number;
    median: number;
  };
  leaguesByStatus: {
    forming: number;
    drafting: number;
    active: number;
    completed: number;
  };
  topLeagues: Array<{
    id: string;
    name: string;
    memberCount: number;
    isPublic: boolean;
    requireDonation: boolean;
    donationAmount: number | null;
  }>;
}

export interface CommunicationStats {
  chatStats: {
    totalMessages: number;
    messagesThisWeek: number;
    uniqueChatters: number;
    averageMessagesPerUser: number;
  };
  emailStats: {
    totalSent: number;
    sentToday: number;
    queueSize: number;
    failedCount: number;
    deliveryRate: number;
  };
  notificationPrefs: {
    emailEnabled: number;
    smsEnabled: number;
    pushEnabled: number;
    spoilerDelayEnabled: number;
  };
}

export interface GameProgressStats {
  season: {
    id: string;
    name: string;
    number: number;
  } | null;
  episodes: {
    total: number;
    scored: number;
    remaining: number;
    nextAirDate: string | null;
  };
  castaways: {
    total: number;
    active: number;
    eliminated: number;
    winner: number;
  };
  picks: {
    totalThisWeek: number;
    lockedThisWeek: number;
    autoPickedThisWeek: number;
    pendingThisWeek: number;
  };
  scoring: {
    totalPointsAwarded: number;
    averagePointsPerEpisode: number;
    topScorer: {
      name: string;
      points: number;
    } | null;
  };
  tribeBreakdown: Array<{
    tribe: string;
    active: number;
    eliminated: number;
  }>;
}

export interface SystemMetrics {
  database: {
    latencyMs: number;
    status: 'healthy' | 'degraded' | 'unhealthy';
  };
  jobs: {
    totalRuns24h: number;
    successRate: number;
    failures24h: number;
    lastFailure: string | null;
  };
  email: {
    queueSize: number;
    processingRate: number;
    failedToday: number;
  };
  storage: {
    avatarCount: number;
  };
}

export interface ComprehensiveStats {
  generatedAt: string;
  revenue: RevenueStats;
  userEngagement: UserEngagementStats;
  leagueAnalytics: LeagueAnalyticsStats;
  communication: CommunicationStats;
  gameProgress: GameProgressStats;
  systemMetrics: SystemMetrics;
}

// ============================================================================
// Revenue Stats
// ============================================================================

export async function getRevenueStats(): Promise<RevenueStats> {
  const now = DateTime.now().setZone('America/Los_Angeles');
  const thisMonthStart = now.startOf('month').toISO()!;
  const lastMonthStart = now.minus({ months: 1 }).startOf('month').toISO()!;
  const lastMonthEnd = now.startOf('month').toISO()!;

  // Get all payments
  const { data: allPayments } = await supabaseAdmin
    .from('payments')
    .select('id, amount, status, league_id, created_at');

  const payments = allPayments || [];

  // Calculate totals
  const completedPayments = payments.filter(p => p.status === 'completed');
  const totalRevenue = completedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  
  const thisMonthPayments = completedPayments.filter(p => p.created_at >= thisMonthStart);
  const revenueThisMonth = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  
  const lastMonthPayments = completedPayments.filter(
    p => p.created_at >= lastMonthStart && p.created_at < lastMonthEnd
  );
  const revenueLastMonth = lastMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  // Month over month growth
  const monthOverMonthGrowth = revenueLastMonth > 0
    ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
    : null;

  // Average donation
  const averageDonation = completedPayments.length > 0
    ? totalRevenue / completedPayments.length
    : 0;

  // Payments by status
  const paymentsByStatus = {
    completed: payments.filter(p => p.status === 'completed').length,
    pending: payments.filter(p => p.status === 'pending').length,
    failed: payments.filter(p => p.status === 'failed').length,
    refunded: payments.filter(p => p.status === 'refunded').length,
  };

  // Revenue by league
  const { data: leagues } = await supabaseAdmin
    .from('leagues')
    .select('id, name');

  const leagueMap = new Map((leagues || []).map(l => [l.id, l.name]));
  
  const revenueByLeagueMap = new Map<string, { totalAmount: number; paymentCount: number }>();
  for (const payment of completedPayments) {
    const existing = revenueByLeagueMap.get(payment.league_id) || { totalAmount: 0, paymentCount: 0 };
    existing.totalAmount += Number(payment.amount);
    existing.paymentCount += 1;
    revenueByLeagueMap.set(payment.league_id, existing);
  }

  const revenueByLeague = Array.from(revenueByLeagueMap.entries())
    .map(([leagueId, data]) => ({
      leagueId,
      leagueName: leagueMap.get(leagueId) || 'Unknown League',
      totalAmount: data.totalAmount,
      paymentCount: data.paymentCount,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10);

  return {
    totalRevenue: totalRevenue / 100, // Convert cents to dollars
    revenueThisMonth: revenueThisMonth / 100,
    revenueLastMonth: revenueLastMonth / 100,
    monthOverMonthGrowth,
    averageDonation: averageDonation / 100,
    totalPayments: payments.length,
    paymentsByStatus,
    revenueByLeague: revenueByLeague.map(l => ({
      ...l,
      totalAmount: l.totalAmount / 100,
    })),
  };
}

// ============================================================================
// User Engagement Stats
// ============================================================================

export async function getUserEngagementStats(): Promise<UserEngagementStats> {
  const now = DateTime.now().setZone('America/Los_Angeles');
  const todayStart = now.startOf('day').toISO()!;
  const weekStart = now.startOf('week').toISO()!;
  const monthStart = now.startOf('month').toISO()!;
  const thirtyDaysAgo = now.minus({ days: 30 }).toISO()!;

  // Get all users
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, role, profile_setup_complete, trivia_completed, trivia_score, trivia_attempts, created_at');

  const allUsers = users || [];

  // Profile completion
  const profilesComplete = allUsers.filter(u => u.profile_setup_complete).length;
  const profileCompletionRate = allUsers.length > 0 
    ? (profilesComplete / allUsers.length) * 100 
    : 0;

  // Trivia stats
  const triviaStarted = allUsers.filter(u => u.trivia_attempts && u.trivia_attempts > 0).length;
  const triviaCompleted = allUsers.filter(u => u.trivia_completed).length;
  const triviaCompletionRate = triviaStarted > 0 
    ? (triviaCompleted / triviaStarted) * 100 
    : 0;
  const triviaScores = allUsers.filter(u => u.trivia_completed && u.trivia_score).map(u => u.trivia_score!);
  const averageScore = triviaScores.length > 0 
    ? triviaScores.reduce((a, b) => a + b, 0) / triviaScores.length 
    : 0;
  const triviaAttempts = allUsers.filter(u => u.trivia_attempts).map(u => u.trivia_attempts!);
  const averageAttempts = triviaAttempts.length > 0 
    ? triviaAttempts.reduce((a, b) => a + b, 0) / triviaAttempts.length 
    : 0;

  // Users by role
  const usersByRole = {
    players: allUsers.filter(u => u.role === 'player' || !u.role).length,
    commissioners: allUsers.filter(u => u.role === 'commissioner').length,
    admins: allUsers.filter(u => u.role === 'admin').length,
  };

  // Retention stats - get from auth.users for last_sign_in_at
  const { count: activeToday } = await supabaseAdmin
    .from('users')
    .select('id', { count: 'exact', head: true })
    .gte('updated_at', todayStart);

  const { count: activeThisWeek } = await supabaseAdmin
    .from('users')
    .select('id', { count: 'exact', head: true })
    .gte('updated_at', weekStart);

  const { count: activeThisMonth } = await supabaseAdmin
    .from('users')
    .select('id', { count: 'exact', head: true })
    .gte('updated_at', monthStart);

  // Churned = created > 30 days ago but not active in last 30 days
  const { count: churned30Days } = await supabaseAdmin
    .from('users')
    .select('id', { count: 'exact', head: true })
    .lt('created_at', thirtyDaysAgo)
    .lt('updated_at', thirtyDaysAgo);

  // Signups by day (last 14 days)
  const signupsByDay: Array<{ date: string; count: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const dayStart = now.minus({ days: i }).startOf('day');
    const dayEnd = dayStart.plus({ days: 1 });
    
    const { count } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', dayStart.toISO()!)
      .lt('created_at', dayEnd.toISO()!);

    signupsByDay.push({
      date: dayStart.toFormat('yyyy-MM-dd'),
      count: count || 0,
    });
  }

  return {
    totalUsers: allUsers.length,
    profilesComplete,
    profileCompletionRate,
    triviaStats: {
      started: triviaStarted,
      completed: triviaCompleted,
      completionRate: triviaCompletionRate,
      averageScore,
      averageAttempts,
    },
    usersByRole,
    retentionStats: {
      activeToday: activeToday || 0,
      activeThisWeek: activeThisWeek || 0,
      activeThisMonth: activeThisMonth || 0,
      churned30Days: churned30Days || 0,
    },
    signupsByDay,
  };
}

// ============================================================================
// League Analytics Stats
// ============================================================================

export async function getLeagueAnalyticsStats(): Promise<LeagueAnalyticsStats> {
  // Get all leagues with member counts
  const { data: leagues } = await supabaseAdmin
    .from('leagues')
    .select(`
      id,
      name,
      is_public,
      is_global,
      require_donation,
      donation_amount,
      status,
      draft_status,
      league_members (count)
    `);

  const allLeagues = (leagues || []) as any[];
  const nonGlobalLeagues = allLeagues.filter(l => !l.is_global);

  // Basic counts
  const totalLeagues = nonGlobalLeagues.length;
  const publicLeagues = nonGlobalLeagues.filter(l => l.is_public).length;
  const privateLeagues = nonGlobalLeagues.filter(l => !l.is_public).length;
  const paidLeagues = nonGlobalLeagues.filter(l => l.require_donation).length;
  const freeLeagues = nonGlobalLeagues.filter(l => !l.require_donation).length;

  // Global league members
  const globalLeague = allLeagues.find(l => l.is_global);
  const globalLeagueMembers = globalLeague?.league_members?.[0]?.count || 0;

  // Draft stats
  const draftStats = {
    pending: nonGlobalLeagues.filter(l => l.draft_status === 'pending').length,
    inProgress: nonGlobalLeagues.filter(l => l.draft_status === 'in_progress').length,
    completed: nonGlobalLeagues.filter(l => l.draft_status === 'completed').length,
    completionRate: 0,
  };
  if (totalLeagues > 0) {
    draftStats.completionRate = (draftStats.completed / totalLeagues) * 100;
  }

  // Member distribution
  const memberCounts = nonGlobalLeagues.map(l => l.league_members?.[0]?.count || 0).filter(c => c > 0);
  const sortedCounts = [...memberCounts].sort((a, b) => a - b);
  
  const memberDistribution = {
    min: sortedCounts.length > 0 ? sortedCounts[0] : 0,
    max: sortedCounts.length > 0 ? sortedCounts[sortedCounts.length - 1] : 0,
    average: memberCounts.length > 0 
      ? memberCounts.reduce((a, b) => a + b, 0) / memberCounts.length 
      : 0,
    median: sortedCounts.length > 0 
      ? sortedCounts[Math.floor(sortedCounts.length / 2)] 
      : 0,
  };

  // Leagues by status
  const leaguesByStatus = {
    forming: nonGlobalLeagues.filter(l => l.status === 'forming').length,
    drafting: nonGlobalLeagues.filter(l => l.status === 'drafting').length,
    active: nonGlobalLeagues.filter(l => l.status === 'active').length,
    completed: nonGlobalLeagues.filter(l => l.status === 'completed').length,
  };

  // Top leagues by member count
  const topLeagues = nonGlobalLeagues
    .map(l => ({
      id: l.id,
      name: l.name,
      memberCount: l.league_members?.[0]?.count || 0,
      isPublic: l.is_public,
      requireDonation: l.require_donation,
      donationAmount: l.donation_amount ? Number(l.donation_amount) : null,
    }))
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, 10);

  return {
    totalLeagues,
    publicLeagues,
    privateLeagues,
    paidLeagues,
    freeLeagues,
    globalLeagueMembers,
    draftStats,
    memberDistribution,
    leaguesByStatus,
    topLeagues,
  };
}

// ============================================================================
// Communication Stats
// ============================================================================

export async function getCommunicationStats(): Promise<CommunicationStats> {
  const now = DateTime.now().setZone('America/Los_Angeles');
  const weekStart = now.startOf('week').toISO()!;
  const todayStart = now.startOf('day').toISO()!;

  // Chat stats from league_messages
  const { count: totalMessages } = await supabaseAdmin
    .from('league_messages')
    .select('id', { count: 'exact', head: true });

  const { count: messagesThisWeek } = await supabaseAdmin
    .from('league_messages')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', weekStart);

  const { data: uniqueChattersData } = await supabaseAdmin
    .from('league_messages')
    .select('user_id');
  
  const uniqueChatters = new Set((uniqueChattersData || []).map(m => m.user_id)).size;
  const averageMessagesPerUser = uniqueChatters > 0 
    ? (totalMessages || 0) / uniqueChatters 
    : 0;

  // Email stats
  const queueStats = await getQueueStats();
  
  const { count: totalEmailsSent } = await supabaseAdmin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('type', 'email');

  const { count: emailsSentToday } = await supabaseAdmin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('type', 'email')
    .gte('sent_at', todayStart);

  const { count: failedEmails } = await supabaseAdmin
    .from('failed_emails')
    .select('id', { count: 'exact', head: true })
    .eq('retry_attempted', false);

  // Delivery rate calculation
  const totalAttempted = (totalEmailsSent || 0) + (failedEmails || 0);
  const deliveryRate = totalAttempted > 0 
    ? ((totalEmailsSent || 0) / totalAttempted) * 100 
    : 100;

  // Notification preferences
  const { data: notifPrefs } = await supabaseAdmin
    .from('notification_preferences')
    .select('email_results, sms_results, push_results, spoiler_delay_hours');

  const prefs = notifPrefs || [];
  const notificationPrefs = {
    emailEnabled: prefs.filter(p => p.email_results).length,
    smsEnabled: prefs.filter(p => p.sms_results).length,
    pushEnabled: prefs.filter(p => p.push_results).length,
    spoilerDelayEnabled: prefs.filter(p => p.spoiler_delay_hours && p.spoiler_delay_hours > 0).length,
  };

  return {
    chatStats: {
      totalMessages: totalMessages || 0,
      messagesThisWeek: messagesThisWeek || 0,
      uniqueChatters,
      averageMessagesPerUser,
    },
    emailStats: {
      totalSent: totalEmailsSent || 0,
      sentToday: emailsSentToday || 0,
      queueSize: queueStats.pending + queueStats.processing,
      failedCount: failedEmails || 0,
      deliveryRate,
    },
    notificationPrefs,
  };
}

// ============================================================================
// Game Progress Stats
// ============================================================================

export async function getGameProgressStats(): Promise<GameProgressStats> {
  const now = DateTime.now().setZone('America/Los_Angeles');
  const weekStart = now.startOf('week').toISO()!;

  // Get active season
  const { data: season } = await supabaseAdmin
    .from('seasons')
    .select('id, name, number')
    .eq('is_active', true)
    .single();

  if (!season) {
    return {
      season: null,
      episodes: { total: 0, scored: 0, remaining: 0, nextAirDate: null },
      castaways: { total: 0, active: 0, eliminated: 0, winner: 0 },
      picks: { totalThisWeek: 0, lockedThisWeek: 0, autoPickedThisWeek: 0, pendingThisWeek: 0 },
      scoring: { totalPointsAwarded: 0, averagePointsPerEpisode: 0, topScorer: null },
      tribeBreakdown: [],
    };
  }

  // Episodes
  const { data: episodes } = await supabaseAdmin
    .from('episodes')
    .select('id, is_scored, air_date')
    .eq('season_id', season.id)
    .order('air_date', { ascending: true });

  const allEpisodes = episodes || [];
  const scoredEpisodes = allEpisodes.filter(e => e.is_scored);
  const nextEpisode = allEpisodes.find(e => new Date(e.air_date) > new Date());

  // Castaways
  const { data: castaways } = await supabaseAdmin
    .from('castaways')
    .select('id, status, tribe_original')
    .eq('season_id', season.id);

  const allCastaways = castaways || [];
  const castawayStats = {
    total: allCastaways.length,
    active: allCastaways.filter(c => c.status === 'active').length,
    eliminated: allCastaways.filter(c => c.status === 'eliminated').length,
    winner: allCastaways.filter(c => c.status === 'winner').length,
  };

  // Tribe breakdown
  const tribeMap = new Map<string, { active: number; eliminated: number }>();
  for (const castaway of allCastaways) {
    const tribe = castaway.tribe_original || 'Unknown';
    const existing = tribeMap.get(tribe) || { active: 0, eliminated: 0 };
    if (castaway.status === 'active') {
      existing.active += 1;
    } else {
      existing.eliminated += 1;
    }
    tribeMap.set(tribe, existing);
  }
  const tribeBreakdown = Array.from(tribeMap.entries()).map(([tribe, stats]) => ({
    tribe,
    ...stats,
  }));

  // Picks this week
  const { data: picks } = await supabaseAdmin
    .from('weekly_picks')
    .select('id, status')
    .gte('created_at', weekStart);

  const allPicks = picks || [];
  const pickStats = {
    totalThisWeek: allPicks.length,
    lockedThisWeek: allPicks.filter(p => p.status === 'locked').length,
    autoPickedThisWeek: allPicks.filter(p => p.status === 'auto_picked').length,
    pendingThisWeek: allPicks.filter(p => p.status === 'pending').length,
  };

  // Scoring stats
  const { data: scores } = await supabaseAdmin
    .from('episode_scores')
    .select('points, episode_id');

  const allScores = scores || [];
  const totalPointsAwarded = allScores.reduce((sum, s) => sum + s.points, 0);
  const averagePointsPerEpisode = scoredEpisodes.length > 0 
    ? totalPointsAwarded / scoredEpisodes.length 
    : 0;

  // Top scorer (from league_members)
  const { data: topMember } = await supabaseAdmin
    .from('league_members')
    .select(`
      total_points,
      users (display_name)
    `)
    .order('total_points', { ascending: false })
    .limit(1)
    .single();

  const topScorer = topMember && (topMember as any).users
    ? {
        name: (topMember as any).users.display_name,
        points: topMember.total_points || 0,
      }
    : null;

  return {
    season: {
      id: season.id,
      name: season.name,
      number: season.number,
    },
    episodes: {
      total: allEpisodes.length,
      scored: scoredEpisodes.length,
      remaining: allEpisodes.length - scoredEpisodes.length,
      nextAirDate: nextEpisode?.air_date || null,
    },
    castaways: castawayStats,
    picks: pickStats,
    scoring: {
      totalPointsAwarded,
      averagePointsPerEpisode,
      topScorer,
    },
    tribeBreakdown,
  };
}

// ============================================================================
// System Metrics
// ============================================================================

export async function getSystemMetrics(): Promise<SystemMetrics> {
  const now = DateTime.now();
  const last24h = now.minus({ hours: 24 }).toJSDate();
  const todayStart = now.startOf('day').toISO()!;

  // Database latency
  const latencyMs = await measureDbLatency();
  const dbStatus: 'healthy' | 'degraded' | 'unhealthy' = 
    latencyMs < 500 ? 'healthy' : latencyMs < 1000 ? 'degraded' : 'unhealthy';

  // Job stats
  const jobHistory = getJobHistory(200);
  const recentJobs = jobHistory.filter(j => j.startTime >= last24h);
  const successfulJobs = recentJobs.filter(j => j.success);
  const failedJobs = recentJobs.filter(j => !j.success);
  const lastFailure = failedJobs.length > 0 
    ? failedJobs[0].startTime.toISOString() 
    : null;

  // Email stats
  const queueStats = await getQueueStats();
  
  const { count: failedToday } = await supabaseAdmin
    .from('failed_emails')
    .select('id', { count: 'exact', head: true })
    .gte('failed_at', todayStart);

  // Storage stats (count avatars)
  const { data: avatarFiles } = await supabaseAdmin.storage.from('avatars').list();
  const avatarCount = avatarFiles?.length || 0;

  return {
    database: {
      latencyMs,
      status: dbStatus,
    },
    jobs: {
      totalRuns24h: recentJobs.length,
      successRate: recentJobs.length > 0 
        ? (successfulJobs.length / recentJobs.length) * 100 
        : 100,
      failures24h: failedJobs.length,
      lastFailure,
    },
    email: {
      queueSize: queueStats.pending + queueStats.processing,
      processingRate: queueStats.sent_today,
      failedToday: failedToday || 0,
    },
    storage: {
      avatarCount,
    },
  };
}

// ============================================================================
// Comprehensive Stats (All in one)
// ============================================================================

export async function getComprehensiveStats(): Promise<ComprehensiveStats> {
  const [
    revenue,
    userEngagement,
    leagueAnalytics,
    communication,
    gameProgress,
    systemMetrics,
  ] = await Promise.all([
    getRevenueStats(),
    getUserEngagementStats(),
    getLeagueAnalyticsStats(),
    getCommunicationStats(),
    getGameProgressStats(),
    getSystemMetrics(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    revenue,
    userEngagement,
    leagueAnalytics,
    communication,
    gameProgress,
    systemMetrics,
  };
}
