import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/authenticate.js';
import { supabase, supabaseAdmin } from '../config/supabase.js';

const router = Router();

// POST /api/episodes/:id/scoring/start - Begin scoring session
router.post('/:id/scoring/start', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const episodeId = req.params.id;

    // Get episode
    const { data: episode } = await supabase
      .from('episodes')
      .select('*, seasons(*)')
      .eq('id', episodeId)
      .single();

    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    // Check if session already exists
    const { data: existingSession } = await supabase
      .from('scoring_sessions')
      .select('*')
      .eq('episode_id', episodeId)
      .single();

    if (existingSession) {
      // Get castaways and rules for the session
      const { data: castaways } = await supabase
        .from('castaways')
        .select('*')
        .eq('season_id', episode.season_id)
        .eq('status', 'active');

      const { data: rules } = await supabase
        .from('scoring_rules')
        .select('*')
        .or(`season_id.eq.${episode.season_id},season_id.is.null`)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      // Get existing scores
      const { data: scores } = await supabase
        .from('episode_scores')
        .select('*')
        .eq('episode_id', episodeId);

      return res.json({
        session: existingSession,
        castaways,
        rules,
        scores,
      });
    }

    // Create new session
    const { data: session, error } = await supabaseAdmin
      .from('scoring_sessions')
      .insert({
        episode_id: episodeId,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Get castaways and rules
    const { data: castaways } = await supabase
      .from('castaways')
      .select('*')
      .eq('season_id', episode.season_id)
      .eq('status', 'active');

    const { data: rules } = await supabase
      .from('scoring_rules')
      .select('*')
      .or(`season_id.eq.${episode.season_id},season_id.is.null`)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    res.json({
      session,
      castaways,
      rules,
      scores: [],
    });
  } catch (err) {
    console.error('POST /api/episodes/:id/scoring/start error:', err);
    res.status(500).json({ error: 'Failed to start scoring session' });
  }
});

// POST /api/episodes/:id/scoring/save - Save progress
router.post('/:id/scoring/save', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const episodeId = req.params.id;
    const userId = req.user!.id;
    const { scores } = req.body;

    if (!Array.isArray(scores)) {
      return res.status(400).json({ error: 'scores must be an array' });
    }

    // Validate session exists and is draft
    const { data: session } = await supabase
      .from('scoring_sessions')
      .select('*')
      .eq('episode_id', episodeId)
      .single();

    if (!session) {
      return res.status(404).json({ error: 'Scoring session not found' });
    }

    if (session.status === 'finalized') {
      return res.status(400).json({ error: 'Session is already finalized' });
    }

    // Upsert scores
    let savedCount = 0;
    for (const score of scores) {
      const { castaway_id, scoring_rule_id, quantity } = score;

      if (!castaway_id || !scoring_rule_id) continue;

      // Get rule to calculate points
      const { data: rule } = await supabase
        .from('scoring_rules')
        .select('points')
        .eq('id', scoring_rule_id)
        .single();

      if (!rule) continue;

      const points = rule.points * (quantity || 1);

      if (quantity > 0) {
        await supabaseAdmin
          .from('episode_scores')
          .upsert({
            episode_id: episodeId,
            castaway_id,
            scoring_rule_id,
            quantity: quantity || 1,
            points,
            entered_by: userId,
          }, {
            onConflict: 'episode_id,castaway_id,scoring_rule_id',
          });
        savedCount++;
      } else {
        // Remove score if quantity is 0
        await supabaseAdmin
          .from('episode_scores')
          .delete()
          .eq('episode_id', episodeId)
          .eq('castaway_id', castaway_id)
          .eq('scoring_rule_id', scoring_rule_id);
      }
    }

    res.json({ saved: savedCount });
  } catch (err) {
    console.error('POST /api/episodes/:id/scoring/save error:', err);
    res.status(500).json({ error: 'Failed to save scores' });
  }
});

// GET /api/episodes/:id/scoring/status - Get scoring completeness status
router.get('/:id/scoring/status', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const episodeId = req.params.id;

    // Check if episode exists
    const { data: episode } = await supabase
      .from('episodes')
      .select('id, is_scored')
      .eq('id', episodeId)
      .single();

    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    // Get completeness status using the database function
    const { data: completeness, error: rpcError } = await supabaseAdmin.rpc('check_scoring_completeness', {
      p_episode_id: episodeId,
    });

    if (rpcError) {
      console.error('Check completeness RPC error:', rpcError);
      return res.status(500).json({ error: 'Failed to check scoring status' });
    }

    const status = Array.isArray(completeness) ? completeness[0] : completeness;

    res.json({
      is_complete: status.is_complete,
      total_castaways: status.total_castaways,
      scored_castaways: status.scored_castaways,
      unscored_castaway_ids: status.unscored_castaway_ids || [],
      unscored_castaway_names: status.unscored_castaway_names || [],
      is_finalized: episode.is_scored,
    });
  } catch (err) {
    console.error('GET /api/episodes/:id/scoring/status error:', err);
    res.status(500).json({ error: 'Failed to get scoring status' });
  }
});

// POST /api/episodes/:id/scoring/finalize - Finalize scores
router.post('/:id/scoring/finalize', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const episodeId = req.params.id;
    const userId = req.user!.id;

    // Use atomic finalization function to prevent double-finalization
    const { data: result, error: rpcError } = await supabaseAdmin.rpc('finalize_episode_scoring', {
      p_episode_id: episodeId,
      p_finalized_by: userId,
    });

    if (rpcError) {
      console.error('Finalize scoring RPC error:', rpcError);
      return res.status(500).json({ error: 'Failed to finalize scoring' });
    }

    // Check for errors returned by the function
    const finalizeResult = Array.isArray(result) ? result[0] : result;

    if (finalizeResult?.error_code) {
      const statusCode = finalizeResult.error_code === 'SESSION_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json({
        error: finalizeResult.error_message,
        error_code: finalizeResult.error_code
      });
    }

    res.json({
      finalized: finalizeResult.finalized,
      eliminated: finalizeResult.eliminated_castaway_ids || [],
      standings_updated: finalizeResult.standings_updated,
    });
  } catch (err) {
    console.error('POST /api/episodes/:id/scoring/finalize error:', err);
    res.status(500).json({ error: 'Failed to finalize scoring' });
  }
});

// GET /api/episodes/:id/scores - Get all scores for episode
router.get('/:id/scores', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const episodeId = req.params.id;

    // Check if scoring is finalized
    const { data: session } = await supabase
      .from('scoring_sessions')
      .select('status')
      .eq('episode_id', episodeId)
      .single();

    if (!session || session.status !== 'finalized') {
      return res.status(403).json({ error: 'Scores not yet available' });
    }

    // Get scores with castaway and rule details
    const { data: scores } = await supabase
      .from('episode_scores')
      .select(`
        id,
        quantity,
        points,
        castaways (
          id,
          name,
          photo_url
        ),
        scoring_rules (
          id,
          code,
          name,
          points,
          category
        )
      `)
      .eq('episode_id', episodeId);

    // Calculate totals per castaway
    const totals: Record<string, number> = {};
    for (const score of scores || []) {
      const castawayId = (score as any).castaways?.id;
      if (castawayId) {
        totals[castawayId] = (totals[castawayId] || 0) + score.points;
      }
    }

    res.json({ scores, totals });
  } catch (err) {
    console.error('GET /api/episodes/:id/scores error:', err);
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

// GET /api/episodes/:id/scores/:castawayId - Get castaway's episode scores
router.get('/:id/scores/:castawayId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: episodeId, castawayId } = req.params;

    // Check if scoring is finalized
    const { data: session } = await supabase
      .from('scoring_sessions')
      .select('status')
      .eq('episode_id', episodeId)
      .single();

    if (!session || session.status !== 'finalized') {
      return res.status(403).json({ error: 'Scores not yet available' });
    }

    // Get castaway
    const { data: castaway } = await supabase
      .from('castaways')
      .select('*')
      .eq('id', castawayId)
      .single();

    if (!castaway) {
      return res.status(404).json({ error: 'Castaway not found' });
    }

    // Get scores
    const { data: scores } = await supabase
      .from('episode_scores')
      .select(`
        quantity,
        points,
        scoring_rules (
          code,
          name,
          points,
          category
        )
      `)
      .eq('episode_id', episodeId)
      .eq('castaway_id', castawayId);

    const total = scores?.reduce((sum, s) => sum + s.points, 0) || 0;

    res.json({
      castaway,
      scores,
      total,
    });
  } catch (err) {
    console.error('GET /api/episodes/:id/scores/:castawayId error:', err);
    res.status(500).json({ error: 'Failed to fetch castaway scores' });
  }
});

// POST /api/scoring/recalculate - Recalculate all standings (admin)
router.post('/recalculate', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { season_id } = req.body;

    if (!season_id) {
      return res.status(400).json({ error: 'season_id is required' });
    }

    // Get all active leagues for season
    const { data: leagues } = await supabaseAdmin
      .from('leagues')
      .select('id')
      .eq('season_id', season_id)
      .eq('status', 'active');

    if (!leagues || leagues.length === 0) {
      return res.json({ recalculated_leagues: 0 });
    }

    for (const league of leagues) {
      // Get all members
      const { data: members } = await supabaseAdmin
        .from('league_members')
        .select('user_id')
        .eq('league_id', league.id);

      for (const member of members || []) {
        // Recalculate total points
        const { data: picks } = await supabaseAdmin
          .from('weekly_picks')
          .select('points_earned')
          .eq('league_id', league.id)
          .eq('user_id', member.user_id);

        const totalPoints = picks?.reduce((sum, p) => sum + (p.points_earned || 0), 0) || 0;

        await supabaseAdmin
          .from('league_members')
          .update({ total_points: totalPoints })
          .eq('league_id', league.id)
          .eq('user_id', member.user_id);
      }

      // Update ranks
      const { data: rankedMembers } = await supabaseAdmin
        .from('league_members')
        .select('id, total_points')
        .eq('league_id', league.id)
        .order('total_points', { ascending: false });

      for (let i = 0; i < (rankedMembers?.length || 0); i++) {
        await supabaseAdmin
          .from('league_members')
          .update({ rank: i + 1 })
          .eq('id', rankedMembers![i].id);
      }
    }

    res.json({ recalculated_leagues: leagues.length });
  } catch (err) {
    console.error('POST /api/scoring/recalculate error:', err);
    res.status(500).json({ error: 'Failed to recalculate standings' });
  }
});

export default router;
