/**
 * Lifecycle Email Jobs
 * Scheduled jobs that send emails based on user lifecycle stage
 * 
 * RATE LIMITING:
 * - Max 2 lifecycle (non-transactional) emails per user per week
 * - Same email type cannot be sent twice within 3 days
 * - Skip users who have already completed the action the email is nudging them to do
 */

import { supabaseAdmin } from '../config/supabase.js';
import { EmailService } from '../emails/service.js';
import { DateTime } from 'luxon';

const BASE_URL = process.env.FRONTEND_URL || 'https://survivor.realitygamesfantasyleague.com';
const MAX_LIFECYCLE_EMAILS_PER_WEEK = 2;

export interface LifecycleResult {
  success: boolean;
  emailsSent: number;
  skippedRateLimit: number;
  skippedAlreadyActioned: number;
  errors: string[];
}

/**
 * Check if a user can receive a lifecycle email (rate limit check)
 */
async function canSendLifecycleEmail(userId: string, emailType: string): Promise<boolean> {
  const { data } = await supabaseAdmin.rpc('can_send_lifecycle_email', {
    p_user_id: userId,
    p_email_type: emailType,
    p_max_per_week: MAX_LIFECYCLE_EMAILS_PER_WEEK,
  });
  return data === true;
}

/**
 * Log that a lifecycle email was sent
 */
async function logLifecycleEmail(userId: string, emailType: string): Promise<void> {
  await supabaseAdmin.rpc('log_lifecycle_email', {
    p_user_id: userId,
    p_email_type: emailType,
  });
}

/**
 * Send join league nudge emails
 * Target: Users who signed up 3+ days ago but haven't joined any non-global league
 * Skip: Users who have already joined a league, made picks, or completed draft rankings
 */
export async function sendJoinLeagueNudges(): Promise<LifecycleResult> {
  const result: LifecycleResult = { 
    success: false, 
    emailsSent: 0, 
    skippedRateLimit: 0,
    skippedAlreadyActioned: 0,
    errors: [] 
  };

  try {
    const EMAIL_TYPE = 'join-league-nudge';
    
    // Get users who signed up 3-7 days ago
    const threeDaysAgo = DateTime.now().minus({ days: 3 }).toISO();
    const sevenDaysAgo = DateTime.now().minus({ days: 7 }).toISO();

    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name, created_at')
      .lt('created_at', threeDaysAgo)
      .gt('created_at', sevenDaysAgo)
      .not('email', 'is', null);

    if (usersError || !users?.length) {
      result.success = true;
      return result;
    }

    // Get users who are already in non-global leagues (they've actioned!)
    const { data: leagueMembers } = await supabaseAdmin
      .from('league_members')
      .select('user_id, leagues!inner(is_global)')
      .eq('leagues.is_global', false)
      .in('user_id', users.map((u) => u.id));

    const usersInPrivateLeagues = new Set(leagueMembers?.map((m) => m.user_id) || []);

    // Get users who have made ANY picks (they're engaged!)
    const { data: pickers } = await supabaseAdmin
      .from('weekly_picks')
      .select('user_id')
      .in('user_id', users.map((u) => u.id));

    const usersWithPicks = new Set(pickers?.map((p) => p.user_id) || []);

    // Get users who have completed draft rankings (they're engaged!)
    const { data: rankers } = await supabaseAdmin
      .from('draft_rankings')
      .select('user_id')
      .in('user_id', users.map((u) => u.id));

    const usersWithRankings = new Set(rankers?.map((r) => r.user_id) || []);

    // Get current season info
    const { data: season } = await supabaseAdmin
      .from('seasons')
      .select('name, premiere_date')
      .eq('is_active', true)
      .single();

    for (const user of users) {
      // Skip if user has already taken action
      if (usersInPrivateLeagues.has(user.id)) {
        result.skippedAlreadyActioned++;
        continue;
      }
      if (usersWithPicks.has(user.id)) {
        result.skippedAlreadyActioned++;
        continue;
      }
      if (usersWithRankings.has(user.id)) {
        result.skippedAlreadyActioned++;
        continue;
      }

      // Check rate limit
      const canSend = await canSendLifecycleEmail(user.id, EMAIL_TYPE);
      if (!canSend) {
        result.skippedRateLimit++;
        continue;
      }

      try {
        const daysSinceSignup = Math.floor(
          DateTime.now().diff(DateTime.fromISO(user.created_at), 'days').days
        );

        await EmailService.sendJoinLeagueNudge({
          displayName: user.display_name || 'Survivor Fan',
          email: user.email!,
          daysSinceSignup,
          seasonName: season?.name || 'Season 50',
          premiereDate: season?.premiere_date ? new Date(season.premiere_date) : new Date(),
        });

        await logLifecycleEmail(user.id, EMAIL_TYPE);
        result.emailsSent++;
      } catch (err) {
        result.errors.push(`Failed to send to ${user.email}: ${err}`);
      }
    }

    result.success = true;
    return result;
  } catch (err) {
    result.errors.push(`Unexpected error: ${err}`);
    return result;
  }
}

/**
 * Send pre-season hype emails
 * Target: Users at specific intervals before premiere (14, 7, 3, 1 days)
 * Skip: Users who have already completed their draft rankings for this season
 */
export async function sendPreSeasonHype(): Promise<LifecycleResult> {
  const result: LifecycleResult = { 
    success: false, 
    emailsSent: 0, 
    skippedRateLimit: 0,
    skippedAlreadyActioned: 0,
    errors: [] 
  };

  try {
    const EMAIL_TYPE = 'pre-season-hype';
    
    // Get active season
    const { data: season } = await supabaseAdmin
      .from('seasons')
      .select('id, name, number, premiere_date')
      .eq('is_active', true)
      .single();

    if (!season?.premiere_date) {
      result.success = true;
      return result;
    }

    const premiereDate = DateTime.fromISO(season.premiere_date);
    const daysUntilPremiere = Math.floor(premiereDate.diff(DateTime.now(), 'days').days);

    // Only send on specific days
    const sendDays = [14, 7, 3, 1];
    if (!sendDays.includes(daysUntilPremiere)) {
      result.success = true;
      return result;
    }

    // Get all users with email
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name')
      .not('email', 'is', null);

    if (!users?.length) {
      result.success = true;
      return result;
    }

    // Get users in leagues for this season
    const { data: leagueMembers } = await supabaseAdmin
      .from('league_members')
      .select('user_id, leagues!inner(name, id)')
      .eq('leagues.season_id', season.id);

    const userLeagues = new Map<string, string>();
    const usersInLeagues = new Set<string>();
    leagueMembers?.forEach((m: any) => {
      usersInLeagues.add(m.user_id);
      if (!userLeagues.has(m.user_id)) {
        userLeagues.set(m.user_id, m.leagues.name);
      }
    });

    // Get users who have completed their draft rankings for this season
    // These users are "ready" - the hype email would be redundant
    const { data: completedRankings } = await supabaseAdmin
      .from('draft_rankings')
      .select('user_id, league_id')
      .in('user_id', users.map((u) => u.id));

    // Count rankings per user - if they have 24 (all castaways ranked), they're done
    const userRankingCounts = new Map<string, number>();
    completedRankings?.forEach((r) => {
      const count = userRankingCounts.get(r.user_id) || 0;
      userRankingCounts.set(r.user_id, count + 1);
    });

    // Users with 24+ rankings have completed their prep
    const usersFullyPrepped = new Set<string>();
    userRankingCounts.forEach((count, userId) => {
      if (count >= 24) usersFullyPrepped.add(userId);
    });

    for (const user of users) {
      const hasLeague = usersInLeagues.has(user.id);
      const isFullyPrepped = usersFullyPrepped.has(user.id);

      // Skip users who are fully prepped - they don't need hype, they're ready!
      if (isFullyPrepped) {
        result.skippedAlreadyActioned++;
        continue;
      }

      // Check rate limit
      const canSend = await canSendLifecycleEmail(user.id, EMAIL_TYPE);
      if (!canSend) {
        result.skippedRateLimit++;
        continue;
      }

      try {
        await EmailService.sendPreSeasonHype({
          displayName: user.display_name || 'Survivor Fan',
          email: user.email!,
          seasonName: season.name,
          seasonNumber: season.number,
          premiereDate: new Date(season.premiere_date),
          daysUntilPremiere,
          hasLeague,
          leagueName: hasLeague ? userLeagues.get(user.id) : undefined,
        });

        await logLifecycleEmail(user.id, EMAIL_TYPE);
        result.emailsSent++;
      } catch (err) {
        result.errors.push(`Failed to send to ${user.email}: ${err}`);
      }
    }

    result.success = true;
    return result;
  } catch (err) {
    result.errors.push(`Unexpected error: ${err}`);
    return result;
  }
}

/**
 * Send inactivity reminder emails
 * Target: Users who haven't made a pick in 7+ days during active season
 * Skip: Users who have made a pick for the current/upcoming episode
 */
export async function sendInactivityReminders(): Promise<LifecycleResult> {
  const result: LifecycleResult = { 
    success: false, 
    emailsSent: 0, 
    skippedRateLimit: 0,
    skippedAlreadyActioned: 0,
    errors: [] 
  };

  try {
    const EMAIL_TYPE = 'inactivity-reminder';
    
    // Get active season
    const { data: season } = await supabaseAdmin
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .single();

    if (!season) {
      result.success = true;
      return result;
    }

    // Get the current/upcoming episode (next one that isn't locked)
    const { data: currentEpisode } = await supabaseAdmin
      .from('episodes')
      .select('id, episode_number')
      .eq('season_id', season.id)
      .eq('picks_locked', false)
      .order('episode_number', { ascending: true })
      .limit(1)
      .single();

    // Get users who have already made a pick for the current episode
    // These users are active - don't bug them!
    const usersWithCurrentPick = new Set<string>();
    if (currentEpisode) {
      const { data: currentPicks } = await supabaseAdmin
        .from('weekly_picks')
        .select('user_id')
        .eq('episode_id', currentEpisode.id);
      
      currentPicks?.forEach((p) => usersWithCurrentPick.add(p.user_id));
    }

    const sevenDaysAgo = DateTime.now().minus({ days: 7 }).toISO();

    // Get users who have made picks recently (last 7 days) - they're active
    const { data: recentPickers } = await supabaseAdmin
      .from('weekly_picks')
      .select('user_id')
      .gte('created_at', sevenDaysAgo);

    const recentActiveUserIds = new Set(recentPickers?.map((p) => p.user_id) || []);

    // Get users in leagues for this season
    const { data: leagueMembers } = await supabaseAdmin
      .from('league_members')
      .select('user_id, users!inner(email, display_name, last_sign_in_at)')
      .not('users.email', 'is', null);

    // Count total locked episodes
    const { data: episodes } = await supabaseAdmin
      .from('episodes')
      .select('id')
      .eq('season_id', season.id)
      .eq('picks_locked', true);

    const totalLockedEpisodes = episodes?.length || 0;

    // Deduplicate users (they might be in multiple leagues)
    const processedUsers = new Set<string>();

    for (const member of leagueMembers || []) {
      const userId = member.user_id;
      const user = member.users as any;

      // Skip if already processed
      if (processedUsers.has(userId)) continue;
      processedUsers.add(userId);

      // Skip if user made a pick for the current episode - they're engaged!
      if (usersWithCurrentPick.has(userId)) {
        result.skippedAlreadyActioned++;
        continue;
      }

      // Skip if user was recently active (made any pick in last 7 days)
      if (recentActiveUserIds.has(userId)) {
        result.skippedAlreadyActioned++;
        continue;
      }

      // Check last sign in - skip if they logged in recently
      const lastSignIn = user.last_sign_in_at
        ? DateTime.fromISO(user.last_sign_in_at)
        : null;
      
      if (lastSignIn && lastSignIn > DateTime.now().minus({ days: 7 })) {
        result.skippedAlreadyActioned++;
        continue;
      }

      // Check rate limit
      const canSend = await canSendLifecycleEmail(userId, EMAIL_TYPE);
      if (!canSend) {
        result.skippedRateLimit++;
        continue;
      }

      try {
        // Count this user's picks to calculate missed episodes
        const { count: pickCount } = await supabaseAdmin
          .from('weekly_picks')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        const missedEpisodes = totalLockedEpisodes - (pickCount || 0);
        const daysSinceActivity = lastSignIn
          ? Math.floor(DateTime.now().diff(lastSignIn, 'days').days)
          : 30;

        await EmailService.sendInactivityReminder({
          displayName: user.display_name || 'Survivor Fan',
          email: user.email,
          daysSinceLastActivity: daysSinceActivity,
          missedEpisodes: Math.max(0, missedEpisodes),
        });

        await logLifecycleEmail(userId, EMAIL_TYPE);
        result.emailsSent++;
      } catch (err) {
        result.errors.push(`Failed to send to ${user.email}: ${err}`);
      }
    }

    result.success = true;
    return result;
  } catch (err) {
    result.errors.push(`Unexpected error: ${err}`);
    return result;
  }
}

/**
 * Send trivia progress emails
 * Target: Users who started trivia but didn't finish (50%+ progress, not completed)
 * Skip: Users who have completed trivia or joined a league (trivia is mainly for acquisition)
 */
export async function sendTriviaProgressEmails(): Promise<LifecycleResult> {
  const result: LifecycleResult = { 
    success: false, 
    emailsSent: 0, 
    skippedRateLimit: 0,
    skippedAlreadyActioned: 0,
    errors: [] 
  };

  try {
    const EMAIL_TYPE = 'trivia-progress';
    const totalQuestions = 24;

    // Get users with partial trivia progress who haven't completed
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name, trivia_score, trivia_completed')
      .eq('trivia_completed', false)
      .gt('trivia_score', Math.floor(totalQuestions * 0.5)) // 50%+ progress
      .not('email', 'is', null);

    if (!users?.length) {
      result.success = true;
      return result;
    }

    // Get users who have joined any league - they've converted, no need for trivia nudge
    const { data: leagueMembers } = await supabaseAdmin
      .from('league_members')
      .select('user_id')
      .in('user_id', users.map((u) => u.id));

    const usersInLeagues = new Set(leagueMembers?.map((m) => m.user_id) || []);

    for (const user of users) {
      // Skip if user has joined a league - they've converted!
      if (usersInLeagues.has(user.id)) {
        result.skippedAlreadyActioned++;
        continue;
      }

      // Check rate limit
      const canSend = await canSendLifecycleEmail(user.id, EMAIL_TYPE);
      if (!canSend) {
        result.skippedRateLimit++;
        continue;
      }

      try {
        const questionsAnswered = user.trivia_score || 0;

        await EmailService.sendTriviaProgress({
          displayName: user.display_name || 'Survivor Fan',
          email: user.email!,
          questionsAnswered,
          questionsCorrect: questionsAnswered, // In our trivia, answered = correct
          totalQuestions,
        });

        await logLifecycleEmail(user.id, EMAIL_TYPE);
        result.emailsSent++;
      } catch (err) {
        result.errors.push(`Failed to send to ${user.email}: ${err}`);
      }
    }

    result.success = true;
    return result;
  } catch (err) {
    result.errors.push(`Unexpected error: ${err}`);
    return result;
  }
}
