/**
 * Admin Analytics Routes
 *
 * Three-tab analytics structure:
 * - Executive: Business health, revenue, funnel
 * - Engagement: User behavior, retention, segments
 * - Operations: System metrics, email performance, jobs
 */
import { Router } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
const router = Router();
// GET /api/admin/analytics/executive - Business health metrics
router.get('/executive', async (req, res) => {
    try {
        // Get user funnel
        const { data: funnel } = await supabaseAdmin.rpc('get_user_funnel');
        // Get donation analytics
        const { data: donations } = await supabaseAdmin.rpc('get_donation_analytics');
        // Calculate health score (retention 50%, activation 30%, growth 20%)
        const { count: totalUsers } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true });
        const { count: activeUsers } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('last_active_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
        const { count: newUsersThisWeek } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
        const retentionRate = totalUsers ? ((activeUsers || 0) / totalUsers) * 100 : 0;
        const activationRate = funnel?.signups ? ((funnel.joinedLeague || 0) / funnel.signups) * 100 : 0;
        const growthRate = totalUsers ? ((newUsersThisWeek || 0) / totalUsers) * 100 : 0;
        const healthScore = Math.round((retentionRate * 0.5) + (activationRate * 0.3) + (Math.min(growthRate * 10, 20)));
        // Get top leagues by engagement
        const { data: topLeagues } = await supabaseAdmin
            .from('leagues')
            .select(`
        id,
        name,
        entry_fee,
        league_members (count)
      `)
            .order('created_at', { ascending: false })
            .limit(10);
        // Enhance with pick stats
        const topLeaguesWithStats = await Promise.all((topLeagues || []).map(async (league) => {
            const { count: pickCount } = await supabaseAdmin
                .from('weekly_picks')
                .select('*', { count: 'exact', head: true })
                .eq('league_id', league.id);
            return {
                ...league,
                pickCount: pickCount || 0,
                memberCount: Array.isArray(league.league_members) ? league.league_members.length : 0,
            };
        }));
        res.json({
            healthScore,
            vitals: {
                totalUsers: totalUsers || 0,
                activeUsers: activeUsers || 0,
                retentionRate: Math.round(retentionRate),
                activationRate: Math.round(activationRate),
                growthRate: Math.round(growthRate * 10) / 10,
                newUsersThisWeek: newUsersThisWeek || 0,
            },
            funnel: funnel || {},
            donations: donations || {},
            topLeagues: topLeaguesWithStats.slice(0, 5),
        });
    }
    catch (err) {
        console.error('GET /api/admin/analytics/executive error:', err);
        res.status(500).json({ error: 'Failed to fetch executive analytics' });
    }
});
// GET /api/admin/analytics/engagement - User behavior metrics
router.get('/engagement', async (req, res) => {
    try {
        // Get retention cohorts
        const { data: cohorts } = await supabaseAdmin.rpc('get_retention_cohorts');
        // Get user segments
        const { data: users } = await supabaseAdmin
            .from('users')
            .select('id');
        const segments = { power: 0, casual: 0, dormant: 0, churned: 0, new: 0 };
        for (const user of users || []) {
            const { data: segment } = await supabaseAdmin.rpc('get_user_segment', { user_uuid: user.id });
            if (segment && segments[segment] !== undefined) {
                segments[segment]++;
            }
        }
        // Get episode pick completion status
        const { data: currentSeason } = await supabaseAdmin
            .from('seasons')
            .select('id')
            .eq('is_active', true)
            .single();
        let episodeStatus = { episode: 0, submitted: 0, total: 0, percentage: 0 };
        if (currentSeason) {
            const { data: currentEpisode } = await supabaseAdmin
                .from('episodes')
                .select('id, episode_number')
                .eq('season_id', currentSeason.id)
                .lte('air_date', new Date().toISOString())
                .order('air_date', { ascending: false })
                .limit(1)
                .single();
            if (currentEpisode) {
                const { count: totalEligible } = await supabaseAdmin
                    .from('league_members')
                    .select('*', { count: 'exact', head: true });
                const { count: submitted } = await supabaseAdmin
                    .from('weekly_picks')
                    .select('*', { count: 'exact', head: true })
                    .eq('episode_id', currentEpisode.id);
                episodeStatus = {
                    episode: currentEpisode.episode_number,
                    submitted: submitted || 0,
                    total: totalEligible || 0,
                    percentage: totalEligible ? Math.round(((submitted || 0) / totalEligible) * 100) : 0,
                };
            }
        }
        // Get pick patterns by day of week
        const { data: pickPatterns } = await supabaseAdmin
            .from('weekly_picks')
            .select('created_at')
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        const dayPattern = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
        for (const pick of pickPatterns || []) {
            const day = new Date(pick.created_at).getDay();
            dayPattern[day]++;
        }
        // Get at-risk users (no activity in 7+ days, have picks)
        const { data: atRiskUsers } = await supabaseAdmin
            .from('users')
            .select('id, display_name, email, last_active_at')
            .lt('last_active_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .limit(20);
        res.json({
            episodeStatus,
            cohorts: cohorts || [],
            segments,
            pickPatterns: {
                byDay: dayPattern,
                dayLabels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            },
            atRiskUsers: atRiskUsers || [],
        });
    }
    catch (err) {
        console.error('GET /api/admin/analytics/engagement error:', err);
        res.status(500).json({ error: 'Failed to fetch engagement analytics' });
    }
});
// GET /api/admin/analytics/operations - System metrics
router.get('/operations', async (req, res) => {
    try {
        // Get email delivery stats
        const { data: emailStats } = await supabaseAdmin.rpc('get_email_delivery_rate', { days: 7 });
        // Get failed emails
        const { data: failedEmails, count: failedCount } = await supabaseAdmin
            .from('failed_emails')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .limit(10);
        // Get job history
        const { data: recentJobs } = await supabaseAdmin
            .from('job_runs')
            .select('*')
            .order('started_at', { ascending: false })
            .limit(20);
        // Get job failure count
        const { count: failedJobCount } = await supabaseAdmin
            .from('job_runs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'failed')
            .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        // Calculate system status
        const emailHealthy = (emailStats?.delivery_rate || 1) >= 0.9;
        const jobsHealthy = (failedJobCount || 0) === 0;
        const systemStatus = emailHealthy && jobsHealthy ? 'healthy' :
            (emailHealthy || jobsHealthy) ? 'warning' : 'critical';
        // Get error log from recent job failures
        const { data: errorLogs } = await supabaseAdmin
            .from('job_runs')
            .select('job_name, error_message, started_at')
            .eq('status', 'failed')
            .order('started_at', { ascending: false })
            .limit(10);
        // Get pending emails count
        const { count: pendingEmails } = await supabaseAdmin
            .from('email_queue')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        res.json({
            systemStatus,
            emailPerformance: {
                ...emailStats,
                failedCount: failedCount || 0,
                pendingCount: pendingEmails || 0,
                recentFailures: failedEmails || [],
            },
            jobHistory: {
                recent: recentJobs || [],
                failedCount: failedJobCount || 0,
            },
            errorLog: errorLogs || [],
        });
    }
    catch (err) {
        console.error('GET /api/admin/analytics/operations error:', err);
        res.status(500).json({ error: 'Failed to fetch operations analytics' });
    }
});
// GET /api/admin/analytics/history - Historical stat trends
router.get('/history', async (req, res) => {
    try {
        const { stat_name, category, days = 30 } = req.query;
        let query = supabaseAdmin
            .from('stats_history')
            .select('*')
            .gte('recorded_at', new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000).toISOString())
            .order('recorded_at', { ascending: true });
        if (stat_name) {
            query = query.eq('stat_name', stat_name);
        }
        if (category) {
            query = query.eq('stat_category', category);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        // Group by stat_name for easier charting
        const groupedData = (data || []).reduce((acc, item) => {
            if (!acc[item.stat_name]) {
                acc[item.stat_name] = [];
            }
            acc[item.stat_name].push({
                date: item.recorded_at,
                value: Number(item.stat_value),
            });
            return acc;
        }, {});
        res.json({
            history: groupedData,
            stats: data || [],
            period: { days: Number(days) },
        });
    }
    catch (err) {
        console.error('GET /api/admin/analytics/history error:', err);
        res.status(500).json({ error: 'Failed to fetch analytics history' });
    }
});
// POST /api/admin/analytics/snapshot - Manually trigger a stats snapshot
router.post('/snapshot', async (req, res) => {
    try {
        const now = new Date().toISOString();
        // Collect current stats
        const { count: totalUsers } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true });
        const { count: activeUsers } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('last_active_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
        const { count: totalLeagues } = await supabaseAdmin
            .from('leagues')
            .select('*', { count: 'exact', head: true });
        const { count: totalPicks } = await supabaseAdmin
            .from('weekly_picks')
            .select('*', { count: 'exact', head: true });
        const { count: totalPayments } = await supabaseAdmin
            .from('payments')
            .select('*', { count: 'exact', head: true });
        const { count: newUsersToday } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        // Insert all stats
        const stats = [
            { stat_name: 'total_users', stat_category: 'executive', stat_value: totalUsers || 0 },
            { stat_name: 'active_users_7d', stat_category: 'executive', stat_value: activeUsers || 0 },
            { stat_name: 'total_leagues', stat_category: 'executive', stat_value: totalLeagues || 0 },
            { stat_name: 'total_picks', stat_category: 'engagement', stat_value: totalPicks || 0 },
            { stat_name: 'total_payments', stat_category: 'executive', stat_value: totalPayments || 0 },
            { stat_name: 'new_users_today', stat_category: 'executive', stat_value: newUsersToday || 0 },
        ];
        const { error } = await supabaseAdmin
            .from('stats_history')
            .insert(stats.map(s => ({ ...s, recorded_at: now })));
        if (error)
            throw error;
        res.json({
            success: true,
            message: 'Stats snapshot captured',
            stats,
            timestamp: now,
        });
    }
    catch (err) {
        console.error('POST /api/admin/analytics/snapshot error:', err);
        res.status(500).json({ error: 'Failed to capture stats snapshot' });
    }
});
export default router;
//# sourceMappingURL=analytics.js.map