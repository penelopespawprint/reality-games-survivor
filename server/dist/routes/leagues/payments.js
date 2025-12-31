/**
 * League Payment Routes
 *
 * Handles Stripe checkout and payment status for paid leagues
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { requireStripe } from '../../config/stripe.js';
import { checkoutLimiter } from '../../config/rateLimit.js';
const router = Router();
// POST /api/leagues/:id/join/checkout - Create Stripe checkout session
// Rate limited to prevent checkout session abuse (10 per hour)
router.post('/:id/join/checkout', authenticate, checkoutLimiter, async (req, res) => {
    try {
        const userId = req.user.id;
        const leagueId = req.params.id;
        // Get league - use admin client to bypass RLS (user might not be a member yet)
        const { data: league, error: leagueError } = await supabaseAdmin
            .from('leagues')
            .select('*')
            .eq('id', leagueId)
            .single();
        if (leagueError || !league) {
            return res.status(404).json({ error: 'League not found' });
        }
        if (!league.require_donation || !league.donation_amount) {
            return res.status(400).json({ error: 'This league does not require payment' });
        }
        // CRITICAL: Use FRONTEND_URL for redirects (frontend domain), NEVER BASE_URL (points to API)
        // ALWAYS use hardcoded production URL to prevent redirect issues - never trust env vars for payments
        // This prevents any rgfl.app or api.rgfl.app redirects that break payments
        const frontendUrl = 'https://survivor.realitygamesfantasyleague.com';
        // Check if user already has a pending payment for this league
        const { data: existingPending } = await supabaseAdmin
            .from('payments')
            .select('stripe_session_id')
            .eq('league_id', leagueId)
            .eq('user_id', userId)
            .eq('status', 'pending')
            .single();
        // If there's a pending session, handle all possible payment states
        if (existingPending?.stripe_session_id) {
            const { handleExistingSession } = await import('../../lib/stripe-helpers.js');
            const sessionResult = await handleExistingSession(requireStripe(), existingPending.stripe_session_id, userId, leagueId);
            if (sessionResult.action === 'reuse') {
                // Session still valid, return existing checkout URL
                return res.json({
                    checkout_url: sessionResult.url,
                    session_id: existingPending.stripe_session_id,
                    message: sessionResult.message
                });
            }
            if (sessionResult.action === 'wait') {
                // Payment is processing (3D Secure or in-flight)
                // DO NOT create new session - this would double-charge the user
                return res.json({
                    checkout_url: sessionResult.url,
                    session_id: existingPending.stripe_session_id,
                    message: sessionResult.message,
                    processing: true
                });
            }
            // action === 'expire': Session expired/completed, continue to create new one
        }
        const session = await requireStripe().checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `${league.name} - League Entry`,
                            description: league.donation_notes || 'League entry fee',
                        },
                        unit_amount: Math.round(league.donation_amount * 100),
                    },
                    quantity: 1,
                }],
            metadata: {
                league_id: leagueId,
                user_id: userId,
                type: 'league_donation',
            },
            success_url: `${frontendUrl}/leagues/${leagueId}?joined=true`,
            cancel_url: `${frontendUrl}/join/${league.code}?cancelled=true`,
            expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min expiration
        });
        // Record pending payment for recovery tracking
        await supabaseAdmin.from('payments').insert({
            user_id: userId,
            league_id: leagueId,
            amount: league.donation_amount,
            currency: 'usd',
            stripe_session_id: session.id,
            status: 'pending',
        });
        res.json({ checkout_url: session.url, session_id: session.id });
    }
    catch (err) {
        console.error('POST /api/leagues/:id/join/checkout error:', err);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});
// GET /api/leagues/:id/join/status - Check payment status
router.get('/:id/join/status', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const leagueId = req.params.id;
        // Check if member - use admin to bypass RLS
        const { data: membership } = await supabaseAdmin
            .from('league_members')
            .select('*')
            .eq('league_id', leagueId)
            .eq('user_id', userId)
            .single();
        res.json({ paid: !!membership, membership });
    }
    catch (err) {
        console.error('GET /api/leagues/:id/join/status error:', err);
        res.status(500).json({ error: 'Failed to check status' });
    }
});
export default router;
//# sourceMappingURL=payments.js.map