// @ts-nocheck
import { Router } from "express";
import { createLogger, logError } from "./logger.js";
const logger = createLogger("sms");
import prisma from "./prisma.js";
import { requireAdmin } from "./middleware.js";
import { sendSMS, normalizePhone } from "./simpletexting.js";
import {
  handlePickCommand,
  handleLeaderboardCommand,
  handleStatusCommand,
  handleTeamCommand,
  handleHelpCommand
} from "./sms-handlers.js";

const router = Router();

// Rate limiting map: phone -> { count, resetAt }
const rateLimits = new Map<string, { count: number; resetAt: Date }>();

function checkRateLimit(phone: string): boolean {
  const limit = parseInt(process.env.SMS_RATE_LIMIT_PER_USER_PER_DAY || '10');
  const now = new Date();
  const entry = rateLimits.get(phone);

  if (!entry || now > entry.resetAt) {
    // Reset daily limit
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    rateLimits.set(phone, { count: 1, resetAt: tomorrow });
    return true;
  }

  if (entry.count >= limit) {
    return false; // Rate limit exceeded
  }

  entry.count++;
  return true;
}

// Webhook handler function (supports both GET for SMS and POST for MMS)
async function handleWebhook(req: any, res: any) {
  try {
    let contactPhone: string;
    let text: string;
    let accountPhone: string;

    // SimpleTexting sends SMS via GET and MMS via POST
    if (req.method === 'GET') {
      // SMS format: ?from=8017555038&to=555888&text=MESSAGE
      contactPhone = req.query.from as string;
      accountPhone = req.query.to as string;
      text = req.query.text as string || '';
    } else {
      // POST can be MMS format or custom webhook format
      const body = req.body;

      // Check if it's MMS format: {from, to, text, attachments}
      if (body.from && body.to) {
        contactPhone = body.from;
        accountPhone = body.to;
        text = body.text || '';
      }
      // Check if it's custom webhook format: {type, values}
      else if (body.type === 'INCOMING_MESSAGE' && body.values) {
        contactPhone = body.values.contactPhone;
        accountPhone = body.values.accountPhone;
        text = body.values.text || '';
      }
      // Unknown format
      else {
        logger.warn('Unknown webhook format:', JSON.stringify(body).substring(0, 200));
        return res.status(200).json({ received: true });
      }
    }

    // Validate required fields
    if (!contactPhone || !text) {
      logger.warn('Missing required fields in webhook');
      return res.status(200).json({ received: true });
    }

    // Validate it's for our account
    if (accountPhone !== process.env.SIMPLETEXTING_ACCOUNT_PHONE) {
      logger.warn(`Webhook for wrong account: ${accountPhone}`);
      return res.status(200).json({ received: true });
    }

    const phone = normalizePhone(contactPhone);

    // Check rate limit
    if (!checkRateLimit(phone)) {
      await logSMS({
        phone,
        direction: 'INBOUND',
        inboundText: text,
        outboundText: null,
        success: false,
        errorMessage: 'Rate limit exceeded',
        command: null
      });

      await sendSMS({
        to: phone,
        text: "You've reached your daily SMS limit (10). Try again tomorrow or visit rgfl.app"
      });

      return res.status(200).json({ received: true });
    }

    // Find user by phone
    const user = await prisma.user.findUnique({
      where: { phone }
    });

    if (!user) {
      await logSMS({
        phone,
        direction: 'INBOUND',
        inboundText: text,
        outboundText: null,
        success: false,
        errorMessage: 'User not found',
        command: null
      });

      await sendSMS({
        to: phone,
        text: "Phone not recognized. Please add your phone at rgfl.app/profile/sms"
      });

      return res.status(200).json({ received: true });
    }

    if (!user.smsEnabled) {
      await logSMS({
        userId: user.id,
        phone,
        direction: 'INBOUND',
        inboundText: text,
        outboundText: null,
        success: false,
        errorMessage: 'SMS disabled',
        command: null
      });

      return res.status(200).json({ received: true });
    }

    // Parse command
    const parts = text.trim().toUpperCase().split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    let response: string;
    let success = true;
    let errorMessage: string | null = null;

    try {
      switch (command) {
        case 'PICK': {
          const week = await prisma.week.findFirst({ where: { isActive: true } });
          if (!week) {
            response = "No active week. Check your email or visit rgfl.app";
            break;
          }
          response = await handlePickCommand(user, args, week);
          break;
        }

        case 'LEADERBOARD':
        case 'BOARD':
        case 'LEAD':
          response = await handleLeaderboardCommand(user);
          break;

        case 'STATUS':
        case 'CHECK':
        case 'PICK?': {
          const week = await prisma.week.findFirst({ where: { isActive: true } });
          if (!week) {
            response = "No active week. Check your email or visit rgfl.app";
            break;
          }
          response = await handleStatusCommand(user, week);
          break;
        }

        case 'TEAM':
        case 'CASTAWAYS':
        case 'ROSTER':
          response = await handleTeamCommand(user);
          break;

        case 'HELP':
        case 'COMMANDS':
        case '?':
          response = await handleHelpCommand();
          break;

        case 'STOP':
        case 'UNSUBSCRIBE':
        case 'CANCEL':
        case 'END':
        case 'QUIT':
          await prisma.user.update({
            where: { id: user.id },
            data: { smsEnabled: false }
          });
          response = "You've been unsubscribed from RGFL SMS. Text START to re-enable or manage at rgfl.app/profile/sms";
          break;

        case 'START':
        case 'SUBSCRIBE':
        case 'UNSTOP':
        case 'RESUME':
          await prisma.user.update({
            where: { id: user.id },
            data: { smsEnabled: true }
          });
          response = "Welcome back! You're subscribed to RGFL SMS. Reply HELP for commands.";
          break;

        default:
          response = `Unknown command: "${command}". Reply HELP for available commands or visit rgfl.app`;
          success = false;
          errorMessage = 'Unknown command';
      }

      // Send response
      const smsResponse = await sendSMS({ to: phone, text: response });

      // Log interaction
      await logSMS({
        userId: user.id,
        phone,
        direction: 'OUTBOUND',
        command,
        inboundText: text,
        outboundText: response,
        success,
        errorMessage,
        messageId: smsResponse.id,
        credits: smsResponse.credits
      });

    } catch (error: any) {
      logger.error('SMS command error:', error);

      await logSMS({
        userId: user.id,
        phone,
        direction: 'INBOUND',
        command,
        inboundText: text,
        outboundText: null,
        success: false,
        errorMessage: error.message
      });

      await sendSMS({
        to: phone,
        text: "Sorry, something went wrong. Please try again or visit rgfl.app"
      });
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    logger.error('Webhook error:', error);
    return res.status(200).json({ received: true });
  }
}

// Register webhook for both GET (SMS) and POST (MMS/custom)
router.post("/webhook", handleWebhook);
router.get("/webhook", handleWebhook);

router.get("/health", (req, res) => {
  res.json({ status: "ok", service: "sms-webhook" });
});

router.get("/logs", requireAdmin, async (req, res) => {
  const logs = await prisma.sMSLog.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  res.json(logs);
});

// Get reminder status
router.get("/reminder-status", requireAdmin, async (req, res) => {
  const enabled = process.env.SMS_REMINDER_ENABLED === 'true';

  const activeWeek = await prisma.week.findFirst({
    where: { isActive: true },
    select: { id: true, weekNumber: true, picksCloseAt: true }
  });

  res.json({
    enabled,
    activeWeek,
    reminderWindows: {
      "48h": "48 hours before deadline",
      "24h": "24 hours before deadline",
      "2h": "2 hours before deadline"
    }
  });
});

// Estimate recipients for blast
router.post("/blast/estimate", requireAdmin, async (req, res) => {
  try {
    const { recipientFilter, customRecipients } = req.body as {
      recipientFilter: "all" | "no-picks" | "custom";
      customRecipients?: string[];
    };

    let recipients: any[] = [];

    if (recipientFilter === "all") {
      recipients = await prisma.user.findMany({
        where: {
          phone: { not: null },
          smsEnabled: true
        }
      });
    } else if (recipientFilter === "no-picks") {
      const activeWeek = await prisma.week.findFirst({ where: { isActive: true } });
      if (!activeWeek) {
        return res.json({ count: 0, recipients: [] });
      }

      const usersWithPicks = await prisma.pick.findMany({
        where: { weekNumber: activeWeek.weekNumber },
        select: { userId: true }
      });

      const userIdsWithPicks = new Set(usersWithPicks.map(p => p.userId));

      recipients = await prisma.user.findMany({
        where: {
          phone: { not: null },
          smsEnabled: true,
          id: { notIn: Array.from(userIdsWithPicks) }
        }
      });
    } else if (recipientFilter === "custom" && customRecipients) {
      recipients = await prisma.user.findMany({
        where: {
          id: { in: customRecipients },
          phone: { not: null },
          smsEnabled: true
        }
      });
    }

    res.json({ count: recipients.length, recipients: recipients.map(u => u.id) });
  } catch (error) {
    logger.error("Failed to estimate recipients:", error);
    res.status(500).json({ error: "Failed to estimate recipients" });
  }
});

// Send SMS blast
router.post("/blast", requireAdmin, async (req, res) => {
  try {
    const { message, recipientFilter, customRecipients } = req.body as {
      message: string;
      recipientFilter: "all" | "no-picks" | "custom";
      customRecipients?: string[];
    };

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    let recipients: any[] = [];

    if (recipientFilter === "all") {
      recipients = await prisma.user.findMany({
        where: {
          phone: { not: null },
          smsEnabled: true
        },
        select: { id: true, name: true, phone: true }
      });
    } else if (recipientFilter === "no-picks") {
      const activeWeek = await prisma.week.findFirst({ where: { isActive: true } });
      if (!activeWeek) {
        return res.status(400).json({ error: "No active week found" });
      }

      const usersWithPicks = await prisma.pick.findMany({
        where: { weekNumber: activeWeek.weekNumber },
        select: { userId: true }
      });

      const userIdsWithPicks = new Set(usersWithPicks.map(p => p.userId));

      recipients = await prisma.user.findMany({
        where: {
          phone: { not: null },
          smsEnabled: true,
          id: { notIn: Array.from(userIdsWithPicks) }
        },
        select: { id: true, name: true, phone: true }
      });
    } else if (recipientFilter === "custom" && customRecipients) {
      recipients = await prisma.user.findMany({
        where: {
          id: { in: customRecipients },
          phone: { not: null },
          smsEnabled: true
        },
        select: { id: true, name: true, phone: true }
      });
    }

    if (recipients.length === 0) {
      return res.status(400).json({ error: "No recipients match the filter" });
    }

    // Get active week for variable substitution
    const activeWeek = await prisma.week.findFirst({ where: { isActive: true } });

    let sentCount = 0;
    let failedCount = 0;

    // Send to each recipient
    for (const recipient of recipients) {
      try {
        // Substitute variables
        let personalizedMessage = message.replace(/{name}/g, recipient.name);

        if (activeWeek) {
          personalizedMessage = personalizedMessage.replace(/{week}/g, activeWeek.weekNumber.toString());

          if (activeWeek.picksCloseAt) {
            const deadline = new Date(activeWeek.picksCloseAt).toLocaleString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              timeZone: "America/Los_Angeles"
            });
            personalizedMessage = personalizedMessage.replace(/{deadline}/g, deadline);
          }
        }

        const smsResponse = await sendSMS({
          to: recipient.phone!,
          text: personalizedMessage
        });

        await logSMS({
          userId: recipient.id,
          phone: recipient.phone!,
          direction: 'OUTBOUND',
          command: 'BLAST',
          inboundText: null,
          outboundText: personalizedMessage,
          success: true,
          messageId: smsResponse.id,
          credits: smsResponse.credits
        });

        // Update lastSmsAt
        await prisma.user.update({
          where: { id: recipient.id },
          data: { lastSmsAt: new Date() }
        });

        sentCount++;
      } catch (error: any) {
        logger.error(`Failed to send SMS to ${recipient.name}:`, error);

        await logSMS({
          userId: recipient.id,
          phone: recipient.phone!,
          direction: 'OUTBOUND',
          command: 'BLAST',
          inboundText: null,
          outboundText: message,
          success: false,
          errorMessage: error.message
        });

        failedCount++;
      }
    }

    logger.info(`[SMS BLAST] Sent ${sentCount} messages, ${failedCount} failed`);

    res.json({
      sentCount,
      failedCount,
      totalRecipients: recipients.length
    });
  } catch (error: any) {
    logger.error("SMS blast error:", error);
    res.status(500).json({ error: "Failed to send SMS blast" });
  }
});

async function logSMS(data: {
  userId?: string;
  phone: string;
  direction: string;
  command?: string | null;
  inboundText?: string | null;
  outboundText?: string | null;
  success: boolean;
  errorMessage?: string | null;
  messageId?: string | null;
  credits?: number;
  eventKey?: string | null;
}) {
  await prisma.sMSLog.create({
    data: {
      userId: data.userId,
      phone: data.phone,
      direction: data.direction,
      command: data.command || null,
      inboundText: data.inboundText || null,
      outboundText: data.outboundText || null,
      success: data.success,
      errorMessage: data.errorMessage || null,
      messageId: data.messageId || null,
      credits: data.credits || 0,
      eventKey: data.eventKey || null
    }
  });
}

export default router;
