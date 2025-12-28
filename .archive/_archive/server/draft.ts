// @ts-nocheck
import { Router, Request } from "express";
import { createLogger, logError } from "./logger.js";
const logger = createLogger("draft");
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

/**
 * Fisher-Yates shuffle algorithm for unbiased randomization
 * CRITICAL: Do not replace with .sort(() => Math.random() - 0.5) as that's biased
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

router.use(authenticate);

function buildSnakeOrder<T>(items: T[], round: number): T[] {
  if (round % 2 === 0) {
    return items;
  }
  return [...items].reverse();
}

router.get("/assigned", async (req, res) => {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const leagueId = getLeagueId(req);

  const picks = await prisma.draftPick.findMany({
    where: {
      userId,
      ...(leagueId ? { leagueId } : {}),
    },
    include: { castaway: true },
    orderBy: { round: "asc" }
  });

  res.json({ picks });
});

router.get("/status", async (req, res) => {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const leagueId = getLeagueId(req);

  // If leagueId provided, verify membership; otherwise get user's first league
  let league;
  if (leagueId) {
    // Verify user is a member of this league
    const membership = await prisma.leagueMembership.findFirst({
      where: { userId, leagueId, isActive: true },
      include: { league: true }
    });
    if (!membership) {
      return res.status(403).json({ error: "Not a member of this league" });
    }
    league = membership.league;
  } else {
    // Fall back to user's first league (safe - only returns their own data)
    const membership = await prisma.leagueMembership.findFirst({
      where: { userId, isActive: true },
      include: { league: true },
      orderBy: { joinedAt: "asc" }
    });
    if (!membership) {
      return res.status(400).json({ error: "No league membership found" });
    }
    league = membership.league;
  }

  if (!league) {
    return res.status(400).json({ error: "League not configured" });
  }

  const picks = await prisma.draftPick.findMany({
    where: { leagueId: league.id },
    include: { user: { select: { id: true, name: true, email: true } }, castaway: true },
    orderBy: { pickNumber: "asc" }
  });

  res.json({
    draftStatus: league.draftStatus,
    draftRunAt: league.draftRunAt,
    picks
  });
});

function runDraftLogic(
  users: any[],
  castaways: { id: string; name?: string; tribe?: string | null }[],
  picksPerUser: number
): {
  userId: string;
  castawayId: string;
  round: number;
  user?: { id: string; name: string; email: string };
  castaway?: { id: string; name?: string; tribe?: string | null };
}[] {
  // Create randomized rankings for users without submissions
  const usersWithRankings = users.map((user) => {
    if (user.ranking && user.ranking.entries && user.ranking.entries.length > 0) {
      return {
        ...user,
        rankingEntries: user.ranking.entries
      };
    }

    // Generate random ranking for users without submissions
    const shuffled = shuffleArray(castaways);
    return {
      ...user,
      rankingEntries: shuffled.map((c, index) => ({
        castawayId: c.id,
        position: index + 1
      }))
    };
  });

  const assignments: {
    userId: string;
    castawayId: string;
    round: number;
    user?: { id: string; name: string; email: string };
  castaway?: { id: string; name?: string; tribe?: string | null };
  }[] = [];

  const availableCastaways = new Set(castaways.map((c) => c.id));

  // Run snake draft with special round 2 logic
  for (let roundIndex = 0; roundIndex < picksPerUser; roundIndex++) {
    const currentRound = roundIndex + 1;
    const roundOrder = buildSnakeOrder(usersWithRankings, roundIndex);

    // Special logic for round 2: balance contestants and players
    if (currentRound === 2) {
      // Calculate how many contestants remain after round 1
      const contestantsAfterRound1 = castaways.length - usersWithRankings.length;

      if (contestantsAfterRound1 === usersWithRankings.length) {
        // EQUAL: Last player reserves AND removes to balance (contestants-1, players-1)
        const lastPlayer = roundOrder[0]; // First in reversed order
        const otherPlayers = roundOrder.slice(1);

        // Last player picks and removes
        const lastPlayerEntries = lastPlayer.rankingEntries ?? [];
        const lastPlayerPick = lastPlayerEntries.find((entry: any) => availableCastaways.has(entry.castawayId));

        if (lastPlayerPick) {
          const castaway = castaways.find((c) => c.id === lastPlayerPick.castawayId);
          if (castaway) {
            availableCastaways.delete(lastPlayerPick.castawayId);
            assignments.push({
              userId: lastPlayer.id,
              castawayId: lastPlayerPick.castawayId,
              round: currentRound,
              user: { id: lastPlayer.id, name: lastPlayer.name, email: lastPlayer.email },
              castaway: { id: castaway.id, name: castaway.name, tribe: castaway.tribe }
            });
          }
        }

        // Remaining players pick normally (removing from pool)
        for (const user of otherPlayers) {
          const rankingEntries = user.rankingEntries ?? [];
          const pick = rankingEntries.find((entry: any) => availableCastaways.has(entry.castawayId));
          if (!pick) continue;

          const castaway = castaways.find((c) => c.id === pick.castawayId);
          if (!castaway) continue;

          availableCastaways.delete(pick.castawayId);
          assignments.push({
            userId: user.id,
            castawayId: pick.castawayId,
            round: currentRound,
            user: { id: user.id, name: user.name, email: user.email },
            castaway: { id: castaway.id, name: castaway.name, tribe: castaway.tribe }
          });
        }
      } else if (contestantsAfterRound1 < usersWithRankings.length) {
        // NOT EQUAL: Players beyond contestant count reserve WITHOUT removing
        const numPlayersReserving = usersWithRankings.length - contestantsAfterRound1;

        // Process ALL players in round 2 order, but track who reserves vs removes
        const reservedPicks = new Map<string, string>();

        // Process each player in reversed order
        for (let i = 0; i < roundOrder.length; i++) {
          const user = roundOrder[i];
          const rankingEntries = user.rankingEntries ?? [];

          if (i < numPlayersReserving) {
            // This player reserves (doesn't remove from pool)
            const pick = rankingEntries.find((entry: any) => availableCastaways.has(entry.castawayId));
            if (pick) {
              reservedPicks.set(user.id, pick.castawayId);
            }

            // Assign their pick immediately
            let finalCastawayId = pick?.castawayId;

            if (!finalCastawayId) {
              logger.info(`[DRAFT] Player ${user.name} (${user.email}) has no available pick in round 2! Available: ${availableCastaways.size}, RankingEntries: ${rankingEntries.length}`);
              continue;
            }

            const castaway = castaways.find((c) => c.id === finalCastawayId);
            if (!castaway) continue;

            // Don't remove from pool - this is a reservation
            assignments.push({
              userId: user.id,
              castawayId: finalCastawayId,
              round: currentRound,
              user: { id: user.id, name: user.name, email: user.email },
              castaway: { id: castaway.id, name: castaway.name, tribe: castaway.tribe }
            });
          } else {
            // This player picks normally and REMOVES from pool
            const pick = rankingEntries.find((entry: any) => availableCastaways.has(entry.castawayId));
            if (!pick) continue;

            const castaway = castaways.find((c) => c.id === pick.castawayId);
            if (!castaway) continue;

            availableCastaways.delete(pick.castawayId);

            // If they took a reserved pick, we need to handle duplicates
            // Find any reserving player who picked this contestant
            for (const [reservedUserId, reservedCastawayId] of reservedPicks.entries()) {
              if (pick.castawayId === reservedCastawayId) {
                // This reserved pick got taken - the reserving player keeps it as duplicate
                // No action needed, they already have their assignment
              }
            }

            assignments.push({
              userId: user.id,
              castawayId: pick.castawayId,
              round: currentRound,
              user: { id: user.id, name: user.name, email: user.email },
              castaway: { id: castaway.id, name: castaway.name, tribe: castaway.tribe }
            });
          }
        }
      } else {
        // More contestants than players - standard snake
        for (const user of roundOrder) {
          const rankingEntries = user.rankingEntries ?? [];
          const pick = rankingEntries.find((entry: any) => availableCastaways.has(entry.castawayId));
          if (!pick) continue;

          const castaway = castaways.find((c) => c.id === pick.castawayId);
          if (!castaway) continue;

          availableCastaways.delete(pick.castawayId);
          assignments.push({
            userId: user.id,
            castawayId: pick.castawayId,
            round: currentRound,
            user: { id: user.id, name: user.name, email: user.email },
            castaway: { id: castaway.id, name: castaway.name, tribe: castaway.tribe }
          });
        }
      }
    } else {
      // Standard snake draft for all other rounds
      for (const user of roundOrder) {
        const rankingEntries = user.rankingEntries ?? [];
        const pick = rankingEntries.find((entry: any) => availableCastaways.has(entry.castawayId));
        if (!pick) continue;

        const castaway = castaways.find((c) => c.id === pick.castawayId);
        if (!castaway) continue;

        availableCastaways.delete(pick.castawayId);
        assignments.push({
          userId: user.id,
          castawayId: pick.castawayId,
          round: currentRound,
          user: { id: user.id, name: user.name, email: user.email },
          castaway: { id: castaway.id, name: castaway.name, tribe: castaway.tribe }
        });
      }
    }
  }

  return assignments;
}

router.post("/preview", requireAdmin, async (_req, res) => {
  // Get active season for season-scoped queries
  const activeSeason = await getActiveSeason();
  const seasonId = activeSeason?.id || null;

  // Optimized: Separate queries to avoid N+1
  const league = await prisma.league.findFirst({
    where: seasonId ? { seasonId } : {},
    include: {
      memberships: {
        include: {
          user: { select: { id: true, name: true, email: true } }
        },
        orderBy: { joinedAt: "asc" }
      }
    }
  });

  if (!league) {
    return res.status(400).json({ error: "League not configured" });
  }

  const userIds = league.memberships.map(m => m.userId);

  // Single query for all rankings instead of N+1
  const rankings = await prisma.ranking.findMany({
    where: {
      userId: { in: userIds },
      leagueId: league.id
    },
    include: {
      entries: { orderBy: { position: "asc" } }
    }
  });

  const rankingsByUser = new Map(rankings.map(r => [r.userId, r]));

  // Transform memberships to user array for draft logic
  const users = league.memberships.map(m => ({
    ...m.user,
    ranking: rankingsByUser.get(m.userId) || null
  }));

  if (users.length === 0) {
    return res.status(400).json({ error: "No users to draft" });
  }

  const castaways = await prisma.castaway.findMany({
    where: { eliminated: false },
    select: { id: true, name: true, tribe: true }
  });
  const assignments = runDraftLogic(users, castaways, league.picksPerUser);

  const picks = assignments.map((assignment, index) => ({
    id: `preview-${index}`,
    ...assignment,
    pickNumber: index + 1
  }));

  res.json({ picks });
});

router.post("/run", requireAdmin, async (_req, res) => {
  try {
    logger.info("[DRAFT] Starting draft run...");

    // Get active season for season-scoped queries
    const activeSeason = await getActiveSeason();
    const seasonId = activeSeason?.id || null;

    // Optimized: Separate queries to avoid N+1
    const league = await prisma.league.findFirst({
      where: seasonId ? { seasonId } : {},
      include: {
        memberships: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          },
          orderBy: { joinedAt: "asc" }
        }
      }
    });

    if (!league) {
      logger.info("[DRAFT] No league found");
      return res.status(400).json({ error: "League not configured" });
    }

    const userIds = league.memberships.map(m => m.userId);

    // Single query for all rankings instead of N+1
    const rankings = await prisma.ranking.findMany({
      where: {
        userId: { in: userIds },
        leagueId: league.id
      },
      include: {
        entries: { orderBy: { position: "asc" } }
      }
    });

    const rankingsByUser = new Map(rankings.map(r => [r.userId, r]));

    // Transform memberships to user array for draft logic
    const users = league.memberships.map(m => ({
      ...m.user,
      ranking: rankingsByUser.get(m.userId) || null
    }));

    if (users.length === 0) {
      logger.info("[DRAFT] No users found");
      return res.status(400).json({ error: "No users to draft" });
    }

    logger.info(`[DRAFT] Found ${users.length} users`);

    const castaways = await prisma.castaway.findMany({
      where: { eliminated: false },
      select: { id: true }
    });

    logger.info(`[DRAFT] Found ${castaways.length} castaways`);
    logger.info("[DRAFT] Running draft logic...");

    const assignments = runDraftLogic(users, castaways, league.picksPerUser);

    logger.info(`[DRAFT] Generated ${assignments.length} assignments`);

    logger.info("[DRAFT] Saving to database...");
    await prisma.$transaction(async (tx) => {
      await tx.draftPick.deleteMany({ where: { leagueId: league.id } });
      if (assignments.length > 0) {
        await tx.draftPick.createMany({
          data: assignments.map((assignment, index) => ({
            userId: assignment.userId,
            castawayId: assignment.castawayId,
            round: assignment.round,
            leagueId: league.id,
            pickNumber: index + 1
          }))
        });
      }

      await tx.league.update({
        where: { id: league.id },
        data: {
          draftStatus: "COMPLETED",
          draftRunAt: new Date(),
          rankingLockAt: league.rankingLockAt ?? new Date()
        }
      });
    });

    logger.info("[DRAFT] Fetching final picks...");
    const picks = await prisma.draftPick.findMany({
      where: { leagueId: league.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        castaway: true
      },
      orderBy: { pickNumber: "asc" }
    });

    logger.info(`[DRAFT] Draft completed successfully with ${picks.length} picks`);
    res.json({ success: true, picks });
  } catch (error) {
    logger.error("[DRAFT] Error running draft:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to run draft" });
  }
});

router.post("/reset", requireAdmin, async (_req, res) => {
  // Get active season for season-scoped queries
  const activeSeason = await getActiveSeason();
  const seasonId = activeSeason?.id || null;

  const league = await prisma.league.findFirst({
    where: seasonId ? { seasonId } : {},
  });
  if (!league) {
    return res.status(400).json({ error: "League not configured" });
  }

  await prisma.$transaction(async (tx) => {
    await tx.draftPick.deleteMany({ where: { leagueId: league.id } });
    await tx.league.update({
      where: { id: league.id },
      data: {
        draftStatus: "PENDING",
        draftRunAt: null
      }
    });
  });

  res.json({ success: true, message: "Draft reset successfully" });
});

router.post("/manual", requireAdmin, async (req, res) => {
  const { userId, castawayId, round } = req.body as {
    userId?: string;
    castawayId?: string;
    round?: number;
  };

  if (!userId || !castawayId || !round) {
    return res.status(400).json({ error: "userId, castawayId, and round are required" });
  }

  // Get active season for season-scoped queries
  const activeSeason = await getActiveSeason();
  const seasonId = activeSeason?.id || null;

  const league = await prisma.league.findFirst({
    where: seasonId ? { seasonId } : {},
  });
  if (!league) {
    return res.status(400).json({ error: "League not configured" });
  }

  const existingPick = await prisma.draftPick.findUnique({
    where: { leagueId_userId_round: { leagueId: league.id, userId, round } }
  });

  if (existingPick) {
    await prisma.draftPick.update({
      where: { id: existingPick.id },
      data: { castawayId }
    });
  } else {
    const maxPickNumber = await prisma.draftPick.findFirst({
      where: { leagueId: league.id },
      orderBy: { pickNumber: "desc" },
      select: { pickNumber: true }
    });

    await prisma.draftPick.create({
      data: {
        userId,
        castawayId,
        leagueId: league.id,
        round,
        pickNumber: (maxPickNumber?.pickNumber ?? 0) + 1
      }
    });
  }

  const picks = await prisma.draftPick.findMany({
    where: { leagueId: league.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      castaway: true
    },
    orderBy: { pickNumber: "asc" }
  });

  res.json({ success: true, picks });
});

router.delete("/manual/:pickId", requireAdmin, async (req, res) => {
  const { pickId } = req.params;

  await prisma.draftPick.delete({
    where: { id: pickId }
  });

  res.json({ success: true, message: "Pick deleted" });
});

export default router;
