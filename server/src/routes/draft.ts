import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/authenticate.js';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { EmailService } from '../emails/index.js';

const router = Router();

// Types for draft assignment
interface RosterAssignment {
  league_id: string;
  user_id: string;
  castaway_id: string;
  draft_round: number;
  draft_pick: number;
  acquired_via: string;
}

/**
 * Assigns castaways to participants using a snake draft with unique picks.
 *
 * Normal case (players <= castaways/2):
 * - Round 1: Players 1→N pick in order, castaways removed from pool
 * - Round 2: Players N→1 pick in reverse, castaways removed from pool
 * - Each castaway can only be on ONE roster
 *
 * Overflow case (players > castaways/2, e.g. 13 players with 24 castaways):
 * - Round 1: Players 1→12 pick, castaways removed from pool
 * - Overflow: Player 13+ gets their top 2 from remaining pool (NOT removed, can overlap)
 * - Round 2: Players 12→1 pick in reverse, castaways removed from pool
 */
export function assignCastaways(
  leagueId: string,
  memberUserIds: string[],
  rankingsMap: Map<string, string[]>,
  allCastawayIds: string[]
): RosterAssignment[] {
  const assignments: RosterAssignment[] = [];
  const numCastaways = allCastawayIds.length;
  const maxRegularPlayers = Math.floor(numCastaways / 2);

  // Shuffle members for random draft order
  const draftOrder = [...memberUserIds].sort(() => Math.random() - 0.5);

  // Split into regular and overflow players
  const regularPlayers = draftOrder.slice(0, maxRegularPlayers);
  const overflowPlayers = draftOrder.slice(maxRegularPlayers);

  // Track available castaways
  const availablePool = new Set(allCastawayIds);

  let pickNumber = 0;

  // Helper to get user's top available pick from their rankings
  const getTopAvailable = (userId: string, pool: Set<string>): string | null => {
    const userRankings = rankingsMap.get(userId) || [];

    // Find highest-ranked castaway that's still available
    for (const castawayId of userRankings) {
      if (pool.has(castawayId)) {
        return castawayId;
      }
    }

    // Fallback: random from remaining pool
    if (pool.size > 0) {
      const poolArray = Array.from(pool);
      return poolArray[Math.floor(Math.random() * poolArray.length)];
    }

    return null;
  };

  // Helper to get user's top 2 from pool (for overflow, skipping already picked)
  const getTop2FromPool = (userId: string, pool: Set<string>): [string | null, string | null] => {
    const userRankings = rankingsMap.get(userId) || [];
    const picks: string[] = [];

    for (const castawayId of userRankings) {
      if (pool.has(castawayId) && !picks.includes(castawayId)) {
        picks.push(castawayId);
        if (picks.length === 2) break;
      }
    }

    // Fallback: random from pool if not enough rankings
    const poolArray = Array.from(pool);
    while (picks.length < 2 && poolArray.length > picks.length) {
      const remaining = poolArray.filter(c => !picks.includes(c));
      if (remaining.length === 0) break;
      picks.push(remaining[Math.floor(Math.random() * remaining.length)]);
    }

    return [picks[0] || null, picks[1] || null];
  };

  // Round 1: Regular players pick in order, castaways removed
  for (const userId of regularPlayers) {
    const castawayId = getTopAvailable(userId, availablePool);
    if (!castawayId) continue;

    pickNumber++;
    availablePool.delete(castawayId); // Remove from pool

    assignments.push({
      league_id: leagueId,
      user_id: userId,
      castaway_id: castawayId,
      draft_round: 1,
      draft_pick: pickNumber,
      acquired_via: 'draft',
    });
  }

  // Overflow players: Get their top 2 from remaining pool (NOT removed)
  for (const userId of overflowPlayers) {
    const [pick1, pick2] = getTop2FromPool(userId, availablePool);

    if (pick1) {
      pickNumber++;
      // Do NOT remove from pool - overflow picks can overlap
      assignments.push({
        league_id: leagueId,
        user_id: userId,
        castaway_id: pick1,
        draft_round: 1,
        draft_pick: pickNumber,
        acquired_via: 'draft',
      });
    }

    if (pick2) {
      pickNumber++;
      // Do NOT remove from pool
      assignments.push({
        league_id: leagueId,
        user_id: userId,
        castaway_id: pick2,
        draft_round: 2,
        draft_pick: pickNumber,
        acquired_via: 'draft',
      });
    }
  }

  // Round 2: Regular players pick in reverse order, castaways removed
  const reversedRegular = [...regularPlayers].reverse();
  for (const userId of reversedRegular) {
    const castawayId = getTopAvailable(userId, availablePool);
    if (!castawayId) continue;

    pickNumber++;
    availablePool.delete(castawayId); // Remove from pool

    assignments.push({
      league_id: leagueId,
      user_id: userId,
      castaway_id: castawayId,
      draft_round: 2,
      draft_pick: pickNumber,
      acquired_via: 'draft',
    });
  }

  return assignments;
}

// GET /api/leagues/:id/draft/state - Get draft state for a league
router.get('/:id/draft/state', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leagueId = req.params.id;
    const userId = req.user!.id;

    // Get league and draft info
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('*, seasons(*)')
      .eq('id', leagueId)
      .single();

    if (leagueError || !league) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Get members
    const { data: members } = await supabase
      .from('league_members')
      .select('user_id, users(id, display_name)')
      .eq('league_id', leagueId);

    // Get user's draft rankings for this season
    const { data: rankings } = await supabase
      .from('draft_rankings')
      .select('rankings, submitted_at')
      .eq('user_id', userId)
      .eq('season_id', league.season_id)
      .single();

    // Get existing roster assignments (if draft is complete)
    const { data: rosters } = await supabase
      .from('rosters')
      .select('user_id, castaway_id, draft_round, draft_pick, castaways(id, name, tribe_original)')
      .eq('league_id', leagueId);

    // Get all castaways for this season
    const { data: castaways } = await supabase
      .from('castaways')
      .select('*')
      .eq('season_id', league.season_id)
      .eq('status', 'active');

    const season = (league as any).seasons;
    const draftDeadline = season?.draft_deadline ? new Date(season.draft_deadline) : null;
    const now = new Date();
    const isBeforeDeadline = draftDeadline ? now < draftDeadline : false;

    // Calculate who has submitted rankings
    const { data: allRankings } = await supabase
      .from('draft_rankings')
      .select('user_id')
      .eq('season_id', league.season_id);

    const submittedUserIds = new Set(allRankings?.map(r => r.user_id) || []);

    res.json({
      status: league.draft_status,
      deadline: draftDeadline?.toISOString() || null,
      isBeforeDeadline,
      myRankings: rankings?.rankings || null,
      myRankingsSubmittedAt: rankings?.submitted_at || null,
      members: (members || []).map((m: any) => ({
        user_id: m.user_id,
        display_name: m.users?.display_name || 'Unknown',
        hasSubmittedRankings: submittedUserIds.has(m.user_id),
      })),
      castaways: castaways || [],
      rosters: rosters?.map((r: any) => ({
        user_id: r.user_id,
        castaway: r.castaways,
        round: r.draft_round,
        pick: r.draft_pick,
      })) || [],
      myRoster: rosters?.filter((r: any) => r.user_id === userId).map((r: any) => ({
        castaway: r.castaways,
        round: r.draft_round,
        pick: r.draft_pick,
      })) || [],
    });
  } catch (err) {
    console.error('GET /api/leagues/:id/draft/state error:', err);
    res.status(500).json({ error: 'Failed to fetch draft state' });
  }
});

// GET /api/draft/rankings - Get user's draft rankings for active season
router.get('/rankings', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get active season
    const { data: season } = await supabase
      .from('seasons')
      .select('id, draft_deadline')
      .eq('is_active', true)
      .single();

    if (!season) {
      return res.status(404).json({ error: 'No active season' });
    }

    // Get user's rankings
    const { data: rankings } = await supabase
      .from('draft_rankings')
      .select('rankings, submitted_at, updated_at')
      .eq('user_id', userId)
      .eq('season_id', season.id)
      .single();

    // Get all castaways for ranking
    const { data: castaways } = await supabase
      .from('castaways')
      .select('id, name, tribe_original, photo_url')
      .eq('season_id', season.id)
      .eq('status', 'active');

    res.json({
      rankings: rankings?.rankings || null,
      submittedAt: rankings?.submitted_at || null,
      updatedAt: rankings?.updated_at || null,
      deadline: season.draft_deadline,
      castaways: castaways || [],
    });
  } catch (err) {
    console.error('GET /api/draft/rankings error:', err);
    res.status(500).json({ error: 'Failed to fetch rankings' });
  }
});

// PUT /api/draft/rankings - Submit or update draft rankings
router.put('/rankings', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { rankings } = req.body;

    if (!rankings || !Array.isArray(rankings)) {
      return res.status(400).json({ error: 'rankings must be an array of castaway IDs' });
    }

    // Get active season
    const { data: season } = await supabase
      .from('seasons')
      .select('id, draft_deadline')
      .eq('is_active', true)
      .single();

    if (!season) {
      return res.status(404).json({ error: 'No active season' });
    }

    // Check deadline hasn't passed
    const now = new Date();
    const deadline = new Date(season.draft_deadline);
    if (now >= deadline) {
      return res.status(400).json({ error: 'Draft deadline has passed' });
    }

    // Validate rankings are valid castaway IDs
    const { data: castaways } = await supabase
      .from('castaways')
      .select('id')
      .eq('season_id', season.id)
      .eq('status', 'active');

    const validIds = new Set(castaways?.map(c => c.id) || []);

    // Check for duplicates
    const rankingsSet = new Set(rankings);
    if (rankingsSet.size !== rankings.length) {
      return res.status(400).json({ error: 'Rankings contain duplicate castaway IDs' });
    }

    // Validate all IDs
    const invalidIds = rankings.filter((id: string) => !validIds.has(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: 'Rankings contain invalid castaway IDs' });
    }

    // Upsert rankings
    const { data: result, error } = await supabaseAdmin
      .from('draft_rankings')
      .upsert({
        user_id: userId,
        season_id: season.id,
        rankings,
        submitted_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,season_id',
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      rankings: result.rankings,
      submittedAt: result.submitted_at,
      deadline: season.draft_deadline,
    });
  } catch (err) {
    console.error('PUT /api/draft/rankings error:', err);
    res.status(500).json({ error: 'Failed to save rankings' });
  }
});

// POST /api/draft/finalize-all - Process rankings and assign castaways (system/cron)
// Snake draft with unique picks - each castaway can only be on one roster per league
// Draft order is randomized, deadline is Tuesday before episode 2
router.post('/finalize-all', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get all leagues with pending drafts past deadline
    const { data: leagues } = await supabaseAdmin
      .from('leagues')
      .select('*, seasons(*)')
      .in('draft_status', ['pending', 'in_progress']);

    if (!leagues || leagues.length === 0) {
      return res.json({ finalized_leagues: 0, assignments: 0 });
    }

    let totalAssignments = 0;
    const finalizedLeagues: string[] = [];

    for (const league of leagues) {
      const season = (league as any).seasons;
      const deadline = new Date(season.draft_deadline);

      if (new Date() < deadline) continue;

      // Get all members
      const { data: members } = await supabaseAdmin
        .from('league_members')
        .select('user_id')
        .eq('league_id', league.id);

      if (!members || members.length === 0) continue;

      // Get all rankings for this season
      const { data: allRankings } = await supabaseAdmin
        .from('draft_rankings')
        .select('user_id, rankings')
        .eq('season_id', league.season_id);

      const rankingsMap = new Map<string, string[]>();
      for (const r of allRankings || []) {
        rankingsMap.set(r.user_id, r.rankings || []);
      }

      // Get all castaways (for fallback if no rankings)
      const { data: castaways } = await supabaseAdmin
        .from('castaways')
        .select('id')
        .eq('season_id', league.season_id)
        .eq('status', 'active');

      const allCastawayIds = castaways?.map(c => c.id) || [];

      // Assign castaways using the appropriate algorithm
      const assignments = assignCastaways(
        league.id,
        members.map(m => m.user_id),
        rankingsMap,
        allCastawayIds
      );

      // Insert all roster assignments
      if (assignments.length > 0) {
        await supabaseAdmin.from('rosters').insert(assignments);
        totalAssignments += assignments.length;
      }

      // Mark draft complete
      await supabaseAdmin
        .from('leagues')
        .update({
          draft_status: 'completed',
          draft_completed_at: new Date().toISOString(),
          status: 'active',
        })
        .eq('id', league.id);

      finalizedLeagues.push(league.id);

      // Send draft complete emails (fire and forget)
      (async () => {
        try {
          const { data: leagueDetails } = await supabaseAdmin
            .from('leagues')
            .select('name, seasons(premiere_at)')
            .eq('id', league.id)
            .single();

          const { data: allRosters } = await supabaseAdmin
            .from('rosters')
            .select('user_id, castaways(name, tribe_original)')
            .eq('league_id', league.id);

          const { data: episodes } = await supabaseAdmin
            .from('episodes')
            .select('picks_lock_at')
            .eq('season_id', league.season_id)
            .order('number', { ascending: true })
            .limit(2);

          const firstPickDue = episodes?.[1]?.picks_lock_at
            ? new Date(episodes[1].picks_lock_at)
            : new Date();

          for (const member of members) {
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
                leagueId: league.id,
                castaways: memberRoster.map((r: any) => ({
                  name: r.castaways?.name || 'Unknown',
                  tribe: r.castaways?.tribe_original || 'Unknown',
                })),
                premiereDate: new Date((leagueDetails as any).seasons?.premiere_at),
                firstPickDue,
              });
            }
          }
        } catch (emailErr) {
          console.error('Failed to send draft complete emails:', emailErr);
        }
      })();
    }

    res.json({
      finalized_leagues: finalizedLeagues.length,
      assignments: totalAssignments,
    });
  } catch (err) {
    console.error('POST /api/draft/finalize-all error:', err);
    res.status(500).json({ error: 'Failed to finalize drafts' });
  }
});

export default router;
