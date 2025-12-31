/**
 * Castaway Elimination Service
 *
 * Handles castaway elimination logic including:
 * - Updating castaway status
 * - Finding affected users via rosters
 * - Sending notifications (email/SMS) for:
 *   - Torch snuffed (both castaways eliminated)
 *   - Elimination alert (one castaway remaining)
 * - Updating league_members for eliminated users
 */
import { supabaseAdmin } from '../config/supabase.js';
import { sendSMS } from '../config/twilio.js';
import { EmailService } from '../emails/service.js';
/**
 * Eliminate a castaway and notify affected users
 */
export async function eliminateCastaway(params) {
    const { castawayId, episodeId, placement } = params;
    const notificationsSent = {
        torchSnuffed: 0,
        eliminationAlert: 0,
        smsCount: 0,
        emailCount: 0,
    };
    // Get castaway details before updating
    const { data: castawayBefore } = await supabaseAdmin
        .from('castaways')
        .select('id, name, season_id')
        .eq('id', castawayId)
        .single();
    if (!castawayBefore) {
        throw new Error('Castaway not found');
    }
    // Update castaway status to eliminated
    const { data: castaway, error } = await supabaseAdmin
        .from('castaways')
        .update({
        status: 'eliminated',
        eliminated_episode_id: episodeId,
        placement,
    })
        .eq('id', castawayId)
        .select()
        .single();
    if (error) {
        throw new Error(`Failed to eliminate castaway: ${error.message}`);
    }
    // Find all users who have this castaway on their roster
    const { data: rosters } = await supabaseAdmin
        .from('rosters')
        .select(`
      id,
      user_id,
      league_id,
      users!inner(id, email, display_name, phone, notification_email, notification_sms),
      leagues!inner(id, name)
    `)
        .eq('castaway_id', castawayId)
        .is('dropped_at', null); // Only active roster spots
    if (!rosters || rosters.length === 0) {
        console.log(`[Elimination] ${castawayBefore.name} eliminated, no active rosters affected`);
        return { castaway, notificationsSent, affectedUsers: 0 };
    }
    console.log(`[Elimination] ${castawayBefore.name} eliminated, notifying ${rosters.length} users`);
    // Get episode number for notifications
    const { data: episode } = await supabaseAdmin
        .from('episodes')
        .select('number')
        .eq('id', episodeId)
        .single();
    // Process each affected user
    for (const roster of rosters) {
        const user = roster.users;
        const league = roster.leagues;
        // Check how many active castaways this user still has
        const { data: userRoster } = await supabaseAdmin
            .from('rosters')
            .select('castaway_id, castaways!inner(id, name, status)')
            .eq('league_id', roster.league_id)
            .eq('user_id', roster.user_id)
            .is('dropped_at', null);
        const activeCastaways = userRoster?.filter((r) => r.castaways?.status === 'active') || [];
        if (activeCastaways.length === 0) {
            // BOTH CASTAWAYS ELIMINATED - TORCH SNUFFED! 🔥
            await handleTorchSnuffed(user, league, episode?.number || 0);
            notificationsSent.torchSnuffed++;
            if (user.notification_email !== false)
                notificationsSent.emailCount++;
            if (user.notification_sms && user.phone)
                notificationsSent.smsCount++;
            // Mark user as eliminated in league_members
            await supabaseAdmin
                .from('league_members')
                .update({ is_eliminated: true })
                .eq('league_id', roster.league_id)
                .eq('user_id', roster.user_id);
        }
        else if (activeCastaways.length === 1) {
            // ONE CASTAWAY REMAINING - Send elimination alert
            await handleEliminationAlert(user, league, castawayBefore.name);
            notificationsSent.eliminationAlert++;
            if (user.notification_email !== false)
                notificationsSent.emailCount++;
            if (user.notification_sms && user.phone)
                notificationsSent.smsCount++;
        }
    }
    return { castaway, notificationsSent, affectedUsers: rosters.length };
}
/**
 * Handle torch snuffed notification (both castaways eliminated)
 */
async function handleTorchSnuffed(user, league, episodeNumber) {
    console.log(`[Elimination] User ${user.id} has ZERO active castaways in league ${league.id} - TORCH SNUFFED`);
    // Send torch snuffed email
    if (user.notification_email !== false) {
        try {
            await EmailService.sendTorchSnuffed({
                displayName: user.display_name,
                email: user.email,
                leagueName: league.name,
                leagueId: league.id,
                episodeNumber,
            });
            console.log(`[Elimination] Sent torch snuffed email to ${user.email}`);
        }
        catch (err) {
            console.error(`[Elimination] Failed to send torch snuffed email to ${user.email}:`, err);
        }
    }
    // Send torch snuffed SMS
    if (user.notification_sms && user.phone) {
        try {
            await sendSMS({
                to: user.phone,
                text: `[RG:S] Both your castaways have been eliminated in ${league.name}. Your torch has been snuffed and you can no longer compete this season. Check your email for details.`,
            });
            console.log(`[Elimination] Sent torch snuffed SMS to ${user.phone}`);
        }
        catch (err) {
            console.error(`[Elimination] Failed to send torch snuffed SMS to ${user.phone}:`, err);
        }
    }
}
/**
 * Handle elimination alert notification (one castaway remaining)
 */
async function handleEliminationAlert(user, league, castawayName) {
    console.log(`[Elimination] User ${user.id} has 1 active castaway remaining in league ${league.id}`);
    // Send elimination alert email
    if (user.notification_email !== false) {
        try {
            await EmailService.sendEliminationAlert({
                displayName: user.display_name,
                email: user.email,
                castawayName,
                leagueName: league.name,
                leagueId: league.id,
            });
            console.log(`[Elimination] Sent elimination alert email to ${user.email}`);
        }
        catch (err) {
            console.error(`[Elimination] Failed to send elimination alert to ${user.email}:`, err);
        }
    }
    // Send SMS notification
    if (user.notification_sms && user.phone) {
        try {
            await sendSMS({
                to: user.phone,
                text: `[RG:S] ${castawayName} has been eliminated. You have 1 castaway remaining in ${league.name}. Choose wisely!`,
            });
            console.log(`[Elimination] Sent elimination SMS to ${user.phone}`);
        }
        catch (err) {
            console.error(`[Elimination] Failed to send elimination SMS:`, err);
        }
    }
}
//# sourceMappingURL=elimination.js.map