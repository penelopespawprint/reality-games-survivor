import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/authenticate.js';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { stripe } from '../config/stripe.js';
import { runJob, getJobStatus, getJobHistory, getJobStats, getTrackedJobs, scheduleAutoRandomizeRankings, scheduleDraftFinalize } from '../jobs/index.js';
import { getQueueStats, sendEmailCritical } from '../config/email.js';
import { seasonConfig } from '../lib/season-config.js';
import {
  getTimeline,
  getDashboardStats,
  getRecentActivity,
  getSystemHealth,
} from '../services/admin-dashboard.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// GET /api/admin/dashboard/timeline - Get upcoming events timeline
router.get('/dashboard/timeline', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const timeline = await getTimeline();
    res.json({ timeline });
  } catch (err) {
    console.error('GET /api/admin/dashboard/timeline error:', err);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// GET /api/admin/dashboard/stats - Get comprehensive dashboard stats
router.get('/dashboard/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (err) {
    console.error('GET /api/admin/dashboard/stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/dashboard/activity - Get recent platform activity
router.get('/dashboard/activity', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 20 } = req.query;
    const activity = await getRecentActivity(Number(limit));
    res.json({ activity });
  } catch (err) {
    console.error('GET /api/admin/dashboard/activity error:', err);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// GET /api/admin/dashboard/system-health - Get system health status
router.get('/dashboard/system-health', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const health = await getSystemHealth();
    res.json(health);
  } catch (err) {
    console.error('GET /api/admin/dashboard/system-health error:', err);
    res.status(500).json({ error: 'Failed to fetch system health' });
  }
});

// POST /api/admin/seasons - Create season
router.post('/seasons', async (req: AuthenticatedRequest, res: Response) => {
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

    if (!number || !name || !premiere_at || !draft_deadline) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

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
router.patch('/seasons/:id', async (req: AuthenticatedRequest, res: Response) => {
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

    // If updating dates, invalidate cache
    if (updates.draft_deadline || updates.draft_order_deadline || updates.registration_closes_at) {
      seasonConfig.invalidateCache();
      console.log('Season dates updated, cache invalidated');
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

    // Invalidate cache when activating a new season
    seasonConfig.invalidateCache();
    console.log(`Season ${season.number} activated, cache invalidated`);

    res.json({ season, previous_deactivated: true });
  } catch (err) {
    console.error('POST /api/admin/seasons/:id/activate error:', err);
    res.status(500).json({ error: 'Failed to activate season' });
  }
});

// PATCH /api/admin/seasons/:id/dates - Update season dates and reschedule jobs
router.patch('/seasons/:id/dates', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const seasonId = req.params.id;
    const { draft_deadline, draft_order_deadline, registration_closes_at, premiere_at } = req.body;

    // Build updates object with only provided fields
    const updates: any = {};
    if (draft_deadline !== undefined) updates.draft_deadline = draft_deadline;
    if (draft_order_deadline !== undefined) updates.draft_order_deadline = draft_order_deadline;
    if (registration_closes_at !== undefined) updates.registration_closes_at = registration_closes_at;
    if (premiere_at !== undefined) updates.premiere_at = premiere_at;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No date fields provided' });
    }

    // Update season dates
    const { data: season, error } = await supabaseAdmin
      .from('seasons')
      .update(updates)
      .eq('id', seasonId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Invalidate cache
    seasonConfig.invalidateCache();
    console.log('Season dates updated, cache invalidated');

    // If this is the active season and we updated relevant dates, reschedule one-time jobs
    if (season.is_active) {
      const rescheduled: string[] = [];

      if (updates.draft_order_deadline) {
        await scheduleAutoRandomizeRankings();
        rescheduled.push('auto-randomize-rankings');
      }

      if (updates.draft_deadline) {
        await scheduleDraftFinalize();
        rescheduled.push('draft-finalize');
      }

      if (rescheduled.length > 0) {
        console.log(`Rescheduled jobs: ${rescheduled.join(', ')}`);
        return res.json({ season, rescheduled_jobs: rescheduled });
      }
    }

    res.json({ season });
  } catch (err) {
    console.error('PATCH /api/admin/seasons/:id/dates error:', err);
    res.status(500).json({ error: 'Failed to update season dates' });
  }
});

// POST /api/admin/castaways - Add castaway
router.post('/castaways', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { season_id, name, age, hometown, occupation, photo_url, tribe_original } = req.body;

    if (!season_id || !name) {
      return res.status(400).json({ error: 'season_id and name are required' });
    }

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

    // Get castaway details before updating
    const { data: castawayBefore } = await supabaseAdmin
      .from('castaways')
      .select('id, name, season_id')
      .eq('id', castawayId)
      .single();

    // Update castaway status to eliminated
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

    // NOTIFICATION LOGIC: Send elimination alerts to affected users
    if (castaway && castawayBefore) {
      // Find all users who have this castaway on their roster
      const { data: rosters } = await supabaseAdmin
        .from('rosters')
        .select(`
          id,
          user_id,
          league_id,
          users!inner(id, email, display_name, phone, notification_email, notification_sms),
          leagues!inner(id, name)
        `)
        .eq('castaway_id', castawayId)
        .is('dropped_at', null); // Only active roster spots

      if (rosters && rosters.length > 0) {
        console.log(`[Elimination] ${castawayBefore.name} eliminated, notifying ${rosters.length} users`);

        // Process each affected user
        for (const roster of rosters) {
          const user = (roster as any).users;
          const league = (roster as any).leagues;

          // Check how many active castaways this user still has
          const { data: userRoster } = await supabaseAdmin
            .from('rosters')
            .select('castaway_id, castaways!inner(id, name, status)')
            .eq('league_id', roster.league_id)
            .eq('user_id', roster.user_id)
            .is('dropped_at', null);

          const activeCastaways = userRoster?.filter(
            (r: any) => r.castaways?.status === 'active'
          ) || [];

          if (activeCastaways.length === 0) {
            // BOTH CASTAWAYS ELIMINATED - TORCH SNUFFED! 🔥
            console.log(`[Elimination] User ${user.id} has ZERO active castaways in league ${league.id} - TORCH SNUFFED`);

            // Send torch snuffed email
            if (user.notification_email !== false) {
              try {
                // Import EmailService dynamically to avoid circular deps
                const { EmailService } = await import('../emails/service.js');
                const { data: episode } = await supabaseAdmin
                  .from('episodes')
                  .select('number')
                  .eq('id', episode_id)
                  .single();

                await EmailService.sendTorchSnuffed({
                  displayName: user.display_name,
                  email: user.email,
                  leagueName: league.name,
                  leagueId: league.id,
                  episodeNumber: episode?.number || 0,
                });
                console.log(`[Elimination] Sent torch snuffed email to ${user.email}`);
              } catch (err) {
                console.error(`[Elimination] Failed to send torch snuffed email to ${user.email}:`, err);
              }
            }

            // Send torch snuffed SMS
            if (user.notification_sms && user.phone) {
              try {
                const { sendSMS } = await import('../config/twilio.js');
                await sendSMS({
                  to: user.phone,
                  text: `[RGFL] Both your castaways have been eliminated in ${league.name}. Your torch has been snuffed and you can no longer compete this season. Check your email for details.`,
                });
                console.log(`[Elimination] Sent torch snuffed SMS to ${user.phone}`);
              } catch (err) {
                console.error(`[Elimination] Failed to send torch snuffed SMS to ${user.phone}:`, err);
              }
            }

            // Mark user as eliminated in league_members
            await supabaseAdmin
              .from('league_members')
              .update({ is_eliminated: true })
              .eq('league_id', roster.league_id)
              .eq('user_id', roster.user_id);

          } else if (activeCastaways.length === 1) {
            // ONE CASTAWAY REMAINING - Send elimination alert
            console.log(`[Elimination] User ${user.id} has 1 active castaway remaining in league ${league.id}`);

            if (user.notification_email !== false) {
              try {
                const { EmailService } = await import('../emails/service.js');
                await EmailService.sendEliminationAlert({
                  displayName: user.display_name,
                  email: user.email,
                  castawayName: castawayBefore.name,
                  leagueName: league.name,
                  leagueId: league.id,
                });
                console.log(`[Elimination] Sent elimination alert email to ${user.email}`);
              } catch (err) {
                console.error(`[Elimination] Failed to send elimination alert to ${user.email}:`, err);
              }
            }

            // Send SMS notification
            if (user.notification_sms && user.phone) {
              try {
                const { sendSMS } = await import('../config/twilio.js');
                await sendSMS({
                  to: user.phone,
                  text: `[RGFL] ${castawayBefore.name} has been eliminated. You have 1 castaway remaining in ${league.name}. Choose wisely!`,
                });
                console.log(`[Elimination] Sent elimination SMS to ${user.phone}`);
              } catch (err) {
                console.error(`[Elimination] Failed to send elimination SMS:`, err);
              }
            }
          }
        }
      }
    }

    res.json({ castaway });
  } catch (err) {
    console.error('POST /api/admin/castaways/:id/eliminate error:', err);
    res.status(500).json({ error: 'Failed to eliminate castaway' });
  }
});

// POST /api/admin/episodes - Create episode
router.post('/episodes', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { season_id, number, title, air_date } = req.body;

    if (!season_id || !number || !air_date) {
      return res.status(400).json({ error: 'season_id, number, and air_date are required' });
    }

    // Calculate default times based on air_date
    const airDate = new Date(air_date);
    const picksLockAt = new Date(airDate);
    picksLockAt.setHours(15, 0, 0, 0); // 3pm same day

    const resultsPostedAt = new Date(airDate);
    resultsPostedAt.setDate(resultsPostedAt.getDate() + 2); // Friday
    resultsPostedAt.setHours(12, 0, 0, 0);

    const { data: episode, error } = await supabaseAdmin
      .from('episodes')
      .insert({
        season_id,
        number,
        title,
        air_date,
        picks_lock_at: picksLockAt.toISOString(),
        results_posted_at: resultsPostedAt.toISOString(),
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

// GET /api/admin/jobs/history - Get job execution history
router.get('/jobs/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 100, jobName } = req.query;

    // Get execution history
    const history = getJobHistory(
      Number(limit),
      jobName ? String(jobName) : undefined
    );

    // Get statistics for all tracked jobs
    const trackedJobs = getTrackedJobs();
    const stats = trackedJobs.map((name) => ({
      jobName: name,
      ...getJobStats(name),
    }));

    res.json({
      history,
      stats,
      totalExecutions: history.length,
    });
  } catch (err) {
    console.error('GET /api/admin/jobs/history error:', err);
    res.status(500).json({ error: 'Failed to fetch job history' });
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

// GET /api/admin/email-queue/stats - Email queue statistics
router.get('/email-queue/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await getQueueStats();
    res.json(stats);
  } catch (err) {
    console.error('GET /api/admin/email-queue/stats error:', err);
    res.status(500).json({ error: 'Failed to fetch email queue stats' });
  }
});

// GET /api/admin/failed-emails - List failed emails from dead letter queue
router.get('/failed-emails', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const { data: failedEmails, error, count } = await supabaseAdmin
      .from('failed_emails')
      .select('*', { count: 'exact' })
      .order('failed_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ failed_emails: failedEmails, total: count });
  } catch (err) {
    console.error('GET /api/admin/failed-emails error:', err);
    res.status(500).json({ error: 'Failed to fetch failed emails' });
  }
});

// POST /api/admin/failed-emails/:id/retry - Retry sending a failed email
router.post('/failed-emails/:id/retry', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const failedEmailId = req.params.id;

    // Get failed email record
    const { data: failedEmail, error: fetchError } = await supabaseAdmin
      .from('failed_emails')
      .select('*')
      .eq('id', failedEmailId)
      .single();

    if (fetchError || !failedEmail) {
      return res.status(404).json({ error: 'Failed email not found' });
    }

    if (failedEmail.retry_attempted) {
      return res.status(400).json({ error: 'Email has already been retried' });
    }

    // Extract email data from email_job
    const emailJob = failedEmail.email_job as any;

    if (!emailJob || !emailJob.to_email || !emailJob.subject || !emailJob.html) {
      return res.status(400).json({ error: 'Invalid email job data' });
    }

    // Attempt to send with critical retry logic
    const success = await sendEmailCritical({
      to: emailJob.to_email,
      subject: emailJob.subject,
      html: emailJob.html,
      text: emailJob.text,
    });

    // Update failed_emails record
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('failed_emails')
      .update({
        retry_attempted: true,
        retry_succeeded: success,
        retry_at: new Date().toISOString(),
        notes: success
          ? 'Manual retry successful'
          : `Manual retry failed. ${failedEmail.notes || ''}`.trim(),
      })
      .eq('id', failedEmailId)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    res.json({
      failed_email: updated,
      retry_success: success,
      message: success
        ? 'Email sent successfully'
        : 'Email send failed after retries, check queue for status',
    });
  } catch (err) {
    console.error('POST /api/admin/failed-emails/:id/retry error:', err);
    res.status(500).json({ error: 'Failed to retry email' });
  }
});

// POST /api/admin/test-alert - Send test alert
router.post('/test-alert', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sendTestAlert } = await import('../jobs/jobAlerting.js');

    const results = await sendTestAlert();

    res.json({
      message: 'Test alerts sent',
      results,
    });
  } catch (err) {
    console.error('POST /api/admin/test-alert error:', err);
    res.status(500).json({ error: 'Failed to send test alert' });
  }
});

// GET /api/admin/alerting/config - Get alerting configuration
router.get('/alerting/config', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { getAlertingConfig } = await import('../jobs/jobAlerting.js');

    const config = getAlertingConfig();

    res.json(config);
  } catch (err) {
    console.error('GET /api/admin/alerting/config error:', err);
    res.status(500).json({ error: 'Failed to get alerting config' });
  }
});

// POST /api/admin/episodes/:id/release-results - Manually release episode results
router.post('/episodes/:id/release-results', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: episodeId } = req.params;

    // Verify episode exists and is finalized
    const { data: episode, error: episodeError } = await supabaseAdmin
      .from('episodes')
      .select('id, number, season_id, is_scored, results_released_at')
      .eq('id', episodeId)
      .single();

    if (episodeError || !episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    if (!episode.is_scored) {
      return res.status(400).json({ error: 'Episode scoring must be finalized before releasing results' });
    }

    if (episode.results_released_at) {
      return res.status(400).json({
        error: 'Results already released',
        released_at: episode.results_released_at,
      });
    }

    // Import spoiler-safe notification function
    const { sendSpoilerSafeNotification } = await import('../lib/spoiler-safe-notifications.js');

    // Get all users in active leagues for this season
    const { data: leagues } = await supabaseAdmin
      .from('leagues')
      .select('id')
      .eq('season_id', episode.season_id)
      .eq('status', 'active');

    if (!leagues || leagues.length === 0) {
      return res.status(400).json({ error: 'No active leagues found for this season' });
    }

    const leagueIds = leagues.map((l) => l.id);

    // Get unique users from all leagues
    const { data: members } = await supabaseAdmin
      .from('league_members')
      .select(`
        user_id,
        users (
          id,
          email,
          display_name,
          phone
        )
      `)
      .in('league_id', leagueIds);

    if (!members || members.length === 0) {
      return res.status(400).json({ error: 'No users found in active leagues' });
    }

    // Deduplicate users
    const uniqueUsers = new Map();
    for (const member of members) {
      const user = (member as any).users;
      if (user && !uniqueUsers.has(user.id)) {
        uniqueUsers.set(user.id, user);
      }
    }

    let notificationsSent = 0;
    let errors = 0;

    // Send notifications to all users
    for (const user of uniqueUsers.values()) {
      try {
        await sendSpoilerSafeNotification(user, episode);
        notificationsSent++;
      } catch (error) {
        console.error(`Failed to send notification to user ${user.id}:`, error);
        errors++;
      }
    }

    // Mark as released
    const { error: updateError } = await supabaseAdmin
      .from('episodes')
      .update({
        results_released_at: new Date().toISOString(),
        results_released_by: req.user!.id,
      })
      .eq('id', episodeId);

    if (updateError) {
      console.error('Failed to mark results as released:', updateError);
      return res.status(500).json({ error: 'Failed to mark results as released' });
    }

    res.json({
      message: 'Results released successfully',
      episode: {
        id: episode.id,
        number: episode.number,
      },
      notifications_sent: notificationsSent,
      errors,
    });
  } catch (err) {
    console.error('POST /api/admin/episodes/:id/release-results error:', err);
    res.status(500).json({ error: 'Failed to release results' });
  }
});

// GET /api/admin/episodes/:id/release-status - Check if results are released
router.get('/episodes/:id/release-status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: episodeId } = req.params;

    const { data: episode, error } = await supabaseAdmin
      .from('episodes')
      .select(`
        id,
        number,
        is_scored,
        results_released_at,
        results_released_by,
        users!results_released_by (display_name)
      `)
      .eq('id', episodeId)
      .single();

    if (error || !episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    // Count notifications sent
    const { count: notificationCount } = await supabaseAdmin
      .from('results_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('episode_id', episodeId);

    res.json({
      episode: {
        id: episode.id,
        number: episode.number,
      },
      scoring_finalized: !!episode.is_scored,
      results_released: !!episode.results_released_at,
      results_released_at: episode.results_released_at,
      released_by: episode.results_released_by
        ? {
            id: episode.results_released_by,
            name: (episode as any).users?.display_name,
          }
        : null,
      notifications_sent: notificationCount || 0,
    });
  } catch (err) {
    console.error('GET /api/admin/episodes/:id/release-status error:', err);
    res.status(500).json({ error: 'Failed to fetch release status' });
  }
});

// GET /api/admin/notification-preferences/stats - Get stats on user preferences
router.get('/notification-preferences/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true });

    const { data: allPrefs } = await supabaseAdmin
      .from('users')
      .select('notification_email, notification_sms, notification_push');

    const emailEnabled = allPrefs?.filter((p) => p.notification_email).length || 0;
    const smsEnabled = allPrefs?.filter((p) => p.notification_sms).length || 0;
    const pushEnabled = allPrefs?.filter((p) => p.notification_push).length || 0;
    const allDisabled =
      allPrefs?.filter(
        (p) => !p.notification_email && !p.notification_sms && !p.notification_push
      ).length || 0;

    const stats = {
      total_users: totalUsers || 0,
      email_enabled: emailEnabled,
      sms_enabled: smsEnabled,
      push_enabled: pushEnabled,
      all_disabled: allDisabled,
    };

    res.json(stats);
  } catch (err) {
    console.error('GET /api/admin/notification-preferences/stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
