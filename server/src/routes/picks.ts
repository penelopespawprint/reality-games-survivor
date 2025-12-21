import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/authenticate.js';
import { supabase, supabaseAdmin } from '../config/supabase.js';

const router = Router();

// POST /api/leagues/:id/picks - Submit weekly pick
router.post('/:id/picks', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leagueId = req.params.id;
    const userId = req.user!.id;
    const { castaway_id, episode_id } = req.body;

    if (!castaway_id || !episode_id) {
      return res.status(400).json({ error: 'castaway_id and episode_id are required' });
    }

    // Check episode hasn't locked
    const { data: episode } = await supabase
      .from('episodes')
      .select('*')
      .eq('id', episode_id)
      .single();

    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    const lockTime = new Date(episode.picks_lock_at);
    if (new Date() >= lockTime) {
      return res.status(400).json({ error: 'Picks are locked for this episode' });
    }

    // Check user has this castaway on roster
    const { data: roster } = await supabase
      .from('rosters')
      .select('*')
      .eq('league_id', leagueId)
      .eq('user_id', userId)
      .eq('castaway_id', castaway_id)
      .is('dropped_at', null)
      .single();

    if (!roster) {
      return res.status(400).json({ error: 'Castaway not on your roster' });
    }

    // Check castaway is still active
    const { data: castaway } = await supabase
      .from('castaways')
      .select('status')
      .eq('id', castaway_id)
      .single();

    if (castaway?.status !== 'active') {
      return res.status(400).json({ error: 'Castaway is eliminated' });
    }

    // Upsert pick
    const { data: pick, error } = await supabaseAdmin
      .from('weekly_picks')
      .upsert({
        league_id: leagueId,
        user_id: userId,
        episode_id,
        castaway_id,
        status: 'pending',
        picked_at: new Date().toISOString(),
      }, {
        onConflict: 'league_id,user_id,episode_id',
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ pick });
  } catch (err) {
    console.error('POST /api/leagues/:id/picks error:', err);
    res.status(500).json({ error: 'Failed to submit pick' });
  }
});

// GET /api/leagues/:id/picks/current - Get current week pick status
router.get('/:id/picks/current', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leagueId = req.params.id;
    const userId = req.user!.id;

    // Get league
    const { data: league } = await supabase
      .from('leagues')
      .select('season_id')
      .eq('id', leagueId)
      .single();

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Get current/next episode
    const now = new Date();
    const { data: episodes } = await supabase
      .from('episodes')
      .select('*')
      .eq('season_id', league.season_id)
      .gte('picks_lock_at', now.toISOString())
      .order('picks_lock_at', { ascending: true })
      .limit(1);

    const episode = episodes?.[0];

    if (!episode) {
      return res.json({
        episode: null,
        my_pick: null,
        deadline: null,
        roster: [],
      });
    }

    // Get user's pick for this episode
    const { data: pick } = await supabase
      .from('weekly_picks')
      .select('*, castaways(*)')
      .eq('league_id', leagueId)
      .eq('user_id', userId)
      .eq('episode_id', episode.id)
      .single();

    // Get user's roster
    const { data: roster } = await supabase
      .from('rosters')
      .select('*, castaways(*)')
      .eq('league_id', leagueId)
      .eq('user_id', userId)
      .is('dropped_at', null);

    res.json({
      episode: {
        id: episode.id,
        number: episode.number,
        title: episode.title,
        air_date: episode.air_date,
        picks_lock_at: episode.picks_lock_at,
      },
      my_pick: pick ? {
        castaway: (pick as any).castaways,
        status: pick.status,
        picked_at: pick.picked_at,
      } : null,
      deadline: episode.picks_lock_at,
      roster: roster?.map((r: any) => ({
        castaway: r.castaways,
        canPick: r.castaways?.status === 'active',
      })) || [],
    });
  } catch (err) {
    console.error('GET /api/leagues/:id/picks/current error:', err);
    res.status(500).json({ error: 'Failed to fetch current pick' });
  }
});

// POST /api/picks/lock - Lock all picks for current episode (cron)
router.post('/lock', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();

    // Find episodes that should be locked
    const { data: episodes } = await supabaseAdmin
      .from('episodes')
      .select('id')
      .lte('picks_lock_at', now.toISOString())
      .eq('is_scored', false);

    if (!episodes || episodes.length === 0) {
      return res.json({ locked: 0, episodes: [] });
    }

    const episodeIds = episodes.map((e) => e.id);

    // Lock all pending picks
    const { data, error } = await supabaseAdmin
      .from('weekly_picks')
      .update({
        status: 'locked',
        locked_at: now.toISOString(),
      })
      .eq('status', 'pending')
      .in('episode_id', episodeIds)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      locked: data?.length || 0,
      episodes: episodeIds,
    });
  } catch (err) {
    console.error('POST /api/picks/lock error:', err);
    res.status(500).json({ error: 'Failed to lock picks' });
  }
});

// POST /api/picks/auto-fill - Auto-pick for users who didn't submit (cron)
router.post('/auto-fill', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();

    // Find episodes past lock time
    const { data: episodes } = await supabaseAdmin
      .from('episodes')
      .select('id, season_id')
      .lte('picks_lock_at', now.toISOString())
      .eq('is_scored', false);

    if (!episodes || episodes.length === 0) {
      return res.json({ auto_picked: 0, users: [] });
    }

    const autoPicks: Array<{ user_id: string; episode_id: string }> = [];

    for (const episode of episodes) {
      // Get all leagues for this season
      const { data: leagues } = await supabaseAdmin
        .from('leagues')
        .select('id')
        .eq('season_id', episode.season_id)
        .eq('status', 'active');

      if (!leagues) continue;

      for (const league of leagues) {
        // Get members who haven't picked
        const { data: members } = await supabaseAdmin
          .from('league_members')
          .select('user_id')
          .eq('league_id', league.id);

        const { data: existingPicks } = await supabaseAdmin
          .from('weekly_picks')
          .select('user_id')
          .eq('league_id', league.id)
          .eq('episode_id', episode.id);

        const pickedUserIds = new Set(existingPicks?.map((p) => p.user_id) || []);
        const missingUsers = members?.filter((m) => !pickedUserIds.has(m.user_id)) || [];

        for (const member of missingUsers) {
          // Get user's active roster
          const { data: roster } = await supabaseAdmin
            .from('rosters')
            .select('castaway_id, castaways(id, status)')
            .eq('league_id', league.id)
            .eq('user_id', member.user_id)
            .is('dropped_at', null);

          // Pick first active castaway
          const activeCastaway = roster?.find(
            (r: any) => r.castaways?.status === 'active'
          );

          if (activeCastaway) {
            await supabaseAdmin.from('weekly_picks').insert({
              league_id: league.id,
              user_id: member.user_id,
              episode_id: episode.id,
              castaway_id: activeCastaway.castaway_id,
              status: 'auto_picked',
              picked_at: now.toISOString(),
              locked_at: now.toISOString(),
            });

            autoPicks.push({
              user_id: member.user_id,
              episode_id: episode.id,
            });
          }
        }
      }
    }

    res.json({
      auto_picked: autoPicks.length,
      users: autoPicks.map((p) => p.user_id),
    });
  } catch (err) {
    console.error('POST /api/picks/auto-fill error:', err);
    res.status(500).json({ error: 'Failed to auto-fill picks' });
  }
});

export default router;
