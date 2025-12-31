import Stripe from 'stripe';
export type StripeSessionStatus = 'open' | 'complete' | 'expired' | 'requires_payment' | 'processing';
export interface SessionHandlerResult {
    action: 'reuse' | 'expire' | 'wait';
    url?: string;
    message?: string;
}
/**
 * Handle existing Stripe checkout session states
 * Prevents double-charging by properly handling all payment states
 */
export declare function handleExistingSession(stripe: Stripe, sessionId: string, userId: string, leagueId: string): Promise<SessionHandlerResult>;
/**
 * Create a new Stripe checkout session with proper error handling
 */
export declare function createCheckoutSession(stripe: Stripe, params: Stripe.Checkout.SessionCreateParams): Promise<Stripe.Checkout.Session>;
//# sourceMappingURL=stripe-helpers.d.ts.map