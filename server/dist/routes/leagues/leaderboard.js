/**
 * Global Leaderboard Route
 *
 * Cross-league leaderboard with weighted average scoring
 * Uses steeper confidence penalty for small sample sizes:
 * - 1 league: 33% weight on raw score, 67% regression to mean
 * - 2 leagues: 55% weight
 * - 3 leagues: 70% weight
 * - 4+ leagues: asymptotically approaches 100%
 */
import { Router } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
import { getWeightedRankings, getConfidenceIndicator } from '../../services/weightedRankings.js';
const router = Router();
// GET /api/leagues/global-leaderboard - Global leaderboard with weighted average
router.get('/global-leaderboard', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const offset = parseInt(req.query.offset) || 0;
        // Get active season
        const { data: activeSeason } = await supabaseAdmin
            .from('seasons')
            .select('id, number, name')
            .eq('is_active', true)
            .single();
        if (!activeSeason) {
            return res.json({
                leaderboard: [],
                pagination: { total: 0, limit, offset, hasMore: false },
                summary: { totalPlayers: 0, topScore: 0, activeTorches: 0 },
                activeSeason: null,
            });
        }
        // Get weighted rankings using the service
        const rankings = await getWeightedRankings(activeSeason.id);
        // Get eliminated castaway status for each user
        const { data: eliminatedStatus } = await supabaseAdmin.rpc('get_global_leaderboard_stats');
        const eliminatedMap = new Map();
        (eliminatedStatus || []).forEach((row) => {
            eliminatedMap.set(row.user_id, row.has_eliminated_castaway || false);
        });
        // Map rankings to response format with confidence indicators
        const allStats = rankings.map((player, index) => ({
            userId: player.userId,
            displayName: player.displayName,
            avatarUrl: player.avatarUrl,
            totalPoints: player.totalPoints,
            leagueCount: player.leagueCount,
            averagePoints: player.rawAverage,
            weightedScore: player.weightedScore,
            confidence: player.confidence,
            confidenceIndicator: getConfidenceIndicator(player.leagueCount),
            scores: player.scores,
            hasEliminatedCastaway: eliminatedMap.get(player.userId) || false,
        }));
        // Apply pagination
        const paginatedStats = allStats.slice(offset, offset + limit);
        // Summary stats
        const totalPlayers = allStats.length;
        const topScore = allStats.length > 0 ? allStats[0].weightedScore : 0;
        const activeTorches = allStats.filter((p) => !p.hasEliminatedCastaway).length;
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
    }
    catch (err) {
        console.error('GET /api/global-leaderboard error:', err);
        res.status(500).json({ error: 'Failed to fetch global leaderboard' });
    }
});
// GET /api/leagues/rankings/:seasonId - Get weighted rankings for a specific season
router.get('/rankings/:seasonId', async (req, res) => {
    try {
        const { seasonId } = req.params;
        if (!seasonId) {
            return res.status(400).json({ error: 'seasonId is required' });
        }
        const rankings = await getWeightedRankings(seasonId);
        // Add rank position and confidence indicator
        const response = rankings.map((player, index) => ({
            rank: index + 1,
            playerId: player.userId,
            playerName: player.displayName,
            leagueCount: player.leagueCount,
            rawAverage: player.rawAverage,
            confidence: player.confidence,
            weightedScore: player.weightedScore,
            scores: player.scores,
            confidenceIndicator: getConfidenceIndicator(player.leagueCount),
        }));
        return res.json({
            seasonId,
            totalPlayers: response.length,
            rankings: response,
        });
    }
    catch (error) {
        console.error('Rankings error:', error);
        return res.status(500).json({
            error: 'Failed to calculate rankings',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
export default router;
//# sourceMappingURL=leaderboard.js.map