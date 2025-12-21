import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn('Warning: RESEND_API_KEY not set - emails will be logged only');
}

export const resend = new Resend(process.env.RESEND_API_KEY || '');

export const FROM_EMAIL = 'RGFL Survivor <noreply@rgfl.app>';
export const REPLY_TO = 'support@rgfl.app';

interface EmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailParams): Promise<boolean> {
  try {
    if (!process.env.RESEND_API_KEY) {
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
  } catch (err) {
    console.error('Email send failed:', err);
    return false;
  }
}
