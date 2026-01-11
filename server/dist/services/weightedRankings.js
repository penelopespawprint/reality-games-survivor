/**
 * Weighted Rankings Service
 *
 * Implements Bayesian-weighted average ranking for cross-league leaderboards.
 * Players in multiple leagues get more confident scores; those in fewer leagues
 * are regressed toward the global mean.
 *
 * Formula: weightedScore = (rawAverage * confidence) + (globalMean * (1 - confidence))
 */
import { supabaseAdmin } from '../config/supabase.js';
/**
 * Calculate confidence factor based on number of leagues
 * Steeper penalty for small sample sizes:
 * - 1 league: 33% weight
 * - 2 leagues: 55% weight
 * - 3 leagues: 70% weight
 * - 4+ leagues: asymptotically approaches 100%
 */
function calculateConfidence(leagueCount) {
    if (leagueCount === 1)
        return 0.33;
    if (leagueCount === 2)
        return 0.55;
    if (leagueCount === 3)
        return 0.70;
    return 1 - (1 / (leagueCount + 1));
}
/**
 * Calculate global mean score across all players
 */
async function calculateGlobalMean(seasonId) {
    const { data, error } = await supabaseAdmin
        .from('league_members')
        .select(`
      total_points,
      leagues!inner(season_id)
    `)
        .eq('leagues.season_id', seasonId);
    if (error)
        throw new Error(`Failed to fetch scores: ${error.message}`);
    if (!data || data.length === 0)
        return 25; // Fallback default
    const total = data.reduce((sum, row) => sum + (row.total_points || 0), 0);
    return total / data.length;
}
/**
 * Get weighted rankings for a specific season
 */
export async function getWeightedRankings(seasonId) {
    // Fetch all player scores for the season with user info
    const { data: scores, error } = await supabaseAdmin
        .from('league_members')
        .select(`
      user_id,
      users!inner(display_name, avatar_url),
      league_id,
      total_points,
      leagues!inner(season_id)
    `)
        .eq('leagues.season_id', seasonId);
    if (error)
        throw new Error(`Failed to fetch scores: ${error.message}`);
    if (!scores || scores.length === 0)
        return [];
    // Calculate dynamic global mean
    const globalMean = await calculateGlobalMean(seasonId);
    // Group scores by player
    const playerScores = new Map();
    for (const row of scores) {
        const userId = row.user_id;
        const user = row.users;
        const displayName = user?.display_name || 'Unknown';
        const avatarUrl = user?.avatar_url || null;
        const points = row.total_points || 0;
        if (!playerScores.has(userId)) {
            playerScores.set(userId, {
                displayName,
                avatarUrl,
                scores: [],
                totalPoints: 0,
            });
        }
        const playerData = playerScores.get(userId);
        playerData.scores.push(points);
        playerData.totalPoints += points;
    }
    // Calculate weighted rankings
    const rankings = [];
    for (const [userId, data] of playerScores) {
        const leagueCount = data.scores.length;
        const rawAverage = data.scores.reduce((a, b) => a + b, 0) / leagueCount;
        const confidence = calculateConfidence(leagueCount);
        const weightedScore = (rawAverage * confidence) + (globalMean * (1 - confidence));
        rankings.push({
            userId,
            displayName: data.displayName,
            avatarUrl: data.avatarUrl,
            leagueCount,
            rawAverage: Math.round(rawAverage * 100) / 100,
            confidence: Math.round(confidence * 1000) / 1000,
            weightedScore: Math.round(weightedScore * 100) / 100,
            scores: data.scores,
            totalPoints: data.totalPoints,
        });
    }
    // Sort by weighted score descending
    rankings.sort((a, b) => b.weightedScore - a.weightedScore);
    return rankings;
}
/**
 * Get confidence indicator string for display
 */
export function getConfidenceIndicator(leagueCount) {
    if (leagueCount >= 5)
        return '✓✓✓';
    if (leagueCount >= 3)
        return '✓✓';
    if (leagueCount >= 2)
        return '✓';
    return '⚠️';
}
//# sourceMappingURL=weightedRankings.js.map