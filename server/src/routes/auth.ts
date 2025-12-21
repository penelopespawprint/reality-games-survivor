import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/authenticate.js';
import { supabase, supabaseAdmin } from '../config/supabase.js';

const router = Router();

// GET /api/me - Current user with leagues
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get user profile
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's leagues with membership info
    const { data: memberships, error: memberError } = await supabase
      .from('league_members')
      .select(`
        draft_position,
        total_points,
        rank,
        joined_at,
        leagues (
          id,
          name,
          code,
          status,
          commissioner_id,
          is_global
        )
      `)
      .eq('user_id', userId);

    const leagues = memberships?.map((m: any) => ({
      ...m.leagues,
      isCommissioner: m.leagues.commissioner_id === userId,
      draftPosition: m.draft_position,
      totalPoints: m.total_points,
      rank: m.rank,
      joinedAt: m.joined_at,
    })) || [];

    res.json({ user, leagues });
  } catch (err) {
    console.error('GET /api/me error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PATCH /api/me/phone - Update phone number
router.patch('/me/phone', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { phone } = req.body;
    const userId = req.user!.id;

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ phone, phone_verified: false })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // TODO: Send verification SMS via SimpleTexting
    res.json({ user: data, verification_sent: true });
  } catch (err) {
    console.error('PATCH /api/me/phone error:', err);
    res.status(500).json({ error: 'Failed to update phone' });
  }
});

// POST /api/me/verify-phone - Verify SMS code
router.post('/me/verify-phone', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code } = req.body;
    const userId = req.user!.id;

    // TODO: Verify code against stored verification
    // For now, just mark as verified
    const { error } = await supabaseAdmin
      .from('users')
      .update({ phone_verified: true })
      .eq('id', userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ verified: true });
  } catch (err) {
    console.error('POST /api/me/verify-phone error:', err);
    res.status(500).json({ error: 'Failed to verify phone' });
  }
});

// PATCH /api/me/notifications - Update notification preferences
router.patch('/me/notifications', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, sms, push } = req.body;
    const userId = req.user!.id;

    const updates: Record<string, boolean> = {};
    if (typeof email === 'boolean') updates.notification_email = email;
    if (typeof sms === 'boolean') updates.notification_sms = sms;
    if (typeof push === 'boolean') updates.notification_push = push;

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ user: data });
  } catch (err) {
    console.error('PATCH /api/me/notifications error:', err);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

// GET /api/me/payments - Payment history
router.get('/me/payments', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        currency,
        status,
        created_at,
        leagues (
          id,
          name
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ payments });
  } catch (err) {
    console.error('GET /api/me/payments error:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

export default router;
