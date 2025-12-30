/**
 * Admin Episodes Routes
 *
 * Routes for managing episodes (create, update, release results).
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate.js';
import { supabaseAdmin } from '../../config/supabase.js';

const router = Router();

// POST /api/admin/episodes - Create episode
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { season_id, number, title, air_date } = req.body;

    if (!season_id || !number || !air_date) {
      return res.status(400).json({ error: 'season_id, number, and air_date are required' });
    }

    // Calculate default times based on air_date
    const airDate = new Date(air_date);
    const picksLockAt = new Date(airDate);
    picksLockAt.setHours(15, 0, 0, 0); // 3pm same day

    const resultsPostedAt = new Date(airDate);
    resultsPostedAt.setDate(resultsPostedAt.getDate() + 2); // Friday
    resultsPostedAt.setHours(12, 0, 0, 0);

    const { data: episode, error } = await supabaseAdmin
      .from('episodes')
      .insert({
        season_id,
        number,
        title,
        air_date,
        picks_lock_at: picksLockAt.toISOString(),
        results_posted_at: resultsPostedAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ episode });
  } catch (err) {
    console.error('POST /api/admin/episodes error:', err);
    res.status(500).json({ error: 'Failed to create episode' });
  }
});

// PATCH /api/admin/episodes/:id - Update episode
router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const episodeId = req.params.id;
    const updates = req.body;

    const { data: episode, error } = await supabaseAdmin
      .from('episodes')
      .update(updates)
      .eq('id', episodeId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ episode });
  } catch (err) {
    console.error('PATCH /api/admin/episodes/:id error:', err);
    res.status(500).json({ error: 'Failed to update episode' });
  }
});

// POST /api/admin/episodes/:id/lock - Lock results for release
router.post('/:id/lock', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: episodeId } = req.params;

    // Verify episode exists and is scored
    const { data: episode, error: episodeError } = await supabaseAdmin
      .from('episodes')
      .select('id, number, is_scored, results_locked_at, results_released_at')
      .eq('id', episodeId)
      .single();

    if (episodeError || !episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    if (!episode.is_scored) {
      return res.status(400).json({ error: 'Episode scoring must be finalized before locking results' });
    }

    if (episode.results_locked_at) {
      return res.status(400).json({
        error: 'Results already locked',
        locked_at: episode.results_locked_at,
      });
    }

    if (episode.results_released_at) {
      return res.status(400).json({
        error: 'Results already released',
        released_at: episode.results_released_at,
      });
    }

    // Lock results
    const { error: updateError } = await supabaseAdmin
      .from('episodes')
      .update({
        results_locked_at: new Date().toISOString(),
        results_locked_by: req.user!.id,
      })
      .eq('id', episodeId);

    if (updateError) {
      console.error('Failed to lock results:', updateError);
      return res.status(500).json({ error: 'Failed to lock results' });
    }

    res.json({
      message: 'Results locked successfully. They will be released automatically within 15 minutes.',
      episode: {
        id: episode.id,
        number: episode.number,
      },
    });
  } catch (err) {
    console.error('POST /api/admin/episodes/:id/lock error:', err);
    res.status(500).json({ error: 'Failed to lock results' });
  }
});

// POST /api/admin/episodes/:id/release-results - Manually release episode results
router.post('/:id/release-results', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: episodeId } = req.params;

    // Verify episode exists and is finalized
    const { data: episode, error: episodeError } = await supabaseAdmin
      .from('episodes')
      .select('id, number, season_id, is_scored, results_released_at')
      .eq('id', episodeId)
      .single();

    if (episodeError || !episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    if (!episode.is_scored) {
      return res.status(400).json({ error: 'Episode scoring must be finalized before releasing results' });
    }

    if (episode.results_released_at) {
      return res.status(400).json({
        error: 'Results already released',
        released_at: episode.results_released_at,
      });
    }

    // Import spoiler-safe notification function
    const { sendSpoilerSafeNotification } = await import('../../lib/spoiler-safe-notifications.js');

    // Get all users in active leagues for this season
    const { data: leagues } = await supabaseAdmin
      .from('leagues')
      .select('id')
      .eq('season_id', episode.season_id)
      .eq('status', 'active');

    if (!leagues || leagues.length === 0) {
      return res.status(400).json({ error: 'No active leagues found for this season' });
    }

    const leagueIds = leagues.map((l) => l.id);

    // Get unique users from all leagues
    const { data: members } = await supabaseAdmin
      .from('league_members')
      .select(`
        user_id,
        users (
          id,
          email,
          display_name,
          phone
        )
      `)
      .in('league_id', leagueIds);

    if (!members || members.length === 0) {
      return res.status(400).json({ error: 'No users found in active leagues' });
    }

    // Deduplicate users
    const uniqueUsers = new Map();
    for (const member of members) {
      const user = (member as any).users;
      if (user && !uniqueUsers.has(user.id)) {
        uniqueUsers.set(user.id, user);
      }
    }

    let notificationsSent = 0;
    let errors = 0;

    // Send notifications to all users
    for (const user of uniqueUsers.values()) {
      try {
        await sendSpoilerSafeNotification(user, episode);
        notificationsSent++;
      } catch (error) {
        console.error(`Failed to send notification to user ${user.id}:`, error);
        errors++;
      }
    }

    // Mark as released
    const { error: updateError } = await supabaseAdmin
      .from('episodes')
      .update({
        results_released_at: new Date().toISOString(),
        results_released_by: req.user!.id,
      })
      .eq('id', episodeId);

    if (updateError) {
      console.error('Failed to mark results as released:', updateError);
      return res.status(500).json({ error: 'Failed to mark results as released' });
    }

    res.json({
      message: 'Results released successfully',
      episode: {
        id: episode.id,
        number: episode.number,
      },
      notifications_sent: notificationsSent,
      errors,
    });
  } catch (err) {
    console.error('POST /api/admin/episodes/:id/release-results error:', err);
    res.status(500).json({ error: 'Failed to release results' });
  }
});

// GET /api/admin/episodes/:id/release-status - Check if results are released
router.get('/:id/release-status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: episodeId } = req.params;

    const { data: episode, error } = await supabaseAdmin
      .from('episodes')
      .select(`
        id,
        number,
        is_scored,
        results_released_at,
        results_released_by,
        users!results_released_by (display_name)
      `)
      .eq('id', episodeId)
      .single();

    if (error || !episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    // Count notifications sent
    const { count: notificationCount } = await supabaseAdmin
      .from('results_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('episode_id', episodeId);

    res.json({
      episode: {
        id: episode.id,
        number: episode.number,
      },
      scoring_finalized: !!episode.is_scored,
      results_released: !!episode.results_released_at,
      results_released_at: episode.results_released_at,
      released_by: episode.results_released_by
        ? {
            id: episode.results_released_by,
            name: (episode as any).users?.display_name,
          }
        : null,
      notifications_sent: notificationCount || 0,
    });
  } catch (err) {
    console.error('GET /api/admin/episodes/:id/release-status error:', err);
    res.status(500).json({ error: 'Failed to fetch release status' });
  }
});

export default router;
