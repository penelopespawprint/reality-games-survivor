/**
 * Admin Campaigns API
 *
 * Handles email and SMS campaign management:
 * - Create, schedule, and send email campaigns via Resend
 * - Create, schedule, and send SMS campaigns via Twilio
 * - Campaign archiving and history
 * - Recipient management and segmentation
 */
import { Router } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
import { resend, FROM_EMAIL, REPLY_TO } from '../../config/email.js';
import { sendSMS } from '../../config/twilio.js';
import { z } from 'zod';
const router = Router();
// ============================================
// EMAIL CAMPAIGNS
// ============================================
// Schema for email campaign
const emailCampaignSchema = z.object({
    name: z.string().min(1).max(255),
    subject: z.string().min(1).max(500),
    html_body: z.string().min(1),
    text_body: z.string().optional(),
    recipient_segment: z.enum(['all', 'active', 'commissioners', 'picked', 'not_picked', 'custom']),
    custom_recipients: z.array(z.string().email()).optional(),
    template_id: z.string().uuid().optional(),
    scheduled_at: z.string().datetime().optional().nullable(),
    send_immediately: z.boolean().optional(),
    // Weekly cadence options
    recurring: z.boolean().optional(),
    recurring_day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).optional(),
    recurring_time: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:MM format
});
// List email campaigns
router.get('/email', async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;
        let query = supabaseAdmin
            .from('email_campaigns')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(Number(offset), Number(offset) + Number(limit) - 1);
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }
        const { data, error, count } = await query;
        if (error)
            throw error;
        res.json({
            campaigns: data || [],
            total: count || 0,
            pagination: {
                limit: Number(limit),
                offset: Number(offset),
                hasMore: (count || 0) > Number(offset) + Number(limit),
            },
        });
    }
    catch (err) {
        console.error('Failed to fetch email campaigns:', err);
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
});
// Get single campaign
router.get('/email/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabaseAdmin
            .from('email_campaigns')
            .select('*')
            .eq('id', id)
            .single();
        if (error)
            throw error;
        if (!data) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        res.json({ campaign: data });
    }
    catch (err) {
        console.error('Failed to fetch campaign:', err);
        res.status(500).json({ error: 'Failed to fetch campaign' });
    }
});
// Create email campaign (draft or scheduled)
router.post('/email', async (req, res) => {
    try {
        const userId = req.user?.id;
        const parsed = emailCampaignSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
        }
        const { send_immediately, ...campaignData } = parsed.data;
        // Determine status
        let status = 'draft';
        if (send_immediately) {
            status = 'sending';
        }
        else if (campaignData.scheduled_at) {
            status = 'scheduled';
        }
        const { data, error } = await supabaseAdmin
            .from('email_campaigns')
            .insert({
            ...campaignData,
            status,
            created_by: userId,
            updated_by: userId,
        })
            .select()
            .single();
        if (error)
            throw error;
        // If sending immediately, trigger send
        if (send_immediately && data) {
            // Don't await - let it run in background
            sendEmailCampaignNow(data.id).catch(err => {
                console.error('Failed to send campaign:', err);
            });
        }
        res.status(201).json({
            campaign: data,
            message: send_immediately ? 'Campaign is being sent' : 'Campaign created successfully',
        });
    }
    catch (err) {
        console.error('Failed to create email campaign:', err);
        res.status(500).json({ error: 'Failed to create campaign' });
    }
});
// Update email campaign
router.put('/email/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const parsed = emailCampaignSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
        }
        // Check if campaign can be edited
        const { data: existing } = await supabaseAdmin
            .from('email_campaigns')
            .select('status')
            .eq('id', id)
            .single();
        if (existing?.status === 'sent' || existing?.status === 'sending') {
            return res.status(400).json({ error: 'Cannot edit a campaign that has been sent or is sending' });
        }
        const { send_immediately, ...campaignData } = parsed.data;
        let status = 'draft';
        if (send_immediately) {
            status = 'sending';
        }
        else if (campaignData.scheduled_at) {
            status = 'scheduled';
        }
        const { data, error } = await supabaseAdmin
            .from('email_campaigns')
            .update({
            ...campaignData,
            status,
            updated_by: userId,
            updated_at: new Date().toISOString(),
        })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        if (send_immediately && data) {
            sendEmailCampaignNow(data.id).catch(err => {
                console.error('Failed to send campaign:', err);
            });
        }
        res.json({ campaign: data, message: 'Campaign updated successfully' });
    }
    catch (err) {
        console.error('Failed to update email campaign:', err);
        res.status(500).json({ error: 'Failed to update campaign' });
    }
});
// Send campaign now
router.post('/email/:id/send', async (req, res) => {
    try {
        const { id } = req.params;
        // Check campaign status
        const { data: campaign } = await supabaseAdmin
            .from('email_campaigns')
            .select('*')
            .eq('id', id)
            .single();
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        if (campaign.status === 'sent') {
            return res.status(400).json({ error: 'Campaign has already been sent' });
        }
        if (campaign.status === 'sending') {
            return res.status(400).json({ error: 'Campaign is currently being sent' });
        }
        // Update status to sending
        await supabaseAdmin
            .from('email_campaigns')
            .update({ status: 'sending' })
            .eq('id', id);
        // Trigger send (don't await)
        sendEmailCampaignNow(id).catch(err => {
            console.error('Failed to send campaign:', err);
        });
        res.json({ message: 'Campaign is being sent' });
    }
    catch (err) {
        console.error('Failed to send campaign:', err);
        res.status(500).json({ error: 'Failed to send campaign' });
    }
});
// Archive campaign
router.post('/email/:id/archive', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const { data, error } = await supabaseAdmin
            .from('email_campaigns')
            .update({
            status: 'archived',
            archived_at: new Date().toISOString(),
            archived_by: userId,
        })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        res.json({ campaign: data, message: 'Campaign archived' });
    }
    catch (err) {
        console.error('Failed to archive campaign:', err);
        res.status(500).json({ error: 'Failed to archive campaign' });
    }
});
// Unarchive campaign
router.post('/email/:id/unarchive', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabaseAdmin
            .from('email_campaigns')
            .update({
            status: 'draft',
            archived_at: null,
            archived_by: null,
        })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        res.json({ campaign: data, message: 'Campaign unarchived' });
    }
    catch (err) {
        console.error('Failed to unarchive campaign:', err);
        res.status(500).json({ error: 'Failed to unarchive campaign' });
    }
});
// Delete campaign (only drafts)
router.delete('/email/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Check if campaign can be deleted
        const { data: existing } = await supabaseAdmin
            .from('email_campaigns')
            .select('status')
            .eq('id', id)
            .single();
        if (!existing) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        if (existing.status !== 'draft' && existing.status !== 'archived') {
            return res.status(400).json({ error: 'Only draft or archived campaigns can be deleted' });
        }
        const { error } = await supabaseAdmin
            .from('email_campaigns')
            .delete()
            .eq('id', id);
        if (error)
            throw error;
        res.json({ message: 'Campaign deleted' });
    }
    catch (err) {
        console.error('Failed to delete campaign:', err);
        res.status(500).json({ error: 'Failed to delete campaign' });
    }
});
// Get recipient preview for a segment
router.get('/email/recipients/:segment', async (req, res) => {
    try {
        const { segment } = req.params;
        const recipients = await getRecipientsBySegment(segment);
        res.json({
            segment,
            count: recipients.length,
            preview: recipients.slice(0, 10).map(r => ({
                email: r.email,
                displayName: r.display_name,
            })),
        });
    }
    catch (err) {
        console.error('Failed to fetch recipients:', err);
        res.status(500).json({ error: 'Failed to fetch recipients' });
    }
});
// ============================================
// SMS CAMPAIGNS
// ============================================
const smsCampaignSchema = z.object({
    name: z.string().min(1).max(255),
    message: z.string().min(1).max(1600), // SMS limit
    recipient_segment: z.enum(['all', 'active', 'commissioners', 'phone_verified', 'custom']),
    custom_recipients: z.array(z.string()).optional(), // Phone numbers
    scheduled_at: z.string().datetime().optional().nullable(),
    send_immediately: z.boolean().optional(),
});
// List SMS campaigns
router.get('/sms', async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;
        let query = supabaseAdmin
            .from('sms_campaigns')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(Number(offset), Number(offset) + Number(limit) - 1);
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }
        const { data, error, count } = await query;
        if (error)
            throw error;
        res.json({
            campaigns: data || [],
            total: count || 0,
            pagination: {
                limit: Number(limit),
                offset: Number(offset),
                hasMore: (count || 0) > Number(offset) + Number(limit),
            },
        });
    }
    catch (err) {
        console.error('Failed to fetch SMS campaigns:', err);
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
});
// Create SMS campaign
router.post('/sms', async (req, res) => {
    try {
        const userId = req.user?.id;
        const parsed = smsCampaignSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
        }
        const { send_immediately, ...campaignData } = parsed.data;
        let status = 'draft';
        if (send_immediately) {
            status = 'sending';
        }
        else if (campaignData.scheduled_at) {
            status = 'scheduled';
        }
        const { data, error } = await supabaseAdmin
            .from('sms_campaigns')
            .insert({
            ...campaignData,
            status,
            created_by: userId,
            updated_by: userId,
        })
            .select()
            .single();
        if (error)
            throw error;
        if (send_immediately && data) {
            sendSmsCampaignNow(data.id).catch(err => {
                console.error('Failed to send SMS campaign:', err);
            });
        }
        res.status(201).json({
            campaign: data,
            message: send_immediately ? 'SMS campaign is being sent' : 'SMS campaign created',
        });
    }
    catch (err) {
        console.error('Failed to create SMS campaign:', err);
        res.status(500).json({ error: 'Failed to create SMS campaign' });
    }
});
// Send SMS campaign now
router.post('/sms/:id/send', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: campaign } = await supabaseAdmin
            .from('sms_campaigns')
            .select('*')
            .eq('id', id)
            .single();
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        if (campaign.status === 'sent') {
            return res.status(400).json({ error: 'Campaign has already been sent' });
        }
        await supabaseAdmin
            .from('sms_campaigns')
            .update({ status: 'sending' })
            .eq('id', id);
        sendSmsCampaignNow(id).catch(err => {
            console.error('Failed to send SMS campaign:', err);
        });
        res.json({ message: 'SMS campaign is being sent' });
    }
    catch (err) {
        console.error('Failed to send SMS campaign:', err);
        res.status(500).json({ error: 'Failed to send campaign' });
    }
});
// Archive SMS campaign
router.post('/sms/:id/archive', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const { data, error } = await supabaseAdmin
            .from('sms_campaigns')
            .update({
            status: 'archived',
            archived_at: new Date().toISOString(),
            archived_by: userId,
        })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        res.json({ campaign: data, message: 'Campaign archived' });
    }
    catch (err) {
        console.error('Failed to archive SMS campaign:', err);
        res.status(500).json({ error: 'Failed to archive campaign' });
    }
});
// Get SMS recipients preview
router.get('/sms/recipients/:segment', async (req, res) => {
    try {
        const { segment } = req.params;
        const recipients = await getSmsRecipientsBySegment(segment);
        res.json({
            segment,
            count: recipients.length,
            preview: recipients.slice(0, 10).map(r => ({
                phone: r.phone?.replace(/\d{4}$/, '****'), // Mask last 4 digits
                displayName: r.display_name,
            })),
        });
    }
    catch (err) {
        console.error('Failed to fetch SMS recipients:', err);
        res.status(500).json({ error: 'Failed to fetch recipients' });
    }
});
// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Get recipients based on segment
 */
async function getRecipientsBySegment(segment) {
    let query = supabaseAdmin
        .from('users')
        .select('id, email, display_name, notification_email')
        .eq('notification_email', true);
    switch (segment) {
        case 'active':
            // Users who have been active in the current season
            const { data: activeSeason } = await supabaseAdmin
                .from('seasons')
                .select('id')
                .eq('is_active', true)
                .single();
            if (activeSeason) {
                const { data: activeMembers } = await supabaseAdmin
                    .from('league_members')
                    .select('user_id, leagues!inner(season_id)')
                    .eq('leagues.season_id', activeSeason.id);
                const activeUserIds = [...new Set(activeMembers?.map(m => m.user_id) || [])];
                query = query.in('id', activeUserIds);
            }
            break;
        case 'commissioners':
            const { data: leagues } = await supabaseAdmin
                .from('leagues')
                .select('commissioner_id')
                .eq('status', 'active');
            const commissionerIds = [...new Set(leagues?.map(l => l.commissioner_id) || [])];
            query = query.in('id', commissionerIds);
            break;
        case 'picked':
            // Users who have made a pick this week
            const { data: nextEpisode } = await supabaseAdmin
                .from('episodes')
                .select('id')
                .gt('picks_lock_at', new Date().toISOString())
                .order('picks_lock_at', { ascending: true })
                .limit(1)
                .single();
            if (nextEpisode) {
                const { data: picks } = await supabaseAdmin
                    .from('weekly_picks')
                    .select('user_id')
                    .eq('episode_id', nextEpisode.id);
                const pickedUserIds = [...new Set(picks?.map(p => p.user_id) || [])];
                query = query.in('id', pickedUserIds);
            }
            break;
        case 'not_picked':
            // Users who have NOT made a pick this week
            const { data: upcomingEpisode } = await supabaseAdmin
                .from('episodes')
                .select('id')
                .gt('picks_lock_at', new Date().toISOString())
                .order('picks_lock_at', { ascending: true })
                .limit(1)
                .single();
            if (upcomingEpisode) {
                const { data: pickedUsers } = await supabaseAdmin
                    .from('weekly_picks')
                    .select('user_id')
                    .eq('episode_id', upcomingEpisode.id);
                const pickedIds = new Set(pickedUsers?.map(p => p.user_id) || []);
                // Get all users who should have picked
                const { data: allMembers } = await supabaseAdmin
                    .from('league_members')
                    .select('user_id');
                const memberIds = [...new Set(allMembers?.map(m => m.user_id) || [])];
                const notPickedIds = memberIds.filter(id => !pickedIds.has(id));
                query = query.in('id', notPickedIds);
            }
            break;
        case 'all':
        default:
            // All users with email notifications enabled
            break;
    }
    const { data, error } = await query;
    if (error)
        throw error;
    return (data || []).map(u => ({
        email: u.email,
        display_name: u.display_name,
        user_id: u.id,
    }));
}
/**
 * Get SMS recipients based on segment
 */
async function getSmsRecipientsBySegment(segment) {
    let query = supabaseAdmin
        .from('users')
        .select('id, phone, display_name, notification_sms, phone_verified')
        .eq('notification_sms', true)
        .eq('phone_verified', true)
        .not('phone', 'is', null);
    switch (segment) {
        case 'active':
            const { data: activeSeason } = await supabaseAdmin
                .from('seasons')
                .select('id')
                .eq('is_active', true)
                .single();
            if (activeSeason) {
                const { data: activeMembers } = await supabaseAdmin
                    .from('league_members')
                    .select('user_id, leagues!inner(season_id)')
                    .eq('leagues.season_id', activeSeason.id);
                const activeUserIds = [...new Set(activeMembers?.map(m => m.user_id) || [])];
                query = query.in('id', activeUserIds);
            }
            break;
        case 'commissioners':
            const { data: leagues } = await supabaseAdmin
                .from('leagues')
                .select('commissioner_id')
                .eq('status', 'active');
            const commissionerIds = [...new Set(leagues?.map(l => l.commissioner_id) || [])];
            query = query.in('id', commissionerIds);
            break;
        case 'phone_verified':
        case 'all':
        default:
            // All verified users with SMS enabled
            break;
    }
    const { data, error } = await query;
    if (error)
        throw error;
    return (data || []).filter(u => u.phone).map(u => ({
        phone: u.phone,
        display_name: u.display_name,
        user_id: u.id,
    }));
}
/**
 * Send email campaign immediately
 */
async function sendEmailCampaignNow(campaignId) {
    try {
        const { data: campaign, error: fetchError } = await supabaseAdmin
            .from('email_campaigns')
            .select('*')
            .eq('id', campaignId)
            .single();
        if (fetchError || !campaign) {
            throw new Error('Campaign not found');
        }
        // Get recipients
        let recipients;
        if (campaign.recipient_segment === 'custom' && campaign.custom_recipients?.length) {
            recipients = campaign.custom_recipients.map((email) => ({
                email,
                display_name: email.split('@')[0],
                user_id: '',
            }));
        }
        else {
            recipients = await getRecipientsBySegment(campaign.recipient_segment);
        }
        if (recipients.length === 0) {
            await supabaseAdmin
                .from('email_campaigns')
                .update({
                status: 'failed',
                error_message: 'No recipients found for this segment',
            })
                .eq('id', campaignId);
            return;
        }
        let sent = 0;
        let failed = 0;
        const errors = [];
        // Send to each recipient
        for (const recipient of recipients) {
            try {
                // Replace variables in subject and body
                let subject = campaign.subject;
                let html = campaign.html_body;
                subject = subject.replace(/\{\{displayName\}\}/g, recipient.display_name);
                html = html.replace(/\{\{displayName\}\}/g, recipient.display_name);
                if (resend) {
                    await resend.emails.send({
                        from: FROM_EMAIL,
                        to: recipient.email,
                        reply_to: REPLY_TO,
                        subject,
                        html,
                    });
                    sent++;
                }
                else {
                    console.log(`[Campaign] Would send to ${recipient.email}: ${subject}`);
                    sent++;
                }
            }
            catch (err) {
                failed++;
                const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                errors.push(`${recipient.email}: ${errorMsg}`);
                console.error(`Failed to send to ${recipient.email}:`, err);
            }
        }
        // Update campaign status
        await supabaseAdmin
            .from('email_campaigns')
            .update({
            status: failed === recipients.length ? 'failed' : 'sent',
            sent_at: new Date().toISOString(),
            recipients_count: recipients.length,
            sent_count: sent,
            failed_count: failed,
            error_message: errors.length > 0 ? errors.slice(0, 10).join('\n') : null,
        })
            .eq('id', campaignId);
        console.log(`Email campaign ${campaignId} sent: ${sent}/${recipients.length} succeeded`);
    }
    catch (err) {
        console.error('Error sending email campaign:', err);
        await supabaseAdmin
            .from('email_campaigns')
            .update({
            status: 'failed',
            error_message: err instanceof Error ? err.message : 'Unknown error',
        })
            .eq('id', campaignId);
    }
}
/**
 * Send SMS campaign immediately
 */
async function sendSmsCampaignNow(campaignId) {
    try {
        const { data: campaign, error: fetchError } = await supabaseAdmin
            .from('sms_campaigns')
            .select('*')
            .eq('id', campaignId)
            .single();
        if (fetchError || !campaign) {
            throw new Error('Campaign not found');
        }
        // Get recipients
        let recipients;
        if (campaign.recipient_segment === 'custom' && campaign.custom_recipients?.length) {
            recipients = campaign.custom_recipients.map((phone) => ({
                phone,
                display_name: '',
                user_id: '',
            }));
        }
        else {
            recipients = await getSmsRecipientsBySegment(campaign.recipient_segment);
        }
        if (recipients.length === 0) {
            await supabaseAdmin
                .from('sms_campaigns')
                .update({
                status: 'failed',
                error_message: 'No recipients found for this segment',
            })
                .eq('id', campaignId);
            return;
        }
        let sent = 0;
        let failed = 0;
        const errors = [];
        for (const recipient of recipients) {
            try {
                // Replace variables
                let message = campaign.message;
                if (recipient.display_name) {
                    message = message.replace(/\{\{displayName\}\}/g, recipient.display_name);
                }
                const result = await sendSMS({
                    to: recipient.phone,
                    text: message,
                    isTransactional: false, // Campaign = promotional
                });
                if (result.success) {
                    sent++;
                }
                else {
                    failed++;
                    if (result.reason) {
                        errors.push(`${recipient.phone}: ${result.reason}`);
                    }
                }
            }
            catch (err) {
                failed++;
                const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                errors.push(`${recipient.phone}: ${errorMsg}`);
                console.error(`Failed to send SMS to ${recipient.phone}:`, err);
            }
        }
        // Update campaign status
        await supabaseAdmin
            .from('sms_campaigns')
            .update({
            status: failed === recipients.length ? 'failed' : 'sent',
            sent_at: new Date().toISOString(),
            recipients_count: recipients.length,
            sent_count: sent,
            failed_count: failed,
            error_message: errors.length > 0 ? errors.slice(0, 10).join('\n') : null,
        })
            .eq('id', campaignId);
        console.log(`SMS campaign ${campaignId} sent: ${sent}/${recipients.length} succeeded`);
    }
    catch (err) {
        console.error('Error sending SMS campaign:', err);
        await supabaseAdmin
            .from('sms_campaigns')
            .update({
            status: 'failed',
            error_message: err instanceof Error ? err.message : 'Unknown error',
        })
            .eq('id', campaignId);
    }
}
export default router;
// Export for job scheduler to process scheduled campaigns
export { sendEmailCampaignNow, sendSmsCampaignNow };
//# sourceMappingURL=campaigns.js.map