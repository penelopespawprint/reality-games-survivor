import twilio from 'twilio';
interface SendSMSOptions {
    to: string;
    text: string;
    /**
     * Set to true for transactional messages (verification codes, user-initiated actions)
     * These bypass STOP/unsubscribe checks as they're required for app functionality.
     * Default: false (promotional/notification messages that honor STOP)
     */
    isTransactional?: boolean;
}
interface SendSMSResponse {
    sid: string;
    success: boolean;
    skipped?: boolean;
    reason?: string;
}
/**
 * Normalize phone number to E.164 format
 */
export declare function normalizePhone(phone: string): string;
/**
 * Send SMS via Twilio API
 *
 * @param options - SMS options
 * @param options.to - Recipient phone number
 * @param options.text - Message text
 * @param options.isTransactional - True for verification codes and user-initiated actions
 * @returns SMS response with success status
 *
 * Note: Non-transactional messages are automatically checked against notification_sms preference.
 * This function enforces STOP compliance at the infrastructure level (FCC/TCPA requirement).
 */
export declare function sendSMS({ to, text, isTransactional }: SendSMSOptions): Promise<SendSMSResponse>;
/**
 * Generate a cryptographically secure 6-digit verification code
 */
export declare function generateVerificationCode(): string;
/**
 * Send verification SMS (transactional - bypasses STOP/unsubscribe)
 */
export declare function sendVerificationSMS(phone: string, code: string): Promise<boolean>;
/**
 * Validate Twilio webhook signature
 */
export declare function validateTwilioWebhook(signature: string, url: string, params: Record<string, string>): boolean;
export { twilio };
//# sourceMappingURL=twilio.d.ts.map