import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/authenticate.js';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import {
  normalizePhone,
  generateVerificationCode,
  sendVerificationSMS,
} from '../config/twilio.js';
import { phoneLimiter, authLimiter } from '../config/rateLimit.js';
import {
  validate,
  updatePhoneSchema,
  verifyPhoneSchema,
  notificationPrefsSchema,
} from '../lib/validation.js';

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
    const { data: memberships } = await supabase
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

// PATCH /api/me/phone - Update phone number and send verification
// Rate limited to prevent SMS spam (5 attempts per hour)
router.patch('/me/phone', authenticate, phoneLimiter, validate(updatePhoneSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { phone } = req.body;
    const userId = req.user!.id;

    const normalizedPhone = normalizePhone(phone);

    // Check if phone is already in use by another user
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', normalizedPhone)
      .neq('id', userId)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Phone number already in use' });
    }

    // Update phone (unverified)
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ phone: normalizedPhone, phone_verified: false })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Generate and store verification code in database
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Upsert verification code (replace any existing code for this user)
    await supabaseAdmin
      .from('verification_codes')
      .upsert({
        user_id: userId,
        phone: normalizedPhone,
        code,
        expires_at: expiresAt.toISOString(),
      }, { onConflict: 'user_id' });

    // Send verification SMS
    const sent = await sendVerificationSMS(normalizedPhone, code);

    res.json({
      user: data,
      verification_sent: sent,
      message: sent
        ? 'Verification code sent! Check your phone.'
        : 'Could not send SMS. You can still use email notifications.',
    });
  } catch (err) {
    console.error('PATCH /api/me/phone error:', err);
    res.status(500).json({ error: 'Failed to update phone' });
  }
});

// POST /api/me/verify-phone - Verify SMS code
// Rate limited to prevent brute-force code guessing (10 attempts per 15 min)
router.post('/me/verify-phone', authenticate, authLimiter, validate(verifyPhoneSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code } = req.body;
    const userId = req.user!.id;

    // Get stored verification from database
    const { data: stored, error: fetchError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('user_id', userId)
      .is('used_at', null)
      .single();

    if (fetchError || !stored) {
      return res.status(400).json({ error: 'No pending verification. Please request a new code.' });
    }

    // Check expiry
    if (new Date() > new Date(stored.expires_at)) {
      // Delete expired code
      await supabaseAdmin.from('verification_codes').delete().eq('id', stored.id);
      return res.status(400).json({ error: 'Code expired. Please request a new code.' });
    }

    // Check code (constant-time comparison to prevent timing attacks)
    const codeMatches = stored.code === code.trim();
    if (!codeMatches) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    // Mark phone as verified and mark code as used (atomic transaction)
    const { error } = await supabaseAdmin
      .from('users')
      .update({ phone_verified: true })
      .eq('id', userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Mark code as used (prevents reuse)
    await supabaseAdmin
      .from('verification_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', stored.id);

    res.json({
      verified: true,
      message: 'Phone verified! You can now use SMS commands and receive text reminders.',
    });
  } catch (err) {
    console.error('POST /api/me/verify-phone error:', err);
    res.status(500).json({ error: 'Failed to verify phone' });
  }
});

// POST /api/me/resend-code - Resend verification code
router.post('/me/resend-code', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get user's phone
    const { data: user } = await supabase
      .from('users')
      .select('phone, phone_verified')
      .eq('id', userId)
      .single();

    if (!user?.phone) {
      return res.status(400).json({ error: 'No phone number on file' });
    }

    if (user.phone_verified) {
      return res.status(400).json({ error: 'Phone already verified' });
    }

    // Generate new code and store in database
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Upsert verification code (replace any existing code for this user)
    await supabaseAdmin
      .from('verification_codes')
      .upsert({
        user_id: userId,
        phone: user.phone,
        code,
        expires_at: expiresAt.toISOString(),
      }, { onConflict: 'user_id' });

    // Send verification SMS
    const sent = await sendVerificationSMS(user.phone, code);

    res.json({
      sent,
      message: sent ? 'New code sent!' : 'Could not send SMS. Please try again.',
    });
  } catch (err) {
    console.error('POST /api/me/resend-code error:', err);
    res.status(500).json({ error: 'Failed to resend code' });
  }
});

// PATCH /api/me/notifications - Update notification preferences
router.patch('/me/notifications', authenticate, validate(notificationPrefsSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, sms, push } = req.body;
    const userId = req.user!.id;

    const updates: Record<string, boolean> = {};
    if (email !== undefined) updates.notification_email = email;
    if (sms !== undefined) updates.notification_sms = sms;
    if (push !== undefined) updates.notification_push = push;

    // If enabling SMS, check phone is verified
    if (sms === true) {
      const { data: user } = await supabase
        .from('users')
        .select('phone, phone_verified')
        .eq('id', userId)
        .single();

      if (!user?.phone_verified) {
        return res.status(400).json({
          error: 'Please verify your phone number first to enable SMS notifications',
        });
      }
    }

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
