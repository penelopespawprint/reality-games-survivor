import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/authenticate.js';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { EmailService } from '../emails/index.js';

const router = Router();

// Snake draft helper - calculates which player picks at a given pick number
function getSnakePickerIndex(pickNumber: number, totalMembers: number): { round: number; pickerIndex: number } {
  const round = Math.floor(pickNumber / totalMembers) + 1;
  const pickInRound = pickNumber % totalMembers;
  const pickerIndex = round % 2 === 1 ? pickInRound : totalMembers - 1 - pickInRound;
  return { round, pickerIndex };
}

// GET /api/leagues/:id/draft/state - Get draft state
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

    // Get existing picks
    const { data: picks } = await supabase
      .from('rosters')
      .select('user_id, castaway_id, draft_round, draft_pick')
      .eq('league_id', leagueId)
      .order('draft_pick', { ascending: true });

    // Get available castaways
    const { data: castaways } = await supabase
      .from('castaways')
      .select('*')
      .eq('season_id', league.season_id);

    const pickedCastawayIds = new Set(picks?.map((p) => p.castaway_id) || []);
    const available = castaways?.filter((c) => !pickedCastawayIds.has(c.id)) || [];

    const totalMembers = members?.length || 0;
    const totalPicks = picks?.length || 0;
    const { round: currentRound, pickerIndex } = getSnakePickerIndex(totalPicks, totalMembers);
    const draftOrder = league.draft_order || members?.map((m: any) => m.user_id) || [];
    const currentPickUserId = draftOrder[pickerIndex];

    // My picks
    const myPicks = picks?.filter((p) => p.user_id === userId) || [];

    res.json({
      status: league.draft_status,
      current_pick: totalPicks + 1,
      current_round: currentRound,
      current_picker: currentPickUserId,
      is_my_turn: currentPickUserId === userId,
      order: draftOrder.map((uid: string, idx: number) => {
        const member = members?.find((m: any) => m.user_id === uid);
        return {
          user_id: uid,
          position: idx + 1,
          display_name: (member as any)?.users?.display_name || 'Unknown',
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
      })),
    });
  } catch (err) {
    console.error('GET /api/leagues/:id/draft/state error:', err);
    res.status(500).json({ error: 'Failed to fetch draft state' });
  }
});

// GET /api/leagues/:id/draft/order - Get draft order
router.get('/:id/draft/order', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leagueId = req.params.id;

    const { data: league } = await supabase
      .from('leagues')
      .select('draft_order')
      .eq('id', leagueId)
      .single();

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    const { data: members } = await supabase
      .from('league_members')
      .select('user_id, users(id, display_name)')
      .eq('league_id', leagueId);

    const order = (league.draft_order || []).map((uid: string, idx: number) => {
      const member = members?.find((m) => m.user_id === uid);
      return {
        user_id: uid,
        position: idx + 1,
        display_name: (member as any)?.users?.display_name || 'Unknown',
      };
    });

    res.json({ order });
  } catch (err) {
    console.error('GET /api/leagues/:id/draft/order error:', err);
    res.status(500).json({ error: 'Failed to fetch draft order' });
  }
});

// POST /api/leagues/:id/draft/pick - Make a draft pick
router.post('/:id/draft/pick', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leagueId = req.params.id;
    const userId = req.user!.id;
    const { castaway_id } = req.body;

    if (!castaway_id) {
      return res.status(400).json({ error: 'castaway_id is required' });
    }

    // Get league
    const { data: league } = await supabase
      .from('leagues')
      .select('*')
      .eq('id', leagueId)
      .single();

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    if (league.draft_status !== 'in_progress') {
      return res.status(400).json({ error: 'Draft is not in progress' });
    }

    // Get existing picks to determine current turn
    const { data: picks } = await supabase
      .from('rosters')
      .select('*')
      .eq('league_id', leagueId);

    const { data: members } = await supabase
      .from('league_members')
      .select('user_id')
      .eq('league_id', leagueId);

    const totalMembers = members?.length || 0;
    const totalPicks = picks?.length || 0;
    const { round: currentRound, pickerIndex } = getSnakePickerIndex(totalPicks, totalMembers);
    const draftOrder = league.draft_order || [];
    const currentPickUserId = draftOrder[pickerIndex];

    if (currentPickUserId !== userId) {
      return res.status(403).json({ error: 'Not your turn to pick' });
    }

    // Check castaway not already picked
    const alreadyPicked = picks?.some((p) => p.castaway_id === castaway_id);
    if (alreadyPicked) {
      return res.status(400).json({ error: 'Castaway already drafted' });
    }

    // Check user doesn't already have 2 castaways
    const userPicks = picks?.filter((p) => p.user_id === userId).length || 0;
    if (userPicks >= 2) {
      return res.status(400).json({ error: 'You already have 2 castaways' });
    }

    // Make the pick
    const { data: roster, error } = await supabaseAdmin
      .from('rosters')
      .insert({
        league_id: leagueId,
        user_id: userId,
        castaway_id,
        draft_round: currentRound,
        draft_pick: totalPicks + 1,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Check if draft is complete (all members have 2 picks)
    const newTotalPicks = totalPicks + 1;
    const isDraftComplete = newTotalPicks >= totalMembers * 2;

    if (isDraftComplete) {
      await supabaseAdmin
        .from('leagues')
        .update({
          draft_status: 'completed',
          draft_completed_at: new Date().toISOString(),
          status: 'active',
        })
        .eq('id', leagueId);

      // Send draft complete emails to all members (fire and forget)
      (async () => {
        try {
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
    } else {
      // Send draft pick confirmation email (fire and forget)
      (async () => {
        try {
          const { data: user } = await supabaseAdmin
            .from('users')
            .select('email, display_name')
            .eq('id', userId)
            .single();

          const { data: castawayDetails } = await supabaseAdmin
            .from('castaways')
            .select('name')
            .eq('id', castaway_id)
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
              pickNumber: totalPicks + 1,
              totalRounds: 2,
            });

            await EmailService.logNotification(
              userId,
              'email',
              `Draft pick: ${castawayDetails.name}`,
              `Round ${currentRound} pick confirmed.`
            );
          }
        } catch (emailErr) {
          console.error('Failed to send draft pick confirmation email:', emailErr);
        }
      })();
    }

    // Calculate next pick
    const { round: nextRound, pickerIndex: nextPickerIndex } = getSnakePickerIndex(newTotalPicks, totalMembers);
    const nextPickUserId = draftOrder[nextPickerIndex];

    res.json({
      roster_entry: roster,
      draft_complete: isDraftComplete,
      next_pick: isDraftComplete ? null : {
        pick_number: newTotalPicks + 1,
        round: nextRound,
        user_id: nextPickUserId,
      },
    });
  } catch (err) {
    console.error('POST /api/leagues/:id/draft/pick error:', err);
    res.status(500).json({ error: 'Failed to make draft pick' });
  }
});

// POST /api/leagues/:id/draft/set-order - Set or randomize draft order
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

    let draftOrder: string[];

    if (randomize) {
      // Shuffle members
      const memberIds = members?.map((m) => m.user_id) || [];
      draftOrder = memberIds.sort(() => Math.random() - 0.5);
    } else if (order && Array.isArray(order)) {
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

// POST /api/draft/finalize-all - Auto-complete all incomplete drafts (system/cron)
router.post('/finalize-all', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get all leagues with incomplete drafts past deadline
    const { data: leagues } = await supabaseAdmin
      .from('leagues')
      .select('*, seasons(*)')
      .eq('draft_status', 'in_progress');

    if (!leagues || leagues.length === 0) {
      return res.json({ finalized_leagues: 0, auto_picks: 0 });
    }

    let totalAutoPicks = 0;
    const finalizedLeagues: string[] = [];

    for (const league of leagues) {
      const season = (league as any).seasons;
      const deadline = new Date(season.draft_deadline);

      if (new Date() < deadline) continue;

      // Get existing picks and members
      const { data: picks } = await supabaseAdmin
        .from('rosters')
        .select('*')
        .eq('league_id', league.id);

      const { data: members } = await supabaseAdmin
        .from('league_members')
        .select('user_id')
        .eq('league_id', league.id);

      // Get available castaways
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

      // Auto-pick remaining
      while (currentPicks < totalMembers * 2 && available.length > 0) {
        const { round: currentRound, pickerIndex } = getSnakePickerIndex(currentPicks, totalMembers);
        const pickerId = draftOrder[pickerIndex];
        const castaway = available.shift()!;

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
    }

    res.json({
      finalized_leagues: finalizedLeagues.length,
      auto_picks: totalAutoPicks,
    });
  } catch (err) {
    console.error('POST /api/draft/finalize-all error:', err);
    res.status(500).json({ error: 'Failed to finalize drafts' });
  }
});

export default router;
