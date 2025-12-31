/**
 * Results Release Job
 *
 * Runs every Friday at 2:00 PM PST
 * Sends spoiler-safe notifications for the latest finalized episode
 */
import { supabaseAdmin } from '../config/supabase.js';
import { sendSpoilerSafeNotification } from '../lib/spoiler-safe-notifications.js';
/**
 * Get the latest locked episode that hasn't had results released yet
 * Episodes must be manually locked by admin before results can be released
 */
async function getLatestLockedEpisode() {
    const { data, error } = await supabaseAdmin
        .from('episodes')
        .select('id, number, week_number, season_id, scoring_finalized_at, results_locked_at, results_released_at')
        .not('scoring_finalized_at', 'is', null)
        .not('results_locked_at', 'is', null)
        .is('results_released_at', null)
        .order('results_locked_at', { ascending: false })
        .limit(1)
        .single();
    if (error && error.code !== 'PGRST116') {
        console.error('[Release Results] Error fetching latest locked episode:', error);
        return null;
    }
    return data;
}
/**
 * Get all users who want results notifications
 */
async function getUsersWithResultsNotifications() {
    const { data, error } = await supabaseAdmin
        .from('users')
        .select(`
      id,
      email,
      display_name,
      phone,
      notification_preferences (
        email_results,
        sms_results
      )
    `)
        .or('notification_preferences.email_results.eq.true,notification_preferences.sms_results.eq.true');
    if (error) {
        console.error('[Release Results] Error fetching users with notification preferences:', error);
        return [];
    }
    return data;
}
/**
 * Mark episode results as released
 */
async function markResultsReleased(episodeId) {
    const { error } = await supabaseAdmin
        .from('episodes')
        .update({
        results_released_at: new Date().toISOString(),
    })
        .eq('id', episodeId);
    if (error) {
        console.error('[Release Results] Error marking results as released:', error);
    }
}
/**
 * Main job: Release weekly results
 */
export async function releaseWeeklyResults() {
    console.log('[Release Results] Starting results release job...');
    // Get latest locked episode that hasn't been released
    const episode = await getLatestLockedEpisode();
    if (!episode) {
        console.log('[Release Results] No locked episode ready for release');
        return { episode: null, notificationsSent: 0, errors: 0 };
    }
    console.log(`[Release Results] Releasing results for Episode ${episode.number} (Week ${episode.week_number})`);
    // Get users who want notifications
    const users = await getUsersWithResultsNotifications();
    console.log(`[Release Results] Found ${users.length} users with notifications enabled`);
    let notificationsSent = 0;
    let errors = 0;
    // Send notifications to each user
    for (const user of users) {
        try {
            await sendSpoilerSafeNotification(user, episode);
            notificationsSent++;
        }
        catch (error) {
            console.error(`[Release Results] Failed to send notification to user ${user.id}:`, error);
            errors++;
        }
    }
    // Mark episode as released
    await markResultsReleased(episode.id);
    console.log(`[Release Results] Complete! Sent ${notificationsSent} notifications (${errors} errors)`);
    return { episode, notificationsSent, errors };
}
//# sourceMappingURL=releaseResults.js.map