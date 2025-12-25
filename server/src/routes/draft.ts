import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/authenticate.js';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { EmailService } from '../emails/index.js';
import { secureShuffle } from '../utils/crypto.js';

const router = Router();

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

    // Get members with draft positions
    const { data: members } = await supabase
      .from('league_members')
      .select('user_id, draft_position, users(id, display_name)')
      .eq('league_id', leagueId)
      .order('draft_position', { ascending: true });

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
      .eq('league_id', leagueId)
      .order('draft_pick', { ascending: true });

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
      order: (league.draft_order || []).map((uid: string, idx: number) => {
        const member = members?.find((m: any) => m.user_id === uid);
        return {
          user_id: uid,
          position: idx + 1,
          display_name: (member as any)?.users?.display_name || 'Unknown',
          hasSubmittedRankings: submittedUserIds.has(uid),
        };
      }),
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

// POST /api/leagues/:id/draft/set-order - Set or randomize draft order (commissioner only)
router.post('/:id/draft/set-order', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leagueId = req.params.id;
    const userId = req.user!.id;
    const { order, randomize } = req.body;

    // Check commissioner
    const { data: league } = await supabase
      .from('leagues')
      .select('commissioner_id, draft_status')
      .eq('id', leagueId)
      .single();

    if (!league || (league.commissioner_id !== userId && req.user!.role !== 'admin')) {
      return res.status(403).json({ error: 'Only commissioner can set draft order' });
    }

    if (league.draft_status !== 'pending') {
      return res.status(400).json({ error: 'Cannot change order after draft starts' });
    }

    // Get members
    const { data: members } = await supabase
      .from('league_members')
      .select('user_id')
      .eq('league_id', leagueId);

    const memberIds = members?.map((m) => m.user_id) || [];
    let draftOrder: string[];

    if (randomize) {
      // Shuffle members using cryptographically secure random
      draftOrder = secureShuffle(memberIds);
    } else if (order && Array.isArray(order)) {
      // Validate custom order matches league members exactly
      if (order.length !== memberIds.length) {
        return res.status(400).json({
          error: `Order must contain exactly ${memberIds.length} members`,
        });
      }

      // Check for duplicates
      const orderSet = new Set(order);
      if (orderSet.size !== order.length) {
        return res.status(400).json({ error: 'Order contains duplicate user IDs' });
      }

      // Validate all IDs are strings (basic type check)
      if (!order.every((id) => typeof id === 'string' && id.length > 0)) {
        return res.status(400).json({ error: 'Order must contain valid user ID strings' });
      }

      // Validate all provided user_ids are league members
      const memberIdSet = new Set(memberIds);
      const invalidIds = order.filter((id: string) => !memberIdSet.has(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({
          error: 'Order contains users who are not league members',
        });
      }

      // Validate all league members are in the order
      const missingMembers = memberIds.filter((id) => !orderSet.has(id));
      if (missingMembers.length > 0) {
        return res.status(400).json({
          error: 'Order is missing some league members',
        });
      }

      draftOrder = order;
    } else {
      return res.status(400).json({ error: 'Must provide order array or randomize=true' });
    }

    // Update league
    const { error } = await supabaseAdmin
      .from('leagues')
      .update({ draft_order: draftOrder })
      .eq('id', leagueId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Update member draft positions
    for (let i = 0; i < draftOrder.length; i++) {
      await supabaseAdmin
        .from('league_members')
        .update({ draft_position: i + 1 })
        .eq('league_id', leagueId)
        .eq('user_id', draftOrder[i]);
    }

    res.json({ order: draftOrder });
  } catch (err) {
    console.error('POST /api/leagues/:id/draft/set-order error:', err);
    res.status(500).json({ error: 'Failed to set draft order' });
  }
});

// POST /api/draft/finalize-all - Process rankings and assign castaways (system/cron)
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

      // Get members in draft order
      const draftOrder = league.draft_order || [];
      if (draftOrder.length === 0) continue;

      const totalMembers = draftOrder.length;

      // Get all rankings for this season
      const { data: allRankings } = await supabaseAdmin
        .from('draft_rankings')
        .select('user_id, rankings')
        .eq('season_id', league.season_id);

      const rankingsMap = new Map<string, string[]>();
      for (const r of allRankings || []) {
        rankingsMap.set(r.user_id, r.rankings || []);
      }

      // Get all castaways
      const { data: castaways } = await supabaseAdmin
        .from('castaways')
        .select('id')
        .eq('season_id', league.season_id)
        .eq('status', 'active');

      const allCastawayIds = castaways?.map(c => c.id) || [];
      const assignedCastaways = new Set<string>();

      // Track assignments for this league
      const assignments: Array<{
        user_id: string;
        castaway_id: string;
        draft_round: number;
        draft_pick: number;
      }> = [];

      // Process 2 rounds in snake order
      for (let round = 1; round <= 2; round++) {
        // Snake: round 1 goes 1→N, round 2 goes N→1
        const orderForRound = round % 2 === 1
          ? draftOrder
          : [...draftOrder].reverse();

        for (let i = 0; i < orderForRound.length; i++) {
          const userId = orderForRound[i];
          const userRankings = rankingsMap.get(userId) || [];

          // Find first available castaway from user's rankings
          let assignedCastawayId: string | null = null;

          for (const castawayId of userRankings) {
            if (!assignedCastaways.has(castawayId)) {
              assignedCastawayId = castawayId;
              break;
            }
          }

          // If no ranked castaway available, pick first unassigned
          if (!assignedCastawayId) {
            for (const castawayId of allCastawayIds) {
              if (!assignedCastaways.has(castawayId)) {
                assignedCastawayId = castawayId;
                break;
              }
            }
          }

          if (assignedCastawayId) {
            assignedCastaways.add(assignedCastawayId);
            const pickNumber = (round - 1) * totalMembers + i + 1;

            assignments.push({
              user_id: userId,
              castaway_id: assignedCastawayId,
              draft_round: round,
              draft_pick: pickNumber,
            });
          }
        }
      }

      // Insert all roster assignments
      if (assignments.length > 0) {
        await supabaseAdmin.from('rosters').insert(
          assignments.map(a => ({
            league_id: league.id,
            user_id: a.user_id,
            castaway_id: a.castaway_id,
            draft_round: a.draft_round,
            draft_pick: a.draft_pick,
            acquired_via: 'draft',
          }))
        );

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
          const { data: members } = await supabaseAdmin
            .from('league_members')
            .select('user_id')
            .eq('league_id', league.id);

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

          for (const member of members || []) {
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
