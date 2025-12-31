/**
 * Spoiler-Safe Notification Service
 *
 * Sends notifications about episode results WITHOUT spoilers
 * - Email: Generic subject, click-to-reveal content
 * - SMS: No scores/names, just prompt to check app
 * - Push: Generic message (future)
 */
import { enqueueEmail } from './email-queue.js';
import { sendSMS } from '../config/twilio.js';
import { supabaseAdmin } from '../config/supabase.js';
import crypto from 'crypto';
/**
 * Get user's notification preferences
 * Fallback: check users table for legacy notification_email/notification_sms flags
 */
async function getNotificationPreferences(userId) {
    // First check notification_preferences table (new system)
    const { data, error } = await supabaseAdmin
        .from('notification_preferences')
        .select('email_results, sms_results, push_results')
        .eq('user_id', userId)
        .single();
    if (!error && data) {
        return data;
    }
    // Fallback: check users table for legacy flags
    const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('notification_email, notification_sms, notification_push')
        .eq('id', userId)
        .single();
    if (!userError && userData) {
        return {
            email_results: userData.notification_email ?? true,
            sms_results: userData.notification_sms ?? false,
            push_results: userData.notification_push ?? true,
        };
    }
    // Default: all enabled except SMS
    return { email_results: true, sms_results: false, push_results: true };
}
/**
 * Generate secure results token for user+episode
 */
async function generateResultsToken(userId, episodeId) {
    // Check if token already exists
    const { data: existing } = await supabaseAdmin
        .from('results_tokens')
        .select('token')
        .eq('user_id', userId)
        .eq('episode_id', episodeId)
        .single();
    if (existing) {
        return existing.token;
    }
    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
    const { error } = await supabaseAdmin
        .from('results_tokens')
        .insert({
        token,
        user_id: userId,
        episode_id: episodeId,
        expires_at: expiresAt.toISOString(),
    });
    if (error) {
        console.error('Error creating results token:', error);
        throw error;
    }
    return token;
}
/**
 * Render spoiler-safe email HTML
 */
function renderSpoilerSafeEmail(episode, token, userName) {
    const appUrl = process.env.APP_URL || 'https://survivor.realitygamesfantasyleague.com';
    const weekNumber = episode.week_number ?? episode.number; // Use week_number if available, fallback to number
    const resultsUrl = `${appUrl}/results/week-${weekNumber}?token=${token}`;
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Episode ${episode.number} Results Ready</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #faf8f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="color: #7f1d1d; font-size: 28px; margin: 0 0 8px 0;">Survivor Fantasy League</h1>
      <p style="color: #6b7280; margin: 0;">Reality Games Fantasy League</p>
    </div>

    <!-- Main Card -->
    <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 16px 0;">Episode ${episode.number} Results Are In!</h2>

      <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
        Hi ${userName},
      </p>

      <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
        The latest episode has been scored and your results are ready to view.
      </p>

      <!-- Spoiler Warning Box -->
      <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin: 0 0 24px 0;">
        <p style="color: #92400e; font-weight: 600; margin: 0 0 8px 0;">⚠️ Spoiler Warning</p>
        <p style="color: #78350f; margin: 0 0 16px 0; line-height: 1.6;">
          Click the button below to reveal your scores and standings. This will show episode results including eliminations and gameplay events.
        </p>

        <!-- CTA Button -->
        <a href="${resultsUrl}"
           style="display: inline-block; background: #7f1d1d; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          📊 View My Results
        </a>
      </div>

      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
        <em>Not ready to see spoilers? No problem! Results will be available in your app whenever you're ready.</em>
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0 0 8px 0;">
        You're receiving this because you're enrolled in Reality Games: Survivor.
      </p>
      <p style="margin: 0;">
        <a href="${appUrl}/profile/notifications" style="color: #7f1d1d; text-decoration: none;">Update notification preferences</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}
/**
 * Render spoiler-safe email plain text
 */
function renderSpoilerSafeEmailText(episode, token, userName) {
    const appUrl = process.env.APP_URL || 'https://survivor.realitygamesfantasyleague.com';
    const weekNumber = episode.week_number ?? episode.number; // Use week_number if available, fallback to number
    const resultsUrl = `${appUrl}/results/week-${weekNumber}?token=${token}`;
    return `
SURVIVOR FANTASY LEAGUE - Episode ${episode.number} Results Ready

Hi ${userName},

The latest episode has been scored and your results are ready to view.

⚠️ SPOILER WARNING
The link below will show episode results including eliminations and gameplay events.

View Your Results:
${resultsUrl}

Not ready to see spoilers? No problem! Results will be available in your app whenever you're ready.

---
You're receiving this because you're enrolled in Reality Games: Survivor.
Update preferences: ${appUrl}/profile/notifications
  `.trim();
}
/**
 * Send spoiler-safe notification to a user
 */
export async function sendSpoilerSafeNotification(user, episode) {
    const prefs = await getNotificationPreferences(user.id);
    const token = await generateResultsToken(user.id, episode.id);
    // Send email notification (if enabled)
    if (prefs.email_results) {
        await enqueueEmail({
            to: user.email,
            subject: `Your Survivor Fantasy results are ready (Episode ${episode.number})`,
            html: renderSpoilerSafeEmail(episode, token, user.display_name),
            text: renderSpoilerSafeEmailText(episode, token, user.display_name),
            type: 'normal',
        });
        console.log(`[Spoiler-Safe] Email queued for ${user.email} (Episode ${episode.number})`);
    }
    // Send SMS notification (if enabled and user has phone)
    if (prefs.sms_results && user.phone) {
        const appUrl = process.env.APP_URL || 'https://survivor.realitygamesfantasyleague.com';
        await sendSMS({
            to: user.phone,
            text: `[RG:S] Episode ${episode.number} results are ready! Check the app to view your scores and standings. ${appUrl}/results Reply STOP to opt out.`,
        });
        console.log(`[Spoiler-Safe] SMS sent to ${user.phone} (Episode ${episode.number})`);
    }
    // Push notification (future implementation)
    if (prefs.push_results) {
        // TODO: Implement push notifications
        console.log(`[Spoiler-Safe] Push notification would be sent to user ${user.id}`);
    }
}
/**
 * Verify results token and mark as used
 */
export async function verifyResultsToken(token) {
    const { data, error } = await supabaseAdmin
        .from('results_tokens')
        .select('user_id, episode_id, expires_at, used_at')
        .eq('token', token)
        .single();
    if (error || !data) {
        return { valid: false };
    }
    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
        return { valid: false };
    }
    // Mark as used (first time only)
    if (!data.used_at) {
        await supabaseAdmin
            .from('results_tokens')
            .update({ used_at: new Date().toISOString() })
            .eq('token', token);
    }
    return {
        valid: true,
        userId: data.user_id,
        episodeId: data.episode_id,
    };
}
//# sourceMappingURL=spoiler-safe-notifications.js.map