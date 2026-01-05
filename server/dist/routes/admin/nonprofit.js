/**
 * Admin Nonprofit Fund Tracking Routes
 *
 * Provides endpoints for 501(c)(3) fund management:
 * - Global fund summary (operational vs restricted)
 * - Per-league fund balances
 * - Charity selection and disbursement tracking
 * - Tax receipt management
 */
import { Router } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
import { authenticate, requireAdmin } from '../../middleware/authenticate.js';
const router = Router();
// All routes require admin authentication
router.use(authenticate, requireAdmin);
// GET /api/admin/nonprofit/summary - Global fund summary
router.get('/summary', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('global_fund_summary')
            .select('*')
            .single();
        if (error)
            throw error;
        res.json(data);
    }
    catch (err) {
        console.error('Error fetching global fund summary:', err);
        res.status(500).json({ error: 'Failed to fetch fund summary' });
    }
});
// GET /api/admin/nonprofit/league-funds - Per-league fund balances
router.get('/league-funds', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('league_fund_balances')
            .select('*')
            .order('total_restricted_fund', { ascending: false });
        if (error)
            throw error;
        res.json(data);
    }
    catch (err) {
        console.error('Error fetching league fund balances:', err);
        res.status(500).json({ error: 'Failed to fetch league funds' });
    }
});
// GET /api/admin/nonprofit/pending-receipts - Tax receipts not yet sent
router.get('/pending-receipts', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('pending_tax_receipts')
            .select('*')
            .order('donation_date', { ascending: false });
        if (error)
            throw error;
        res.json(data);
    }
    catch (err) {
        console.error('Error fetching pending tax receipts:', err);
        res.status(500).json({ error: 'Failed to fetch pending receipts' });
    }
});
// POST /api/admin/nonprofit/charity-selection - Record charity selection by winner
router.post('/charity-selection', async (req, res) => {
    try {
        const { league_id, charity_name, charity_ein, charity_address, selected_by } = req.body;
        if (!league_id || !charity_name || !selected_by) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Update league with charity information
        const { data, error } = await supabaseAdmin
            .from('leagues')
            .update({
            charity_name,
            charity_ein,
            charity_address,
            charity_selected_by: selected_by,
            charity_selected_at: new Date().toISOString(),
        })
            .eq('id', league_id)
            .select('*, users!charity_selected_by(display_name)')
            .single();
        if (error)
            throw error;
        res.json({ success: true, league: data });
    }
    catch (err) {
        console.error('Error recording charity selection:', err);
        res.status(500).json({ error: 'Failed to record charity selection' });
    }
});
// POST /api/admin/nonprofit/disburse - Record charity disbursement
router.post('/disburse', async (req, res) => {
    try {
        const { league_id, disbursement_method = 'check', bank_transaction_ref, check_number, notes, } = req.body;
        if (!league_id) {
            return res.status(400).json({ error: 'League ID is required' });
        }
        // Get league details and verify charity is selected
        const { data: league, error: leagueError } = await supabaseAdmin
            .from('leagues')
            .select('id, name, charity_name, charity_ein, charity_address')
            .eq('id', league_id)
            .single();
        if (leagueError)
            throw leagueError;
        if (!league.charity_name) {
            return res.status(400).json({ error: 'Charity not selected for this league' });
        }
        // Get all completed payments for this league
        const { data: payments, error: paymentsError } = await supabaseAdmin
            .from('payments')
            .select('id, restricted_fund')
            .eq('league_id', league_id)
            .eq('status', 'completed');
        if (paymentsError)
            throw paymentsError;
        if (!payments || payments.length === 0) {
            return res.status(400).json({ error: 'No completed payments found for this league' });
        }
        // Calculate total restricted fund amount
        const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.restricted_fund || '0'), 0);
        const paymentIds = payments.map((p) => p.id);
        // Insert disbursement record
        const { data: disbursement, error: disbursementError } = await supabaseAdmin
            .from('charity_disbursements')
            .insert({
            league_id,
            charity_name: league.charity_name,
            charity_ein: league.charity_ein,
            charity_address: league.charity_address,
            total_amount: totalAmount,
            payment_count: payments.length,
            payment_ids: paymentIds,
            disbursement_method,
            bank_transaction_ref,
            check_number,
            disbursed_by: req.user.id,
            notes,
        })
            .select()
            .single();
        if (disbursementError)
            throw disbursementError;
        // Update league to mark funds as disbursed
        const { error: updateError } = await supabaseAdmin
            .from('leagues')
            .update({
            funds_disbursed_at: new Date().toISOString(),
            disbursement_notes: notes,
        })
            .eq('id', league_id);
        if (updateError)
            throw updateError;
        res.json({ success: true, disbursement });
    }
    catch (err) {
        console.error('Error recording disbursement:', err);
        res.status(500).json({ error: 'Failed to record disbursement' });
    }
});
// GET /api/admin/nonprofit/disbursements - Get disbursement history
router.get('/disbursements', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('charity_disbursements')
            .select('*, leagues(name), users!disbursed_by(display_name)')
            .order('disbursed_at', { ascending: false });
        if (error)
            throw error;
        res.json(data);
    }
    catch (err) {
        console.error('Error fetching disbursements:', err);
        res.status(500).json({ error: 'Failed to fetch disbursements' });
    }
});
// POST /api/admin/nonprofit/resend-tax-receipt - Resend tax receipt for a payment
router.post('/resend-tax-receipt/:paymentId', async (req, res) => {
    try {
        const { paymentId } = req.params;
        // Get payment details
        const { data: payment, error: paymentError } = await supabaseAdmin
            .from('payments')
            .select('*, users(display_name, email), leagues(name)')
            .eq('id', paymentId)
            .single();
        if (paymentError)
            throw paymentError;
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        // Import email service dynamically
        const { EmailService } = await import('../../emails/index.js');
        // Send tax receipt
        await EmailService.sendTaxReceipt({
            displayName: payment.users.display_name,
            email: payment.users.email,
            donationAmount: parseFloat(payment.amount),
            donationDate: new Date(payment.created_at),
            transactionId: payment.stripe_session_id || payment.id,
            leagueName: payment.leagues.name,
        });
        // Update payment record
        const { error: updateError } = await supabaseAdmin
            .from('payments')
            .update({
            tax_receipt_sent: true,
            tax_receipt_sent_at: new Date().toISOString(),
        })
            .eq('id', paymentId);
        if (updateError)
            throw updateError;
        res.json({ success: true, message: 'Tax receipt resent successfully' });
    }
    catch (err) {
        console.error('Error resending tax receipt:', err);
        res.status(500).json({ error: 'Failed to resend tax receipt' });
    }
});
export default router;
//# sourceMappingURL=nonprofit.js.map