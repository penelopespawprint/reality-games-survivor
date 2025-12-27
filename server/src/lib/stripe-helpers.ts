import Stripe from 'stripe';
import { supabaseAdmin } from '../config/supabase.js';

export type StripeSessionStatus =
  | 'open'
  | 'complete'
  | 'expired'
  | 'requires_payment'  // 3D Secure
  | 'processing';        // Payment in flight

export interface SessionHandlerResult {
  action: 'reuse' | 'expire' | 'wait';
  url?: string;
  message?: string;
}

/**
 * Handle existing Stripe checkout session states
 * Prevents double-charging by properly handling all payment states
 */
export async function handleExistingSession(
  stripe: Stripe,
  sessionId: string,
  userId: string,
  leagueId: string
): Promise<SessionHandlerResult> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const status = session.status;

    // Handle known session states
    if (status === 'open') {
      // Session still valid, user can continue checkout
      return {
        action: 'reuse',
        url: session.url || undefined,
        message: 'Existing checkout session found'
      };
    }

    if (status === 'complete') {
      // Payment succeeded, mark as completed
      await supabaseAdmin
        .from('payments')
        .update({ status: 'completed' })
        .eq('stripe_session_id', sessionId);

      return {
        action: 'expire',
        message: 'Payment already completed'
      };
    }

    if (status === 'expired') {
      // Session timed out, mark as failed
      await supabaseAdmin
        .from('payments')
        .update({ status: 'failed' })
        .eq('stripe_session_id', sessionId);

      return {
        action: 'expire',
        message: 'Checkout session expired'
      };
    }

    // Handle payment_status for processing states (3D Secure, etc.)
    if (session.payment_status === 'unpaid' && status !== 'expired') {
      // Payment still in progress - DO NOT create new session
      return {
        action: 'wait',
        url: session.url || undefined,
        message: 'Payment is being processed, please wait'
      };
    }

    // Unknown status or edge case, safe to expire and create new
    console.warn(`Unknown Stripe session status: ${status}, payment_status: ${session.payment_status}`);
    return {
      action: 'expire',
      message: 'Session in unknown state, creating new checkout'
    };
  } catch (error) {
    console.error('Error handling existing Stripe session:', error);
    // If we can't retrieve the session, safe to create new one
    return {
      action: 'expire',
      message: 'Could not retrieve existing session'
    };
  }
}

/**
 * Create a new Stripe checkout session with proper error handling
 */
export async function createCheckoutSession(
  stripe: Stripe,
  params: Stripe.Checkout.SessionCreateParams
): Promise<Stripe.Checkout.Session> {
  try {
    const session = await stripe.checkout.sessions.create(params);
    return session;
  } catch (error) {
    console.error('Failed to create Stripe checkout session:', error);
    throw new Error('Failed to create payment session');
  }
}
