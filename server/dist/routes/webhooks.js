/**
 * Webhook Routes
 *
 * Handles external webhook integrations:
 * - Stripe payment webhooks
 * - Twilio SMS webhooks
 */
import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireStripe, STRIPE_WEBHOOK_SECRET } from '../config/stripe.js';
import { validateTwilioWebhook } from '../config/twilio.js';
import { EmailService } from '../emails/index.js';
import { processSmsCommand } from '../services/sms/index.js';
const router = Router();
// POST /webhooks/stripe - Handle Stripe events
router.post('/stripe', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = requireStripe().webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                if (session.metadata?.type === 'league_donation') {
                    const { league_id, user_id } = session.metadata;
                    // SECURITY: Verify payment amount matches league fee
                    const { data: league } = await supabaseAdmin
                        .from('leagues')
                        .select('name, donation_amount, require_donation')
                        .eq('id', league_id)
                        .single();
                    if (!league) {
                        console.error(`League ${league_id} not found during payment verification`);
                        throw new Error('League not found');
                    }
                    const paidAmount = (session.amount_total || 0) / 100;
                    const expectedAmount = league.donation_amount;
                    // Verify payment amount matches (allow 1 cent tolerance for rounding)
                    if (!expectedAmount || Math.abs(paidAmount - expectedAmount) > 0.01) {
                        console.error(`Payment amount mismatch: paid ${paidAmount}, expected ${expectedAmount}`);
                        throw new Error('Payment amount mismatch');
                    }
                    // NONPROFIT FUND SPLIT CALCULATION (501c3 Compliance)
                    // Assumes Stripe nonprofit rate: 2.2% + $0.30
                    const processingFee = Math.round((paidAmount * 0.022 + 0.30) * 100) / 100;
                    const netDonation = paidAmount - processingFee;
                    // 7% operational fund (unrestricted), 93% restricted fund (for charity)
                    const operationalFund = Math.round(netDonation * 0.07 * 100) / 100;
                    const restrictedFund = Math.round(netDonation * 0.93 * 100) / 100;
                    console.log(`Payment split: $${paidAmount} = $${processingFee} (fee) + $${operationalFund} (ops) + $${restrictedFund} (charity)`);
                    // Use atomic database function to ensure both membership and payment are recorded together
                    // This prevents race conditions where payment succeeds but membership fails
                    const { data: result, error } = await supabaseAdmin.rpc('process_league_payment_with_fund_split', {
                        p_user_id: user_id,
                        p_league_id: league_id,
                        p_total_amount: paidAmount,
                        p_processing_fee: processingFee,
                        p_operational_fund: operationalFund,
                        p_restricted_fund: restrictedFund,
                        p_currency: session.currency || 'usd',
                        p_session_id: session.id,
                        p_payment_intent_id: session.payment_intent,
                    });
                    if (error) {
                        console.error('Failed to process league payment:', error);
                        throw error;
                    }
                    console.log(`User ${user_id} joined league ${league_id} via payment (atomic, verified $${paidAmount})`);
                    // Send payment confirmation email
                    const { data: user } = await supabaseAdmin
                        .from('users')
                        .select('email, display_name')
                        .eq('id', user_id)
                        .single();
                    if (user && league) {
                        // Send payment confirmation email
                        await EmailService.sendPaymentConfirmed({
                            displayName: user.display_name,
                            email: user.email,
                            leagueName: league.name,
                            leagueId: league_id,
                            amount: paidAmount,
                            date: new Date(),
                        });
                        // Send tax receipt for nonprofit donation (IRS compliance)
                        await EmailService.sendTaxReceipt({
                            displayName: user.display_name,
                            email: user.email,
                            donationAmount: paidAmount,
                            donationDate: new Date(),
                            transactionId: session.id,
                            leagueName: league.name,
                        });
                        // Mark tax receipt as sent
                        await supabaseAdmin
                            .from('payments')
                            .update({
                            tax_receipt_sent: true,
                            tax_receipt_sent_at: new Date().toISOString(),
                        })
                            .eq('stripe_session_id', session.id);
                        // Also send league joined email
                        const { data: leagueWithSeason } = await supabaseAdmin
                            .from('leagues')
                            .select('name, max_players, is_global, commissioner_id, seasons(name, premiere_at, draft_deadline)')
                            .eq('id', league_id)
                            .single();
                        const { count: memberCount } = await supabaseAdmin
                            .from('league_members')
                            .select('*', { count: 'exact', head: true })
                            .eq('league_id', league_id);
                        const season = leagueWithSeason?.seasons;
                        if (season && leagueWithSeason) {
                            const premiereDate = new Date(season.premiere_at);
                            const firstPickDue = new Date(premiereDate);
                            firstPickDue.setDate(firstPickDue.getDate() + 7);
                            firstPickDue.setHours(15, 0, 0, 0);
                            // Check if this is a private (non-global) league
                            if (!leagueWithSeason.is_global) {
                                // Get commissioner name for private league welcome
                                const { data: commissioner } = await supabaseAdmin
                                    .from('users')
                                    .select('display_name')
                                    .eq('id', leagueWithSeason.commissioner_id)
                                    .single();
                                await EmailService.sendPrivateLeagueWelcome({
                                    displayName: user.display_name,
                                    email: user.email,
                                    leagueName: leagueWithSeason.name,
                                    leagueId: league_id,
                                    commissionerName: commissioner?.display_name || 'The Commissioner',
                                    seasonName: season.name,
                                    memberCount: memberCount || 1,
                                    maxMembers: leagueWithSeason.max_players || 12,
                                });
                            }
                            else {
                                await EmailService.sendLeagueJoined({
                                    displayName: user.display_name,
                                    email: user.email,
                                    leagueName: leagueWithSeason.name,
                                    leagueId: league_id,
                                    seasonName: season.name,
                                    memberCount: memberCount || 1,
                                    maxMembers: leagueWithSeason.max_players || 12,
                                    premiereDate: premiereDate,
                                    draftDeadline: new Date(season.draft_deadline),
                                    firstPickDue: firstPickDue,
                                });
                            }
                        }
                        // Log notification
                        await EmailService.logNotification(user_id, 'email', `Payment received - ${league.name}`, `$${paidAmount.toFixed(2)} payment confirmed for ${league.name}`);
                    }
                }
                break;
            }
            case 'checkout.session.expired': {
                const session = event.data.object;
                console.log(`Checkout session expired: ${session.id}`);
                // Update payment status to failed
                await supabaseAdmin
                    .from('payments')
                    .update({ status: 'failed' })
                    .eq('stripe_session_id', session.id);
                // SECURITY: Clean up leagues where commissioner never paid
                if (session.metadata?.type === 'league_donation') {
                    const { user_id, league_id } = session.metadata;
                    // Check if this was the commissioner's payment
                    const { data: league } = await supabaseAdmin
                        .from('leagues')
                        .select('commissioner_id, name, code')
                        .eq('id', league_id)
                        .single();
                    if (league && league.commissioner_id === user_id) {
                        // Check if commissioner ever became a member
                        const { data: membership } = await supabaseAdmin
                            .from('league_members')
                            .select('id')
                            .eq('league_id', league_id)
                            .eq('user_id', user_id)
                            .single();
                        if (!membership) {
                            // Commissioner never paid - check if league has any members
                            const { count: memberCount } = await supabaseAdmin
                                .from('league_members')
                                .select('*', { count: 'exact', head: true })
                                .eq('league_id', league_id);
                            if (!memberCount || memberCount === 0) {
                                // No members - delete the abandoned league
                                console.log(`Deleting abandoned league ${league_id} - commissioner never paid`);
                                await supabaseAdmin
                                    .from('leagues')
                                    .delete()
                                    .eq('id', league_id);
                            }
                        }
                    }
                    const { data: user } = await supabaseAdmin
                        .from('users')
                        .select('email, display_name')
                        .eq('id', user_id)
                        .single();
                    if (user && league) {
                        // Send payment recovery email
                        await EmailService.sendPaymentRecovery({
                            displayName: user.display_name,
                            email: user.email,
                            leagueName: league.name,
                            leagueCode: league.code,
                            amount: (session.amount_total || 0) / 100,
                        });
                    }
                }
                break;
            }
            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object;
                console.log(`Payment failed: ${paymentIntent.id}, reason: ${paymentIntent.last_payment_error?.message}`);
                // Find and update the payment record
                const { data: payment } = await supabaseAdmin
                    .from('payments')
                    .update({ status: 'failed' })
                    .eq('stripe_payment_intent_id', paymentIntent.id)
                    .select('league_id, user_id')
                    .single();
                // SECURITY: Clean up leagues where commissioner payment failed
                if (payment) {
                    const { data: league } = await supabaseAdmin
                        .from('leagues')
                        .select('commissioner_id')
                        .eq('id', payment.league_id)
                        .single();
                    if (league && league.commissioner_id === payment.user_id) {
                        // Check if commissioner is a member (they shouldn't be)
                        const { data: membership } = await supabaseAdmin
                            .from('league_members')
                            .select('id')
                            .eq('league_id', payment.league_id)
                            .eq('user_id', payment.user_id)
                            .single();
                        if (!membership) {
                            // Check if league has any members
                            const { count: memberCount } = await supabaseAdmin
                                .from('league_members')
                                .select('*', { count: 'exact', head: true })
                                .eq('league_id', payment.league_id);
                            if (!memberCount || memberCount === 0) {
                                // No members - delete the abandoned league
                                console.log(`Deleting abandoned league ${payment.league_id} - commissioner payment failed`);
                                await supabaseAdmin
                                    .from('leagues')
                                    .delete()
                                    .eq('id', payment.league_id);
                            }
                        }
                    }
                }
                break;
            }
            case 'charge.refunded': {
                const charge = event.data.object;
                console.log(`Charge refunded: ${charge.id}`);
                break;
            }
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        res.json({ received: true });
    }
    catch (err) {
        console.error('Error processing webhook:', err);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});
// ============================================================================
// Twilio SMS Webhook
// ============================================================================
// POST /webhooks/sms - Handle Twilio inbound SMS
router.post('/sms', async (req, res) => {
    try {
        // Validate Twilio webhook signature to prevent spoofing
        const twilioSignature = req.headers['x-twilio-signature'];
        const webhookUrl = `${process.env.BASE_URL || 'https://api.rgfl.app'}/webhooks/sms`;
        if (!validateTwilioWebhook(twilioSignature, webhookUrl, req.body)) {
            console.warn('Invalid Twilio webhook signature - possible spoofing attempt');
            return res.status(403).send('Forbidden: Invalid signature');
        }
        // Twilio webhook payload (form-urlencoded)
        const from = req.body.From;
        const text = req.body.Body;
        if (!from || !text) {
            return res.status(400).json({ error: 'Missing from or text' });
        }
        // Normalize phone number
        const phone = from.replace(/\D/g, '');
        // Find user by phone
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('phone', phone)
            .single();
        // Parse command
        const rawMessage = text.trim().toUpperCase();
        const parts = rawMessage.split(/\s+/);
        const command = parts[0];
        // Build context for command handler
        const ctx = {
            phone,
            userId: user?.id || null,
            rawMessage: text,
            command,
            args: parts.slice(1),
        };
        // Process command via service
        const result = await processSmsCommand(ctx);
        // Log command
        await supabaseAdmin.from('sms_commands').insert({
            phone,
            user_id: user?.id || null,
            command,
            raw_message: text,
            parsed_data: result.parsedData,
            response_sent: result.response,
        });
        // Respond with TwiML to send SMS reply
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(result.response)}</Message>
</Response>`;
        res.set('Content-Type', 'text/xml');
        res.send(twiml);
    }
    catch (err) {
        console.error('Error processing SMS webhook:', err);
        // Return empty TwiML on error
        res.set('Content-Type', 'text/xml');
        res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }
});
// Helper to escape XML special characters
function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
export default router;
//# sourceMappingURL=webhooks.js.map