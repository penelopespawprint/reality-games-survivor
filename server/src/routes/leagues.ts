import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/authenticate.js';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { stripe } from '../config/stripe.js';

const router = Router();

// POST /api/leagues - Create a new league
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, season_id, password, donation_amount } = req.body;

    if (!name || !season_id) {
      return res.status(400).json({ error: 'Name and season_id are required' });
    }

    // Create league
    const { data: league, error } = await supabaseAdmin
      .from('leagues')
      .insert({
        name,
        season_id,
        commissioner_id: userId,
        password_hash: password || null, // TODO: Hash password
        require_donation: !!donation_amount,
        donation_amount: donation_amount || null,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Add commissioner as first member
    await supabaseAdmin
      .from('league_members')
      .insert({
        league_id: league.id,
        user_id: userId,
        draft_position: 1,
      });

    res.status(201).json({ league, invite_code: league.code });
  } catch (err) {
    console.error('POST /api/leagues error:', err);
    res.status(500).json({ error: 'Failed to create league' });
  }
});

// POST /api/leagues/:id/join - Join a league (free)
router.post('/:id/join', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const leagueId = req.params.id;
    const { password } = req.body;

    // Get league
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('*')
      .eq('id', leagueId)
      .single();

    if (leagueError || !league) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Check if league is closed to new members
    if (league.is_closed) {
      return res.status(403).json({ error: 'This league is closed to new members' });
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('league_members')
      .select('id')
      .eq('league_id', leagueId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Already a member of this league' });
    }

    // Check password if required
    if (league.password_hash && league.password_hash !== password) {
      return res.status(403).json({ error: 'Invalid password' });
    }

    // Check if donation required
    if (league.require_donation) {
      return res.status(402).json({
        error: 'Payment required',
        checkout_url: `/api/leagues/${leagueId}/join/checkout`,
      });
    }

    // Check max players
    const { count } = await supabase
      .from('league_members')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId);

    if (count && count >= (league.max_players || 12)) {
      return res.status(400).json({ error: 'League is full' });
    }

    // Add member
    const { data: membership, error } = await supabaseAdmin
      .from('league_members')
      .insert({
        league_id: leagueId,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ membership });
  } catch (err) {
    console.error('POST /api/leagues/:id/join error:', err);
    res.status(500).json({ error: 'Failed to join league' });
  }
});

// POST /api/leagues/:id/join/checkout - Create Stripe checkout session
router.post('/:id/join/checkout', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const leagueId = req.params.id;

    // Get league
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('*')
      .eq('id', leagueId)
      .single();

    if (leagueError || !league) {
      return res.status(404).json({ error: 'League not found' });
    }

    if (!league.require_donation || !league.donation_amount) {
      return res.status(400).json({ error: 'This league does not require payment' });
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${league.name} - League Entry`,
            description: league.donation_notes || 'League entry fee',
          },
          unit_amount: Math.round(league.donation_amount * 100),
        },
        quantity: 1,
      }],
      metadata: {
        league_id: leagueId,
        user_id: userId,
        type: 'league_donation',
      },
      success_url: `${baseUrl}/leagues/${leagueId}?joined=true`,
      cancel_url: `${baseUrl}/join/${league.code}?cancelled=true`,
    });

    res.json({ checkout_url: session.url, session_id: session.id });
  } catch (err) {
    console.error('POST /api/leagues/:id/join/checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// GET /api/leagues/:id/join/status - Check payment status
router.get('/:id/join/status', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const leagueId = req.params.id;

    // Check if member
    const { data: membership } = await supabase
      .from('league_members')
      .select('*')
      .eq('league_id', leagueId)
      .eq('user_id', userId)
      .single();

    res.json({ paid: !!membership, membership });
  } catch (err) {
    console.error('GET /api/leagues/:id/join/status error:', err);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// POST /api/leagues/:id/leave - Leave a league
router.post('/:id/leave', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const leagueId = req.params.id;

    // Get league to check draft status
    const { data: league } = await supabase
      .from('leagues')
      .select('draft_status, commissioner_id')
      .eq('id', leagueId)
      .single();

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    if (league.commissioner_id === userId) {
      return res.status(400).json({ error: 'Commissioner cannot leave their own league' });
    }

    // Check if eligible for refund (before draft)
    let refund = null;
    if (league.draft_status === 'pending') {
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('league_id', leagueId)
        .eq('user_id', userId)
        .eq('status', 'completed')
        .single();

      if (payment && payment.stripe_payment_intent_id) {
        // Issue refund
        const stripeRefund = await stripe.refunds.create({
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
    }

    // Remove membership
    const { error } = await supabaseAdmin
      .from('league_members')
      .delete()
      .eq('league_id', leagueId)
      .eq('user_id', userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, refund });
  } catch (err) {
    console.error('POST /api/leagues/:id/leave error:', err);
    res.status(500).json({ error: 'Failed to leave league' });
  }
});

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

// GET /api/leagues/:id/invite-link - Get/regenerate invite
router.get('/:id/invite-link', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leagueId = req.params.id;
    const userId = req.user!.id;

    const { data: league, error } = await supabase
      .from('leagues')
      .select('code, commissioner_id')
      .eq('id', leagueId)
      .single();

    if (error || !league) {
      return res.status(404).json({ error: 'League not found' });
    }

    if (league.commissioner_id !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Only commissioner can access invite link' });
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';

    res.json({
      code: league.code,
      url: `${baseUrl}/join/${league.code}`,
    });
  } catch (err) {
    console.error('GET /api/leagues/:id/invite-link error:', err);
    res.status(500).json({ error: 'Failed to get invite link' });
  }
});

// PATCH /api/leagues/:id/settings - Update settings (commissioner only)
router.patch('/:id/settings', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leagueId = req.params.id;
    const userId = req.user!.id;
    const {
      name,
      description,
      password,
      donation_amount,
      payout_method,
      is_public,
      is_closed,
      max_players,
      donation_notes,
    } = req.body;

    // Check commissioner
    const { data: league } = await supabase
      .from('leagues')
      .select('commissioner_id, co_commissioners')
      .eq('id', leagueId)
      .single();

    const isCommissioner = league?.commissioner_id === userId ||
      ((league?.co_commissioners as string[]) || []).includes(userId);

    if (!league || (!isCommissioner && req.user!.role !== 'admin')) {
      return res.status(403).json({ error: 'Only commissioner can update settings' });
    }

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (password !== undefined) updates.password_hash = password || null;
    if (donation_amount !== undefined) {
      updates.donation_amount = donation_amount;
      updates.require_donation = !!donation_amount;
    }
    if (donation_notes !== undefined) updates.donation_notes = donation_notes;
    if (payout_method !== undefined) updates.payout_method = payout_method;
    if (is_public !== undefined) updates.is_public = is_public;
    if (is_closed !== undefined) updates.is_closed = is_closed;
    if (max_players !== undefined) updates.max_players = max_players;

    const { data, error } = await supabaseAdmin
      .from('leagues')
      .update(updates)
      .eq('id', leagueId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ league: data });
  } catch (err) {
    console.error('PATCH /api/leagues/:id/settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
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
      const stripeRefund = await stripe.refunds.create({
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
