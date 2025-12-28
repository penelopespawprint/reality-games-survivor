// @ts-nocheck
/**
 * Weeks API Routes
 *
 * Provides week schedule information for the mobile app
 * Weeks are global (not league-scoped) as they follow the Survivor broadcast schedule
 */

import { Router } from "express";
import prisma from "./prisma.js";
import { authenticate } from "./middleware.js";
import { createLogger, logError } from "./logger.js";

const logger = createLogger("weeks");

const router = Router();

// All weeks routes require authentication
router.use(authenticate);

/**
 * GET /api/weeks - Get all weeks with submission status for current user
 * Returns weeks ordered by weekNumber
 */
router.get("/", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const leagueId = req.query.leagueId as string || req.headers['x-league-id'] as string;

    // Get all weeks
    const weeks = await prisma.week.findMany({
      orderBy: { weekNumber: "asc" },
      select: {
        id: true,
        weekNumber: true,
        isActive: true,
        lockAt: true,
        picksOpenAt: true,
        picksCloseAt: true,
      },
    });

    // Get user's picks for all weeks (optionally filtered by league)
    const userPicks = await prisma.pick.findMany({
      where: {
        userId,
        ...(leagueId ? { leagueId } : {}),
      },
      select: {
        weekNumber: true,
      },
    });

    const submittedWeeks = new Set(userPicks.map(p => p.weekNumber));

    // Format response for mobile app
    const formattedWeeks = weeks.map(week => ({
      id: week.id,
      weekNumber: week.weekNumber,
      title: `Week ${week.weekNumber}`,
      isActive: week.isActive,
      deadline: week.picksCloseAt?.toISOString() || null,
      pickDeadline: week.picksCloseAt?.toISOString() || null,
      picksOpenAt: week.picksOpenAt?.toISOString() || null,
      picksCloseAt: week.picksCloseAt?.toISOString() || null,
      hasSubmitted: submittedWeeks.has(week.weekNumber),
      isLocked: week.picksCloseAt ? new Date() > week.picksCloseAt : false,
    }));

    res.json(formattedWeeks);
  } catch (error) {
    logger.error("Failed to fetch weeks:", error);
    res.status(500).json({ error: "Failed to fetch weeks" });
  }
});

/**
 * GET /api/weeks/active - Get the currently active week
 * Returns the active week with full details
 */
router.get("/active", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const leagueId = req.query.leagueId as string || req.headers['x-league-id'] as string;

    const week = await prisma.week.findFirst({
      where: { isActive: true },
    });

    if (!week) {
      return res.status(404).json({ error: "No active week" });
    }

    // Check if user has submitted for this week
    const userPick = await prisma.pick.findFirst({
      where: {
        userId,
        weekNumber: week.weekNumber,
        ...(leagueId ? { leagueId } : {}),
      },
      include: {
        castaway: true,
      },
    });

    res.json({
      id: week.id,
      weekNumber: week.weekNumber,
      title: `Week ${week.weekNumber}`,
      isActive: week.isActive,
      deadline: week.picksCloseAt?.toISOString() || null,
      pickDeadline: week.picksCloseAt?.toISOString() || null,
      picksOpenAt: week.picksOpenAt?.toISOString() || null,
      picksCloseAt: week.picksCloseAt?.toISOString() || null,
      lockAt: week.lockAt?.toISOString() || null,
      hasSubmitted: !!userPick,
      currentPick: userPick ? {
        castawayId: userPick.castawayId,
        castawayName: userPick.castaway.name,
        submittedAt: userPick.submittedAt,
      } : null,
      isPickWindowOpen: week.picksOpenAt && week.picksCloseAt
        ? new Date() >= week.picksOpenAt && new Date() <= week.picksCloseAt
        : true,
    });
  } catch (error) {
    logger.error("Failed to fetch active week:", error);
    res.status(500).json({ error: "Failed to fetch active week" });
  }
});

/**
 * GET /api/weeks/:weekNumber - Get details for a specific week
 */
router.get("/:weekNumber", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const weekNumber = parseInt(req.params.weekNumber, 10);
    const leagueId = req.query.leagueId as string || req.headers['x-league-id'] as string;

    if (isNaN(weekNumber)) {
      return res.status(400).json({ error: "Invalid week number" });
    }

    const week = await prisma.week.findFirst({
      where: { weekNumber },
    });

    if (!week) {
      return res.status(404).json({ error: "Week not found" });
    }

    // Check if user has submitted for this week
    const userPick = await prisma.pick.findFirst({
      where: {
        userId,
        weekNumber,
        ...(leagueId ? { leagueId } : {}),
      },
      include: {
        castaway: true,
      },
    });

    res.json({
      id: week.id,
      weekNumber: week.weekNumber,
      title: `Week ${week.weekNumber}`,
      isActive: week.isActive,
      deadline: week.picksCloseAt?.toISOString() || null,
      pickDeadline: week.picksCloseAt?.toISOString() || null,
      picksOpenAt: week.picksOpenAt?.toISOString() || null,
      picksCloseAt: week.picksCloseAt?.toISOString() || null,
      lockAt: week.lockAt?.toISOString() || null,
      hasSubmitted: !!userPick,
      currentPick: userPick ? {
        castawayId: userPick.castawayId,
        castawayName: userPick.castaway.name,
        submittedAt: userPick.submittedAt,
      } : null,
    });
  } catch (error) {
    logger.error("Failed to fetch week:", error);
    res.status(500).json({ error: "Failed to fetch week" });
  }
});

export default router;
