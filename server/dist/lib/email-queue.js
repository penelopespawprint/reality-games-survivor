import { supabaseAdmin } from '../config/supabase.js';
import { sendEmail } from '../config/email.js';
/**
 * Enqueue an email for asynchronous delivery with retry logic
 * For non-critical emails like reminders, notifications, etc.
 */
export async function enqueueEmail(params) {
    try {
        const to_email = Array.isArray(params.to) ? params.to[0] : params.to;
        const type = params.type || 'normal';
        // Critical emails: 3 retries over 20 minutes (1min, 5min, 15min)
        // Normal emails: 3 retries over 2 hours (5min, 30min, 120min)
        const max_attempts = 3;
        const { data, error } = await supabaseAdmin
            .from('email_queue')
            .insert({
            type,
            to_email,
            subject: params.subject,
            html: params.html,
            text: params.text,
            max_attempts,
            attempts: 0,
        })
            .select('id')
            .single();
        if (error) {
            console.error('Failed to enqueue email:', error);
            return null;
        }
        console.log(`Email enqueued: ${data.id} (${type}) to ${to_email}`);
        return data.id;
    }
    catch (err) {
        console.error('Error enqueueing email:', err);
        return null;
    }
}
/**
 * Send critical email with immediate retry logic
 * For payment receipts, pick confirmations, etc. that must be delivered
 */
export async function sendEmailCritical(params) {
    const maxRetries = 3;
    const retryDelays = [1000, 5000, 15000]; // 1s, 5s, 15s
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const success = await sendEmail(params);
            if (success) {
                if (attempt > 0) {
                    console.log(`Critical email sent after ${attempt + 1} attempts`);
                }
                return true;
            }
            // If not successful and not last attempt, wait and retry
            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
            }
        }
        catch (err) {
            console.error(`Critical email attempt ${attempt + 1} failed:`, err);
            // If last attempt failed, fall back to queue
            if (attempt === maxRetries - 1) {
                console.error('All retry attempts failed, enqueueing for background delivery');
                await enqueueEmail({ ...params, type: 'critical' });
                return false;
            }
            // Wait before next retry
            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
            }
        }
    }
    return false;
}
/**
 * Process pending emails from the queue
 * Called by cron job every 5 minutes
 */
export async function processEmailQueue() {
    try {
        // Get emails ready to be sent (no next_retry_at or retry time has passed)
        const { data: pendingEmails, error } = await supabaseAdmin
            .from('email_queue')
            .select('*')
            .is('sent_at', null)
            .is('failed_at', null)
            .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
            .order('created_at', { ascending: true })
            .limit(50); // Process 50 at a time
        if (error) {
            console.error('Failed to fetch pending emails:', error);
            return { processed: 0, sent: 0, failed: 0 };
        }
        if (!pendingEmails || pendingEmails.length === 0) {
            return { processed: 0, sent: 0, failed: 0 };
        }
        let sent = 0;
        let failed = 0;
        for (const email of pendingEmails) {
            const success = await processSingleEmail(email);
            if (success) {
                sent++;
            }
            else {
                failed++;
            }
        }
        console.log(`Email queue processed: ${pendingEmails.length} emails (${sent} sent, ${failed} failed)`);
        return { processed: pendingEmails.length, sent, failed };
    }
    catch (err) {
        console.error('Error processing email queue:', err);
        return { processed: 0, sent: 0, failed: 0 };
    }
}
/**
 * Process a single email from the queue
 */
async function processSingleEmail(email) {
    try {
        // Attempt to send
        const success = await sendEmail({
            to: email.to_email,
            subject: email.subject,
            html: email.html,
            text: email.text,
        });
        if (success) {
            // Mark as sent
            await supabaseAdmin
                .from('email_queue')
                .update({ sent_at: new Date().toISOString() })
                .eq('id', email.id);
            console.log(`✓ Email sent: ${email.id} to ${email.to_email}`);
            return true;
        }
        else {
            // Send failed, increment attempts
            return await handleEmailFailure(email);
        }
    }
    catch (err) {
        console.error(`Error sending email ${email.id}:`, err);
        return await handleEmailFailure(email, err instanceof Error ? err.message : 'Unknown error');
    }
}
/**
 * Handle email send failure with retry logic
 */
async function handleEmailFailure(email, errorMessage) {
    const attempts = (email.attempts || 0) + 1;
    const maxAttempts = email.max_attempts || 3;
    if (attempts >= maxAttempts) {
        // Max retries reached, move to dead letter queue
        await moveToDeadLetterQueue(email, errorMessage);
        await supabaseAdmin
            .from('email_queue')
            .update({
            attempts,
            last_error: errorMessage || 'Max retries reached',
            failed_at: new Date().toISOString(),
        })
            .eq('id', email.id);
        console.error(`✗ Email failed permanently: ${email.id} after ${attempts} attempts`);
        return false;
    }
    // Calculate next retry time with exponential backoff
    const backoffMinutes = email.type === 'critical'
        ? [1, 5, 15][attempts - 1] || 15 // Critical: 1min, 5min, 15min
        : [5, 30, 120][attempts - 1] || 120; // Normal: 5min, 30min, 2hrs
    const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
    await supabaseAdmin
        .from('email_queue')
        .update({
        attempts,
        last_error: errorMessage || 'Send failed',
        next_retry_at: nextRetryAt.toISOString(),
    })
        .eq('id', email.id);
    console.log(`⏳ Email retry scheduled: ${email.id} (attempt ${attempts}/${maxAttempts}) at ${nextRetryAt.toISOString()}`);
    return false;
}
/**
 * Move failed email to dead letter queue for admin review
 */
async function moveToDeadLetterQueue(email, errorMessage) {
    try {
        await supabaseAdmin.from('failed_emails').insert({
            email_job: email,
            failed_at: new Date().toISOString(),
            notes: errorMessage || 'Failed after max retry attempts',
        });
        console.log(`Moved email ${email.id} to dead letter queue`);
    }
    catch (err) {
        console.error('Failed to move email to dead letter queue:', err);
    }
}
/**
 * Get queue statistics for monitoring
 */
export async function getQueueStats() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: pending } = await supabaseAdmin
            .from('email_queue')
            .select('*', { count: 'exact', head: true })
            .is('sent_at', null)
            .is('failed_at', null);
        const { count: processing } = await supabaseAdmin
            .from('email_queue')
            .select('*', { count: 'exact', head: true })
            .is('sent_at', null)
            .is('failed_at', null)
            .not('next_retry_at', 'is', null);
        const { count: sent_today } = await supabaseAdmin
            .from('email_queue')
            .select('*', { count: 'exact', head: true })
            .gte('sent_at', today.toISOString());
        const { count: failed_today } = await supabaseAdmin
            .from('email_queue')
            .select('*', { count: 'exact', head: true })
            .gte('failed_at', today.toISOString());
        return {
            pending: pending || 0,
            processing: processing || 0,
            sent_today: sent_today || 0,
            failed_today: failed_today || 0,
        };
    }
    catch (err) {
        console.error('Error getting queue stats:', err);
        return { pending: 0, processing: 0, sent_today: 0, failed_today: 0 };
    }
}
//# sourceMappingURL=email-queue.js.map