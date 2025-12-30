/**
 * Results Release Job
 *
 * Runs every Friday at 2:00 PM PST
 * Sends spoiler-safe notifications for the latest finalized episode
 */

import { supabaseAdmin } from '../config/supabase.js';
import { sendSpoilerSafeNotification } from '../lib/spoiler-safe-notifications.js';

interface Episode {
  id: string;
  number: number;
  week_number: number;
  season_id: string;
  scoring_finalized_at: string;
  results_locked_at: string | null;
  results_released_at: string | null;
}

interface User {
  id: string;
  email: string;
  display_name: string;
  phone: string | null;
  notification_preferences?: {
    email_results?: boolean;
    sms_results?: boolean;
  };
}

/**
 * Get the latest locked episode that hasn't had results released yet
 * Episodes must be manually locked by admin before results can be released
 */
async function getLatestLockedEpisode(): Promise<Episode | null> {
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

  return data as Episode | null;
}

/**
 * Get all users who want results notifications
 */
async function getUsersWithResultsNotifications(): Promise<User[]> {
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

  return data as User[];
}

/**
 * Mark episode results as released
 */
async function markResultsReleased(episodeId: string): Promise<void> {
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
export async function releaseWeeklyResults(): Promise<{
  episode: Episode | null;
  notificationsSent: number;
  errors: number;
}> {
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
    } catch (error) {
      console.error(`[Release Results] Failed to send notification to user ${user.id}:`, error);
      errors++;
    }
  }

  // Mark episode as released
  await markResultsReleased(episode.id);

  console.log(`[Release Results] Complete! Sent ${notificationsSent} notifications (${errors} errors)`);

  return { episode, notificationsSent, errors };
}
