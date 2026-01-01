/**
 * Admin Stats Routes
 *
 * Comprehensive analytics endpoints for the admin dashboard
 */
import { Router } from 'express';
import { getComprehensiveStats, getRevenueStats, getUserEngagementStats, getLeagueAnalyticsStats, getCommunicationStats, getGameProgressStats, getSystemMetrics, } from '../../services/admin-stats.js';
const router = Router();
// GET /api/admin/stats - Get all comprehensive stats
router.get('/', async (req, res) => {
    try {
        const stats = await getComprehensiveStats();
        res.json(stats);
    }
    catch (err) {
        console.error('GET /api/admin/stats error:', err);
        res.status(500).json({ error: 'Failed to fetch comprehensive stats' });
    }
});
// GET /api/admin/stats/revenue - Get revenue stats only
router.get('/revenue', async (req, res) => {
    try {
        const stats = await getRevenueStats();
        res.json(stats);
    }
    catch (err) {
        console.error('GET /api/admin/stats/revenue error:', err);
        res.status(500).json({ error: 'Failed to fetch revenue stats' });
    }
});
// GET /api/admin/stats/users - Get user engagement stats only
router.get('/users', async (req, res) => {
    try {
        const stats = await getUserEngagementStats();
        res.json(stats);
    }
    catch (err) {
        console.error('GET /api/admin/stats/users error:', err);
        res.status(500).json({ error: 'Failed to fetch user engagement stats' });
    }
});
// GET /api/admin/stats/leagues - Get league analytics only
router.get('/leagues', async (req, res) => {
    try {
        const stats = await getLeagueAnalyticsStats();
        res.json(stats);
    }
    catch (err) {
        console.error('GET /api/admin/stats/leagues error:', err);
        res.status(500).json({ error: 'Failed to fetch league analytics' });
    }
});
// GET /api/admin/stats/communication - Get communication stats only
router.get('/communication', async (req, res) => {
    try {
        const stats = await getCommunicationStats();
        res.json(stats);
    }
    catch (err) {
        console.error('GET /api/admin/stats/communication error:', err);
        res.status(500).json({ error: 'Failed to fetch communication stats' });
    }
});
// GET /api/admin/stats/game - Get game progress stats only
router.get('/game', async (req, res) => {
    try {
        const stats = await getGameProgressStats();
        res.json(stats);
    }
    catch (err) {
        console.error('GET /api/admin/stats/game error:', err);
        res.status(500).json({ error: 'Failed to fetch game progress stats' });
    }
});
// GET /api/admin/stats/system - Get system metrics only
router.get('/system', async (req, res) => {
    try {
        const stats = await getSystemMetrics();
        res.json(stats);
    }
    catch (err) {
        console.error('GET /api/admin/stats/system error:', err);
        res.status(500).json({ error: 'Failed to fetch system metrics' });
    }
});
export default router;
//# sourceMappingURL=stats.js.map