/**
 * Rankings Route
 *
 * Provides weighted cross-league rankings for players.
 * Uses Bayesian-weighted average to account for sample size differences.
 */

import { Router, Response } from 'express';
import { getWeightedRankings, getConfidenceIndicator } from '../services/weightedRankings.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = Router();

/**
 * GET /api/rankings/:seasonId
 *
 * Get weighted rankings for a specific season.
 * Supports pagination with limit/offset query params.
 */
router.get('/:seasonId', async (req, res: Response) => {
  try {
    const { seasonId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    if (!seasonId) {
      return res.status(400).json({ error: 'seasonId is required' });
    }

    // Verify season exists
    const { data: season, error: seasonError } = await supabaseAdmin
      .from('seasons')
      .select('id, number, name')
      .eq('id', seasonId)
      .single();

    if (seasonError || !season) {
      return res.status(404).json({ error: 'Season not found' });
    }

    const rankings = await getWeightedRankings(seasonId);

    // Add rank position and confidence indicator
    const rankedPlayers = rankings.map((player, index) => ({
      rank: index + 1,
      ...player,
      confidenceIndicator: getConfidenceIndicator(player.leagueCount),
    }));

    // Apply pagination
    const paginatedRankings = rankedPlayers.slice(offset, offset + limit);

    return res.json({
      seasonId,
      seasonName: season.name,
      seasonNumber: season.number,
      totalPlayers: rankedPlayers.length,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < rankedPlayers.length,
      },
      rankings: paginatedRankings,
    });
  } catch (error) {
    console.error('Rankings error:', error);
    return res.status(500).json({
      error: 'Failed to calculate rankings',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/rankings/active
 *
 * Get weighted rankings for the currently active season.
 */
router.get('/', async (req, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    // Get active season
    const { data: season, error: seasonError } = await supabaseAdmin
      .from('seasons')
      .select('id, number, name')
      .eq('is_active', true)
      .single();

    if (seasonError || !season) {
      return res.status(404).json({ error: 'No active season found' });
    }

    const rankings = await getWeightedRankings(season.id);

    // Add rank position and confidence indicator
    const rankedPlayers = rankings.map((player, index) => ({
      rank: index + 1,
      ...player,
      confidenceIndicator: getConfidenceIndicator(player.leagueCount),
    }));

    // Apply pagination
    const paginatedRankings = rankedPlayers.slice(offset, offset + limit);

    return res.json({
      seasonId: season.id,
      seasonName: season.name,
      seasonNumber: season.number,
      totalPlayers: rankedPlayers.length,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < rankedPlayers.length,
      },
      rankings: paginatedRankings,
    });
  } catch (error) {
    console.error('Rankings error:', error);
    return res.status(500).json({
      error: 'Failed to calculate rankings',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
