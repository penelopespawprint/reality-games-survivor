/**
 * Global Leaderboard Route
 *
 * Cross-league leaderboard with Bayesian weighted average scoring
 */

import { Router, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';

const router = Router();

// GET /api/leagues/global-leaderboard - Global leaderboard with Bayesian weighted average
router.get('/global-leaderboard', async (req, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    // Confidence factor for Bayesian weighted average
    // With C=1, players at 1 league get 50% weight, 2 leagues get 67%, 3 leagues get 75%
    const CONFIDENCE_FACTOR = 1;

    // OPTIMIZED: Single SQL query using CTEs to eliminate N+1 queries
    // This replaces multiple separate queries with one efficient query
    const { data: rawStats, error } = await supabaseAdmin.rpc('get_global_leaderboard_stats');

    if (error) {
      console.error('RPC error:', error);
      throw error;
    }

    // Get active season (independent query, can run in parallel if needed)
    const { data: activeSeason } = await supabaseAdmin
      .from('seasons')
      .select('id, number, name')
      .eq('is_active', true)
      .single();

    // Process stats from single query result
    const statsRaw = (rawStats || []).map((row: any) => ({
      userId: row.user_id,
      displayName: row.display_name || 'Unknown',
      avatarUrl: row.avatar_url,
      totalPoints: row.total_points || 0,
      leagueCount: row.league_count || 0,
      averagePoints: row.average_points || 0,
      hasEliminatedCastaway: row.has_eliminated_castaway || false,
    }));

    // Calculate global average for Bayesian weighting
    const totalAllPoints = statsRaw.reduce((sum: number, p: any) => sum + p.totalPoints, 0);
    const totalAllLeagues = statsRaw.reduce((sum: number, p: any) => sum + p.leagueCount, 0);
    const globalAverage = totalAllLeagues > 0 ? totalAllPoints / totalAllLeagues : 0;

    // Apply Bayesian weighted average and sort
    const allStats = statsRaw.map((p: any) => ({
      ...p,
      weightedScore: Math.round(
        (p.averagePoints * p.leagueCount + globalAverage * CONFIDENCE_FACTOR) /
        (p.leagueCount + CONFIDENCE_FACTOR)
      ),
    })).sort((a: any, b: any) => b.weightedScore - a.weightedScore);

    // Apply pagination
    const paginatedStats = allStats.slice(offset, offset + limit);

    // Summary stats
    const totalPlayers = allStats.length;
    const topScore = allStats.length > 0 ? allStats[0].weightedScore : 0;
    const activeTorches = allStats.filter((p: any) => !p.hasEliminatedCastaway).length;

    res.json({
      leaderboard: paginatedStats,
      pagination: {
        total: totalPlayers,
        limit,
        offset,
        hasMore: offset + limit < totalPlayers,
      },
      summary: {
        totalPlayers,
        topScore,
        activeTorches,
      },
      activeSeason: activeSeason || null,
    });
  } catch (err) {
    console.error('GET /api/global-leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch global leaderboard' });
  }
});

export default router;
