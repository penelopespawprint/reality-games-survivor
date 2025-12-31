import { Resend } from 'resend';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
export const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
export const FROM_EMAIL = 'Reality Games: Survivor <noreply@rgfl.app>';
export const REPLY_TO = 'support@realitygamesfantasyleague.com';
export async function sendEmail({ to, subject, html, text }) {
    try {
        if (!resend) {
            console.log(`[Email] Would send to ${to}: ${subject}`);
            return true;
        }
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: Array.isArray(to) ? to : [to],
            reply_to: REPLY_TO,
            subject,
            html,
            text,
        });
        if (error) {
            console.error('Email send error:', error);
            return false;
        }
        console.log(`Email sent: ${data?.id}`);
        return true;
    }
    catch (err) {
        console.error('Email send failed:', err);
        return false;
    }
}
// Export email queue functions for reliable email delivery
export { sendEmailCritical, enqueueEmail, processEmailQueue, getQueueStats } from '../lib/email-queue.js';
//# sourceMappingURL=email.js.map