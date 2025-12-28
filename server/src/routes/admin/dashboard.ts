/**
 * Admin Dashboard Routes
 *
 * Handles timeline, stats, activity, and system health endpoints
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate.js';
import {
  getTimeline,
  getDashboardStats,
  getRecentActivity,
  getSystemHealth,
} from '../../services/admin-dashboard.js';

const router = Router();

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

export default router;
