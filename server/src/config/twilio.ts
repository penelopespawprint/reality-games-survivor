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
}

interface SendSMSResponse {
  sid: string;
  success: boolean;
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
 */
export async function sendSMS({ to, text }: SendSMSOptions): Promise<SendSMSResponse> {
  const client = getClient();

  if (!client) {
    return { sid: 'skipped', success: false };
  }

  if (!fromNumber) {
    console.warn('TWILIO_PHONE_NUMBER not set, skipping SMS');
    return { sid: 'skipped', success: false };
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
 * Send verification SMS
 */
export async function sendVerificationSMS(phone: string, code: string): Promise<boolean> {
  const result = await sendSMS({
    to: phone,
    text: `Reality Games | Your verification code is: ${code}\n\nThis code expires in 10 minutes.`,
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
