import axios from 'axios';
import { createLogger } from "./logger.js";
const logger = createLogger("simpletexting");

const API_BASE = process.env.SIMPLETEXTING_BASE_URL || 'https://api-app2.simpletexting.com/v2';
const API_TOKEN = process.env.SIMPLETEXTING_API_TOKEN;
const ACCOUNT_PHONE = process.env.SIMPLETEXTING_ACCOUNT_PHONE;

if (!API_TOKEN) {
  logger.warn('⚠️  SIMPLETEXTING_API_TOKEN not set - SMS features disabled');
}

export interface SMSMessage {
  to: string;
  text: string;
}

export interface SMSResponse {
  id: string;
  credits: number;
}

export async function sendSMS(message: SMSMessage): Promise<SMSResponse> {
  if (!API_TOKEN) {
    throw new Error('SimpleTexting API token not configured');
  }

  const response = await axios.post(
    `${API_BASE}/api/messages`,
    {
      contactPhone: normalizePhone(message.to),
      accountPhone: ACCOUNT_PHONE,
      mode: 'SINGLE_SMS_STRICTLY',
      text: message.text
    },
    {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );

  logger.info(`📱 SMS sent to ${message.to}: ${message.text.substring(0, 50)}...`);

  return {
    id: response.data.id,
    credits: response.data.credits
  };
}

export function normalizePhone(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // Add +1 if not present
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return phone; // Return as-is if already formatted
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 11 && digits.startsWith('1')) {
    const area = digits.substring(1, 4);
    const prefix = digits.substring(4, 7);
    const line = digits.substring(7, 11);
    return `(${area}) ${prefix}-${line}`;
  }

  return phone;
}

export function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
}
