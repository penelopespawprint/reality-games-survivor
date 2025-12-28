// @ts-nocheck
import { Router } from "express";
import { createLogger, logError } from "./logger.js";
const logger = createLogger("league");
import { z } from "zod";
import prisma from "./prisma.js";
import { authenticate, requireAdmin } from "./middleware.js";

const router = Router();

// Cache for standings keyed by seasonId (invalidates on score updates)
const standingsCache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export function invalidateStandingsCache(seasonId?: string) {
  if (seasonId) {
    standingsCache.delete(seasonId);
  } else {
    standingsCache.clear();
  }
}

async function getActiveSeasonId(): Promise<string | null> {
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
    select: { id: true },
  });
  return activeSeason?.id ?? null;
}

router.get("/", requireAdmin, async (_req, res) => {
  const league = await prisma.league.findFirst({
    include: {
      users: {
        select: { id: true, name: true, email: true, isAdmin: true }
      }
    }
  });
  res.json(league);
});

const leagueUpdateSchema = z.object({
  picksPerUser: z.number().int().min(1).max(10).optional(),
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional()
});

router.put("/", requireAdmin, async (req, res) => {
  const payload = leagueUpdateSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ error: payload.error.flatten() });
  }

  const league = await prisma.league.findFirst();
  if (!league) {
    return res.status(404).json({ error: "League not found" });
  }

  const updated = await prisma.league.update({
    where: { id: league.id },
    data: payload.data,
    include: {
      users: {
        select: { id: true, name: true, email: true, isAdmin: true }
      }
    }
  });

  res.json(updated);
});

async function buildStandings(seasonId?: string | null) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      draftPicks: {
        where: seasonId ? { season: { id: seasonId } } : {},
        include: { castaway: true },
        orderBy: { round: "asc" }
      },
      scores: {
        where: seasonId ? { seasonId } : {},
        select: { points: true }
      }
    }
  });

  return users
    .map((user) => {
      const totalPoints = user.scores.reduce((sum, score) => sum + score.points, 0);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        totalPoints,
        rawPoints: totalPoints,
        draftPicks: user.draftPicks
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

// DEPRECATED: Use /api/global/standings or /api/leagues/:leagueId/standings
// This returns global standings but strips email for privacy
router.get("/standings", authenticate, async (req, res) => {
  const now = Date.now();

  // Get season from query param or use active season
  const seasonId = (req.query.seasonId as string) || await getActiveSeasonId();
  const cacheKey = seasonId || 'default';

  // Return cached data if valid
  const cached = standingsCache.get(cacheKey);
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    // Strip email addresses for privacy
    const safeData = cached.data.map(({ email, ...rest }) => rest);
    return res.json(safeData);
  }

  // Build fresh standings
  const standings = await buildStandings(seasonId);
  standingsCache.set(cacheKey, { data: standings, timestamp: now });

  // Strip email addresses for privacy
  const safeData = standings.map(({ email, ...rest }) => rest);
  res.json(safeData);
});

// DEPRECATED: Use /api/global/leaderboard instead
// This endpoint now redirects to the authenticated global leaderboard
router.get("/leaderboard", authenticate, async (_req, res) => {
  // Return a deprecation notice - clients should use /api/global/leaderboard
  res.status(301).json({
    error: "This endpoint is deprecated. Use /api/global/leaderboard instead.",
    redirect: "/api/global/leaderboard"
  });
});

router.get("/weeks-in-first", authenticate, async (req, res) => {
  try {
    // Get season from query param or use active season
    const seasonId = (req.query.seasonId as string) || await getActiveSeasonId();

    // Get all weeks that have scores (meaning they've been completed) for this season
    const weeksWithScores = await prisma.week.findMany({
      where: {
        ...(seasonId ? { seasonId } : {}),
        scores: {
          some: {}
        }
      },
      orderBy: { weekNumber: "asc" }
    });

    // Get current leader for this season
    const standings = await buildStandings(seasonId);
    if (standings.length === 0) {
      return res.json({ weeksInFirst: 0 });
    }

    const currentLeaderId = standings[0].id;

    // For each completed week, calculate who was in first place
    let weeksInFirst = 0;
    for (const week of weeksWithScores) {
      // Get all scores up to and including this week for this season
      const weeklyStandings = await prisma.user.findMany({
        select: {
          id: true,
          scores: {
            where: {
              ...(seasonId ? { seasonId } : {}),
              week: {
                weekNumber: { lte: week.weekNumber }
              }
            },
            select: { points: true }
          }
        }
      });

      const weeklyRankings = weeklyStandings
        .map((user: { id: string; scores: { points: number }[] }) => ({
          id: user.id,
          totalPoints: user.scores.reduce((sum: number, s: { points: number }) => sum + s.points, 0)
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints);

      if (weeklyRankings.length > 0 && weeklyRankings[0].id === currentLeaderId) {
        weeksInFirst++;
      }
    }

    res.json({ weeksInFirst });
  } catch (error) {
    logger.error("Failed to calculate weeks in first:", error);
    res.json({ weeksInFirst: 0 });
  }
});

export default router;
