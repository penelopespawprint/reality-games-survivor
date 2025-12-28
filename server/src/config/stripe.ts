import Stripe from 'stripe';

// Stripe configured lazily - only fails when actually used without config
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

if (!STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY not set - payment features disabled');
}

// Properly typed: stripe is null when not configured
// All routes using stripe MUST check for null before using
export const stripe: Stripe | null = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY)
  : null;

/**
 * Helper to safely get stripe instance
 * @throws Error if stripe is not configured
 */
export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.');
  }
  return stripe;
}
