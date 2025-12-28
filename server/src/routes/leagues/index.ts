/**
 * League Routes Index
 *
 * Combines all league route modules into a single router.
 * Routes are organized by domain:
 * - Core CRUD (create, join, leave, settings) - in main file
 * - /join/checkout, /join/status - Payment handling (payments.ts)
 * - /standings, /members, /transfer - Member management (members.ts)
 * - /global-leaderboard - Cross-league rankings (leaderboard.ts)
 */

import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate.js';
import { supabase, supabaseAdmin } from '../../config/supabase.js';
import { requireStripe } from '../../config/stripe.js';
import { EmailService } from '../../emails/index.js';
import { joinLimiter } from '../../config/rateLimit.js';
import {
  validate,
  createLeagueSchema,
  joinLeagueSchema,
  updateLeagueSettingsSchema,
} from '../../lib/validation.js';

// Import modular routers
import paymentsRouter from './payments.js';
import membersRouter from './members.js';
import leaderboardRouter from './leaderboard.js';

const SALT_ROUNDS = 10;

const router = Router();

// Mount modular routers
router.use('/', paymentsRouter);
router.use('/', membersRouter);
router.use('/', leaderboardRouter);

// ============================================================================
// League Creation
// ============================================================================

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

    // SECURITY: Only add commissioner to free leagues immediately
    // For paid leagues, commissioner is added after payment via webhook
    if (!league.require_donation) {
      await supabaseAdmin
        .from('league_members')
        .insert({
          league_id: league.id,
          user_id: userId,
          draft_position: 1,
        });
    }

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

    // SECURITY: For paid leagues, redirect to checkout before adding commissioner
    if (league.require_donation) {
      const baseUrl = process.env.BASE_URL || 'http://localhost:5173';

      // Create Stripe checkout session for commissioner
      const session = await requireStripe().checkout.sessions.create({
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
          league_id: league.id,
          user_id: userId,
          type: 'league_donation',
        },
        success_url: `${baseUrl}/leagues/${league.id}?joined=true`,
        cancel_url: `${baseUrl}/leagues/${league.id}?cancelled=true`,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min expiration
      });

      // Record pending payment
      await supabaseAdmin.from('payments').insert({
        user_id: userId,
        league_id: league.id,
        amount: league.donation_amount,
        currency: 'usd',
        stripe_session_id: session.id,
        status: 'pending',
      });

      return res.status(201).json({
        league,
        invite_code: league.code,
        requires_payment: true,
        checkout_url: session.url,
        session_id: session.id
      });
    }

    res.status(201).json({ league, invite_code: league.code });
  } catch (err) {
    console.error('POST /api/leagues error:', err);
    res.status(500).json({ error: 'Failed to create league' });
  }
});

// ============================================================================
// League Join (Free)
// ============================================================================

// POST /api/leagues/:id/join - Join a league (free)
// Rate limited to prevent password brute-forcing (10 attempts per 15 min)
router.post('/:id/join', authenticate, joinLimiter, validate(joinLeagueSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const leagueId = req.params.id;
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

// ============================================================================
// League Lookup
// ============================================================================

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

// ============================================================================
// League Leave
// ============================================================================

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

// ============================================================================
// League Settings
// ============================================================================

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

export default router;
