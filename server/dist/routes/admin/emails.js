/**
 * Admin Emails Routes
 *
 * Routes for managing email queue and failed emails.
 */
import { Router } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
import { getQueueStats, sendEmailCritical } from '../../config/email.js';
const router = Router();
// GET /api/admin/email-queue/stats - Email queue statistics
router.get('/email-queue/stats', async (req, res) => {
    try {
        const stats = await getQueueStats();
        res.json(stats);
    }
    catch (err) {
        console.error('GET /api/admin/email-queue/stats error:', err);
        res.status(500).json({ error: 'Failed to fetch email queue stats' });
    }
});
// GET /api/admin/failed-emails - List failed emails from dead letter queue
router.get('/failed-emails', async (req, res) => {
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
    }
    catch (err) {
        console.error('GET /api/admin/failed-emails error:', err);
        res.status(500).json({ error: 'Failed to fetch failed emails' });
    }
});
// POST /api/admin/failed-emails/:id/retry - Retry sending a failed email
router.post('/failed-emails/:id/retry', async (req, res) => {
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
        const emailJob = failedEmail.email_job;
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
    }
    catch (err) {
        console.error('POST /api/admin/failed-emails/:id/retry error:', err);
        res.status(500).json({ error: 'Failed to retry email' });
    }
});
export default router;
//# sourceMappingURL=emails.js.map