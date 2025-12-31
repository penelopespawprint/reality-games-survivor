/**
 * Admin Payments Routes
 *
 * Routes for managing payments and refunds.
 */
import { Router } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
import { requireStripe } from '../../config/stripe.js';
const router = Router();
// GET /api/admin/payments - All payments
router.get('/', async (req, res) => {
    try {
        const { league_id, status } = req.query;
        let query = supabaseAdmin
            .from('payments')
            .select(`
        *,
        users (
          id,
          display_name,
          email
        ),
        leagues (
          id,
          name
        )
      `)
            .order('created_at', { ascending: false });
        if (league_id) {
            query = query.eq('league_id', league_id);
        }
        if (status) {
            query = query.eq('status', status);
        }
        const { data: payments, error } = await query;
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        const total = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        res.json({ payments, total });
    }
    catch (err) {
        console.error('GET /api/admin/payments error:', err);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});
// POST /api/admin/payments/:id/refund - Issue refund
router.post('/:id/refund', async (req, res) => {
    try {
        const paymentId = req.params.id;
        // Get payment
        const { data: payment } = await supabaseAdmin
            .from('payments')
            .select('*')
            .eq('id', paymentId)
            .single();
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        if (payment.status !== 'completed') {
            return res.status(400).json({ error: 'Can only refund completed payments' });
        }
        if (!payment.stripe_payment_intent_id) {
            return res.status(400).json({ error: 'No Stripe payment intent found' });
        }
        // Issue Stripe refund
        const refund = await requireStripe().refunds.create({
            payment_intent: payment.stripe_payment_intent_id,
            reason: 'requested_by_customer',
        });
        // Update payment record
        const { data: updated, error } = await supabaseAdmin
            .from('payments')
            .update({
            status: 'refunded',
            stripe_refund_id: refund.id,
            refunded_at: new Date().toISOString(),
        })
            .eq('id', paymentId)
            .select()
            .single();
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        res.json({ payment: updated, refund_id: refund.id });
    }
    catch (err) {
        console.error('POST /api/admin/payments/:id/refund error:', err);
        res.status(500).json({ error: 'Failed to issue refund' });
    }
});
export default router;
//# sourceMappingURL=payments.js.map