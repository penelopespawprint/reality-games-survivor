import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/authenticate.js';
import { supabase, supabaseAdmin } from '../config/supabase.js';

const router = Router();

// GET /api/leagues/:id/waivers/available - Get available castaways
router.get('/:id/waivers/available', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leagueId = req.params.id;

    // Get league
    const { data: league } = await supabase
      .from('leagues')
      .select('season_id')
      .eq('id', leagueId)
      .single();

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Get all castaways for season
    const { data: castaways } = await supabase
      .from('castaways')
      .select('*, episodes:eliminated_episode_id(number)')
      .eq('season_id', league.season_id);

    // Get rostered castaways in this league
    const { data: rosters } = await supabase
      .from('rosters')
      .select('castaway_id')
      .eq('league_id', leagueId)
      .is('dropped_at', null);

    const rosteredIds = new Set(rosters?.map((r) => r.castaway_id) || []);

    // Available = not rostered and still active
    const available = castaways?.filter(
      (c) => !rosteredIds.has(c.id) && c.status === 'active'
    ) || [];

    res.json({
      castaways: available.map((c: any) => ({
        id: c.id,
        name: c.name,
        photo_url: c.photo_url,
        tribe_original: c.tribe_original,
      })),
    });
  } catch (err) {
    console.error('GET /api/leagues/:id/waivers/available error:', err);
    res.status(500).json({ error: 'Failed to fetch available castaways' });
  }
});

// GET /api/leagues/:id/waivers/my-rankings - Get user's waiver rankings
router.get('/:id/waivers/my-rankings', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leagueId = req.params.id;
    const userId = req.user!.id;

    // Get current episode with open waiver
    const { data: league } = await supabase
      .from('leagues')
      .select('season_id')
      .eq('id', leagueId)
      .single();

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    const now = new Date();
    const { data: episodes } = await supabase
      .from('episodes')
      .select('*')
      .eq('season_id', league.season_id)
      .lte('waiver_opens_at', now.toISOString())
      .gte('waiver_closes_at', now.toISOString())
      .limit(1);

    const episode = episodes?.[0];

    if (!episode) {
      return res.json({
        rankings: [],
        submitted_at: null,
        waiver_open: false,
      });
    }

    // Get user's rankings
    const { data: ranking } = await supabase
      .from('waiver_rankings')
      .select('*')
      .eq('league_id', leagueId)
      .eq('user_id', userId)
      .eq('episode_id', episode.id)
      .single();

    res.json({
      rankings: ranking?.rankings || [],
      submitted_at: ranking?.submitted_at || null,
      waiver_open: true,
      deadline: episode.waiver_closes_at,
    });
  } catch (err) {
    console.error('GET /api/leagues/:id/waivers/my-rankings error:', err);
    res.status(500).json({ error: 'Failed to fetch rankings' });
  }
});

// PUT /api/leagues/:id/waivers/rankings - Submit waiver rankings
router.put('/:id/waivers/rankings', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leagueId = req.params.id;
    const userId = req.user!.id;
    const { rankings } = req.body;

    if (!Array.isArray(rankings)) {
      return res.status(400).json({ error: 'rankings must be an array of castaway_ids' });
    }

    // Get current episode with open waiver
    const { data: league } = await supabase
      .from('leagues')
      .select('season_id')
      .eq('id', leagueId)
      .single();

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    const now = new Date();
    const { data: episodes } = await supabase
      .from('episodes')
      .select('*')
      .eq('season_id', league.season_id)
      .lte('waiver_opens_at', now.toISOString())
      .gte('waiver_closes_at', now.toISOString())
      .limit(1);

    const episode = episodes?.[0];

    if (!episode) {
      return res.status(400).json({ error: 'Waiver window is not open' });
    }

    // Upsert rankings
    const { data, error } = await supabaseAdmin
      .from('waiver_rankings')
      .upsert({
        league_id: leagueId,
        user_id: userId,
        episode_id: episode.id,
        rankings,
        submitted_at: now.toISOString(),
      }, {
        onConflict: 'league_id,user_id,episode_id',
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      rankings: data.rankings,
      deadline: episode.waiver_closes_at,
    });
  } catch (err) {
    console.error('PUT /api/leagues/:id/waivers/rankings error:', err);
    res.status(500).json({ error: 'Failed to submit rankings' });
  }
});

// POST /api/waivers/process - Process all waivers (cron)
router.post('/process', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();

    // Find episodes with closed waiver windows that haven't been processed
    const { data: episodes } = await supabaseAdmin
      .from('episodes')
      .select('id, season_id')
      .lte('waiver_closes_at', now.toISOString())
      .eq('is_scored', false);

    if (!episodes || episodes.length === 0) {
      return res.json({ processed: 0, transactions: [] });
    }

    const allTransactions: Array<{
      user: string;
      dropped: string | null;
      acquired: string | null;
    }> = [];

    for (const episode of episodes) {
      // Get all leagues for this season
      const { data: leagues } = await supabaseAdmin
        .from('leagues')
        .select('id')
        .eq('season_id', episode.season_id)
        .eq('status', 'active');

      if (!leagues) continue;

      for (const league of leagues) {
        // Get members sorted by inverse standings (last place first)
        const { data: members } = await supabaseAdmin
          .from('league_members')
          .select('user_id, total_points')
          .eq('league_id', league.id)
          .order('total_points', { ascending: true });

        if (!members) continue;

        // Get rankings for this episode
        const { data: rankings } = await supabaseAdmin
          .from('waiver_rankings')
          .select('*')
          .eq('league_id', league.id)
          .eq('episode_id', episode.id);

        // Get current rosters
        const { data: rosters } = await supabaseAdmin
          .from('rosters')
          .select('*, castaways(*)')
          .eq('league_id', league.id)
          .is('dropped_at', null);

        // Track claimed castaways
        const claimedCastawayIds = new Set<string>();

        // Process in waiver order (inverse standings)
        for (let i = 0; i < members.length; i++) {
          const member = members[i];
          const ranking = rankings?.find((r) => r.user_id === member.user_id);

          if (!ranking?.rankings || ranking.rankings.length === 0) continue;

          // Check if user has eliminated castaway to drop
          const userRoster = rosters?.filter((r) => r.user_id === member.user_id);
          const eliminatedCastaway = userRoster?.find(
            (r: any) => r.castaways?.status === 'eliminated'
          );

          if (!eliminatedCastaway) continue;

          // Find first available castaway from rankings
          const rankedIds = ranking.rankings as string[];
          let acquiredCastawayId: string | null = null;

          for (const castawayId of rankedIds) {
            if (!claimedCastawayIds.has(castawayId)) {
              // Check castaway is actually available
              const isRostered = rosters?.some(
                (r) => r.castaway_id === castawayId && r.dropped_at === null
              );
              if (!isRostered) {
                acquiredCastawayId = castawayId;
                claimedCastawayIds.add(castawayId);
                break;
              }
            }
          }

          if (!acquiredCastawayId) continue;

          // Execute waiver transaction
          // Drop eliminated castaway
          await supabaseAdmin
            .from('rosters')
            .update({ dropped_at: now.toISOString() })
            .eq('id', eliminatedCastaway.id);

          // Add new castaway
          await supabaseAdmin.from('rosters').insert({
            league_id: league.id,
            user_id: member.user_id,
            castaway_id: acquiredCastawayId,
            draft_round: 0,
            draft_pick: 0,
            acquired_via: 'waiver',
          });

          // Record result
          await supabaseAdmin.from('waiver_results').insert({
            league_id: league.id,
            user_id: member.user_id,
            episode_id: episode.id,
            dropped_castaway_id: eliminatedCastaway.castaway_id,
            acquired_castaway_id: acquiredCastawayId,
            waiver_position: i + 1,
          });

          allTransactions.push({
            user: member.user_id,
            dropped: eliminatedCastaway.castaway_id,
            acquired: acquiredCastawayId,
          });
        }
      }
    }

    res.json({
      processed: allTransactions.length,
      transactions: allTransactions,
    });
  } catch (err) {
    console.error('POST /api/waivers/process error:', err);
    res.status(500).json({ error: 'Failed to process waivers' });
  }
});

export default router;
