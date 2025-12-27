// Twilio SMS Configuration
import twilio from 'twilio';
import { randomInt } from 'crypto';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client (lazy, only when credentials are available)
let twilioClient: twilio.Twilio | null = null;

function getClient(): twilio.Twilio | null {
  if (!accountSid || !authToken) {
    console.warn('TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set, SMS disabled');
    return null;
  }
  if (!twilioClient) {
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

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
export function normalizePhone(phone: string): string {
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
 * Note: Non-transactional messages should check notification_sms preference before calling this.
 * This function does not check preferences - that's the caller's responsibility.
 */
export async function sendSMS({ to, text, isTransactional = false }: SendSMSOptions): Promise<SendSMSResponse> {
  const client = getClient();

  if (!client) {
    return { sid: 'skipped', success: false, skipped: true, reason: 'Twilio not configured' };
  }

  if (!fromNumber) {
    console.warn('TWILIO_PHONE_NUMBER not set, skipping SMS');
    return { sid: 'skipped', success: false, skipped: true, reason: 'From number not set' };
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
  } catch (err) {
    console.error('Failed to send SMS:', err);
    return { sid: '', success: false };
  }
}

/**
 * Generate a cryptographically secure 6-digit verification code
 */
export function generateVerificationCode(): string {
  // randomInt is cryptographically secure (uses crypto.getRandomValues internally)
  return randomInt(100000, 999999).toString();
}

/**
 * Send verification SMS (transactional - bypasses STOP/unsubscribe)
 */
export async function sendVerificationSMS(phone: string, code: string): Promise<boolean> {
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
export function validateTwilioWebhook(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  if (!authToken) {
    console.warn('TWILIO_AUTH_TOKEN not set, cannot validate webhook');
    return false;
  }
  return twilio.validateRequest(authToken, signature, url, params);
}

export { twilio };
