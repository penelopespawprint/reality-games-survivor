// @ts-nocheck
import { Resend } from "resend";
import { createLogger } from "./logger.js";
const logger = createLogger("email");
import prisma from "./prisma.js";

/**
 * Email service using Resend
 * CEREBRO Skills: 56-70 (Marketing/Brand), 43-55 (Product/Growth)
 *
 * Analytics available at: https://resend.com/emails
 * - Opens, clicks, bounces tracked automatically
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "RGFL <noreply@realitygamesfantasyleague.com>";
const BASE_URL = process.env.CLIENT_URL || "https://realitygamesfantasyleague.com";
const LOGO_URL = `${BASE_URL}/rgfl-logo.png`;

// Resend Audience ID for Season 50 Launch Waitlist drip campaign
const SEASON_50_AUDIENCE_ID = process.env.RESEND_SEASON_50_AUDIENCE_ID;

/**
 * Branded email template wrapper
 * All emails should use this for consistent branding
 */
function brandedEmailTemplate(content: string, options?: { showFooter?: boolean }): string {
  const { showFooter = true } = options || {};

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .email-wrapper { max-width: 600px; margin: 0 auto; background: white; }
          .email-header { background: linear-gradient(135deg, #A42828 0%, #8a2020 100%); padding: 24px; text-align: center; }
          .email-header img { max-width: 180px; height: auto; }
          .email-body { padding: 32px 24px; background: #ffffff; }
          .email-footer { background: #2a2a2a; color: #999; padding: 24px; text-align: center; font-size: 12px; }
          .email-footer a { color: #A42828; text-decoration: none; }
          .button { display: inline-block; background: #A42828; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 16px 0; }
          .button:hover { background: #8a2020; }
          h1, h2, h3 { color: #333; margin-top: 0; }
          .highlight-box { background: #f9f9f9; border-left: 4px solid #A42828; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; }
          .stats-grid { display: flex; justify-content: space-around; margin: 20px 0; }
          .stat-box { text-align: center; padding: 16px; }
          .stat-value { font-size: 32px; font-weight: 900; color: #A42828; }
          .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-header">
            <img src="${LOGO_URL}" alt="RGFL Survivor" />
          </div>
          <div class="email-body">
            ${content}
          </div>
          ${showFooter ? `
          <div class="email-footer">
            <p>Reality Games Fantasy League - Survivor</p>
            <p>
              <a href="${BASE_URL}">Visit Website</a> |
              <a href="mailto:support@realitygamesfantasyleague.com">Contact Support</a>
            </p>
            <p style="margin-top: 16px; font-size: 11px; color: #666;">
              You're receiving this because you signed up for RGFL.<br>
              <a href="${BASE_URL}/unsubscribe" style="color: #666;">Unsubscribe</a>
            </p>
          </div>
          ` : ''}
        </div>
      </body>
    </html>
  `;
}

let resend: Resend | null = null;

if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
  logger.info("✅ Resend email service configured");
} else {
  logger.info("⚠️ Email not configured - RESEND_API_KEY required");
}

/**
 * Add contact to Resend Audience for Season 50 Launch Waitlist drip campaign
 * This enables automated email sequences in Resend Broadcasts
 */
export async function addToWaitlistAudience(
  email: string,
  firstName?: string | null,
  lastName?: string | null
): Promise<boolean> {
  if (!resend || !SEASON_50_AUDIENCE_ID) {
    logger.info("⚠️ Resend audience not configured - skipping audience add");
    return false;
  }

  try {
    await resend.contacts.create({
      audienceId: SEASON_50_AUDIENCE_ID,
      email,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      unsubscribed: false,
    });
    logger.info(`✅ Added ${email} to Season 50 Launch Waitlist audience`);
    return true;
  } catch (error: any) {
    // Don't fail if contact already exists
    if (error?.message?.includes("already exists")) {
      logger.info(`ℹ️ ${email} already in Season 50 audience`);
      return true;
    }
    logger.error(`❌ Failed to add ${email} to audience:`, error);
    return false;
  }
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type?: string;
  metadata?: Record<string, any>;
}

async function logEmail(
  to: string,
  type: string,
  subject: string,
  status: "SENT" | "FAILED",
  error?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await prisma.emailLog.create({
      data: {
        to,
        type: type as any,
        subject,
        status,
        error,
        metadata: metadata ?? undefined,
      },
    });
  } catch (err) {
    logger.error("Failed to log email:", err);
  }
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  type = "WELCOME",
  metadata,
}: EmailOptions): Promise<boolean> {
  // If email not configured, just log it
  if (!resend) {
    logger.info("\n📧 Email would be sent (but Resend not configured):");
    logger.info(`To: ${to}`);
    logger.info(`Subject: ${subject}`);
    logger.info(`Body: ${text || html.replace(/<[^>]*>/g, "").substring(0, 200)}...`);
    logger.info("\n");
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""),
    });

    if (error) {
      logger.error(`❌ Failed to send email to ${to}:`, error);
      await logEmail(to, type, subject, "FAILED", error.message, metadata);
      return false;
    }

    logger.info(`✅ Email sent to ${to} (id: ${data?.id})`);
    await logEmail(to, type, subject, "SENT", undefined, { ...metadata, resendId: data?.id });
    return true;
  } catch (error: any) {
    logger.error(`❌ Failed to send email to ${to}:`, error);
    await logEmail(to, type, subject, "FAILED", error.message, metadata);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #A42828 0%, #8a2020 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #A42828; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reset Your Password</h1>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p>You requested to reset your password for your <strong>Reality Games Fantasy League - Survivor</strong> account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="background: white; padding: 12px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 0.9em;">
              ${resetUrl}
            </p>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.
            </div>
            <p>See you on the island!</p>
            <p><strong>The RGFL Team</strong></p>
          </div>
          <div class="footer">
            <p>Reality Games Fantasy League - Survivor</p>
            <p>Questions? Email <a href="mailto:support@realitygamesfantasyleague.com">support@realitygamesfantasyleague.com</a></p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: "Reset Your Password - RGFL Survivor",
    html,
    text: `Reset your RGFL Survivor password by clicking this link: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
    type: "PASSWORD_RESET",
  });
}

export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  const loginUrl = `${process.env.CLIENT_URL || "https://realitygamesfantasyleague.com"}/login`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #A42828 0%, #8a2020 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #A42828; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
          .checklist { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .checklist li { margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔥 Welcome to RGFL Survivor!</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Welcome to the <strong>Reality Games Fantasy League - Survivor</strong>! You've just joined the ultimate Survivor fantasy experience.</p>

            <div class="checklist">
              <h3>📋 Here's what to do next:</h3>
              <ul>
                <li><strong>✅ Complete Your Profile</strong> - Add your favorite castaway, location, and more</li>
                <li><strong>📊 Rank All 18 Castaways</strong> - Submit your rankings before the deadline</li>
                <li><strong>🎯 Wait for the Draft</strong> - Draft runs automatically</li>
                <li><strong>🏆 Make Weekly Picks</strong> - Pick your castaway each week</li>
                <li><strong>📈 Track the Leaderboard</strong> - See how you stack up</li>
              </ul>
            </div>

            <p style="text-align: center;">
              <a href="${loginUrl}" class="button">Go to Dashboard</a>
            </p>

            <p>Good luck and may the odds be ever in your favor!</p>
            <p><strong>The RGFL Team</strong></p>
          </div>
          <div class="footer">
            <p>Reality Games Fantasy League - Survivor</p>
            <p>Questions? Email <a href="mailto:support@realitygamesfantasyleague.com">support@realitygamesfantasyleague.com</a></p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: "🔥 Welcome to RGFL Survivor - Let's Get Started!",
    html,
    text: `Hi ${name},\n\nWelcome to Reality Games Fantasy League - Survivor!\n\nNext steps:\n1. Complete your profile\n2. Rank all 18 castaways\n3. Wait for the draft\n4. Make weekly picks\n5. Track the leaderboard\n\nLogin here: ${loginUrl}\n\nGood luck!`,
    type: "WELCOME",
    metadata: { userName: name },
  });
}

/**
 * Waitlist Confirmation Email
 * Sent immediately when someone joins the waitlist
 * CEREBRO Skills: 54 (Viral Loops), 56-70 (Marketing/Brand)
 */
export async function sendWaitlistConfirmationEmail(
  email: string,
  name: string | null,
  position: number,
  referralLink: string,
  seasonName: string
): Promise<boolean> {
  const displayName = name || "Survivor Fan";

  const content = `
    <h1 style="text-align: center; color: #A42828;">🔥 You're on the Waitlist!</h1>

    <p>Hey ${displayName},</p>
    <p>You've secured your spot on the waitlist for <strong>${seasonName}</strong>!</p>

    <div style="background: white; border: 3px solid #A42828; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
      <p style="font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin: 0;">Your Position</p>
      <p style="font-size: 64px; font-weight: 900; color: #A42828; margin: 8px 0;">#${position}</p>
      <p style="color: #666; font-size: 14px; margin: 0;">on the waitlist</p>
    </div>

    <div class="highlight-box" style="background: #fff3e0; border-left-color: #ff9800;">
      <strong>🚀 Move Up the List!</strong>
      <p style="margin: 8px 0;">Share your referral link with friends. Each signup moves you up in priority!</p>
      <div style="background: white; padding: 12px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 0.9em; margin: 10px 0; border: 1px solid #ddd;">${referralLink}</div>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="https://twitter.com/intent/tweet?text=I%27m%20%23${position}%20on%20the%20waitlist%20for%20${encodeURIComponent(seasonName)}%20Fantasy%20League!%20Join%20me:%20${encodeURIComponent(referralLink)}" class="button" style="background: #1DA1F2;">Share on X</a>
    </div>

    <p><strong>What happens next?</strong></p>
    <ul>
      <li>📅 Registration opens <strong>February 2025</strong></li>
      <li>📧 You'll get an email the moment signups go live</li>
      <li>🎯 Complete your profile and rank all 18 castaways</li>
      <li>🏆 Draft your team and compete for glory</li>
    </ul>

    <p>See you on the island!</p>
    <p><strong>The RGFL Team</strong></p>
  `;

  const html = brandedEmailTemplate(content);

  return sendEmail({
    to: email,
    subject: `🔥 You're #${position} on the ${seasonName} Waitlist!`,
    html,
    text: `Hey ${displayName}!\n\nYou're #${position} on the waitlist for ${seasonName}!\n\nShare your referral link to move up: ${referralLink}\n\nRegistration opens February 2025. You'll get an email the moment signups go live.\n\nSee you on the island!\nThe RGFL Team`,
    type: "WAITLIST_CONFIRMATION",
    metadata: { position, referralLink, seasonName },
  });
}

/**
 * Registration Open Notification
 * Sent to all waitlist users when Season 50 registration opens
 * CEREBRO Skills: 43-55 (Product/Growth), 56-70 (Marketing/Brand)
 */
export async function sendRegistrationOpenEmail(
  email: string,
  name: string | null,
  seasonName: string,
  signupUrl: string
): Promise<boolean> {
  const displayName = name || "Survivor Fan";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #A42828 0%, #8a2020 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 32px; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .cta-box { background: white; border: 3px solid #A42828; border-radius: 12px; padding: 30px; text-align: center; margin: 24px 0; }
          .button { display: inline-block; background: #A42828; color: white; padding: 18px 48px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; }
          .urgency { background: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 REGISTRATION IS OPEN!</h1>
            <p style="margin: 10px 0 0; font-size: 18px;">${seasonName} Fantasy League</p>
          </div>
          <div class="content">
            <p>Hey ${displayName},</p>
            <p>The wait is over! <strong>${seasonName}</strong> registration is officially OPEN, and you're first in line!</p>

            <div class="cta-box">
              <p style="font-size: 18px; margin: 0 0 20px; color: #333;"><strong>Secure your spot now</strong></p>
              <a href="${signupUrl}" class="button" style="color: white;">Register Now</a>
            </div>

            <div class="urgency">
              <strong>⏰ Don't Wait!</strong>
              <p style="margin: 8px 0 0;">Spots fill up fast. Complete your registration to lock in your place before the draft.</p>
            </div>

            <p><strong>What to do:</strong></p>
            <ol>
              <li>Click the button above to register</li>
              <li>Complete your player profile</li>
              <li>Rank all 18 castaways before the deadline</li>
              <li>Get ready for the draft!</li>
            </ol>

            <p>This is going to be epic. Let's go!</p>
            <p><strong>The RGFL Team</strong></p>
          </div>
          <div class="footer">
            <p>Reality Games Fantasy League - Survivor</p>
            <p>Questions? Reply to this email or contact <a href="mailto:support@realitygamesfantasyleague.com">support@realitygamesfantasyleague.com</a></p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `🎉 ${seasonName} Registration is OPEN - You're First in Line!`,
    html,
    text: `Hey ${displayName}!\n\nThe wait is over! ${seasonName} registration is officially OPEN!\n\nRegister now: ${signupUrl}\n\nDon't wait - spots fill up fast!\n\n1. Register at the link above\n2. Complete your profile\n3. Rank all 18 castaways\n4. Get ready for the draft!\n\nLet's go!\nThe RGFL Team`,
    type: "REGISTRATION_OPEN",
    metadata: { seasonName, signupUrl },
  });
}

/**
 * League Invite Email
 * Sent when a player invites friends to join their league
 * CEREBRO Skills: 54 (Viral Loops), 43-55 (Product/Growth)
 */
export async function sendLeagueInviteEmail(
  toEmail: string,
  inviterName: string,
  leagueName: string,
  leagueCode: string,
  joinUrl: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #A42828 0%, #8a2020 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .invite-box { background: white; border: 3px solid #A42828; border-radius: 12px; padding: 24px; text-align: center; margin: 20px 0; }
          .league-name { font-size: 24px; font-weight: 800; color: #A42828; margin: 0 0 8px; }
          .league-code { font-size: 32px; font-weight: 900; color: #333; font-family: monospace; letter-spacing: 4px; background: #f0f0f0; padding: 12px 24px; border-radius: 8px; display: inline-block; margin: 16px 0; }
          .button { display: inline-block; background: #A42828; color: white; padding: 16px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏝️ You've Been Invited!</h1>
          </div>
          <div class="content">
            <p>Hey there!</p>
            <p><strong>${inviterName}</strong> wants you to join their Survivor fantasy league!</p>

            <div class="invite-box">
              <p class="league-name">${leagueName}</p>
              <p style="color: #666; margin: 0;">League Code:</p>
              <p class="league-code">${leagueCode}</p>
              <a href="${joinUrl}" class="button" style="color: white;">Join League</a>
            </div>

            <p><strong>What is RGFL Survivor?</strong></p>
            <p>The ultimate fantasy Survivor experience with 100+ scoring rules that reward real strategy. Draft castaways, make weekly picks, and compete against your friends to prove you know the game better than anyone.</p>

            <p><strong>Why join?</strong></p>
            <ul>
              <li>🔥 Strategic draft system</li>
              <li>📊 Deep scoring that rewards real gameplay</li>
              <li>🏆 Weekly competition and leaderboards</li>
              <li>📱 SMS reminders so you never miss a deadline</li>
            </ul>

            <p>Don't leave ${inviterName} hanging - join the league!</p>
            <p><strong>The RGFL Team</strong></p>
          </div>
          <div class="footer">
            <p>Reality Games Fantasy League - Survivor</p>
            <p>Questions? Contact <a href="mailto:support@realitygamesfantasyleague.com">support@realitygamesfantasyleague.com</a></p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: toEmail,
    subject: `🏝️ ${inviterName} invited you to join "${leagueName}" - RGFL Survivor`,
    html,
    text: `Hey there!\n\n${inviterName} wants you to join their Survivor fantasy league!\n\nLeague: ${leagueName}\nCode: ${leagueCode}\n\nJoin here: ${joinUrl}\n\nRGFL Survivor is the ultimate fantasy experience with 100+ scoring rules. Draft castaways, make weekly picks, and compete!\n\nDon't leave ${inviterName} hanging - join the league!\n\nThe RGFL Team`,
    type: "LEAGUE_INVITE",
    metadata: { inviterName, leagueName, leagueCode },
  });
}

/**
 * Rankings Reminder Email
 * Sent 48h before rankings deadline
 */
export async function sendRankingsReminderEmail(
  email: string,
  name: string,
  deadlineDate: string,
  rankingsUrl: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #A42828 0%, #8a2020 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .urgency { background: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; }
          .button { display: inline-block; background: #A42828; color: white; padding: 16px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Rankings Deadline Approaching!</h1>
          </div>
          <div class="content">
            <p>Hey ${name},</p>
            <p>Don't forget to submit your castaway rankings before the draft!</p>

            <div class="urgency">
              <strong>⚠️ Deadline: ${deadlineDate}</strong>
              <p style="margin: 8px 0 0;">Rankings determine your draft picks. Submit yours now!</p>
            </div>

            <p style="text-align: center; margin: 24px 0;">
              <a href="${rankingsUrl}" class="button" style="color: white;">Submit Rankings</a>
            </p>

            <p><strong>Why rankings matter:</strong></p>
            <ul>
              <li>Your #1 ranked castaway is your first choice in the draft</li>
              <li>Higher rankings = higher priority if there's a tie</li>
              <li>No rankings = random draft order</li>
            </ul>

            <p>Don't miss out!</p>
            <p><strong>The RGFL Team</strong></p>
          </div>
          <div class="footer">
            <p>Reality Games Fantasy League - Survivor</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `⏰ Rankings Deadline: ${deadlineDate} - Submit Now!`,
    html,
    type: "WEEKLY_REMINDER",
    metadata: { reminderType: "rankings", deadline: deadlineDate },
  });
}

/**
 * Draft Complete Email
 * Sent after draft runs
 */
export async function sendDraftCompleteEmail(
  email: string,
  name: string,
  castaways: { name: string; round: number }[],
  leagueName: string,
  dashboardUrl: string
): Promise<boolean> {
  const castawayList = castaways
    .map((c) => `<li><strong>Round ${c.round}:</strong> ${c.name}</li>`)
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #A42828 0%, #8a2020 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .castaways-box { background: white; border: 3px solid #A42828; border-radius: 12px; padding: 24px; margin: 20px 0; }
          .castaways-box h3 { color: #A42828; margin-top: 0; }
          .button { display: inline-block; background: #A42828; color: white; padding: 16px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Your Draft Results Are In!</h1>
          </div>
          <div class="content">
            <p>Hey ${name},</p>
            <p>The draft for <strong>${leagueName}</strong> is complete! Here's your team:</p>

            <div class="castaways-box">
              <h3>🏝️ Your Castaways</h3>
              <ul style="padding-left: 20px;">
                ${castawayList}
              </ul>
            </div>

            <p>These castaways will earn you points throughout the season based on their gameplay!</p>

            <p style="text-align: center; margin: 24px 0;">
              <a href="${dashboardUrl}" class="button" style="color: white;">View Your Dashboard</a>
            </p>

            <p><strong>What's next:</strong></p>
            <ul>
              <li>Watch the episodes to see how your castaways perform</li>
              <li>Make your weekly pick before each episode</li>
              <li>Track your scores on the leaderboard</li>
            </ul>

            <p>Good luck this season!</p>
            <p><strong>The RGFL Team</strong></p>
          </div>
          <div class="footer">
            <p>Reality Games Fantasy League - Survivor</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `🎉 Draft Complete - Meet Your ${leagueName} Team!`,
    html,
    type: "WELCOME",
    metadata: { emailSubType: "draft_complete", leagueName, castawayCount: castaways.length },
  });
}

/**
 * Weekly Pick Reminder
 * Sent 24h before pick deadline
 */
export async function sendPickReminderEmail(
  email: string,
  name: string,
  weekNumber: number,
  deadlineTime: string,
  picksUrl: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #A42828 0%, #8a2020 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .deadline-box { background: #fff3e0; border-left: 4px solid #ff9800; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; }
          .button { display: inline-block; background: #A42828; color: white; padding: 16px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 Week ${weekNumber} Pick Reminder</h1>
          </div>
          <div class="content">
            <p>Hey ${name},</p>
            <p>Time to make your Week ${weekNumber} pick!</p>

            <div class="deadline-box">
              <strong>⏰ Deadline: ${deadlineTime}</strong>
              <p style="margin: 8px 0 0;">Make sure to submit your pick before the episode airs!</p>
            </div>

            <p style="text-align: center; margin: 24px 0;">
              <a href="${picksUrl}" class="button" style="color: white;">Make Your Pick</a>
            </p>

            <p>Your weekly pick earns you bonus points if your chosen castaway performs well this episode!</p>

            <p><strong>The RGFL Team</strong></p>
          </div>
          <div class="footer">
            <p>Reality Games Fantasy League - Survivor</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `🎯 Week ${weekNumber} Pick Due: ${deadlineTime}`,
    html,
    type: "WEEKLY_REMINDER",
    metadata: { reminderType: "weekly_pick", weekNumber },
  });
}

/**
 * Auto-Pick Warning
 * Sent when user misses deadline and gets auto-pick
 */
export async function sendAutoPickEmail(
  email: string,
  name: string,
  weekNumber: number,
  autoPickedCastaway: string,
  penalty: number
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .warning-box { background: #fee2e2; border: 2px solid #dc2626; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Missed Pick Deadline</h1>
          </div>
          <div class="content">
            <p>Hey ${name},</p>
            <p>You missed the Week ${weekNumber} pick deadline, so we auto-selected a castaway for you.</p>

            <div class="warning-box">
              <p style="font-size: 18px; margin: 0;"><strong>Auto-Pick:</strong> ${autoPickedCastaway}</p>
              ${penalty > 0 ? `<p style="color: #dc2626; margin: 10px 0 0;"><strong>Penalty Applied:</strong> -${penalty} points</p>` : ""}
            </div>

            <p><strong>To avoid this next week:</strong></p>
            <ul>
              <li>Enable SMS reminders in your profile</li>
              <li>Set a calendar reminder before deadlines</li>
              <li>Check the app early in the week</li>
            </ul>

            <p>Good luck the rest of the season!</p>
            <p><strong>The RGFL Team</strong></p>
          </div>
          <div class="footer">
            <p>Reality Games Fantasy League - Survivor</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `⚠️ Week ${weekNumber}: Auto-Pick Applied`,
    html,
    type: "WEEKLY_REMINDER",
    metadata: { reminderType: "auto_pick", weekNumber, autoPickedCastaway, penalty },
  });
}

/**
 * Weekly Results Email
 * Sent after scores are published
 */
export async function sendWeeklyResultsEmail(
  email: string,
  name: string,
  weekNumber: number,
  weeklyPoints: number,
  totalPoints: number,
  rank: number,
  totalPlayers: number,
  leaderboardUrl: string
): Promise<boolean> {
  const movement = rank <= 3 ? "🔥" : rank <= 10 ? "📈" : "";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #A42828 0%, #8a2020 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0; }
          .stat-box { background: white; border-radius: 12px; padding: 20px; text-align: center; border: 2px solid #e5e7eb; }
          .stat-value { font-size: 32px; font-weight: 900; color: #A42828; }
          .stat-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
          .button { display: inline-block; background: #A42828; color: white; padding: 16px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Week ${weekNumber} Results</h1>
          </div>
          <div class="content">
            <p>Hey ${name},</p>
            <p>Week ${weekNumber} scores are in! Here's how you did:</p>

            <div class="stats-grid">
              <div class="stat-box">
                <div class="stat-value">${weeklyPoints > 0 ? "+" : ""}${weeklyPoints}</div>
                <div class="stat-label">This Week</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">${totalPoints}</div>
                <div class="stat-label">Total Points</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">${movement}#${rank}</div>
                <div class="stat-label">of ${totalPlayers}</div>
              </div>
            </div>

            <p style="text-align: center; margin: 24px 0;">
              <a href="${leaderboardUrl}" class="button" style="color: white;">View Full Leaderboard</a>
            </p>

            <p>Keep watching and making smart picks!</p>
            <p><strong>The RGFL Team</strong></p>
          </div>
          <div class="footer">
            <p>Reality Games Fantasy League - Survivor</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `📊 Week ${weekNumber}: You scored ${weeklyPoints > 0 ? "+" : ""}${weeklyPoints} pts (Rank #${rank})`,
    html,
    type: "WEEKLY_REMINDER",
    metadata: { reminderType: "weekly_results", weekNumber, weeklyPoints, totalPoints, rank },
  });
}

/**
 * Final Standings Email
 * Sent at end of season
 */
export async function sendFinalStandingsEmail(
  email: string,
  name: string,
  seasonName: string,
  finalRank: number,
  totalPlayers: number,
  totalPoints: number,
  leagueName: string
): Promise<boolean> {
  const trophy = finalRank === 1 ? "🏆" : finalRank === 2 ? "🥈" : finalRank === 3 ? "🥉" : "🎖️";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #A42828 0%, #8a2020 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .rank-box { background: white; border: 4px solid #A42828; border-radius: 16px; padding: 30px; text-align: center; margin: 20px 0; }
          .rank-number { font-size: 72px; font-weight: 900; color: #A42828; margin: 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${trophy} ${seasonName} Complete!</h1>
          </div>
          <div class="content">
            <p>Hey ${name},</p>
            <p>What a season! Here are your final results for <strong>${leagueName}</strong>:</p>

            <div class="rank-box">
              <p style="font-size: 18px; margin: 0 0 10px; color: #666;">Final Rank</p>
              <p class="rank-number">#${finalRank}</p>
              <p style="color: #666; margin: 10px 0 0;">of ${totalPlayers} players</p>
              <p style="font-size: 24px; font-weight: 700; color: #A42828; margin: 16px 0 0;">${totalPoints} Total Points</p>
            </div>

            ${finalRank <= 3 ? `<p style="text-align: center; font-size: 20px;"><strong>🎉 Congratulations on finishing in the top 3!</strong></p>` : ""}

            <p>Thanks for playing ${seasonName}! Keep an eye out for next season.</p>

            <p><strong>The RGFL Team</strong></p>
          </div>
          <div class="footer">
            <p>Reality Games Fantasy League - Survivor</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `${trophy} ${seasonName} Final: You finished #${finalRank}!`,
    html,
    type: "WELCOME",
    metadata: { emailSubType: "final_standings", seasonName, finalRank, totalPoints },
  });
}

/**
 * Profile Reminder Email
 * Sent to users who haven't completed their profile (P1)
 */
export async function sendProfileReminderEmail(
  email: string,
  name: string,
  missingFields: string[],
  profileUrl: string
): Promise<boolean> {
  const fieldsList = missingFields.map((f) => `<li>${f}</li>`).join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #A42828 0%, #8a2020 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .checklist { background: white; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b; }
          .button { display: inline-block; background: #A42828; color: white; padding: 16px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📝 Complete Your Profile</h1>
          </div>
          <div class="content">
            <p>Hey ${name},</p>
            <p>Your RGFL profile is almost complete! Just a few more details:</p>

            <div class="checklist">
              <strong>Missing Info:</strong>
              <ul style="padding-left: 20px; margin: 10px 0 0;">
                ${fieldsList}
              </ul>
            </div>

            <p>Complete your profile to get the full experience - personalized stats, better matches, and more!</p>

            <p style="text-align: center; margin: 24px 0;">
              <a href="${profileUrl}" class="button" style="color: white;">Complete Profile</a>
            </p>

            <p><strong>The RGFL Team</strong></p>
          </div>
          <div class="footer">
            <p>Reality Games Fantasy League - Survivor</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: "📝 Your RGFL profile is almost complete!",
    html,
    type: "WELCOME",
    metadata: { emailSubType: "profile_reminder", missingFields },
  });
}

/**
 * Season Start Email
 * Sent when a new season officially kicks off (P1)
 */
export async function sendSeasonStartEmail(
  email: string,
  name: string,
  seasonName: string,
  episode1Date: string,
  dashboardUrl: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #A42828 0%, #8a2020 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 36px; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .premiere-box { background: white; border: 3px solid #A42828; border-radius: 12px; padding: 30px; text-align: center; margin: 20px 0; }
          .premiere-date { font-size: 24px; font-weight: 700; color: #A42828; }
          .button { display: inline-block; background: #A42828; color: white; padding: 16px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔥 ${seasonName} IS HERE!</h1>
          </div>
          <div class="content">
            <p>Hey ${name},</p>
            <p>The wait is over! <strong>${seasonName}</strong> officially begins!</p>

            <div class="premiere-box">
              <p style="margin: 0; color: #666;">Episode 1 Premieres</p>
              <p class="premiere-date">${episode1Date}</p>
              <p style="margin: 10px 0 0; color: #666;">Don't miss it!</p>
            </div>

            <p><strong>📋 Your Pre-Season Checklist:</strong></p>
            <ul>
              <li>✅ Submit your castaway rankings (if you haven't!)</li>
              <li>📺 Watch Episode 1 on premiere night</li>
              <li>🎯 Wait for draft results after Episode 1</li>
              <li>📊 Start making weekly picks from Episode 2</li>
            </ul>

            <p style="text-align: center; margin: 24px 0;">
              <a href="${dashboardUrl}" class="button" style="color: white;">Go to Dashboard</a>
            </p>

            <p>Let the games begin! 🏝️</p>
            <p><strong>The RGFL Team</strong></p>
          </div>
          <div class="footer">
            <p>Reality Games Fantasy League - Survivor</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `🔥 ${seasonName} Starts Now - Let the Games Begin!`,
    html,
    type: "WELCOME",
    metadata: { emailSubType: "season_start", seasonName, episode1Date },
  });
}

/**
 * Pick Confirmation Email
 * Sent immediately after a user submits their weekly pick (P2)
 */
export async function sendPickConfirmationEmail(
  email: string,
  name: string,
  weekNumber: number,
  castawayName: string,
  episodeDate: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .pick-box { background: white; border: 3px solid #10b981; border-radius: 12px; padding: 24px; text-align: center; margin: 20px 0; }
          .pick-name { font-size: 28px; font-weight: 800; color: #10b981; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Pick Confirmed!</h1>
          </div>
          <div class="content">
            <p>Hey ${name},</p>
            <p>Your Week ${weekNumber} pick is locked in!</p>

            <div class="pick-box">
              <p style="margin: 0; color: #666; font-size: 14px;">Week ${weekNumber} Pick</p>
              <p class="pick-name">${castawayName}</p>
              <p style="margin: 10px 0 0; color: #666;">Scoring on ${episodeDate}</p>
            </div>

            <p>Your pick will earn bonus points based on ${castawayName}'s performance this episode. Good luck!</p>

            <p><strong>The RGFL Team</strong></p>
          </div>
          <div class="footer">
            <p>Reality Games Fantasy League - Survivor</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `✅ Week ${weekNumber} Pick Confirmed: ${castawayName}`,
    html,
    type: "WEEKLY_REMINDER",
    metadata: { reminderType: "pick_confirmation", weekNumber, castawayName },
  });
}

/**
 * Leaderboard Update Email
 * Weekly summary of standings (P2)
 */
export async function sendLeaderboardUpdateEmail(
  email: string,
  name: string,
  weekNumber: number,
  rank: number,
  previousRank: number,
  totalPlayers: number,
  topPlayers: { name: string; points: number }[],
  leaderboardUrl: string
): Promise<boolean> {
  const movement = rank < previousRank ? "📈" : rank > previousRank ? "📉" : "➡️";
  const movementText = rank < previousRank ? `Up ${previousRank - rank}` : rank > previousRank ? `Down ${rank - previousRank}` : "No change";

  const topList = topPlayers
    .slice(0, 5)
    .map((p, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      return `<tr><td style="padding: 8px;">${medal}</td><td style="padding: 8px;">${p.name}</td><td style="padding: 8px; text-align: right; font-weight: 600;">${p.points}</td></tr>`;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #A42828 0%, #8a2020 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .rank-box { background: white; border-radius: 12px; padding: 20px; margin: 20px 0; display: flex; justify-content: space-between; align-items: center; }
          .your-rank { font-size: 48px; font-weight: 900; color: #A42828; }
          .movement { font-size: 16px; color: #666; }
          .leaderboard { background: white; border-radius: 12px; padding: 20px; margin: 20px 0; }
          .leaderboard table { width: 100%; border-collapse: collapse; }
          .button { display: inline-block; background: #A42828; color: white; padding: 16px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏆 Week ${weekNumber} Standings</h1>
          </div>
          <div class="content">
            <p>Hey ${name},</p>
            <p>Here's where you stand after Week ${weekNumber}:</p>

            <div class="rank-box">
              <div>
                <p style="margin: 0; color: #666; font-size: 14px;">Your Rank</p>
                <p class="your-rank">#${rank}</p>
                <p style="margin: 0; color: #666;">of ${totalPlayers} players</p>
              </div>
              <div style="text-align: right;">
                <p style="margin: 0; font-size: 24px;">${movement}</p>
                <p class="movement">${movementText}</p>
              </div>
            </div>

            <div class="leaderboard">
              <h3 style="margin-top: 0;">🏅 Top 5</h3>
              <table>
                ${topList}
              </table>
            </div>

            <p style="text-align: center; margin: 24px 0;">
              <a href="${leaderboardUrl}" class="button" style="color: white;">Full Leaderboard</a>
            </p>

            <p><strong>The RGFL Team</strong></p>
          </div>
          <div class="footer">
            <p>Reality Games Fantasy League - Survivor</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `🏆 Week ${weekNumber}: You're #${rank} ${movement}`,
    html,
    type: "WEEKLY_REMINDER",
    metadata: { reminderType: "leaderboard_update", weekNumber, rank, previousRank },
  });
}

/**
 * Elimination Alert Email
 * Sent when one of the user's drafted castaways is eliminated (P1)
 */
export async function sendEliminationAlertEmail(
  email: string,
  name: string,
  eliminatedCastaway: string,
  weekNumber: number,
  remainingCastaways: string[],
  dashboardUrl: string
): Promise<boolean> {
  const remainingList = remainingCastaways.length > 0
    ? remainingCastaways.map((c) => `<li>${c}</li>`).join("")
    : "<li><em>No castaways remaining</em></li>";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .elimination-box { background: white; border: 2px solid #9ca3af; border-radius: 12px; padding: 24px; text-align: center; margin: 20px 0; }
          .eliminated-name { font-size: 24px; font-weight: 700; color: #6b7280; text-decoration: line-through; }
          .remaining-box { background: white; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; }
          .button { display: inline-block; background: #A42828; color: white; padding: 16px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔥 Torch Snuffed</h1>
          </div>
          <div class="content">
            <p>Hey ${name},</p>
            <p>Unfortunately, one of your castaways has been voted out in Week ${weekNumber}.</p>

            <div class="elimination-box">
              <p style="margin: 0; color: #666; font-size: 14px;">Eliminated</p>
              <p class="eliminated-name">${eliminatedCastaway}</p>
              <p style="margin: 10px 0 0; color: #666;">The tribe has spoken.</p>
            </div>

            <div class="remaining-box">
              <strong>Your Remaining Castaways:</strong>
              <ul style="margin: 10px 0 0; padding-left: 20px;">
                ${remainingList}
              </ul>
            </div>

            <p>Keep making smart weekly picks to stay competitive!</p>

            <p style="text-align: center; margin: 24px 0;">
              <a href="${dashboardUrl}" class="button" style="color: white;">View Dashboard</a>
            </p>

            <p><strong>The RGFL Team</strong></p>
          </div>
          <div class="footer">
            <p>Reality Games Fantasy League - Survivor</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `🔥 ${eliminatedCastaway} Voted Out - Week ${weekNumber}`,
    html,
    type: "WEEKLY_REMINDER",
    metadata: { reminderType: "elimination", weekNumber, eliminatedCastaway, remainingCount: remainingCastaways.length },
  });
}

/**
 * Re-engagement Email
 * Sent to users who haven't logged in for a while (P2)
 */
export async function sendReengagementEmail(
  email: string,
  name: string,
  lastSeenDays: number,
  currentWeek: number,
  rank: number,
  totalPlayers: number,
  dashboardUrl: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #A42828 0%, #8a2020 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .status-box { background: white; border: 2px solid #A42828; border-radius: 12px; padding: 24px; margin: 20px 0; }
          .button { display: inline-block; background: #A42828; color: white; padding: 16px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>👋 We Miss You!</h1>
          </div>
          <div class="content">
            <p>Hey ${name},</p>
            <p>It's been ${lastSeenDays} days since you last checked in. The game is still on!</p>

            <div class="status-box">
              <h3 style="margin-top: 0;">📊 Your Status</h3>
              <ul style="padding-left: 20px;">
                <li><strong>Current Week:</strong> ${currentWeek}</li>
                <li><strong>Your Rank:</strong> #${rank} of ${totalPlayers}</li>
                <li><strong>Days Away:</strong> ${lastSeenDays}</li>
              </ul>
            </div>

            <p><strong>Don't fall behind!</strong> Make your Week ${currentWeek} pick before it's too late.</p>

            <p style="text-align: center; margin: 24px 0;">
              <a href="${dashboardUrl}" class="button" style="color: white;">Get Back in the Game</a>
            </p>

            <p><strong>The RGFL Team</strong></p>
          </div>
          <div class="footer">
            <p>Reality Games Fantasy League - Survivor</p>
            <p style="font-size: 12px;">Don't want these reminders? <a href="${dashboardUrl}/settings">Update preferences</a></p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `👋 ${name}, your RGFL game needs you!`,
    html,
    type: "WEEKLY_REMINDER",
    metadata: { reminderType: "reengagement", lastSeenDays, currentWeek, rank },
  });
}

/**
 * Season Finale Email
 * Sent before the finale episode (P1)
 */
export async function sendSeasonFinaleEmail(
  email: string,
  name: string,
  seasonName: string,
  finaleDate: string,
  rank: number,
  totalPlayers: number,
  pointsBehindLeader: number,
  dashboardUrl: string
): Promise<boolean> {
  const canWin = pointsBehindLeader <= 100;
  const winMessage = canWin
    ? `<p style="background: #d1fae5; padding: 16px; border-radius: 8px; text-align: center;"><strong>🎯 You're only ${pointsBehindLeader} points behind the leader!</strong> A big finale could put you on top!</p>`
    : "";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #A42828 0%, #8a2020 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 32px; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .finale-box { background: white; border: 3px solid #A42828; border-radius: 12px; padding: 30px; text-align: center; margin: 20px 0; }
          .finale-date { font-size: 24px; font-weight: 700; color: #A42828; }
          .button { display: inline-block; background: #A42828; color: white; padding: 16px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏆 FINALE TIME!</h1>
            <p style="margin: 10px 0 0; font-size: 18px;">${seasonName}</p>
          </div>
          <div class="content">
            <p>Hey ${name},</p>
            <p>This is it! The ${seasonName} finale is almost here!</p>

            <div class="finale-box">
              <p style="margin: 0; color: #666;">The Finale</p>
              <p class="finale-date">${finaleDate}</p>
              <p style="margin: 10px 0 0;">
                <strong>Your Rank: #${rank}</strong> of ${totalPlayers}
              </p>
            </div>

            ${winMessage}

            <p><strong>Finale Week Scoring:</strong></p>
            <ul>
              <li>🔥 Bonus points for Fire Making Challenge</li>
              <li>🗳️ Jury votes = major points</li>
              <li>👑 If your castaway wins, huge bonus!</li>
            </ul>

            <p style="text-align: center; margin: 24px 0;">
              <a href="${dashboardUrl}" class="button" style="color: white;">View Your Team</a>
            </p>

            <p>May the best fantasy player win!</p>
            <p><strong>The RGFL Team</strong></p>
          </div>
          <div class="footer">
            <p>Reality Games Fantasy League - Survivor</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `🏆 ${seasonName} Finale - Your Final Shot at Glory!`,
    html,
    type: "WEEKLY_REMINDER",
    metadata: { reminderType: "finale", seasonName, finaleDate, rank, pointsBehindLeader },
  });
}

/**
 * Next Season Promo Email
 * Sent to past players about upcoming season (P1)
 */
export async function sendNextSeasonPromoEmail(
  email: string,
  name: string,
  previousSeasonName: string,
  previousRank: number,
  nextSeasonName: string,
  signupUrl: string,
  earlyBirdDeadline?: string
): Promise<boolean> {
  const earlyBird = earlyBirdDeadline
    ? `<div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <strong>⏰ Early Bird Bonus!</strong>
        <p style="margin: 8px 0 0;">Sign up before <strong>${earlyBirdDeadline}</strong> for priority league placement!</p>
      </div>`
    : "";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #A42828 0%, #8a2020 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .promo-box { background: white; border: 3px solid #A42828; border-radius: 12px; padding: 24px; text-align: center; margin: 20px 0; }
          .season-name { font-size: 28px; font-weight: 800; color: #A42828; }
          .button { display: inline-block; background: #A42828; color: white; padding: 18px 48px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🆕 New Season Alert!</h1>
          </div>
          <div class="content">
            <p>Hey ${name},</p>
            <p>You finished <strong>#${previousRank}</strong> in ${previousSeasonName}. Ready to do even better?</p>

            <div class="promo-box">
              <p style="margin: 0; color: #666;">Coming Soon</p>
              <p class="season-name">${nextSeasonName}</p>
              <p style="margin: 10px 0 0; color: #666;">18 new castaways. New strategies. Your redemption arc.</p>
            </div>

            ${earlyBird}

            <p><strong>Why come back?</strong></p>
            <ul>
              <li>🎯 New castaways to rank and draft</li>
              <li>📊 Updated scoring with 100+ rules</li>
              <li>🏆 Compete against returning players</li>
              <li>📱 SMS reminders so you never miss a pick</li>
            </ul>

            <p style="text-align: center; margin: 24px 0;">
              <a href="${signupUrl}" class="button" style="color: white;">Join ${nextSeasonName}</a>
            </p>

            <p>See you on the island!</p>
            <p><strong>The RGFL Team</strong></p>
          </div>
          <div class="footer">
            <p>Reality Games Fantasy League - Survivor</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `🆕 ${nextSeasonName} is Coming - Secure Your Spot!`,
    html,
    type: "REGISTRATION_OPEN",
    metadata: { emailSubType: "next_season_promo", previousSeasonName, previousRank, nextSeasonName },
  });
}

/**
 * Email Verification
 * Sent to verify email address (P2)
 */
export async function sendEmailVerificationEmail(
  email: string,
  name: string,
  verificationUrl: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #A42828 0%, #8a2020 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #A42828; color: white; padding: 16px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; }
          .link-box { background: white; padding: 12px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 0.9em; margin: 16px 0; border: 1px solid #ddd; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✉️ Verify Your Email</h1>
          </div>
          <div class="content">
            <p>Hey ${name},</p>
            <p>Thanks for signing up for RGFL Survivor! Please verify your email address to complete your registration.</p>

            <p style="text-align: center; margin: 24px 0;">
              <a href="${verificationUrl}" class="button" style="color: white;">Verify Email</a>
            </p>

            <p>Or copy and paste this link into your browser:</p>
            <div class="link-box">${verificationUrl}</div>

            <div class="warning">
              <strong>⚠️ Link expires in 24 hours.</strong> If you didn't create an account, you can safely ignore this email.
            </div>

            <p><strong>The RGFL Team</strong></p>
          </div>
          <div class="footer">
            <p>Reality Games Fantasy League - Survivor</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: "✉️ Verify Your Email - RGFL Survivor",
    html,
    text: `Hey ${name},\n\nVerify your email by clicking this link: ${verificationUrl}\n\nThis link expires in 24 hours.\n\nThe RGFL Team`,
    type: "WELCOME",
    metadata: { emailSubType: "email_verification" },
  });
}

// Test email configuration
export async function testEmailConfig(): Promise<boolean> {
  if (!resend) {
    logger.info("❌ Resend not configured");
    return false;
  }

  try {
    // Resend doesn't have a verify method, but we can check if the key is valid
    logger.info("✅ Resend API key is configured");
    return true;
  } catch (error) {
    logger.error("❌ Resend configuration error:", error);
    return false;
  }
}
