import { supabaseAdmin } from '../config/supabase.js';
import { EmailService } from '../emails/index.js';
import { sendSMS } from '../config/twilio.js';

/**
 * Auto-fill missing picks for users who didn't submit before deadline
 * Picks highest-ranked available castaway from roster
 * Detects and notifies users who are eliminated (no active castaways)
 * Runs: Wed 3:05pm PST (5 min after lock)
 */
export async function autoPick(): Promise<{
  autoPicked: number;
  users: string[];
  eliminated: number;
  eliminatedUsers: string[];
}> {
  const now = new Date();

  // Find current episode where picks just locked
  const { data: episodes } = await supabaseAdmin
    .from('episodes')
    .select('id, season_id, number')
    .lte('picks_lock_at', now.toISOString())
    .eq('is_scored', false)
    .order('picks_lock_at', { ascending: false })
    .limit(1);

  const episode = episodes?.[0];
  if (!episode) {
    return { autoPicked: 0, users: [], eliminated: 0, eliminatedUsers: [] };
  }

  // Get all active leagues for this season
  const { data: leagues } = await supabaseAdmin
    .from('leagues')
    .select('id, name')
    .eq('season_id', episode.season_id)
    .eq('status', 'active');

  if (!leagues) {
    return { autoPicked: 0, users: [], eliminated: 0, eliminatedUsers: [] };
  }

  const autoPickedUsers: string[] = [];
  const eliminatedUsers: string[] = [];

  for (const league of leagues) {
    // Get members who haven't picked and aren't already eliminated
    const { data: members } = await supabaseAdmin
      .from('league_members')
      .select('user_id, eliminated_at')
      .eq('league_id', league.id);

    const { data: existingPicks } = await supabaseAdmin
      .from('weekly_picks')
      .select('user_id')
      .eq('league_id', league.id)
      .eq('episode_id', episode.id);

    const pickedUserIds = new Set(existingPicks?.map((p) => p.user_id) || []);
    // Only process users who haven't picked and aren't already marked as eliminated
    const missingUsers = members?.filter(
      (m) => !pickedUserIds.has(m.user_id) && !m.eliminated_at
    ) || [];

    for (const member of missingUsers) {
      // Get user's active roster (castaways not eliminated)
      const { data: roster } = await supabaseAdmin
        .from('rosters')
        .select('castaway_id, castaways!inner(id, name, status)')
        .eq('league_id', league.id)
        .eq('user_id', member.user_id)
        .is('dropped_at', null);

      // Filter to active castaways
      const activeCastaways = roster?.filter(
        (r: any) => r.castaways?.status === 'active'
      );

      if (!activeCastaways || activeCastaways.length === 0) {
        // User has no active castaways - their torch has been snuffed
        await handleEliminatedUser(
          member.user_id,
          league.id,
          league.name,
          episode.number,
          now
        );
        eliminatedUsers.push(member.user_id);

        console.log(
          `[AutoPick] User ${member.user_id} eliminated in league ${league.id} - torch snuffed`
        );
        continue;
      }

      // Randomly pick from available active castaways
      const randomIndex = Math.floor(Math.random() * activeCastaways.length);
      const autoCastaway = activeCastaways[randomIndex];

      // Create auto-pick
      const { error } = await supabaseAdmin.from('weekly_picks').insert({
        league_id: league.id,
        user_id: member.user_id,
        episode_id: episode.id,
        castaway_id: autoCastaway.castaway_id,
        status: 'auto_picked',
        picked_at: now.toISOString(),
        locked_at: now.toISOString(),
      });

      if (!error) {
        autoPickedUsers.push(member.user_id);
      }
    }
  }

  console.log(`[AutoPick] Auto-picked for ${autoPickedUsers.length} users`);
  console.log(`[AutoPick] Eliminated ${eliminatedUsers.length} users (torch snuffed)`);

  return {
    autoPicked: autoPickedUsers.length,
    users: autoPickedUsers,
    eliminated: eliminatedUsers.length,
    eliminatedUsers,
  };
}

/**
 * Handle user elimination - mark as eliminated and send notifications
 */
async function handleEliminatedUser(
  userId: string,
  leagueId: string,
  leagueName: string,
  episodeNumber: number,
  eliminatedAt: Date
): Promise<void> {
  try {
    // Mark user as eliminated in league_members
    const { error: updateError } = await supabaseAdmin
      .from('league_members')
      .update({ eliminated_at: eliminatedAt.toISOString() })
      .eq('league_id', leagueId)
      .eq('user_id', userId);

    if (updateError) {
      console.error(`Failed to mark user ${userId} as eliminated:`, updateError);
      return;
    }

    // Get user details for notifications
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('email, display_name, phone, notification_email, notification_sms')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error(`Failed to get user ${userId} for notifications:`, userError);
      return;
    }

    // Send email notification (critical - uses retry logic)
    if (user.notification_email) {
      try {
        await EmailService.sendTorchSnuffed({
          displayName: user.display_name,
          email: user.email,
          leagueName,
          leagueId,
          episodeNumber,
        });
        console.log(`[AutoPick] Torch snuffed email sent to ${user.email}`);
      } catch (emailError) {
        console.error(`Failed to send torch snuffed email to ${user.email}:`, emailError);
      }
    }

    // Send SMS notification if enabled and phone is available
    if (user.notification_sms && user.phone) {
      try {
        await sendSMS({
          to: user.phone,
          text: `[RG:S] The tribe has spoken. Both your castaways have been eliminated from ${leagueName}. Your torch has been snuffed. You can still follow the leaderboard! Reply STOP to opt out.`,
          isTransactional: false,
        });
        console.log(`[AutoPick] Torch snuffed SMS sent to ${user.phone}`);
      } catch (smsError) {
        console.error(`Failed to send torch snuffed SMS to ${user.phone}:`, smsError);
      }
    }

    // Log elimination for admin visibility
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type: 'email',
      subject: `Torch snuffed in ${leagueName}`,
      body: `User eliminated from league ${leagueName} (Episode ${episodeNumber}) - no active castaways remaining`,
      sent_at: new Date().toISOString(),
    });

    console.log(`[AutoPick] ✓ User ${userId} elimination handled successfully`);
  } catch (err) {
    console.error(`Error handling elimination for user ${userId}:`, err);
  }
}
export default autoPick;

