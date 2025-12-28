// @ts-nocheck
import { Router, Request } from "express";
import { createLogger, logError } from "./logger.js";
const logger = createLogger("rankings");
import prisma from "./prisma.js";
import { authenticate, requireAdmin, getLeagueId } from "./middleware.js";
import { getActiveSeason } from "./utils/season.js";

// Extend Express Request to include user property
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    isAdmin: boolean;
  };
}

const router = Router();

router.use(authenticate);

router.get("/me", async (req, res) => {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const leagueId = getLeagueId(req);

  // Get active season for season-scoped queries
  const activeSeason = await getActiveSeason();
  const seasonId = activeSeason?.id || null;

  // If leagueId provided, use it; otherwise find first league in active season
  const league = leagueId
    ? await prisma.league.findUnique({ where: { id: leagueId } })
    : await prisma.league.findFirst({
        where: seasonId ? { seasonId } : {},
      });

  const locked = league?.draftStatus === "COMPLETED" || Boolean(league?.rankingLockAt);

  // Find ranking for this user in this league
  const ranking = leagueId && seasonId
    ? await prisma.ranking.findUnique({
        where: { userId_leagueId_seasonId: { userId, leagueId, seasonId } },
        include: {
          entries: {
            include: { castaway: true },
            orderBy: { position: "asc" }
          }
        }
      })
    : await prisma.ranking.findFirst({
        where: { userId, ...(leagueId && { leagueId }), ...(seasonId && { seasonId }) },
        include: {
          entries: {
            include: { castaway: true },
            orderBy: { position: "asc" }
          }
        }
      });

  if (!ranking) {
    const castaways = await prisma.castaway.findMany({
      where: {
        OR: [
          { eliminated: false },
          { eliminatedWeek: null }
        ]
      },
      orderBy: { name: "asc" }
    });
    return res.json({
      submitted: false,
      locked,
      order: castaways.map((c) => ({ castawayId: c.id, castaway: c }))
    });
  }

  // Filter out eliminated castaways from existing rankings
  const activeEntries = ranking.entries.filter((entry) => {
    const c = entry.castaway;
    return !c.eliminated || c.eliminatedWeek === null;
  });

  return res.json({
    submitted: true,
    submittedAt: ranking.submittedAt,
    locked,
    order: activeEntries.map((entry) => ({
      castawayId: entry.castawayId,
      castaway: entry.castaway,
      position: entry.position
    }))
  });
});

router.post("/me", async (req, res) => {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const leagueId = getLeagueId(req);

  // Get active season for season-scoped queries
  const activeSeason = await getActiveSeason();
  const seasonId = activeSeason?.id || null;

  // If leagueId provided, use it; otherwise find first league in active season
  const league = leagueId
    ? await prisma.league.findUnique({ where: { id: leagueId } })
    : await prisma.league.findFirst({
        where: seasonId ? { seasonId } : {},
      });

  if (!league) {
    return res.status(400).json({ error: "League not configured" });
  }

  if (league.draftStatus === "COMPLETED" || league.rankingLockAt) {
    return res.status(409).json({ error: "Rankings are locked" });
  }

  const order = req.body?.order as string[] | undefined;
  if (!Array.isArray(order) || order.length === 0) {
    return res.status(400).json({ error: "order must be a non-empty array of castaway IDs" });
  }

  // Get all non-eliminated castaways
  const castaways = await prisma.castaway.findMany({
    where: {
      OR: [
        { eliminated: false },
        { eliminatedWeek: null }
      ]
    },
    select: { id: true, name: true, eliminated: true, eliminatedWeek: true }
  });
  const castawayIds = new Set(castaways.map((c) => c.id));

  // Check for duplicates
  const unique = new Set(order);
  if (unique.size !== order.length) {
    return res.status(400).json({ error: "Duplicate castaway IDs in ranking" });
  }

  // Check if all submitted IDs are valid castaways
  const missing = order.filter((id) => !castawayIds.has(id));
  if (missing.length) {
    logger.error(`Invalid castaway IDs submitted: ${missing.join(",")}`);
    return res.status(400).json({ error: `Invalid castaway IDs: ${missing.join(",")}` });
  }

  // Allow ranking as long as they've ranked at least the active castaways
  // This is more lenient - if they have all valid IDs and no duplicates, accept it
  logger.info(`User ${userId} submitting ${order.length} rankings for ${castaways.length} active castaways in league ${league.id}`);

  await prisma.$transaction(async (tx) => {
    // Use upsert with composite key including seasonId
    const effectiveLeagueId = leagueId || league.id;
    const ranking = seasonId
      ? await tx.ranking.upsert({
          where: { userId_leagueId_seasonId: { userId, leagueId: effectiveLeagueId, seasonId } },
          update: { submittedAt: new Date() },
          create: { userId, leagueId: effectiveLeagueId, seasonId, submittedAt: new Date() }
        })
      : await tx.ranking.upsert({
          where: { userId_leagueId_seasonId: { userId, leagueId: effectiveLeagueId, seasonId: "" } },
          update: { submittedAt: new Date() },
          create: { userId, leagueId: effectiveLeagueId, submittedAt: new Date() }
        });

    await tx.rankingEntry.deleteMany({ where: { rankingId: ranking.id } });

    await tx.rankingEntry.createMany({
      data: order.map((castawayId, index) => ({
        rankingId: ranking.id,
        castawayId,
        position: index + 1
      }))
    });
  });

  return res.json({ success: true });
});

router.get("/admin/overview", requireAdmin, async (_req, res) => {
  const rankings = await prisma.ranking.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      entries: {
        include: { castaway: true },
        orderBy: { position: "asc" }
      }
    }
  });

  res.json(rankings.map((ranking) => ({
    user: ranking.user,
    submittedAt: ranking.submittedAt,
    entries: ranking.entries.map((entry) => ({
      position: entry.position,
      castawayId: entry.castawayId,
      castaway: entry.castaway
    }))
  })));
});

router.post("/admin/unlock", requireAdmin, async (req, res) => {
  try {
    const leagueId = getLeagueId(req);

    // Get active season for season-scoped queries
    const activeSeason = await getActiveSeason();
    const seasonId = activeSeason?.id || null;

    // If leagueId provided, use it; otherwise find first league in active season
    const league = leagueId
      ? await prisma.league.findUnique({ where: { id: leagueId } })
      : await prisma.league.findFirst({
          where: seasonId ? { seasonId } : {},
        });

    if (!league) {
      return res.status(400).json({ error: "League not configured" });
    }

    await prisma.league.update({
      where: { id: league.id },
      data: {
        rankingLockAt: null,
        draftStatus: "PENDING"
      }
    });

    res.json({ success: true, message: "Rankings unlocked successfully" });
  } catch (error) {
    logger.error("Failed to unlock rankings:", error);
    res.status(500).json({ error: "Failed to unlock rankings" });
  }
});

export default router;
