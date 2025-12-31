/**
 * Draft Service
 *
 * Business logic for draft operations.
 * Routes handle HTTP concerns; this service handles domain logic.
 */
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { EmailService } from '../emails/index.js';
// ============================================================================
// Helpers
// ============================================================================
/**
 * Snake draft helper - calculates which player picks at a given pick number
 */
export function getSnakePickerIndex(pickNumber, totalMembers) {
    const round = Math.floor(pickNumber / totalMembers) + 1;
    const pickInRound = pickNumber % totalMembers;
    const pickerIndex = round % 2 === 1 ? pickInRound : totalMembers - 1 - pickInRound;
    return { round, pickerIndex };
}
// ============================================================================
// Service Functions
// ============================================================================
/**
 * Get the current draft state for a league
 */
export async function getDraftState(leagueId, userId) {
    const { data: league, error: leagueError } = await supabase
        .from('leagues')
        .select('*, seasons(*)')
        .eq('id', leagueId)
        .single();
    if (leagueError || !league) {
        return { error: 'League not found', status: 404 };
    }
    const { data: members } = await supabase
        .from('league_members')
        .select('user_id, draft_position, users(id, display_name)')
        .eq('league_id', leagueId)
        .order('draft_position', { ascending: true });
    const { data: picks } = await supabase
        .from('rosters')
        .select('user_id, castaway_id, draft_round, draft_pick')
        .eq('league_id', leagueId)
        .order('draft_pick', { ascending: true });
    const { data: castaways } = await supabase
        .from('castaways')
        .select('*')
        .eq('season_id', league.season_id);
    const pickedCastawayIds = new Set(picks?.map((p) => p.castaway_id) || []);
    const available = castaways?.filter((c) => !pickedCastawayIds.has(c.id)) || [];
    const totalMembers = members?.length || 0;
    const totalPicks = picks?.length || 0;
    const { round: currentRound, pickerIndex } = getSnakePickerIndex(totalPicks, totalMembers);
    const draftOrder = league.draft_order || members?.map((m) => m.user_id) || [];
    const currentPickUserId = draftOrder[pickerIndex];
    const myPicks = picks?.filter((p) => p.user_id === userId) || [];
    return {
        data: {
            status: league.draft_status,
            current_pick: totalPicks + 1,
            current_round: currentRound,
            current_picker: currentPickUserId,
            is_my_turn: currentPickUserId === userId,
            order: draftOrder.map((uid, idx) => {
                const member = members?.find((m) => m.user_id === uid);
                return {
                    user_id: uid,
                    position: idx + 1,
                    display_name: member?.users?.display_name || 'Unknown',
                };
            }),
            available,
            my_picks: myPicks.map((p) => ({
                castaway: castaways?.find((c) => c.id === p.castaway_id),
                round: p.draft_round,
                pick: p.draft_pick,
            })),
            picks: picks?.map((p) => ({
                user_id: p.user_id,
                castaway_id: p.castaway_id,
                round: p.draft_round,
                pick: p.draft_pick,
            })) || [],
        },
    };
}
/**
 * Get draft order for a league
 */
export async function getDraftOrder(leagueId) {
    const { data: league } = await supabase
        .from('leagues')
        .select('draft_order')
        .eq('id', leagueId)
        .single();
    if (!league) {
        return { error: 'League not found', status: 404 };
    }
    const { data: members } = await supabase
        .from('league_members')
        .select('user_id, users(id, display_name)')
        .eq('league_id', leagueId);
    const order = (league.draft_order || []).map((uid, idx) => {
        const member = members?.find((m) => m.user_id === uid);
        return {
            user_id: uid,
            position: idx + 1,
            display_name: member?.users?.display_name || 'Unknown',
        };
    });
    return { data: { order } };
}
/**
 * Make a draft pick
 */
export async function makeDraftPick(leagueId, userId, castawayId) {
    if (!castawayId) {
        return { error: 'castaway_id is required', status: 400 };
    }
    const { data: result, error: rpcError } = await supabaseAdmin.rpc('submit_draft_pick', {
        p_league_id: leagueId,
        p_user_id: userId,
        p_castaway_id: castawayId,
        p_idempotency_token: null,
    });
    if (rpcError) {
        console.error('Draft pick RPC error:', rpcError);
        return { error: 'Failed to submit draft pick', status: 500 };
    }
    const pickResult = Array.isArray(result) ? result[0] : result;
    if (pickResult?.error_code) {
        const statusCode = pickResult.error_code === 'LEAGUE_NOT_FOUND'
            ? 404
            : pickResult.error_code === 'NOT_YOUR_TURN'
                ? 403
                : 400;
        return { error: pickResult.error_message, status: statusCode };
    }
    const isDraftComplete = pickResult.is_draft_complete;
    const currentRound = pickResult.draft_round;
    const { data: league } = await supabaseAdmin
        .from('leagues')
        .select('*, season_id')
        .eq('id', leagueId)
        .single();
    sendDraftEmails(leagueId, userId, castawayId, isDraftComplete, currentRound, pickResult.draft_pick, league);
    return {
        data: {
            roster_id: pickResult.roster_id,
            draft_round: pickResult.draft_round,
            draft_pick: pickResult.draft_pick,
            draft_complete: isDraftComplete,
            next_picker: isDraftComplete ? null : pickResult.next_picker_user_id,
        },
    };
}
/**
 * Send draft-related emails (fire and forget)
 */
async function sendDraftEmails(leagueId, userId, castawayId, isDraftComplete, currentRound, draftPick, league) {
    try {
        if (isDraftComplete) {
            const { data: allMembers } = await supabaseAdmin
                .from('league_members')
                .select('user_id')
                .eq('league_id', leagueId);
            const { data: leagueDetails } = await supabaseAdmin
                .from('leagues')
                .select('name, seasons(premiere_at, draft_deadline)')
                .eq('id', leagueId)
                .single();
            const { data: allRosters } = await supabaseAdmin
                .from('rosters')
                .select('user_id, castaways(name, tribe_original)')
                .eq('league_id', leagueId);
            const { data: episodes } = await supabaseAdmin
                .from('episodes')
                .select('picks_lock_at')
                .eq('season_id', league.season_id)
                .order('number', { ascending: true })
                .limit(2);
            const firstPickDue = episodes?.[1]?.picks_lock_at
                ? new Date(episodes[1].picks_lock_at)
                : new Date();
            for (const member of allMembers || []) {
                const { data: user } = await supabaseAdmin
                    .from('users')
                    .select('email, display_name')
                    .eq('id', member.user_id)
                    .single();
                const memberRoster = allRosters?.filter((r) => r.user_id === member.user_id) || [];
                if (user && leagueDetails) {
                    await EmailService.sendDraftComplete({
                        displayName: user.display_name,
                        email: user.email,
                        leagueName: leagueDetails.name,
                        leagueId,
                        castaways: memberRoster.map((r) => ({
                            name: r.castaways?.name || 'Unknown',
                            tribe: r.castaways?.tribe_original || 'Unknown',
                        })),
                        premiereDate: new Date(leagueDetails.seasons?.premiere_at),
                        firstPickDue,
                    });
                }
            }
        }
        else {
            const { data: user } = await supabaseAdmin
                .from('users')
                .select('email, display_name')
                .eq('id', userId)
                .single();
            const { data: castawayDetails } = await supabaseAdmin
                .from('castaways')
                .select('name')
                .eq('id', castawayId)
                .single();
            const { data: leagueDetails } = await supabaseAdmin
                .from('leagues')
                .select('name')
                .eq('id', leagueId)
                .single();
            if (user && castawayDetails && leagueDetails) {
                await EmailService.sendDraftPickConfirmed({
                    displayName: user.display_name,
                    email: user.email,
                    castawayName: castawayDetails.name,
                    leagueName: leagueDetails.name,
                    leagueId,
                    round: currentRound,
                    pickNumber: draftPick,
                    totalRounds: 2,
                });
                await EmailService.logNotification(userId, 'email', `Draft pick: ${castawayDetails.name}`, `Round ${currentRound} pick confirmed.`);
            }
        }
    }
    catch (emailErr) {
        console.error('Failed to send draft emails:', emailErr);
    }
}
/**
 * Set or randomize draft order
 */
export async function setDraftOrder(leagueId, userId, isAdmin, order, randomize) {
    const { data: league } = await supabase
        .from('leagues')
        .select('commissioner_id, draft_status')
        .eq('id', leagueId)
        .single();
    if (!league || (league.commissioner_id !== userId && !isAdmin)) {
        return { error: 'Only commissioner can set draft order', status: 403 };
    }
    if (league.draft_status !== 'pending') {
        return { error: 'Cannot change order after draft starts', status: 400 };
    }
    const { data: members } = await supabase
        .from('league_members')
        .select('user_id')
        .eq('league_id', leagueId);
    let draftOrder;
    if (randomize) {
        const memberIds = members?.map((m) => m.user_id) || [];
        // Fisher-Yates shuffle for unbiased randomization
        draftOrder = [...memberIds];
        for (let i = draftOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [draftOrder[i], draftOrder[j]] = [draftOrder[j], draftOrder[i]];
        }
    }
    else if (order && Array.isArray(order)) {
        draftOrder = order;
    }
    else {
        return { error: 'Must provide order array or randomize=true', status: 400 };
    }
    const { error } = await supabaseAdmin
        .from('leagues')
        .update({ draft_order: draftOrder })
        .eq('id', leagueId);
    if (error) {
        return { error: error.message, status: 400 };
    }
    for (let i = 0; i < draftOrder.length; i++) {
        await supabaseAdmin
            .from('league_members')
            .update({ draft_position: i + 1 })
            .eq('league_id', leagueId)
            .eq('user_id', draftOrder[i]);
    }
    return { data: { order: draftOrder } };
}
/**
 * Auto-complete all incomplete drafts past deadline
 */
export async function finalizeAllDrafts() {
    const { data: leagues } = await supabaseAdmin
        .from('leagues')
        .select('*, seasons(*)')
        .eq('draft_status', 'in_progress');
    if (!leagues || leagues.length === 0) {
        return { data: { finalized_leagues: 0, auto_picks: 0 } };
    }
    let totalAutoPicks = 0;
    const finalizedLeagues = [];
    for (const league of leagues) {
        const season = league.seasons;
        const deadline = new Date(season.draft_deadline);
        if (new Date() < deadline)
            continue;
        const { data: picks } = await supabaseAdmin
            .from('rosters')
            .select('*')
            .eq('league_id', league.id);
        const { data: members } = await supabaseAdmin
            .from('league_members')
            .select('user_id')
            .eq('league_id', league.id);
        const { data: castaways } = await supabaseAdmin
            .from('castaways')
            .select('*')
            .eq('season_id', league.season_id)
            .eq('status', 'active');
        const pickedIds = new Set(picks?.map((p) => p.castaway_id) || []);
        const available = castaways?.filter((c) => !pickedIds.has(c.id)) || [];
        const totalMembers = members?.length || 0;
        let currentPicks = picks?.length || 0;
        const draftOrder = league.draft_order || [];
        while (currentPicks < totalMembers * 2 && available.length > 0) {
            const { round: currentRound, pickerIndex } = getSnakePickerIndex(currentPicks, totalMembers);
            const pickerId = draftOrder[pickerIndex];
            const castaway = available.shift();
            await supabaseAdmin.from('rosters').insert({
                league_id: league.id,
                user_id: pickerId,
                castaway_id: castaway.id,
                draft_round: currentRound,
                draft_pick: currentPicks + 1,
                acquired_via: 'auto_draft',
            });
            currentPicks++;
            totalAutoPicks++;
        }
        await supabaseAdmin
            .from('leagues')
            .update({
            draft_status: 'completed',
            draft_completed_at: new Date().toISOString(),
            status: 'active',
        })
            .eq('id', league.id);
        finalizedLeagues.push(league.id);
    }
    return {
        data: {
            finalized_leagues: finalizedLeagues.length,
            auto_picks: totalAutoPicks,
        },
    };
}
//# sourceMappingURL=draft.js.map