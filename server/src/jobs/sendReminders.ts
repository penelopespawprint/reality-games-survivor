import { supabaseAdmin } from '../config/supabase.js';
import { EmailService } from '../emails/index.js';

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

      if (hoursLeft <= 1) {
        await EmailService.sendPickFinalWarning({
          displayName: user.display_name,
          email: user.email,
          episodeNumber: episode.number,
          minutesRemaining: 30,
        });
      } else {
        await EmailService.sendPickReminder({
          displayName: user.display_name,
          email: user.email,
          episodeNumber: episode.number,
          hoursRemaining: hoursLeft,
        });
      }

      await EmailService.logNotification(
        member.user_id,
        'email',
        `Pick reminder for Episode ${episode.number}`,
        `Reminder sent with ${hoursLeft} hours remaining.`
      );

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
  const hoursLeft = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
  const daysLeft = Math.ceil(hoursLeft / 24);

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

      if (hoursLeft <= 2) {
        await EmailService.sendDraftFinalWarning({
          displayName: user.display_name,
          email: user.email,
          leagueName: league.name,
          leagueId: league.id,
          hoursRemaining: hoursLeft,
        });
      } else {
        await EmailService.sendDraftReminder({
          displayName: user.display_name,
          email: user.email,
          leagueName: league.name,
          leagueId: league.id,
          daysRemaining: daysLeft,
        });
      }

      await EmailService.logNotification(
        member.user_id,
        'email',
        `Draft reminder for ${league.name}`,
        `Reminder sent with ${daysLeft} days remaining.`
      );

      sent++;
    }
  }

  console.log(`Sent ${sent} draft reminders`);
  return { sent, type: 'draft' };
}

export default { sendPickReminders, sendDraftReminders };
