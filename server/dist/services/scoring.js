/**
 * Scoring Service
 *
 * Business logic for scoring operations.
 * Routes handle HTTP concerns; this service handles domain logic.
 */
import { supabase, supabaseAdmin } from '../config/supabase.js';
// ============================================================================
// Service Functions
// ============================================================================
/**
 * Start or resume a scoring session
 */
export async function startScoringSession(episodeId) {
    const { data: episode } = await supabase
        .from('episodes')
        .select('*, seasons(*)')
        .eq('id', episodeId)
        .single();
    if (!episode) {
        return { error: 'Episode not found', status: 404 };
    }
    // Check if session already exists
    const { data: existingSession } = await supabase
        .from('scoring_sessions')
        .select('*')
        .eq('episode_id', episodeId)
        .single();
    if (existingSession) {
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
        const { data: scores } = await supabase
            .from('episode_scores')
            .select('*')
            .eq('episode_id', episodeId);
        return {
            data: {
                session: existingSession,
                castaways: castaways || [],
                rules: rules || [],
                scores: scores || [],
            },
        };
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
        return { error: error.message, status: 400 };
    }
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
    return {
        data: {
            session,
            castaways: castaways || [],
            rules: rules || [],
            scores: [],
        },
    };
}
/**
 * Save scoring progress
 * Supports both individual score updates and bulk saves for a castaway.
 * Auto-creates scoring session if needed.
 */
export async function saveScores(episodeId, userId, scores) {
    if (!Array.isArray(scores)) {
        return { error: 'scores must be an array', status: 400 };
    }
    // Check episode exists and isn't finalized
    const { data: episode } = await supabase
        .from('episodes')
        .select('id, season_id, is_scored')
        .eq('id', episodeId)
        .single();
    if (!episode) {
        return { error: 'Episode not found', status: 404 };
    }
    if (episode.is_scored) {
        return { error: 'Episode scoring is already finalized', status: 400 };
    }
    // Auto-create scoring session if needed
    const { data: existingSession } = await supabase
        .from('scoring_sessions')
        .select('id, status')
        .eq('episode_id', episodeId)
        .single();
    if (existingSession?.status === 'finalized') {
        return { error: 'Session is already finalized', status: 400 };
    }
    if (!existingSession) {
        await supabaseAdmin
            .from('scoring_sessions')
            .insert({
            episode_id: episodeId,
            status: 'draft',
        });
    }
    // Get unique castaways being scored to handle bulk saves
    const castawayIds = [...new Set(scores.map(s => s.castaway_id).filter(Boolean))];
    // For each castaway, delete existing scores and insert new ones (atomic per castaway)
    for (const castawayId of castawayIds) {
        const castawayScores = scores.filter(s => s.castaway_id === castawayId);
        // Delete existing scores for this castaway/episode
        await supabaseAdmin
            .from('episode_scores')
            .delete()
            .eq('episode_id', episodeId)
            .eq('castaway_id', castawayId);
        // Insert new scores with quantity > 0
        const scoresToInsert = [];
        for (const score of castawayScores) {
            const { scoring_rule_id, quantity } = score;
            if (!scoring_rule_id || quantity <= 0)
                continue;
            // Get rule to calculate points
            const { data: rule } = await supabase
                .from('scoring_rules')
                .select('points')
                .eq('id', scoring_rule_id)
                .single();
            if (!rule)
                continue;
            scoresToInsert.push({
                episode_id: episodeId,
                castaway_id: castawayId,
                scoring_rule_id,
                quantity,
                points: rule.points * quantity,
                entered_by: userId,
            });
        }
        if (scoresToInsert.length > 0) {
            const { error } = await supabaseAdmin
                .from('episode_scores')
                .insert(scoresToInsert);
            if (error) {
                console.error('Error inserting scores:', error);
                return { error: 'Failed to save scores', status: 500 };
            }
        }
    }
    return { data: { saved: scores.filter(s => s.quantity > 0).length } };
}
/**
 * Get scoring completeness status
 */
export async function getScoringStatus(episodeId) {
    const { data: episode } = await supabase
        .from('episodes')
        .select('id, is_scored')
        .eq('id', episodeId)
        .single();
    if (!episode) {
        return { error: 'Episode not found', status: 404 };
    }
    const { data: completeness, error: rpcError } = await supabaseAdmin.rpc('check_scoring_completeness', {
        p_episode_id: episodeId,
    });
    if (rpcError) {
        console.error('Check completeness RPC error:', rpcError);
        return { error: 'Failed to check scoring status', status: 500 };
    }
    const status = Array.isArray(completeness) ? completeness[0] : completeness;
    return {
        data: {
            is_complete: status.is_complete,
            total_castaways: status.total_castaways,
            scored_castaways: status.scored_castaways,
            unscored_castaway_ids: status.unscored_castaway_ids || [],
            unscored_castaway_names: status.unscored_castaway_names || [],
            is_finalized: episode.is_scored,
        },
    };
}
/**
 * Finalize scoring for an episode
 */
export async function finalizeScoring(episodeId, userId) {
    const { data: result, error: rpcError } = await supabaseAdmin.rpc('finalize_episode_scoring', {
        p_episode_id: episodeId,
        p_finalized_by: userId,
    });
    if (rpcError) {
        console.error('Finalize scoring RPC error:', rpcError);
        return { error: 'Failed to finalize scoring', status: 500 };
    }
    const finalizeResult = Array.isArray(result) ? result[0] : result;
    if (finalizeResult?.error_code) {
        const statusCode = finalizeResult.error_code === 'SESSION_NOT_FOUND' ? 404 : 400;
        return {
            error: finalizeResult.error_message,
            status: statusCode,
        };
    }
    return {
        data: {
            finalized: finalizeResult.finalized,
            eliminated: finalizeResult.eliminated_castaway_ids || [],
            standings_updated: finalizeResult.standings_updated,
        },
    };
}
/**
 * Get all scores for an episode
 */
export async function getEpisodeScores(episodeId) {
    // Check if scoring is finalized
    const { data: session } = await supabase
        .from('scoring_sessions')
        .select('status')
        .eq('episode_id', episodeId)
        .single();
    if (!session || session.status !== 'finalized') {
        return { error: 'Scores not yet available', status: 403 };
    }
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
    const totals = {};
    for (const score of scores || []) {
        const castawayId = score.castaways?.id;
        if (castawayId) {
            totals[castawayId] = (totals[castawayId] || 0) + score.points;
        }
    }
    return { data: { scores: scores || [], totals } };
}
/**
 * Get a castaway's scores for an episode
 */
export async function getCastawayScores(episodeId, castawayId) {
    // Check if scoring is finalized
    const { data: session } = await supabase
        .from('scoring_sessions')
        .select('status')
        .eq('episode_id', episodeId)
        .single();
    if (!session || session.status !== 'finalized') {
        return { error: 'Scores not yet available', status: 403 };
    }
    const { data: castaway } = await supabase
        .from('castaways')
        .select('*')
        .eq('id', castawayId)
        .single();
    if (!castaway) {
        return { error: 'Castaway not found', status: 404 };
    }
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
    return {
        data: {
            castaway,
            scores: scores || [],
            total,
        },
    };
}
/**
 * Recalculate all standings for a season
 */
export async function recalculateStandings(seasonId) {
    if (!seasonId) {
        return { error: 'season_id is required', status: 400 };
    }
    const { data: leagues } = await supabaseAdmin
        .from('leagues')
        .select('id')
        .eq('season_id', seasonId)
        .eq('status', 'active');
    if (!leagues || leagues.length === 0) {
        return { data: { recalculated_leagues: 0 } };
    }
    for (const league of leagues) {
        const { data: members } = await supabaseAdmin
            .from('league_members')
            .select('user_id')
            .eq('league_id', league.id);
        for (const member of members || []) {
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
                .eq('id', rankedMembers[i].id);
        }
    }
    return { data: { recalculated_leagues: leagues.length } };
}
//# sourceMappingURL=scoring.js.map