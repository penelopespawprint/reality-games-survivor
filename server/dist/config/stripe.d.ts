import Stripe from 'stripe';
export declare const STRIPE_WEBHOOK_SECRET: string;
export declare const stripe: Stripe | null;
/**
 * Helper to safely get stripe instance
 * @throws Error if stripe is not configured
 */
export declare function requireStripe(): Stripe;
//# sourceMappingURL=stripe.d.ts.map