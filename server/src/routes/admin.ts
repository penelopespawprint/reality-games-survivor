import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/authenticate.js';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { stripe } from '../config/stripe.js';
import { runJob, getJobStatus } from '../jobs/index.js';
import {
  validate,
  validateQuery,
  validateParams,
  createSeasonSchema,
  updateSeasonSchema,
  createCastawaySchema,
  updateCastawaySchema,
  eliminateCastawaySchema,
  createEpisodeSchema,
  updateEpisodeSchema,
  updateUserRoleSchema,
  usersQuerySchema,
  leaguesQuerySchema,
  paymentsQuerySchema,
  refundSchema,
  idParamSchema,
  nameParamSchema,
} from '../validation/admin.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// POST /api/admin/seasons - Create season
router.post('/seasons', validate(createSeasonSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      number,
      name,
      registration_opens_at,
      draft_order_deadline,
      registration_closes_at,
      premiere_at,
      draft_deadline,
      finale_at,
    } = req.body;

    const { data: season, error } = await supabaseAdmin
      .from('seasons')
      .insert({
        number,
        name,
        registration_opens_at,
        draft_order_deadline,
        registration_closes_at,
        premiere_at,
        draft_deadline,
        finale_at,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ season });
  } catch (err) {
    console.error('POST /api/admin/seasons error:', err);
    res.status(500).json({ error: 'Failed to create season' });
  }
});

// PATCH /api/admin/seasons/:id - Update season
router.patch('/seasons/:id', validateParams(idParamSchema), validate(updateSeasonSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const seasonId = req.params.id;
    const updates = req.body;

    const { data: season, error } = await supabaseAdmin
      .from('seasons')
      .update(updates)
      .eq('id', seasonId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ season });
  } catch (err) {
    console.error('PATCH /api/admin/seasons/:id error:', err);
    res.status(500).json({ error: 'Failed to update season' });
  }
});

// POST /api/admin/seasons/:id/activate - Set active season
router.post('/seasons/:id/activate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const seasonId = req.params.id;

    // Deactivate all seasons
    await supabaseAdmin
      .from('seasons')
      .update({ is_active: false })
      .neq('id', seasonId);

    // Activate this season
    const { data: season, error } = await supabaseAdmin
      .from('seasons')
      .update({ is_active: true })
      .eq('id', seasonId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ season, previous_deactivated: true });
  } catch (err) {
    console.error('POST /api/admin/seasons/:id/activate error:', err);
    res.status(500).json({ error: 'Failed to activate season' });
  }
});

// POST /api/admin/castaways - Add castaway
router.post('/castaways', validate(createCastawaySchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { season_id, name, age, hometown, occupation, photo_url, tribe_original } = req.body;

    const { data: castaway, error } = await supabaseAdmin
      .from('castaways')
      .insert({
        season_id,
        name,
        age,
        hometown,
        occupation,
        photo_url,
        tribe_original,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ castaway });
  } catch (err) {
    console.error('POST /api/admin/castaways error:', err);
    res.status(500).json({ error: 'Failed to add castaway' });
  }
});

// PATCH /api/admin/castaways/:id - Update castaway
router.patch('/castaways/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const castawayId = req.params.id;
    const updates = req.body;

    const { data: castaway, error } = await supabaseAdmin
      .from('castaways')
      .update(updates)
      .eq('id', castawayId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ castaway });
  } catch (err) {
    console.error('PATCH /api/admin/castaways/:id error:', err);
    res.status(500).json({ error: 'Failed to update castaway' });
  }
});

// POST /api/admin/castaways/:id/eliminate - Mark castaway eliminated
router.post('/castaways/:id/eliminate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const castawayId = req.params.id;
    const { episode_id, placement } = req.body;

    if (!episode_id) {
      return res.status(400).json({ error: 'episode_id is required' });
    }

    const { data: castaway, error } = await supabaseAdmin
      .from('castaways')
      .update({
        status: 'eliminated',
        eliminated_episode_id: episode_id,
        placement,
      })
      .eq('id', castawayId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Check if waiver window should open
    const { data: episode } = await supabase
      .from('episodes')
      .select('waiver_opens_at')
      .eq('id', episode_id)
      .single();

    res.json({
      castaway,
      waiver_opened: episode?.waiver_opens_at ? true : false,
    });
  } catch (err) {
    console.error('POST /api/admin/castaways/:id/eliminate error:', err);
    res.status(500).json({ error: 'Failed to eliminate castaway' });
  }
});

// POST /api/admin/episodes - Create episode
router.post('/episodes', validate(createEpisodeSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { season_id, number, title, air_date } = req.body;

    // Calculate default times based on air_date
    const airDate = new Date(air_date);
    const picksLockAt = new Date(airDate);
    picksLockAt.setHours(15, 0, 0, 0); // 3pm same day

    const resultsPostedAt = new Date(airDate);
    resultsPostedAt.setDate(resultsPostedAt.getDate() + 2); // Friday
    resultsPostedAt.setHours(12, 0, 0, 0);

    const waiverOpensAt = new Date(airDate);
    waiverOpensAt.setDate(waiverOpensAt.getDate() + 3); // Saturday
    waiverOpensAt.setHours(12, 0, 0, 0);

    const waiverClosesAt = new Date(airDate);
    waiverClosesAt.setDate(waiverClosesAt.getDate() + 7); // Next Wednesday
    waiverClosesAt.setHours(15, 0, 0, 0);

    const { data: episode, error } = await supabaseAdmin
      .from('episodes')
      .insert({
        season_id,
        number,
        title,
        air_date,
        picks_lock_at: picksLockAt.toISOString(),
        results_posted_at: resultsPostedAt.toISOString(),
        waiver_opens_at: waiverOpensAt.toISOString(),
        waiver_closes_at: waiverClosesAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ episode });
  } catch (err) {
    console.error('POST /api/admin/episodes error:', err);
    res.status(500).json({ error: 'Failed to create episode' });
  }
});

// PATCH /api/admin/episodes/:id - Update episode
router.patch('/episodes/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const episodeId = req.params.id;
    const updates = req.body;

    const { data: episode, error } = await supabaseAdmin
      .from('episodes')
      .update(updates)
      .eq('id', episodeId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ episode });
  } catch (err) {
    console.error('PATCH /api/admin/episodes/:id error:', err);
    res.status(500).json({ error: 'Failed to update episode' });
  }
});

// GET /api/admin/jobs - Job status
router.get('/jobs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const jobs = getJobStatus();
    res.json({ jobs });
  } catch (err) {
    console.error('GET /api/admin/jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// POST /api/admin/jobs/:name/run - Trigger job manually
router.post('/jobs/:name/run', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const jobName = req.params.name;
    const result = await runJob(jobName);
    res.json({ job: jobName, result });
  } catch (err) {
    console.error('POST /api/admin/jobs/:name/run error:', err);
    const message = err instanceof Error ? err.message : 'Failed to run job';
    res.status(500).json({ error: message });
  }
});

// GET /api/admin/payments - All payments
router.get('/payments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { league_id, status } = req.query;

    let query = supabaseAdmin
      .from('payments')
      .select(`
        *,
        users (
          id,
          display_name,
          email
        ),
        leagues (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (league_id) {
      query = query.eq('league_id', league_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: payments, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const total = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    res.json({ payments, total });
  } catch (err) {
    console.error('GET /api/admin/payments error:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// GET /api/admin/users - View all users
router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role, search, limit = 50, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (role) {
      query = query.eq('role', role);
    }

    if (search) {
      query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: users, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ users, total: count });
  } catch (err) {
    console.error('GET /api/admin/users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PATCH /api/admin/users/:id - Update user role
router.patch('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    if (!role || !['player', 'commissioner', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ user });
  } catch (err) {
    console.error('PATCH /api/admin/users/:id error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// GET /api/admin/leagues - View all leagues
router.get('/leagues', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { season_id, status, search, limit = 50, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('leagues')
      .select(`
        *,
        seasons (
          id,
          name,
          number
        ),
        users:commissioner_id (
          id,
          display_name,
          email
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (season_id) {
      query = query.eq('season_id', season_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: leagues, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Get member counts for each league
    const leaguesWithCounts = await Promise.all(
      (leagues || []).map(async (league) => {
        const { count: memberCount } = await supabaseAdmin
          .from('league_members')
          .select('*', { count: 'exact', head: true })
          .eq('league_id', league.id);

        return {
          ...league,
          member_count: memberCount || 0,
        };
      })
    );

    res.json({ leagues: leaguesWithCounts, total: count });
  } catch (err) {
    console.error('GET /api/admin/leagues error:', err);
    res.status(500).json({ error: 'Failed to fetch leagues' });
  }
});

// POST /api/admin/payments/:id/refund - Issue refund
router.post('/payments/:id/refund', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paymentId = req.params.id;
    const { reason } = req.body;

    // Get payment
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({ error: 'Can only refund completed payments' });
    }

    if (!payment.stripe_payment_intent_id) {
      return res.status(400).json({ error: 'No Stripe payment intent found' });
    }

    // Issue Stripe refund
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      reason: 'requested_by_customer',
    });

    // Update payment record
    const { data: updated, error } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'refunded',
        stripe_refund_id: refund.id,
        refunded_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ payment: updated, refund_id: refund.id });
  } catch (err) {
    console.error('POST /api/admin/payments/:id/refund error:', err);
    res.status(500).json({ error: 'Failed to issue refund' });
  }
});

export default router;
