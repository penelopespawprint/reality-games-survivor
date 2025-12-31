/**
 * Enqueue an email for asynchronous delivery with retry logic
 * For non-critical emails like reminders, notifications, etc.
 */
export declare function enqueueEmail(params: {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    type?: 'critical' | 'normal';
}): Promise<string | null>;
/**
 * Send critical email with immediate retry logic
 * For payment receipts, pick confirmations, etc. that must be delivered
 */
export declare function sendEmailCritical(params: {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
}): Promise<boolean>;
/**
 * Process pending emails from the queue
 * Called by cron job every 5 minutes
 */
export declare function processEmailQueue(): Promise<{
    processed: number;
    sent: number;
    failed: number;
}>;
/**
 * Get queue statistics for monitoring
 */
export declare function getQueueStats(): Promise<{
    pending: number;
    processing: number;
    sent_today: number;
    failed_today: number;
}>;
//# sourceMappingURL=email-queue.d.ts.map