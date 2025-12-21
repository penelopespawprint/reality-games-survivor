import { supabaseAdmin } from '../config/supabase.js';
import { sendEmail } from '../emails/index.js';
import * as emails from '../emails/index.js';

interface ReminderResult {
  sent: number;
  type: string;
}

/**
 * Send pick reminders to users who haven't submitted
 * Runs: Wed 12pm PST
 */
export async function sendPickReminders(): Promise<ReminderResult> {
  const now = new Date();

  // Find upcoming episode
  const { data: episodes } = await supabaseAdmin
    .from('episodes')
    .select('id, number, season_id, picks_lock_at')
    .gte('picks_lock_at', now.toISOString())
    .order('picks_lock_at', { ascending: true })
    .limit(1);

  const episode = episodes?.[0];
  if (!episode) {
    return { sent: 0, type: 'pick' };
  }

  const lockTime = new Date(episode.picks_lock_at);
  const hoursLeft = Math.round((lockTime.getTime() - now.getTime()) / (1000 * 60 * 60));

  // Get active leagues
  const { data: leagues } = await supabaseAdmin
    .from('leagues')
    .select('id, name')
    .eq('season_id', episode.season_id)
    .eq('status', 'active');

  if (!leagues) return { sent: 0, type: 'pick' };

  let sent = 0;

  for (const league of leagues) {
    const { data: members } = await supabaseAdmin
      .from('league_members')
      .select('user_id, users(id, display_name, email, notification_email)')
      .eq('league_id', league.id);

    const { data: existingPicks } = await supabaseAdmin
      .from('weekly_picks')
      .select('user_id')
      .eq('league_id', league.id)
      .eq('episode_id', episode.id);

    const pickedUserIds = new Set(existingPicks?.map((p) => p.user_id) || []);

    for (const member of members || []) {
      if (pickedUserIds.has(member.user_id)) continue;

      const user = (member as any).users;
      if (!user?.email || !user.notification_email) continue;

      const emailHtml = emails.pickReminderEmail({
        displayName: user.display_name,
        episodeNumber: episode.number,
        hoursLeft,
        leagueId: league.id,
      });

      await sendEmail({
        to: user.email,
        subject: `Make your pick for Episode ${episode.number}`,
        html: emailHtml,
      });

      sent++;
    }
  }

  console.log(`Sent ${sent} pick reminders`);
  return { sent, type: 'pick' };
}

/**
 * Send draft reminders to users with incomplete drafts
 * Runs: Daily 9am during draft window
 */
export async function sendDraftReminders(): Promise<ReminderResult> {
  const now = new Date();

  // Get active season
  const { data: season } = await supabaseAdmin
    .from('seasons')
    .select('id, draft_deadline')
    .eq('is_active', true)
    .single();

  if (!season || new Date(season.draft_deadline) < now) {
    return { sent: 0, type: 'draft' };
  }

  const deadline = new Date(season.draft_deadline);
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Get leagues with pending drafts
  const { data: leagues } = await supabaseAdmin
    .from('leagues')
    .select('id, name')
    .eq('season_id', season.id)
    .in('draft_status', ['pending', 'in_progress']);

  if (!leagues) return { sent: 0, type: 'draft' };

  let sent = 0;

  for (const league of leagues) {
    const { data: members } = await supabaseAdmin
      .from('league_members')
      .select('user_id, users(id, display_name, email, notification_email)')
      .eq('league_id', league.id);

    for (const member of members || []) {
      const user = (member as any).users;
      if (!user?.email || !user.notification_email) continue;

      const emailHtml = emails.draftReminderEmail({
        displayName: user.display_name,
        leagueName: league.name,
        daysLeft,
        leagueId: league.id,
      });

      await sendEmail({
        to: user.email,
        subject: `${daysLeft} days left to complete your draft!`,
        html: emailHtml,
      });

      sent++;
    }
  }

  console.log(`Sent ${sent} draft reminders`);
  return { sent, type: 'draft' };
}

/**
 * Send waiver reminders to users with eliminated castaways
 * Runs: Tue 12pm
 */
export async function sendWaiverReminders(): Promise<ReminderResult> {
  const now = new Date();

  // Find open waiver window
  const { data: episodes } = await supabaseAdmin
    .from('episodes')
    .select('id, number, season_id, waiver_closes_at')
    .lte('waiver_opens_at', now.toISOString())
    .gte('waiver_closes_at', now.toISOString())
    .limit(1);

  const episode = episodes?.[0];
  if (!episode) {
    return { sent: 0, type: 'waiver' };
  }

  const closeTime = new Date(episode.waiver_closes_at);
  const hoursLeft = Math.round((closeTime.getTime() - now.getTime()) / (1000 * 60 * 60));

  const { data: leagues } = await supabaseAdmin
    .from('leagues')
    .select('id, name')
    .eq('season_id', episode.season_id)
    .eq('status', 'active');

  if (!leagues) return { sent: 0, type: 'waiver' };

  let sent = 0;

  for (const league of leagues) {
    const { data: members } = await supabaseAdmin
      .from('league_members')
      .select('user_id, users(id, display_name, email, notification_email)')
      .eq('league_id', league.id);

    const { data: existingRankings } = await supabaseAdmin
      .from('waiver_rankings')
      .select('user_id')
      .eq('league_id', league.id)
      .eq('episode_id', episode.id);

    const rankedUserIds = new Set(existingRankings?.map((r) => r.user_id) || []);

    for (const member of members || []) {
      if (rankedUserIds.has(member.user_id)) continue;

      // Check if user has eliminated castaway
      const { data: rosters } = await supabaseAdmin
        .from('rosters')
        .select('castaways!inner(status)')
        .eq('league_id', league.id)
        .eq('user_id', member.user_id)
        .is('dropped_at', null);

      const hasEliminated = rosters?.some((r: any) => r.castaways?.status === 'eliminated');
      if (!hasEliminated) continue;

      const user = (member as any).users;
      if (!user?.email || !user.notification_email) continue;

      const emailHtml = emails.waiverReminderEmail({
        displayName: user.display_name,
        leagueName: league.name,
        hoursLeft,
        leagueId: league.id,
      });

      await sendEmail({
        to: user.email,
        subject: 'Submit your waiver rankings',
        html: emailHtml,
      });

      sent++;
    }
  }

  console.log(`Sent ${sent} waiver reminders`);
  return { sent, type: 'waiver' };
}

export default { sendPickReminders, sendDraftReminders, sendWaiverReminders };
