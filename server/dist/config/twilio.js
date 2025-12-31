// Twilio SMS Configuration
import twilio from 'twilio';
import { randomInt } from 'crypto';
import { supabaseAdmin } from './supabase.js';
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
// Initialize Twilio client (lazy, only when credentials are available)
let twilioClient = null;
function getClient() {
    if (!accountSid || !authToken) {
        console.warn('TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set, SMS disabled');
        return null;
    }
    if (!twilioClient) {
        twilioClient = twilio(accountSid, authToken);
    }
    return twilioClient;
}
/**
 * Normalize phone number to E.164 format
 */
export function normalizePhone(phone) {
    const digits = phone.replace(/\D/g, '');
    // Add country code if not present
    if (digits.length === 10) {
        return `+1${digits}`;
    }
    if (digits.length === 11 && digits.startsWith('1')) {
        return `+${digits}`;
    }
    // Already has country code
    if (!digits.startsWith('+')) {
        return `+${digits}`;
    }
    return digits;
}
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
export async function sendSMS({ to, text, isTransactional = false }) {
    const client = getClient();
    if (!client) {
        return { sid: 'skipped', success: false, skipped: true, reason: 'Twilio not configured' };
    }
    if (!fromNumber) {
        console.warn('TWILIO_PHONE_NUMBER not set, skipping SMS');
        return { sid: 'skipped', success: false, skipped: true, reason: 'From number not set' };
    }
    // CRITICAL: Enforce STOP preferences for non-transactional messages
    // Transactional = verification codes, user-initiated actions (always send)
    // Marketing/notifications = must check opt-in status (FCC/TCPA compliance)
    if (!isTransactional) {
        const normalizedPhone = normalizePhone(to);
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('notification_sms')
            .eq('phone', normalizedPhone)
            .single();
        if (error) {
            console.warn(`Failed to check SMS preferences for ${normalizedPhone}:`, error);
            // Fail safe: if we can't verify opt-in, don't send (compliance first)
            return { sid: 'skipped', success: false, skipped: true, reason: 'Unable to verify opt-in status' };
        }
        if (!user || !user.notification_sms) {
            console.log(`User ${normalizedPhone} has opted out of SMS notifications (STOP command)`);
            return { sid: 'skipped', success: false, skipped: true, reason: 'User opted out via STOP' };
        }
    }
    try {
        const message = await client.messages.create({
            body: text,
            from: fromNumber,
            to: normalizePhone(to),
        });
        return {
            sid: message.sid,
            success: true,
        };
    }
    catch (err) {
        console.error('Failed to send SMS:', err);
        return { sid: '', success: false };
    }
}
/**
 * Generate a cryptographically secure 6-digit verification code
 */
export function generateVerificationCode() {
    // randomInt is cryptographically secure (uses crypto.getRandomValues internally)
    return randomInt(100000, 999999).toString();
}
/**
 * Send verification SMS (transactional - bypasses STOP/unsubscribe)
 */
export async function sendVerificationSMS(phone, code) {
    const result = await sendSMS({
        to: phone,
        text: `Reality Games | Your verification code is: ${code}\n\nThis code expires in 10 minutes.`,
        isTransactional: true,
    });
    return result.success;
}
/**
 * Validate Twilio webhook signature
 */
export function validateTwilioWebhook(signature, url, params) {
    if (!authToken) {
        console.warn('TWILIO_AUTH_TOKEN not set, cannot validate webhook');
        return false;
    }
    return twilio.validateRequest(authToken, signature, url, params);
}
export { twilio };
//# sourceMappingURL=twilio.js.map