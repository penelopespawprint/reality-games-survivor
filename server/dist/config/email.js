import { Resend } from 'resend';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
export const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
// IMPORTANT: FROM_EMAIL must use the verified domain (realitygamesfantasyleague.com)
// Using an unverified domain will cause 403 "domain not verified" errors
export const FROM_EMAIL = 'Reality Games: Survivor <noreply@realitygamesfantasyleague.com>';
export const REPLY_TO = 'support@realitygamesfantasyleague.com';
export async function sendEmail({ to, subject, html, text }) {
    try {
        if (!resend) {
            console.log(`[Email] Resend API key not configured - would send to ${to}: ${subject}`);
            return true;
        }
        const recipients = Array.isArray(to) ? to : [to];
        console.log(`[Email] Sending to ${recipients.join(', ')}: ${subject}`);
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: recipients,
            reply_to: REPLY_TO,
            subject,
            html,
            text,
        });
        if (error) {
            // Log detailed error information for debugging
            console.error('[Email] Send error:', {
                name: error.name,
                message: error.message,
                to: recipients,
                subject,
                from: FROM_EMAIL,
            });
            return false;
        }
        console.log(`[Email] Sent successfully: ${data?.id} to ${recipients.join(', ')}`);
        return true;
    }
    catch (err) {
        console.error('[Email] Send failed with exception:', err);
        return false;
    }
}
// Export email queue functions for reliable email delivery
export { sendEmailCritical, enqueueEmail, processEmailQueue, getQueueStats } from '../lib/email-queue.js';
//# sourceMappingURL=email.js.map