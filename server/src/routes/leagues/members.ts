/**
 * League Member Routes
 *
 * Handles member management, standings, and ownership transfer
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate.js';
import { supabase, supabaseAdmin } from '../../config/supabase.js';
import { requireStripe } from '../../config/stripe.js';

const router = Router();

// GET /api/leagues/:id/standings - Calculated standings
router.get('/:id/standings', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leagueId = req.params.id;

    const { data: members, error } = await supabase
      .from('league_members')
      .select(`
        user_id,
        total_points,
        rank,
        users (
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('league_id', leagueId)
      .order('total_points', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const standings = members?.map((m: any, idx: number) => ({
      user: m.users,
      rank: idx + 1,
      points: m.total_points || 0,
      movement: 0, // TODO: Calculate from previous week
    }));

    res.json({ standings });
  } catch (err) {
    console.error('GET /api/leagues/:id/standings error:', err);
    res.status(500).json({ error: 'Failed to fetch standings' });
  }
});

// GET /api/leagues/:id/members - Get league members
router.get('/:id/members', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leagueId = req.params.id;

    const { data: members, error } = await supabase
      .from('league_members')
      .select(`
        id,
        user_id,
        draft_position,
        total_points,
        rank,
        joined_at,
        users (
          id,
          display_name,
          email,
          avatar_url
        )
      `)
      .eq('league_id', leagueId)
      .order('draft_position', { ascending: true, nullsFirst: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Get commissioner info
    const { data: league } = await supabase
      .from('leagues')
      .select('commissioner_id, co_commissioners')
      .eq('id', leagueId)
      .single();

    const formattedMembers = members?.map((m: any) => ({
      ...m,
      is_commissioner: m.user_id === league?.commissioner_id,
      is_co_commissioner: ((league?.co_commissioners as string[]) || []).includes(m.user_id),
    }));

    res.json({ members: formattedMembers });
  } catch (err) {
    console.error('GET /api/leagues/:id/members error:', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// DELETE /api/leagues/:id/members/:userId - Remove a member (commissioner only)
router.delete('/:id/members/:userId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leagueId = req.params.id;
    const targetUserId = req.params.userId;
    const userId = req.user!.id;

    // Check commissioner
    const { data: league } = await supabase
      .from('leagues')
      .select('commissioner_id, co_commissioners, draft_status')
      .eq('id', leagueId)
      .single();

    const isCommissioner = league?.commissioner_id === userId ||
      ((league?.co_commissioners as string[]) || []).includes(userId);

    if (!league || (!isCommissioner && req.user!.role !== 'admin')) {
      return res.status(403).json({ error: 'Only commissioner can remove members' });
    }

    // Can't remove the commissioner
    if (targetUserId === league.commissioner_id) {
      return res.status(400).json({ error: 'Cannot remove the league commissioner' });
    }

    // Can't remove co-commissioners (must demote first)
    if (((league.co_commissioners as string[]) || []).includes(targetUserId)) {
      return res.status(400).json({ error: 'Remove co-commissioner status first' });
    }

    // Remove membership
    const { error } = await supabaseAdmin
      .from('league_members')
      .delete()
      .eq('league_id', leagueId)
      .eq('user_id', targetUserId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Also remove their roster and picks if before draft completes
    if (league.draft_status !== 'completed') {
      await supabaseAdmin
        .from('rosters')
        .delete()
        .eq('league_id', leagueId)
        .eq('user_id', targetUserId);

      await supabaseAdmin
        .from('weekly_picks')
        .delete()
        .eq('league_id', leagueId)
        .eq('user_id', targetUserId);
    }

    // Issue refund if applicable
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('league_id', leagueId)
      .eq('user_id', targetUserId)
      .eq('status', 'completed')
      .single();

    let refund = null;
    if (payment && payment.stripe_payment_intent_id && league.draft_status === 'pending') {
      const stripeRefund = await requireStripe().refunds.create({
        payment_intent: payment.stripe_payment_intent_id,
      });

      await supabaseAdmin
        .from('payments')
        .update({
          status: 'refunded',
          stripe_refund_id: stripeRefund.id,
          refunded_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      refund = { amount: payment.amount };
    }

    res.json({ success: true, refund });
  } catch (err) {
    console.error('DELETE /api/leagues/:id/members/:userId error:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// POST /api/leagues/:id/transfer - Transfer ownership to another member
router.post('/:id/transfer', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leagueId = req.params.id;
    const userId = req.user!.id;
    const { new_commissioner_id } = req.body;

    if (!new_commissioner_id) {
      return res.status(400).json({ error: 'new_commissioner_id is required' });
    }

    // Check commissioner (only main commissioner can transfer)
    const { data: league } = await supabase
      .from('leagues')
      .select('commissioner_id')
      .eq('id', leagueId)
      .single();

    if (!league || league.commissioner_id !== userId) {
      return res.status(403).json({ error: 'Only the commissioner can transfer ownership' });
    }

    // Check new commissioner is a member
    const { data: newCommissioner } = await supabase
      .from('league_members')
      .select('user_id')
      .eq('league_id', leagueId)
      .eq('user_id', new_commissioner_id)
      .single();

    if (!newCommissioner) {
      return res.status(400).json({ error: 'New commissioner must be a league member' });
    }

    // Transfer ownership
    const { data, error } = await supabaseAdmin
      .from('leagues')
      .update({
        commissioner_id: new_commissioner_id,
        co_commissioners: [],
      })
      .eq('id', leagueId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ league: data, message: 'Ownership transferred successfully' });
  } catch (err) {
    console.error('POST /api/leagues/:id/transfer error:', err);
    res.status(500).json({ error: 'Failed to transfer ownership' });
  }
});

export default router;
