// @ts-nocheck
// server/scheduler.ts
import { createLogger, logError } from "./logger.js";
const logger = createLogger("scheduler");
import { runAutoPickJob } from "./jobs/autoPickJob.js";
import prisma from "./prisma.js";
import { sendSMS } from "./simpletexting.js";

// Track sent reminders to avoid duplicates
const sentReminders = new Map<string, Set<string>>(); // weekId -> Set of userIds

/**
 * Check if we should send reminders for the active week
 * Sends reminders at 48h, 24h, and 2h before deadline
 */
async function checkAndSendReminders() {
  if (!process.env.SMS_REMINDER_ENABLED || process.env.SMS_REMINDER_ENABLED !== 'true') {
    return;
  }

  try {
    const activeWeek = await prisma.week.findFirst({
      where: { isActive: true }
    });

    if (!activeWeek || !activeWeek.picksCloseAt) {
      return;
    }

    const now = new Date();
    const deadline = new Date(activeWeek.picksCloseAt);
    const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Determine which reminder tier we're in
    let reminderType: "48h" | "24h" | "2h" | null = null;
    let reminderKey: string;

    if (hoursUntilDeadline > 47 && hoursUntilDeadline <= 49) {
      reminderType = "48h";
      reminderKey = `${activeWeek.id}-48h`;
    } else if (hoursUntilDeadline > 23 && hoursUntilDeadline <= 25) {
      reminderType = "24h";
      reminderKey = `${activeWeek.id}-24h`;
    } else if (hoursUntilDeadline > 1.5 && hoursUntilDeadline <= 2.5) {
      reminderType = "2h";
      reminderKey = `${activeWeek.id}-2h`;
    } else {
      // Not in a reminder window
      return;
    }

    // Get users who haven't submitted picks yet
    const usersWithPicks = await prisma.pick.findMany({
      where: { weekNumber: activeWeek.weekNumber },
      select: { userId: true }
    });

    const userIdsWithPicks = new Set(usersWithPicks.map(p => p.userId));

    const usersWithoutPicks = await prisma.user.findMany({
      where: {
        phone: { not: null },
        smsEnabled: true,
        smsReminders: true,
        id: { notIn: Array.from(userIdsWithPicks) }
      },
      select: { id: true, name: true, phone: true }
    });

    if (usersWithoutPicks.length === 0) {
      return;
    }

    // Check if we've already sent this reminder
    if (!sentReminders.has(reminderKey)) {
      sentReminders.set(reminderKey, new Set());
    }

    const sentForThisReminder = sentReminders.get(reminderKey)!;

    // Format deadline for SMS
    const deadlineFormatted = deadline.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Los_Angeles"
    });

    // Send reminders
    let sentCount = 0;
    for (const user of usersWithoutPicks) {
      // Skip if already sent this reminder to this user
      if (sentForThisReminder.has(user.id)) {
        continue;
      }

      try {
        // Create idempotency key: reminder:week:userId:type
        const eventKey = `reminder:${activeWeek.weekNumber}:${user.id}:${reminderType}`;

        // Check if we already sent this reminder
        const existingSMS = await prisma.sMSLog.findUnique({
          where: { eventKey }
        });

        if (existingSMS) {
          logger.info(`[Scheduler] Skipping duplicate ${reminderType} reminder for ${user.name} (eventKey: ${eventKey})`);
          sentForThisReminder.add(user.id);
          continue;
        }

        let message: string;

        if (reminderType === "48h") {
          message = `⏰ 48 hours left to make your Week ${activeWeek.weekNumber} pick! Choose wisely. Deadline: ${deadlineFormatted}`;
        } else if (reminderType === "24h") {
          message = `🚨 24 hours remaining! Week ${activeWeek.weekNumber} picks close ${deadlineFormatted}. Don't get left behind!`;
        } else {
          message = `⚠️ FINAL CALL! Week ${activeWeek.weekNumber} picks close in 2 hours at ${deadlineFormatted}. Submit now or lose your vote!`;
        }

        const smsResponse = await sendSMS({
          to: user.phone!,
          text: message
        });

        // Log the reminder with eventKey for idempotency
        await prisma.sMSLog.create({
          data: {
            userId: user.id,
            phone: user.phone!,
            direction: 'OUTBOUND',
            command: `REMINDER_${reminderType.toUpperCase()}`,
            inboundText: null,
            outboundText: message,
            success: true,
            messageId: smsResponse.id,
            credits: smsResponse.credits,
            eventKey
          }
        });

        // Update lastSmsAt
        await prisma.user.update({
          where: { id: user.id },
          data: { lastSmsAt: new Date() }
        });

        sentForThisReminder.add(user.id);
        sentCount++;

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        logger.error(`[Scheduler] Failed to send ${reminderType} reminder to ${user.name}:`, error);

        await prisma.sMSLog.create({
          data: {
            userId: user.id,
            phone: user.phone!,
            direction: 'OUTBOUND',
            command: `REMINDER_${reminderType.toUpperCase()}`,
            inboundText: null,
            outboundText: "",
            success: false,
            errorMessage: error.message
          }
        });
      }
    }

    if (sentCount > 0) {
      logger.info(`[Scheduler] Sent ${sentCount} ${reminderType} reminders for Week ${activeWeek.weekNumber}`);
    }

  } catch (error) {
    logger.error("[Scheduler] Error checking reminders:", error);
  }
}

/**
 * Clean up old reminder tracking data to prevent memory leaks
 */
function cleanupReminderTracking() {
  if (sentReminders.size > 15) {
    const entries = Array.from(sentReminders.entries());
    const toKeep = entries.slice(-15);
    sentReminders.clear();
    toKeep.forEach(([key, value]) => sentReminders.set(key, value));
  }
}

/**
 * Scheduler for background jobs
 * Optimized to run only when needed:
 * - Every hour during pick window (Monday 12pm - Wednesday 7pm EST)
 * - Once immediately after pick deadline passes
 * - SMS reminders at 48h, 24h, and 2h before deadline
 */
export function startScheduler() {
  logger.info("[Scheduler] Starting optimized background job scheduler...");

  // Run every hour to check for work (much better than every 5 minutes)
  const HOURLY_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour

  async function checkAndRun() {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const hourUTC = now.getUTCHours();

    // Convert Wednesday 7pm EST (midnight UTC Thursday) and Monday 12pm EST (5pm UTC)
    // Pick window: Monday 5pm UTC - Wednesday 11:59pm UTC (before Thursday midnight)
    const isInPickWindow =
      (dayOfWeek === 1 && hourUTC >= 17) || // Monday after 5pm UTC
      (dayOfWeek === 2) || // All day Tuesday
      (dayOfWeek === 3 && hourUTC < 24); // Wednesday before midnight UTC

    if (isInPickWindow) {
      logger.info("[Scheduler] In pick window, running auto-pick job...");
      try {
        await runAutoPickJob();
      } catch (error) {
        logger.error("[Scheduler] Auto-pick job failed:", error);
      }
    } else {
      logger.info("[Scheduler] Outside pick window, skipping auto-pick job");
    }

    // Always check for SMS reminders (runs its own conditional logic)
    try {
      await checkAndSendReminders();
    } catch (error) {
      logger.error("[Scheduler] SMS reminder check failed:", error);
    }
  }

  // Schedule hourly checks
  setInterval(checkAndRun, HOURLY_CHECK_INTERVAL);

  // Clean up tracking data daily
  setInterval(cleanupReminderTracking, 24 * 60 * 60 * 1000);

  // Run once on startup (after 30 seconds to let server stabilize)
  setTimeout(async () => {
    try {
      logger.info("[Scheduler] Running initial check...");
      await checkAndRun();
    } catch (error) {
      logger.error("[Scheduler] Initial check failed:", error);
    }
  }, 30000);

  logger.info("[Scheduler] ✓ Scheduler started (checks hourly for auto-picks and SMS reminders)");
}

/**
 * Manual trigger for testing SMS reminders
 */
export async function triggerReminderCheck() {
  logger.info("[Scheduler] Manual trigger - checking reminders");
  await checkAndSendReminders();
}
