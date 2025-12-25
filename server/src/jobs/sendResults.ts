import { supabaseAdmin } from '../config/supabase.js';
import { EmailService } from '../emails/index.js';

interface ResultsResult {
  sent: number;
  episodeId: string | null;
}

/**
 * Send episode results to all league members
 * Runs: Fri 12pm PST (after scoring is finalized)
 */
export async function sendEpisodeResults(): Promise<ResultsResult> {
  // Find most recently scored episode
  const { data: episodes } = await supabaseAdmin
    .from('episodes')
    .select('id, number, season_id')
    .eq('is_scored', true)
    .order('air_date', { ascending: false })
    .limit(1);

  const episode = episodes?.[0];
  if (!episode) {
    return { sent: 0, episodeId: null };
  }

  // Check if we already sent results for this episode
  const { data: existingNotifications } = await supabaseAdmin
    .from('notifications')
    .select('id')
    .eq('type', 'email')
    .like('subject', `%Episode ${episode.number} Results%`)
    .limit(1);

  if (existingNotifications && existingNotifications.length > 0) {
    return { sent: 0, episodeId: episode.id };
  }

  const { data: leagues } = await supabaseAdmin
    .from('leagues')
    .select('id, name')
    .eq('season_id', episode.season_id)
    .eq('status', 'active');

  if (!leagues) return { sent: 0, episodeId: episode.id };

  // Group results by user across leagues
  const userResults = new Map<string, {
    user: { email: string; display_name: string };
    leagues: Array<{
      name: string;
      totalPoints: number;
      rank: number;
      rankChange: number;
      totalPlayers: number;
    }>;
    castawayName: string;
    pointsEarned: number;
  }>();

  let sent = 0;

  for (const league of leagues) {
    // Get standings
    const { data: members } = await supabaseAdmin
      .from('league_members')
      .select('user_id, total_points, rank, users(id, display_name, email, notification_email)')
      .eq('league_id', league.id)
      .order('total_points', { ascending: false });

    if (!members) continue;

    for (const member of members) {
      const user = (member as any).users;
      if (!user?.email || !user.notification_email) continue;

      // Get this user's pick and points for the episode
      const { data: pick } = await supabaseAdmin
        .from('weekly_picks')
        .select('points_earned, castaways(name)')
        .eq('league_id', league.id)
        .eq('user_id', member.user_id)
        .eq('episode_id', episode.id)
        .single();

      const pointsEarned = pick?.points_earned || 0;
      const castawayName = (pick as any)?.castaways?.name || 'No pick';

      if (!userResults.has(member.user_id)) {
        userResults.set(member.user_id, {
          user: { email: user.email, display_name: user.display_name },
          leagues: [],
          castawayName,
          pointsEarned,
        });
      }

      userResults.get(member.user_id)!.leagues.push({
        name: league.name,
        totalPoints: member.total_points,
        rank: member.rank || 0,
        rankChange: 0,
        totalPlayers: members.length,
      });
    }
  }

  // Send consolidated emails
  for (const [userId, data] of userResults) {
    try {
      await EmailService.sendEpisodeResults({
        displayName: data.user.display_name,
        email: data.user.email,
        episodeNumber: episode.number,
        castawayName: data.castawayName,
        pointsEarned: data.pointsEarned,
        leagues: data.leagues,
      });

      await EmailService.logNotification(
        userId,
        'email',
        `Episode ${episode.number} Results`,
        `You earned ${data.pointsEarned} points.`
      );

      sent++;
    } catch (err) {
      console.error('Failed to send results email:', err);
    }
  }

  console.log(`Sent ${sent} episode result emails`);
  return { sent, episodeId: episode.id };
}

/**
 * Send elimination alerts to users whose castaways were eliminated
 * Called after scoring is finalized
 */
export async function sendEliminationAlerts(
  episodeId: string
): Promise<{ sent: number }> {
  const { data: episode } = await supabaseAdmin
    .from('episodes')
    .select('id, number, season_id')
    .eq('id', episodeId)
    .single();

  if (!episode) return { sent: 0 };

  // Get eliminated castaways from this episode
  const { data: eliminatedCastaways } = await supabaseAdmin
    .from('castaways')
    .select('id, name')
    .eq('eliminated_episode_id', episodeId);

  if (!eliminatedCastaways || eliminatedCastaways.length === 0) {
    return { sent: 0 };
  }

  const eliminatedIds = eliminatedCastaways.map((c) => c.id);
  const castawayNames = new Map(eliminatedCastaways.map((c) => [c.id, c.name]));

  // Get all active leagues
  const { data: leagues } = await supabaseAdmin
    .from('leagues')
    .select('id, name')
    .eq('season_id', episode.season_id)
    .eq('status', 'active');

  if (!leagues) return { sent: 0 };

  let sent = 0;

  for (const league of leagues) {
    // Find rosters with eliminated castaways
    const { data: affectedRosters } = await supabaseAdmin
      .from('rosters')
      .select('user_id, castaway_id, users(id, display_name, email, notification_email)')
      .eq('league_id', league.id)
      .in('castaway_id', eliminatedIds)
      .is('dropped_at', null);

    if (!affectedRosters) continue;

    for (const roster of affectedRosters) {
      const user = (roster as any).users;
      if (!user?.email || !user.notification_email) continue;

      const castawayName = castawayNames.get(roster.castaway_id) || 'Your castaway';

      try {
        await EmailService.sendEliminationAlert({
          displayName: user.display_name,
          email: user.email,
          castawayName,
          leagueName: league.name,
          leagueId: league.id,
        });

        await EmailService.logNotification(
          roster.user_id,
          'email',
          `${castawayName} has been eliminated`,
          `You'll continue playing with your remaining castaway.`
        );

        sent++;
      } catch (err) {
        console.error('Failed to send elimination alert:', err);
      }
    }
  }

  console.log(`Sent ${sent} elimination alerts`);
  return { sent };
}

export default { sendEpisodeResults, sendEliminationAlerts };
