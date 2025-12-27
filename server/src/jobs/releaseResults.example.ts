/**
 * Example: Release Results Job
 *
 * This example shows how to integrate the spoiler-safe notification service
 * into the results release workflow.
 *
 * USAGE:
 * 1. Call this job after admin finalizes scoring for an episode
 * 2. Job sends spoiler-safe notifications to all active users
 * 3. Users receive generic "results ready" message with secure token link
 */

import { supabaseAdmin } from '../config/supabase.js';
import { sendSpoilerSafeNotification } from '../lib/spoiler-safe-notifications.js';

interface Episode {
  id: string;
  number: number;
  season_id: string;
  is_scored: boolean;
  results_posted_at: string | null;
}

interface User {
  id: string;
  email: string;
  display_name: string;
  phone: string | null;
}

/**
 * Release episode results and notify all users
 */
export async function releaseEpisodeResults(episodeId: string): Promise<{
  success: boolean;
  notificationsSent: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let notificationsSent = 0;

  try {
    // 1. Verify episode is scored and ready for release
    const { data: episode, error: episodeError } = await supabaseAdmin
      .from('episodes')
      .select('id, number, season_id, is_scored, results_posted_at')
      .eq('id', episodeId)
      .single();

    if (episodeError || !episode) {
      throw new Error(`Episode not found: ${episodeId}`);
    }

    if (!episode.is_scored) {
      throw new Error(`Episode ${episode.number} has not been scored yet`);
    }

    if (episode.results_posted_at) {
      throw new Error(`Results for Episode ${episode.number} have already been released`);
    }

    console.log(`[Release Results] Starting release for Episode ${episode.number}`);

    // 2. Mark results as released
    const { error: updateError } = await supabaseAdmin
      .from('episodes')
      .update({
        results_posted_at: new Date().toISOString(),
      })
      .eq('id', episodeId);

    if (updateError) {
      throw new Error(`Failed to mark results as released: ${updateError.message}`);
    }

    console.log(`[Release Results] Episode ${episode.number} marked as released`);

    // 3. Get all active users (users with picks in any league)
    const { data: activeUsers, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name, phone')
      .in(
        'id',
        supabaseAdmin
          .from('league_members')
          .select('user_id')
      );

    if (usersError) {
      throw new Error(`Failed to fetch active users: ${usersError.message}`);
    }

    if (!activeUsers || activeUsers.length === 0) {
      console.log('[Release Results] No active users found');
      return { success: true, notificationsSent: 0, errors: [] };
    }

    console.log(`[Release Results] Sending notifications to ${activeUsers.length} users`);

    // 4. Send spoiler-safe notifications to all users
    for (const user of activeUsers) {
      try {
        await sendSpoilerSafeNotification(user as User, episode as Episode);
        notificationsSent++;

        // Add small delay to avoid rate limits
        if (notificationsSent % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (err) {
        const errorMsg = `Failed to send notification to ${user.email}: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.error(`[Release Results] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log(`[Release Results] Complete: ${notificationsSent} notifications sent, ${errors.length} errors`);

    return {
      success: true,
      notificationsSent,
      errors,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Release Results] Fatal error: ${errorMsg}`);
    errors.push(errorMsg);

    return {
      success: false,
      notificationsSent,
      errors,
    };
  }
}

/**
 * Manual admin endpoint to release results
 *
 * POST /api/admin/episodes/:episodeId/release-results
 *
 * Example usage:
 *
 * import { releaseEpisodeResults } from '../jobs/releaseResults.js';
 *
 * router.post('/api/admin/episodes/:episodeId/release-results', async (req, res) => {
 *   const { episodeId } = req.params;
 *
 *   // Verify admin permissions
 *   if (req.user.role !== 'admin') {
 *     return res.status(403).json({ error: 'Admin access required' });
 *   }
 *
 *   const result = await releaseEpisodeResults(episodeId);
 *
 *   if (!result.success) {
 *     return res.status(500).json({
 *       error: 'Failed to release results',
 *       errors: result.errors,
 *     });
 *   }
 *
 *   res.json({
 *     message: `Results released for episode`,
 *     notificationsSent: result.notificationsSent,
 *     errors: result.errors,
 *   });
 * });
 */

/**
 * Automatic release via cron job
 *
 * Example: Run this job every Friday at noon PST (3pm EST)
 *
 * import cron from 'node-cron';
 * import { releaseEpisodeResults } from './jobs/releaseResults.js';
 *
 * // Run every Friday at 12:00 PM PST (20:00 UTC)
 * cron.schedule('0 20 * * 5', async () => {
 *   console.log('[Cron] Checking for episodes ready to release...');
 *
 *   // Find episodes that are scored but not released
 *   const { data: episodes } = await supabaseAdmin
 *     .from('episodes')
 *     .select('id, number')
 *     .eq('is_scored', true)
 *     .is('results_posted_at', null)
 *     .order('number', { ascending: true })
 *     .limit(1);
 *
 *   if (episodes && episodes.length > 0) {
 *     const episode = episodes[0];
 *     console.log(`[Cron] Releasing results for Episode ${episode.number}`);
 *     await releaseEpisodeResults(episode.id);
 *   } else {
 *     console.log('[Cron] No episodes ready for release');
 *   }
 * }, {
 *   timezone: 'America/Los_Angeles'
 * });
 */
