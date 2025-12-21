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

// POST /api/episodes/:id/scoring/finalize - Finalize scores
router.post('/:id/scoring/finalize', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const episodeId = req.params.id;
    const userId = req.user!.id;

    // Get episode and session
    const { data: episode } = await supabase
      .from('episodes')
      .select('*, seasons(*)')
      .eq('id', episodeId)
      .single();

    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    const { data: session } = await supabase
      .from('scoring_sessions')
      .select('*')
      .eq('episode_id', episodeId)
      .single();

    if (!session) {
      return res.status(404).json({ error: 'Scoring session not found' });
    }

    if (session.status === 'finalized') {
      return res.status(400).json({ error: 'Session already finalized' });
    }

    // Finalize session
    await supabaseAdmin
      .from('scoring_sessions')
      .update({
        status: 'finalized',
        finalized_at: new Date().toISOString(),
        finalized_by: userId,
      })
      .eq('id', session.id);

    // Mark episode as scored
    await supabaseAdmin
      .from('episodes')
      .update({ is_scored: true })
      .eq('id', episodeId);

    // Get all scores for this episode
    const { data: scores } = await supabase
      .from('episode_scores')
      .select('castaway_id, points')
      .eq('episode_id', episodeId);

    // Calculate total points per castaway
    const castawayTotals: Record<string, number> = {};
    for (const score of scores || []) {
      castawayTotals[score.castaway_id] =
        (castawayTotals[score.castaway_id] || 0) + score.points;
    }

    // Update weekly picks with points earned
    const { data: picks } = await supabaseAdmin
      .from('weekly_picks')
      .select('id, castaway_id')
      .eq('episode_id', episodeId);

    for (const pick of picks || []) {
      const pointsEarned = castawayTotals[pick.castaway_id] || 0;
      await supabaseAdmin
        .from('weekly_picks')
        .update({ points_earned: pointsEarned })
        .eq('id', pick.id);
    }

    // Update league member totals
    const { data: leagues } = await supabaseAdmin
      .from('leagues')
      .select('id')
      .eq('season_id', episode.season_id)
      .eq('status', 'active');

    for (const league of leagues || []) {
      const { data: members } = await supabaseAdmin
        .from('league_members')
        .select('user_id')
        .eq('league_id', league.id);

      for (const member of members || []) {
        // Sum all points earned
        const { data: userPicks } = await supabaseAdmin
          .from('weekly_picks')
          .select('points_earned')
          .eq('league_id', league.id)
          .eq('user_id', member.user_id);

        const totalPoints = userPicks?.reduce((sum, p) => sum + (p.points_earned || 0), 0) || 0;

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

    // Check for eliminated castaways (those with elimination rule)
    const { data: eliminationRules } = await supabase
      .from('scoring_rules')
      .select('id')
      .ilike('code', '%ELIM%');

    const eliminatedCastawayIds: string[] = [];
    if (eliminationRules && eliminationRules.length > 0) {
      const elimRuleIds = eliminationRules.map((r) => r.id);

      const { data: elimScores } = await supabase
        .from('episode_scores')
        .select('castaway_id')
        .eq('episode_id', episodeId)
        .in('scoring_rule_id', elimRuleIds);

      for (const score of elimScores || []) {
        await supabaseAdmin
          .from('castaways')
          .update({
            status: 'eliminated',
            eliminated_episode_id: episodeId,
          })
          .eq('id', score.castaway_id);

        eliminatedCastawayIds.push(score.castaway_id);
      }
    }

    res.json({
      finalized: true,
      eliminated: eliminatedCastawayIds,
      standings_updated: true,
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
