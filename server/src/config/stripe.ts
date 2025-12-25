import Stripe from 'stripe';
import { features } from './env.js';

/**
 * Stripe client configuration
 *
 * IMPORTANT: If STRIPE_SECRET_KEY is not set, the stripe client will be null.
 * Always check features.payments before using stripe.
 */

// Only initialize Stripe if the key is configured
let stripeClient: Stripe | null = null;

if (process.env.STRIPE_SECRET_KEY) {
  stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
  });
} else if (process.env.NODE_ENV !== 'test') {
  console.warn('⚠️  Stripe not configured - payment features disabled');
}

/**
 * Get the Stripe client, throwing if payments are not enabled
 * Use this in routes that require Stripe to ensure proper error handling
 */
export function getStripe(): Stripe {
  if (!stripeClient) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY to enable payments.');
  }
  return stripeClient;
}

/**
 * Check if Stripe is available (for optional payment features)
 */
export function isStripeEnabled(): boolean {
  return features.payments && stripeClient !== null;
}

// Export for backwards compatibility, but prefer getStripe() for proper error handling
export const stripe = stripeClient as Stripe;

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
