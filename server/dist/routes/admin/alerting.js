/**
 * Admin Alerting Routes
 *
 * Routes for managing alerts and notifications.
 */
import { Router } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
const router = Router();
// POST /api/admin/test-alert - Send test alert
router.post('/test-alert', async (req, res) => {
    try {
        const { sendTestAlert } = await import('../../jobs/jobAlerting.js');
        const results = await sendTestAlert();
        res.json({
            message: 'Test alerts sent',
            results,
        });
    }
    catch (err) {
        console.error('POST /api/admin/test-alert error:', err);
        res.status(500).json({ error: 'Failed to send test alert' });
    }
});
// GET /api/admin/alerting/config - Get alerting configuration
router.get('/alerting/config', async (req, res) => {
    try {
        const { getAlertingConfig } = await import('../../jobs/jobAlerting.js');
        const config = getAlertingConfig();
        res.json(config);
    }
    catch (err) {
        console.error('GET /api/admin/alerting/config error:', err);
        res.status(500).json({ error: 'Failed to get alerting config' });
    }
});
// GET /api/admin/notification-preferences/stats - Get stats on user preferences
router.get('/notification-preferences/stats', async (req, res) => {
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
        const allDisabled = allPrefs?.filter((p) => !p.notification_email && !p.notification_sms && !p.notification_push).length || 0;
        const stats = {
            total_users: totalUsers || 0,
            email_enabled: emailEnabled,
            sms_enabled: smsEnabled,
            push_enabled: pushEnabled,
            all_disabled: allDisabled,
        };
        res.json(stats);
    }
    catch (err) {
        console.error('GET /api/admin/notification-preferences/stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});
export default router;
//# sourceMappingURL=alerting.js.map