import { Resend } from 'resend';
export declare const resend: Resend | null;
export declare const FROM_EMAIL = "Reality Games: Survivor <noreply@rgfl.app>";
export declare const REPLY_TO = "support@realitygamesfantasyleague.com";
interface EmailParams {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
}
export declare function sendEmail({ to, subject, html, text }: EmailParams): Promise<boolean>;
export { sendEmailCritical, enqueueEmail, processEmailQueue, getQueueStats } from '../lib/email-queue.js';
//# sourceMappingURL=email.d.ts.map