// server/jobs/autoPickJob.ts
import { createLogger } from "../logger.js";
const logger = createLogger("autoPickJob");
import prisma from "../prisma.js";

/**
 * Auto-selection logic for missed picks
 *
 * Rules:
 * 1. Find all users who haven't made a pick for the current week
 * 2. Get their 2 draft picks (castaways)
 * 3. Get their previous week's pick
 * 4. Auto-select the OPPOSITE castaway
 *
 * Runs: After picksCloseAt time (Wednesday 7pm EST)
 */
export async function runAutoPickJob(): Promise<void> {
  logger.info("[AutoPick] Starting auto-pick job...");

  const now = new Date();

  // Find weeks where picks have closed but haven't been processed
  const weeks = await prisma.week.findMany({
    where: {
      picksCloseAt: {
        lte: now // Pick window has closed
      },
      isActive: true
    }
  });

  if (weeks.length === 0) {
    logger.info("[AutoPick] No weeks with closed pick windows");
    return;
  }

  for (const week of weeks) {
    logger.info(`[AutoPick] Processing week ${week.weekNumber}`);

    // Get all users with their draft picks (only 2 per user)
    const league = await prisma.league.findFirst({
      select: {
        id: true,
        users: {
          select: {
            id: true,
            name: true,
            draftPicks: {
              select: {
                castawayId: true,
                castaway: { select: { name: true } }
              }
            }
          }
        }
      }
    });

    if (!league) {
      logger.info("[AutoPick] No league found");
      continue;
    }

    const userIds = league.users.map(u => u.id);

    // ✅ OPTIMIZATION: Batch fetch all picks for this week (1 query instead of N)
    const existingPicks = await prisma.pick.findMany({
      where: {
        userId: { in: userIds },
        weekNumber: week.weekNumber
      },
      select: { userId: true }
    });

    const usersWithPicks = new Set(existingPicks.map(p => p.userId));

    // ✅ OPTIMIZATION: Batch fetch all previous week picks (1 query instead of N)
    const previousPicks = await prisma.pick.findMany({
      where: {
        userId: { in: userIds },
        weekNumber: week.weekNumber - 1
      },
      select: { userId: true, castawayId: true }
    });

    const previousPickMap = new Map(
      previousPicks.map(p => [p.userId, p.castawayId])
    );

    // Process auto-selections
    const autoSelections = [];

    for (const user of league.users) {
      // Skip if user already has a pick
      if (usersWithPicks.has(user.id)) {
        logger.info(`[AutoPick] User ${user.name} already has a pick for week ${week.weekNumber}`);
        continue;
      }

      // Skip if user doesn't have any draft picks
      if (user.draftPicks.length === 0) {
        logger.info(`[AutoPick] User ${user.name} has no draft picks, skipping`);
        continue;
      }

      logger.info(`[AutoPick] Auto-selecting for user ${user.name} (week ${week.weekNumber})`);

      // Determine which castaway to auto-select
      const previousCastawayId = previousPickMap.get(user.id);
      let autoSelectedCastaway;

      if (previousCastawayId) {
        // Select the opposite one from last week
        autoSelectedCastaway = user.draftPicks.find(
          dp => dp.castawayId !== previousCastawayId
        );
        logger.info(`[AutoPick] User ${user.name} picked ${previousCastawayId} last week, auto-selecting opposite`);
      } else {
        // First week or no previous pick - select the first draft pick
        autoSelectedCastaway = user.draftPicks[0];
        logger.info(`[AutoPick] No previous pick found for ${user.name}, selecting first draft pick`);
      }

      if (!autoSelectedCastaway) {
        logger.info(`[AutoPick] Could not determine auto-selection for ${user.name}`);
        continue;
      }

      autoSelections.push({
        userId: user.id,
        castawayId: autoSelectedCastaway.castawayId,
        weekNumber: week.weekNumber,
        weekId: week.id,
        isAutoSelected: true,
        penaltyApplied: false, // No penalty applied
        locked: true,
        submittedAt: now
      });

      logger.info(`[AutoPick] ✓ Will auto-select ${autoSelectedCastaway.castaway.name} for ${user.name}`);
    }

    // ✅ OPTIMIZATION: Batch create all auto-picks (1 query instead of N)
    if (autoSelections.length > 0) {
      await prisma.pick.createMany({
        data: autoSelections
      });
      logger.info(`[AutoPick] Created ${autoSelections.length} auto-selections for week ${week.weekNumber}`);
    }
  }

  logger.info("[AutoPick] Auto-pick job completed");
}

/**
 * Manual trigger endpoint - can be called by admin
 * OPTIMIZED VERSION
 */
export async function processAutoPicksForWeek(weekNumber: number): Promise<number> {
  const week = await prisma.week.findFirst({
    where: { weekNumber }
  });

  if (!week) {
    throw new Error(`Week ${weekNumber} not found`);
  }

  const league = await prisma.league.findFirst({
    select: {
      id: true,
      users: {
        select: {
          id: true,
          draftPicks: {
            select: {
              castawayId: true,
              castaway: { select: { name: true } }
            }
          }
        }
      }
    }
  });

  if (!league) {
    throw new Error("No league found");
  }

  const userIds = league.users.map(u => u.id);

  // Batch fetch existing picks
  const existingPicks = await prisma.pick.findMany({
    where: {
      userId: { in: userIds },
      weekNumber
    },
    select: { userId: true }
  });

  const usersWithPicks = new Set(existingPicks.map(p => p.userId));

  // Batch fetch previous picks
  const previousPicks = await prisma.pick.findMany({
    where: {
      userId: { in: userIds },
      weekNumber: weekNumber - 1
    },
    select: { userId: true, castawayId: true }
  });

  const previousPickMap = new Map(
    previousPicks.map(p => [p.userId, p.castawayId])
  );

  const autoSelections = [];

  for (const user of league.users) {
    if (usersWithPicks.has(user.id)) continue;
    if (user.draftPicks.length === 0) continue;

    const previousCastawayId = previousPickMap.get(user.id);
    let autoSelectedCastaway;

    if (previousCastawayId) {
      autoSelectedCastaway = user.draftPicks.find(
        dp => dp.castawayId !== previousCastawayId
      );
    } else {
      autoSelectedCastaway = user.draftPicks[0];
    }

    if (!autoSelectedCastaway) continue;

    autoSelections.push({
      userId: user.id,
      castawayId: autoSelectedCastaway.castawayId,
      weekNumber,
      weekId: week.id,
      isAutoSelected: true,
      penaltyApplied: false, // No penalty applied
      locked: true,
      submittedAt: new Date()
    });
  }

  if (autoSelections.length > 0) {
    await prisma.pick.createMany({
      data: autoSelections
    });
  }

  return autoSelections.length;
}
