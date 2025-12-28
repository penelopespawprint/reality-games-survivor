import { Router } from "express";
import { z } from "zod";
import prisma from "./prisma.js";
import { requireAdmin, withSeasonContext } from "./middleware.js";
import { io } from "./index.js";
import { invalidateStandingsCache } from "./league.js";

const router = Router();

router.use(requireAdmin);

const scorePayload = z.object({
  entries: z.array(z.object({ castawayId: z.string().uuid(), points: z.number() })).nonempty()
});

// GET scores for a specific week
router.get("/week/:weekNumber", withSeasonContext, async (req, res) => {
  const weekNumber = Number(req.params.weekNumber);
  if (Number.isNaN(weekNumber)) {
    return res.status(400).json({ error: "Invalid week number" });
  }

  const seasonId = (req as any).season?.id;

  const scores = await prisma.weeklyResult.findMany({
    where: { weekNumber, ...(seasonId && { seasonId }) },
    select: {
      castawayId: true,
      points: true
    }
  });

  res.json({ scores });
});

router.post("/week/:weekNumber", withSeasonContext, async (req, res) => {
  const parsed = scorePayload.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const weekNumber = Number(req.params.weekNumber);
  if (Number.isNaN(weekNumber)) {
    return res.status(400).json({ error: "Invalid week number" });
  }

  const seasonId = (req as any).season?.id;
  if (!seasonId) {
    return res.status(400).json({ error: "No active season" });
  }

  const week = await prisma.week.findFirst({ where: { weekNumber, seasonId } });
  if (!week) {
    return res.status(404).json({ error: "Week not found" });
  }

  const { entries } = parsed.data;

  await prisma.$transaction(async (tx) => {
    for (const entry of entries) {
      await tx.weeklyResult.upsert({
        where: {
          seasonId_weekNumber_castawayId: {
            seasonId,
            weekNumber,
            castawayId: entry.castawayId
          }
        },
        update: { points: entry.points },
        create: { seasonId, weekNumber, castawayId: entry.castawayId, points: entry.points }
      });
    }

    const picks = await tx.pick.findMany({
      where: { weekNumber },
      include: { user: true }
    });

    const pointsByUser = new Map<string, number>();

    for (const entry of entries) {
      const relevantPicks = picks.filter((pick) => pick.castawayId === entry.castawayId);
      for (const pick of relevantPicks) {
        pointsByUser.set(pick.userId, (pointsByUser.get(pick.userId) ?? 0) + entry.points);
      }
    }

    for (const [userId, totalPoints] of pointsByUser.entries()) {
      await tx.score.upsert({
        where: {
          userId_weekId: {
            userId,
            weekId: week.id
          }
        },
        update: {
          points: totalPoints
        },
        create: {
          userId,
          weekId: week.id,
          points: totalPoints
        }
      });
    }

    // Note: -5 penalty for auto-selected picks has been removed
    // Auto-picks no longer receive a penalty - they just get the points earned
  });

  const leaderboard = await prisma.score.groupBy({
    by: ["userId"],
    _sum: { points: true }
  });

  // Build and emit real-time leaderboard update with all necessary fields
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      scores: { select: { points: true } },
      draftPicks: {
        include: { castaway: true },
        orderBy: { round: "asc" }
      }
    }
  });

  const standings = users
    .map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      totalPoints: user.scores.reduce((sum, s) => sum + s.points, 0),
      rawPoints: user.scores.reduce((sum, s) => sum + s.points, 0),
      draftPicks: user.draftPicks
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((user, index) => ({ ...user, rank: index + 1 }));

  // Invalidate standings cache when scores update
  invalidateStandingsCache();

  // Emit socket event to leaderboard room only (not all connected clients)
  io.to("leaderboard").emit("leaderboard:updated", standings);

  res.json({ success: true, leaderboard });
});

export default router;
