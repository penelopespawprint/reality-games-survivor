/**
 * Admin Dashboard Routes
 *
 * Handles timeline, stats, activity, and system health endpoints
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate.js';
import { supabaseAdmin } from '../../config/supabase.js';
import {
  getTimeline,
  getDashboardStats,
  getRecentActivity,
  getSystemHealth,
  getDraftStats,
  getPaymentStats,
  getTriviaStats,
  getLeagueBreakdown,
  getNotificationStats,
} from '../../services/admin-dashboard.js';

const router = Router();

// GET /api/admin/dashboard/badges - Get badge counts for navigation
router.get('/badges', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get failed emails count
    const { count: failedEmails } = await supabaseAdmin
      .from('failed_emails')
      .select('*', { count: 'exact', head: true })
      .eq('retry_attempted', false);

    // Get failed jobs count (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: failedJobs } = await supabaseAdmin
      .from('job_runs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('started_at', twentyFourHoursAgo);

    // Get pending donations count
    const { count: pendingDonations } = await supabaseAdmin
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    res.json({
      failedEmails: failedEmails || 0,
      failedJobs: failedJobs || 0,
      pendingDonations: pendingDonations || 0,
    });
  } catch (err) {
    console.error('GET /api/admin/dashboard/badges error:', err);
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

// GET /api/admin/dashboard/timeline - Get upcoming events timeline
router.get('/timeline', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const timeline = await getTimeline();
    res.json({ timeline });
  } catch (err) {
    console.error('GET /api/admin/dashboard/timeline error:', err);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// GET /api/admin/dashboard/stats - Get comprehensive dashboard stats
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (err) {
    console.error('GET /api/admin/dashboard/stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/dashboard/activity - Get recent platform activity
router.get('/activity', async (req: AuthenticatedRequest, res: Response) => {
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
router.get('/system-health', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const health = await getSystemHealth();
    res.json(health);
  } catch (err) {
    console.error('GET /api/admin/dashboard/system-health error:', err);
    res.status(500).json({ error: 'Failed to fetch system health' });
  }
});

// GET /api/admin/dashboard/draft-stats - Get draft status overview
router.get('/draft-stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const draftStats = await getDraftStats();
    res.json(draftStats);
  } catch (err) {
    console.error('GET /api/admin/dashboard/draft-stats error:', err);
    res.status(500).json({ error: 'Failed to fetch draft stats' });
  }
});

// GET /api/admin/dashboard/payment-stats - Get payment/revenue stats
router.get('/payment-stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paymentStats = await getPaymentStats();
    res.json(paymentStats);
  } catch (err) {
    console.error('GET /api/admin/dashboard/payment-stats error:', err);
    res.status(500).json({ error: 'Failed to fetch payment stats' });
  }
});

// GET /api/admin/dashboard/trivia-stats - Get trivia engagement stats
router.get('/trivia-stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const triviaStats = await getTriviaStats();
    res.json(triviaStats);
  } catch (err) {
    console.error('GET /api/admin/dashboard/trivia-stats error:', err);
    res.status(500).json({ error: 'Failed to fetch trivia stats' });
  }
});

// GET /api/admin/dashboard/league-breakdown - Get league breakdown by type
router.get('/league-breakdown', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leagueBreakdown = await getLeagueBreakdown();
    res.json(leagueBreakdown);
  } catch (err) {
    console.error('GET /api/admin/dashboard/league-breakdown error:', err);
    res.status(500).json({ error: 'Failed to fetch league breakdown' });
  }
});

// GET /api/admin/dashboard/notification-stats - Get notification preference stats
router.get('/notification-stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notificationStats = await getNotificationStats();
    res.json(notificationStats);
  } catch (err) {
    console.error('GET /api/admin/dashboard/notification-stats error:', err);
    res.status(500).json({ error: 'Failed to fetch notification stats' });
  }
});

// GET /api/admin/dashboard/all - Get all dashboard data in one request
router.get('/all', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [
      timeline,
      stats,
      activity,
      health,
      draftStats,
      paymentStats,
      triviaStats,
      leagueBreakdown,
      notificationStats,
    ] = await Promise.all([
      getTimeline(),
      getDashboardStats(),
      getRecentActivity(20),
      getSystemHealth(),
      getDraftStats(),
      getPaymentStats(),
      getTriviaStats(),
      getLeagueBreakdown(),
      getNotificationStats(),
    ]);

    res.json({
      timeline,
      stats,
      activity,
      health,
      draftStats,
      paymentStats,
      triviaStats,
      leagueBreakdown,
      notificationStats,
    });
  } catch (err) {
    console.error('GET /api/admin/dashboard/all error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
