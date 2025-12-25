import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { authenticate, AuthenticatedRequest } from '../middleware/authenticate.js';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { stripe } from '../config/stripe.js';
import { EmailService } from '../emails/index.js';
import { joinLimiter, checkoutLimiter } from '../config/rateLimit.js';
import {
  validate,
  createLeagueSchema,
  joinLeagueSchema,
  updateLeagueSettingsSchema,
  uuidSchema,
} from '../lib/validation.js';

const SALT_ROUNDS = 10;

const router = Router();

// POST /api/leagues - Create a new league
router.post('/', authenticate, validate(createLeagueSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, season_id, password, donation_amount } = req.body;
    const { max_players, is_public } = req.body; // Optional fields not in schema

    // Hash password if provided
    let hashedPassword: string | null = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    }

    // Create league
    const { data: league, error } = await supabaseAdmin
      .from('leagues')
      .insert({
        name,
        season_id,
        commissioner_id: userId,
        password_hash: hashedPassword,
        require_donation: !!donation_amount,
        donation_amount: donation_amount || null,
        max_players: max_players || 12,
        is_public: is_public !== false,
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

    // Send league created email
    try {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('email, display_name')
        .eq('id', userId)
        .single();

      const { data: season } = await supabaseAdmin
        .from('seasons')
        .select('name, registration_closes_at, premiere_at, draft_deadline')
        .eq('id', season_id)
        .single();

      if (user && season) {
        await EmailService.sendLeagueCreated({
          displayName: user.display_name,
          email: user.email,
          leagueName: league.name,
          leagueCode: league.code,
          seasonName: season.name,
          registrationCloses: new Date(season.registration_closes_at),
          premiereDate: new Date(season.premiere_at),
          draftDeadline: new Date(season.draft_deadline),
        });
      }
    } catch (emailErr) {
      console.error('Failed to send league created email:', emailErr);
      // Don't fail the request if email fails
    }

    res.status(201).json({ league, invite_code: league.code });
  } catch (err) {
    console.error('POST /api/leagues error:', err);
    res.status(500).json({ error: 'Failed to create league' });
  }
});

// POST /api/leagues/:id/join - Join a league (free)
// Rate limited to prevent password brute-forcing (10 attempts per 15 min)
router.post('/:id/join', authenticate, joinLimiter, validate(joinLeagueSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const leagueId = req.params.id;

    // Validate UUID format
    const uuidResult = uuidSchema.safeParse(leagueId);
    if (!uuidResult.success) {
      return res.status(400).json({ error: 'Invalid league ID format' });
    }

    const { password } = req.body;

    // Get league - use admin client to bypass RLS (user isn't a member yet)
    const { data: league, error: leagueError } = await supabaseAdmin
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

    // Check if already a member - use admin client
    const { data: existing } = await supabaseAdmin
      .from('league_members')
      .select('id')
      .eq('league_id', leagueId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Already a member of this league' });
    }

    // Check password if required
    if (league.password_hash) {
      if (!password) {
        return res.status(403).json({ error: 'Password required to join this league' });
      }
      const passwordValid = await bcrypt.compare(password, league.password_hash);
      if (!passwordValid) {
        return res.status(403).json({ error: 'Invalid password' });
      }
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

    // Send league joined email
    try {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('email, display_name')
        .eq('id', userId)
        .single();

      const { data: leagueWithSeason } = await supabaseAdmin
        .from('leagues')
        .select('name, max_players, seasons(name, premiere_at, draft_deadline)')
        .eq('id', leagueId)
        .single();

      const { count: memberCount } = await supabaseAdmin
        .from('league_members')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', leagueId);

      // First pick is Episode 2 (week after premiere)
      const season = (leagueWithSeason as any)?.seasons;
      const premiereDate = new Date(season?.premiere_at);
      const firstPickDue = new Date(premiereDate);
      firstPickDue.setDate(firstPickDue.getDate() + 7);
      firstPickDue.setHours(15, 0, 0, 0); // Wed 3pm PST

      if (user && leagueWithSeason && season) {
        await EmailService.sendLeagueJoined({
          displayName: user.display_name,
          email: user.email,
          leagueName: leagueWithSeason.name,
          leagueId: leagueId,
          seasonName: season.name,
          memberCount: memberCount || 1,
          maxMembers: leagueWithSeason.max_players || 12,
          premiereDate: premiereDate,
          draftDeadline: new Date(season.draft_deadline),
          firstPickDue: firstPickDue,
        });
      }
    } catch (emailErr) {
      console.error('Failed to send league joined email:', emailErr);
    }

    res.status(201).json({ membership });
  } catch (err) {
    console.error('POST /api/leagues/:id/join error:', err);
    res.status(500).json({ error: 'Failed to join league' });
  }
});

// POST /api/leagues/:id/join/checkout - Create Stripe checkout session
// Rate limited to prevent checkout session abuse (10 per hour)
router.post('/:id/join/checkout', authenticate, checkoutLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const leagueId = req.params.id;

    // Get league - use admin client to bypass RLS (user might not be a member yet)
    const { data: league, error: leagueError } = await supabaseAdmin
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

    // Check if member - use admin to bypass RLS
    const { data: membership } = await supabaseAdmin
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

// GET /api/leagues/code/:code - Get league by invite code (public)
router.get('/code/:code', async (req, res: Response) => {
  try {
    const code = req.params.code.toUpperCase();

    // Get league - use admin to bypass RLS (anyone with code can view basic info)
    const { data: league, error } = await supabaseAdmin
      .from('leagues')
      .select(`
        id,
        name,
        code,
        max_players,
        require_donation,
        donation_amount,
        donation_notes,
        status,
        is_closed,
        password_hash,
        seasons (number, name)
      `)
      .eq('code', code)
      .single();

    if (error || !league) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Get member count
    const { count } = await supabaseAdmin
      .from('league_members')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', league.id);

    // Don't expose password_hash, just indicate if password required
    const { password_hash, ...leagueData } = league;

    res.json({
      league: {
        ...leagueData,
        has_password: !!password_hash,
        member_count: count || 0,
      },
    });
  } catch (err) {
    console.error('GET /api/leagues/code/:code error:', err);
    res.status(500).json({ error: 'Failed to fetch league' });
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
router.patch('/:id/settings', authenticate, validate(updateLeagueSettingsSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leagueId = req.params.id;
    const userId = req.user!.id;

    // Validate UUID format
    const uuidResult = uuidSchema.safeParse(leagueId);
    if (!uuidResult.success) {
      return res.status(400).json({ error: 'Invalid league ID format' });
    }

    const {
      name,
      password,
      donation_amount,
      payout_method,
      is_public,
      donation_notes,
    } = req.body;
    const { description, is_closed, max_players } = req.body; // Fields not in schema

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
    if (password !== undefined) {
      // Hash password before storing (null to remove password)
      updates.password_hash = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;
    }
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

// GET /api/global-leaderboard - Global leaderboard with Bayesian weighted average
router.get('/global-leaderboard', async (req, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    // Confidence factor for Bayesian weighted average
    // With C=1, players at 1 league get 50% weight, 2 leagues get 67%, 3 leagues get 75%
    const CONFIDENCE_FACTOR = 1;

    // Get all league members with user info
    const { data: members, error } = await supabaseAdmin
      .from('league_members')
      .select(`
        user_id,
        total_points,
        league_id,
        users (id, display_name, avatar_url)
      `);

    if (error) throw error;

    // Get rosters to check for eliminated castaways
    const { data: rosters } = await supabaseAdmin
      .from('rosters')
      .select(`
        user_id,
        castaway:castaways (id, status)
      `)
      .is('dropped_at', null);

    // Get active season
    const { data: activeSeason } = await supabaseAdmin
      .from('seasons')
      .select('id, number, name')
      .eq('is_active', true)
      .single();

    // Build player stats map
    const playerMap = new Map<string, {
      displayName: string;
      avatarUrl: string | null;
      totalPoints: number;
      leagueCount: number;
      hasEliminatedCastaway: boolean;
    }>();

    // Aggregate member data
    members?.forEach((member: any) => {
      const userId = member.user_id;
      const existing = playerMap.get(userId);

      if (existing) {
        existing.totalPoints += member.total_points || 0;
        existing.leagueCount += 1;
      } else {
        playerMap.set(userId, {
          displayName: member.users?.display_name || 'Unknown',
          avatarUrl: member.users?.avatar_url || null,
          totalPoints: member.total_points || 0,
          leagueCount: 1,
          hasEliminatedCastaway: false,
        });
      }
    });

    // Check for eliminated castaways per user
    rosters?.forEach((roster: any) => {
      const userId = roster.user_id;
      const player = playerMap.get(userId);
      if (player && roster.castaway?.status === 'eliminated') {
        player.hasEliminatedCastaway = true;
      }
    });

    // Convert to array and calculate averages
    const statsRaw = Array.from(playerMap.entries()).map(([userId, data]) => ({
      userId,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
      totalPoints: data.totalPoints,
      leagueCount: data.leagueCount,
      averagePoints: data.leagueCount > 0 ? Math.round(data.totalPoints / data.leagueCount) : 0,
      hasEliminatedCastaway: data.hasEliminatedCastaway,
    }));

    // Calculate global average for Bayesian weighting
    const totalAllPoints = statsRaw.reduce((sum, p) => sum + p.totalPoints, 0);
    const totalAllLeagues = statsRaw.reduce((sum, p) => sum + p.leagueCount, 0);
    const globalAverage = totalAllLeagues > 0 ? totalAllPoints / totalAllLeagues : 0;

    // Apply Bayesian weighted average and sort
    const allStats = statsRaw.map(p => ({
      ...p,
      weightedScore: Math.round(
        (p.averagePoints * p.leagueCount + globalAverage * CONFIDENCE_FACTOR) /
        (p.leagueCount + CONFIDENCE_FACTOR)
      ),
    })).sort((a, b) => b.weightedScore - a.weightedScore);

    // Apply pagination
    const paginatedStats = allStats.slice(offset, offset + limit);

    // Summary stats
    const totalPlayers = allStats.length;
    const topScore = allStats.length > 0 ? allStats[0].weightedScore : 0;
    const activeTorches = allStats.filter(p => !p.hasEliminatedCastaway).length;

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
  } catch (err) {
    console.error('GET /api/global-leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch global leaderboard' });
  }
});

export default router;
