// @ts-nocheck
import { createLogger, logError } from "./logger.js";
const logger = createLogger("admin");
import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "./middleware.js";
import prisma from "./prisma.js";
import { processAutoPicksForWeek } from "./jobs/autoPickJob.js";

const router = Router();

router.use(requireAdmin);

// GET /api/admin/users - Get all users for admin management
router.get("/users", async (_, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        displayName: true,
        city: true,
        state: true,
        isAdmin: true,
        createdAt: true,
        phone: true,
        smsEnabled: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (error) {
    logger.error("Failed to fetch users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// GET /api/admin/leagues - Get all leagues with stats
router.get("/leagues", async (_, res) => {
  const leagues = await prisma.league.findMany({
    include: {
      _count: {
        select: {
          memberships: true,
          Pick: true,
          Score: true,
          DraftPick: true,
          Ranking: true
        }
      }
    },
    orderBy: [
      { type: 'asc' }, // OFFICIAL first
      { createdAt: 'asc' }
    ]
  });

  res.json({
    leagues: leagues.map(l => ({
      id: l.id,
      name: l.name,
      code: l.code,
      type: l.type,
      status: l.status,
      currentPlayers: l.currentPlayers,
      maxPlayers: l.maxPlayers,
      draftStatus: l.draftStatus,
      stats: {
        members: l._count.memberships,
        picks: l._count.Pick,
        scores: l._count.Score,
        draftPicks: l._count.DraftPick,
        rankings: l._count.Ranking
      }
    }))
  });
});

router.get("/stats", async (req, res) => {
  const { leagueId, seasonId } = req.query;

  // Build where clause for league filtering
  const pickWhere = leagueId ? { leagueId: leagueId as string } : {};
  const scoreWhere = leagueId ? { leagueId: leagueId as string } : {};
  const draftWhere = leagueId ? { leagueId: leagueId as string } : {};

  // Get all seasons for breakdown
  const seasons = await prisma.season.findMany({
    orderBy: { number: 'desc' }
  });

  // Build per-season stats
  const bySeasons: Record<string, any> = {};

  for (const season of seasons) {
    const seasonLeagues = await prisma.league.findMany({
      where: { seasonId: season.id },
      select: { id: true, type: true }
    });

    const leagueIds = seasonLeagues.map(l => l.id);
    const activeWeek = await prisma.week.findFirst({
      where: { seasonId: season.id, isActive: true },
      select: { weekNumber: true }
    });

    bySeasons[season.id] = {
      users: await prisma.leagueMembership.count({
        where: { leagueId: { in: leagueIds } },
        distinct: ['userId']
      }),
      picks: await prisma.pick.count({
        where: { leagueId: { in: leagueIds } }
      }),
      castaways: await prisma.castaway.count({
        where: { seasonId: season.id }
      }),
      weeks: await prisma.week.count({
        where: { seasonId: season.id }
      }),
      leagues: seasonLeagues.length,
      officialLeagues: seasonLeagues.filter(l => l.type === 'OFFICIAL').length,
      customLeagues: seasonLeagues.filter(l => l.type === 'CUSTOM').length,
      rankings: await prisma.ranking.count({
        where: { seasonId: season.id }
      }),
      activeWeek: activeWeek?.weekNumber || null
    };
  }

  // Global stats (backward compatible)
  const [users, picks, castaways, weeks, leagues, officialLeagues, customLeagues, scores, draftPicks] = await Promise.all([
    prisma.user.count({ where: { isAdmin: false } }),
    prisma.pick.count({ where: pickWhere }),
    prisma.castaway.count(),
    prisma.week.count(),
    prisma.league.count(),
    prisma.league.count({ where: { type: 'OFFICIAL' } }),
    prisma.league.count({ where: { type: 'CUSTOM' } }),
    prisma.score.count({ where: scoreWhere }),
    prisma.draftPick.count({ where: draftWhere })
  ]);

  res.json({
    users,
    picks,
    castaways,
    weeks,
    leagues,
    officialLeagues,
    customLeagues,
    scores,
    draftPicks,
    filteredByLeague: !!leagueId,
    bySeasons
  });
});

router.get("/weeks", async (_, res) => {
  const weeks = await prisma.week.findMany({
    orderBy: { weekNumber: "asc" }
  });
  res.json(weeks);
});

// GET /api/admin/weeks/active - Get the currently active week
router.get("/weeks/active", async (_, res) => {
  const activeWeek = await prisma.week.findFirst({
    where: { isActive: true }
  });
  res.json(activeWeek);
});

// GET /api/admin/castaways - Get all castaways for admin management
router.get("/castaways", async (_, res) => {
  const castaways = await prisma.castaway.findMany({
    orderBy: [
      { eliminated: "asc" },
      { name: "asc" }
    ],
    include: {
      weeklyResults: {
        orderBy: { weekNumber: "desc" },
        take: 5
      }
    }
  });
  res.json(castaways);
});

// GET /api/admin/picks/status - Get picks submission status
router.get("/picks/status", async (req, res) => {
  const { leagueId } = req.query;

  const activeWeek = await prisma.week.findFirst({ where: { isActive: true } });
  if (!activeWeek) {
    return res.json({ submitted: 0, pending: 0, total: 0, week: null });
  }

  const pickWhere = leagueId
    ? { weekNumber: activeWeek.weekNumber, leagueId: leagueId as string }
    : { weekNumber: activeWeek.weekNumber };

  // Get users who have submitted picks for this week
  const picksThisWeek = await prisma.pick.findMany({
    where: pickWhere,
    select: { userId: true }
  });
  const usersWithPicks = new Set(picksThisWeek.map(p => p.userId));

  // Get total users
  const totalUsers = await prisma.user.count({ where: { isAdmin: false } });

  res.json({
    submitted: usersWithPicks.size,
    pending: totalUsers - usersWithPicks.size,
    total: totalUsers,
    week: activeWeek.weekNumber
  });
});

// GET /api/admin/scoring/current - Get current week scoring data
router.get("/scoring/current", async (_, res) => {
  const activeWeek = await prisma.week.findFirst({ where: { isActive: true } });

  if (!activeWeek) {
    return res.json({ week: null, castaways: [], results: [] });
  }

  const castaways = await prisma.castaway.findMany({
    where: { eliminated: false },
    orderBy: { name: "asc" }
  });

  const results = await prisma.weeklyResult.findMany({
    where: { weekNumber: activeWeek.weekNumber },
    include: { castaway: true }
  });

  res.json({
    week: activeWeek,
    castaways,
    results
  });
});

// GET /api/admin/scoring/audit - Get scoring history for all weeks
router.get("/scoring/audit", async (_, res) => {
  // Get all weeks
  const weeks = await prisma.week.findMany({
    orderBy: { weekNumber: "asc" }
  });

  // Get all weekly results with castaway info
  const weeklyResults = await prisma.weeklyResult.findMany({
    include: { castaway: true },
    orderBy: [
      { weekNumber: "asc" },
      { points: "desc" }
    ]
  });

  // Group results by week
  const resultsByWeek = weeklyResults.reduce((acc, r) => {
    if (!acc[r.weekNumber]) acc[r.weekNumber] = [];
    acc[r.weekNumber].push({
      castawayId: r.castawayId,
      castawayName: r.castaway.name,
      points: r.points
    });
    return acc;
  }, {} as Record<number, { castawayId: string; castawayName: string; points: number }[]>);

  res.json(weeks.map(week => ({
    weekNumber: week.weekNumber,
    isActive: week.isActive,
    results: resultsByWeek[week.weekNumber] || []
  })));
});

router.get("/analytics", async (req, res) => {
  const { leagueId } = req.query;

  // Build where clauses for league filtering
  const pickWhere = leagueId ? { leagueId: leagueId as string } : {};
  const scoreWhere = leagueId ? { leagueId: leagueId as string } : {};

  // Weekly participation - picks submitted per week
  const weeklyParticipation = await prisma.pick.groupBy({
    by: ["weekNumber"],
    where: pickWhere,
    _count: { id: true },
    orderBy: { weekNumber: "asc" }
  });

  // User engagement - total picks per user (filtered by league)
  const userEngagement = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          picks: {
            where: pickWhere
          }
        }
      }
    },
    orderBy: {
      picks: {
        _count: "desc"
      }
    }
  });

  // Weekly scoring trends (filtered by league)
  const scoringTrends = await prisma.week.findMany({
    orderBy: { weekNumber: "asc" },
    include: {
      scores: {
        where: scoreWhere,
        select: { points: true }
      }
    }
  });

  const weeklyScores = scoringTrends.map((week) => {
    const totalPoints = week.scores.reduce((sum, score) => sum + score.points, 0);
    const avgPoints = week.scores.length > 0 ? totalPoints / week.scores.length : 0;
    return {
      weekNumber: week.weekNumber,
      totalPoints,
      avgPoints: Math.round(avgPoints * 100) / 100,
      playerCount: week.scores.length
    };
  });

  // Castaway popularity (most drafted)
  const castawayPopularity = await prisma.draftPick.groupBy({
    by: ["castawayId"],
    _count: { id: true }
  });

  const castawayDetails = await prisma.castaway.findMany({
    where: {
      id: { in: castawayPopularity.map((cp) => cp.castawayId) }
    },
    select: { id: true, name: true }
  });

  const popularCastaways = castawayPopularity.map((cp) => ({
    castaway: castawayDetails.find((c) => c.id === cp.castawayId),
    draftCount: cp._count.id
  })).sort((a, b) => b.draftCount - a.draftCount);

  // User statistics
  const totalUsers = await prisma.user.count();
  const usersWithPicks = await prisma.user.count({
    where: { picks: { some: {} } }
  });
  const usersWithRankings = await prisma.user.count({
    where: { ranking: { isNot: null } }
  });

  res.json({
    weeklyParticipation: weeklyParticipation.map((wp) => ({
      week: wp.weekNumber,
      picks: wp._count.id
    })),
    userEngagement: userEngagement.map((ue) => ({
      name: ue.name,
      pickCount: ue._count.picks
    })),
    scoringTrends: weeklyScores,
    popularCastaways,
    userStats: {
      total: totalUsers,
      withPicks: usersWithPicks,
      withRankings: usersWithRankings,
      participationRate: totalUsers > 0 ? Math.round((usersWithPicks / totalUsers) * 100) : 0
    }
  });
});

router.get("/analytics/win-probability", async (req, res) => {
  const { leagueId } = req.query;
  const scoreWhere = leagueId ? { leagueId: leagueId as string } : {};

  // Get all users with scores
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      scores: {
        where: scoreWhere,
        select: { points: true }
      }
    }
  });

  // ✅ OPTIMIZATION: Get weeks data in one query
  const weeks = await prisma.week.findMany({
    select: {
      id: true,
      _count: { select: { scores: true } }
    }
  });

  const totalWeeks = weeks.length;
  const completedWeeks = weeks.filter(w => w._count.scores > 0).length;
  const remainingWeeks = totalWeeks - completedWeeks;

  // Calculate for each user
  const probabilities = users.map(user => {
    const currentPoints = user.scores.reduce((sum, s) => sum + s.points, 0);
    const avgPoints = completedWeeks > 0 ? currentPoints / completedWeeks : 0;
    const projectedPoints = currentPoints + (avgPoints * remainingWeeks);

    return {
      userId: user.id,
      name: user.name,
      currentPoints,
      avgPointsPerWeek: Math.round(avgPoints * 100) / 100,
      projectedPoints: Math.round(projectedPoints),
      winProbability: 0 // Will calculate after getting max
    };
  });

  // Calculate probabilities based on projected scores
  const maxProjected = Math.max(...probabilities.map(p => p.projectedPoints), 1);

  probabilities.forEach(p => {
    p.winProbability = maxProjected > 0
      ? Math.round((p.projectedPoints / maxProjected) * 100)
      : 0;
  });

  probabilities.sort((a, b) => b.winProbability - a.winProbability);

  res.json({
    completedWeeks,
    remainingWeeks,
    totalWeeks,
    probabilities
  });
});

router.get("/analytics/power-rankings", async (req, res) => {
  const { leagueId } = req.query;
  const draftWhere = leagueId ? { leagueId: leagueId as string } : {};

  // Power Rankings based on player's castaways performance
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      draftPicks: {
        where: draftWhere,
        select: {
          castaway: {
            select: {
              id: true,
              name: true,
              eliminated: true,
              weeklyResults: {
                select: { points: true }
              }
            }
          }
        }
      }
    }
  });

  const rankings = users.map(user => {
    // Calculate castaway performance metrics
    const castawayMetrics = user.draftPicks.map(dp => {
      const totalPoints = dp.castaway.weeklyResults.reduce((sum, wr) => sum + wr.points, 0);
      const avgPoints = dp.castaway.weeklyResults.length > 0 ? totalPoints / dp.castaway.weeklyResults.length : 0;

      return {
        name: dp.castaway.name,
        totalPoints,
        avgPoints,
        eliminated: dp.castaway.eliminated,
        weeksActive: dp.castaway.weeklyResults.length
      };
    });

    // Power Score based on castaways
    const castawaysStillActive = castawayMetrics.filter(c => !c.eliminated).length;
    const totalCastawayPoints = castawayMetrics.reduce((sum, c) => sum + c.totalPoints, 0);
    const avgCastawayPoints = castawayMetrics.length > 0 ? totalCastawayPoints / castawayMetrics.length : 0;
    const castawaysInTopForm = castawayMetrics.filter(c => c.avgPoints > 5).length;

    // Power score prioritizes:
    // 1. How many castaways are still active (not eliminated)
    // 2. Total points from all their castaways
    // 3. Average performance per castaway
    const powerScore = (
      (castawaysStillActive * 15) + // 15 points per active castaway
      (totalCastawayPoints * 0.5) + // 50% of total castaway points
      (avgCastawayPoints * 5) + // 5 points per average point per castaway
      (castawaysInTopForm * 10) // 10 points per castaway performing above 5 avg
    );

    return {
      userId: user.id,
      name: user.name,
      powerScore: Math.round(powerScore * 10) / 10,
      powerRank: 0, // Will be set after sorting
      metrics: {
        totalCastawayPoints: totalCastawayPoints.toFixed(1),
        avgCastawayPoints: avgCastawayPoints.toFixed(1),
        castawaysActive: castawaysStillActive,
        totalCastaways: castawayMetrics.length,
        castawaysEliminated: castawayMetrics.filter(c => c.eliminated).length,
        topFormCastaways: castawaysInTopForm
      }
    };
  });

  rankings.sort((a, b) => b.powerScore - a.powerScore);
  rankings.forEach((r, i) => r.powerRank = i + 1);

  res.json(rankings);
});

router.get("/analytics/head-to-head", async (req, res) => {
  const { user1, user2 } = req.query as { user1?: string; user2?: string };

  if (!user1 || !user2) {
    return res.status(400).json({ error: "Both user1 and user2 are required" });
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [user1, user2] } },
    include: {
      scores: { include: { week: true }, orderBy: { week: { weekNumber: "asc" } } }
    }
  });

  if (users.length !== 2) {
    return res.status(404).json({ error: "One or both users not found" });
  }

  const [userOne, userTwo] = users;

  // Get all weeks
  const allWeeks = await prisma.week.findMany({ orderBy: { weekNumber: "asc" } });

  // Build weekly comparison
  const weeklyComparison = allWeeks.map(week => {
    const user1Score = userOne.scores.find(s => s.week.weekNumber === week.weekNumber);
    const user2Score = userTwo.scores.find(s => s.week.weekNumber === week.weekNumber);

    const user1Points = user1Score?.points || 0;
    const user2Points = user2Score?.points || 0;

    return {
      week: week.weekNumber,
      user1Points,
      user2Points,
      winner: user1Points > user2Points ? 'user1' :
              user2Points > user1Points ? 'user2' : 'tie'
    };
  });

  // Calculate summary
  const user1Wins = weeklyComparison.filter(w => w.winner === 'user1').length;
  const user2Wins = weeklyComparison.filter(w => w.winner === 'user2').length;
  const ties = weeklyComparison.filter(w => w.winner === 'tie').length;

  const totalUser1Points = userOne.scores.reduce((sum, s) => sum + s.points, 0);
  const totalUser2Points = userTwo.scores.reduce((sum, s) => sum + s.points, 0);

  res.json({
    user1: { id: userOne.id, name: userOne.name, totalPoints: totalUser1Points },
    user2: { id: userTwo.id, name: userTwo.name, totalPoints: totalUser2Points },
    weeklyComparison,
    summary: {
      user1Wins,
      user2Wins,
      ties,
      avgPointDiff: weeklyComparison.length > 0 ? Math.abs(totalUser1Points - totalUser2Points) / weeklyComparison.length : 0
    }
  });
});

router.get("/analytics/castaways-status", async (req, res) => {
  const { leagueId } = req.query;
  const draftWhere = leagueId ? { leagueId: leagueId as string } : {};

  const castaways = await prisma.castaway.findMany({
    select: {
      id: true,
      name: true,
      eliminated: true,
      eliminatedWeek: true,
      draftPicks: {
        where: draftWhere,
        select: { userId: true, user: { select: { name: true } } }
      },
      weeklyResults: {
        select: { weekNumber: true, points: true }
      }
    },
    orderBy: { name: "asc" }
  });

  const castawayStatus = castaways.map(castaway => {
    const totalPoints = castaway.weeklyResults.reduce((sum, wr) => sum + wr.points, 0);
    const weeksActive = castaway.weeklyResults.length;

    return {
      id: castaway.id,
      name: castaway.name,
      eliminated: castaway.eliminated,
      eliminatedWeek: castaway.eliminatedWeek,
      totalPoints,
      weeksActive,
      draftedBy: castaway.draftPicks.map(dp => dp.user.name),
      draftCount: castaway.draftPicks.length
    };
  });

  res.json(castawayStatus);
});

router.get("/analytics/pick-accuracy", async (req, res) => {
  const { leagueId } = req.query;
  const draftWhere = leagueId ? { leagueId: leagueId as string } : {};
  const pickWhere = leagueId ? { leagueId: leagueId as string } : {};

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      draftPicks: {
        where: draftWhere,
        select: {
          castaway: {
            select: {
              id: true,
              name: true,
              eliminated: true,
              weeklyResults: {
                select: { points: true }
              }
            }
          }
        }
      },
      picks: {
        where: pickWhere,
        select: {
          castaway: {
            select: {
              eliminated: true,
              weeklyResults: {
                select: { points: true }
              }
            }
          }
        }
      }
    }
  });

  const accuracy = users.map(user => {
    // Count of castaways still in the game (not eliminated)
    const draftPicksInGame = user.draftPicks.filter(dp => !dp.castaway.eliminated).length;
    const totalDraftPicks = user.draftPicks.length;
    const draftAccuracy = totalDraftPicks > 0 ? Math.round((draftPicksInGame / totalDraftPicks) * 100) : 0;

    // Average points from picks
    const totalDraftPoints = user.draftPicks.reduce((sum, dp) => {
      return sum + dp.castaway.weeklyResults.reduce((s, wr) => s + wr.points, 0);
    }, 0);
    const avgDraftPointsPerPick = totalDraftPicks > 0 ? Math.round((totalDraftPoints / totalDraftPicks) * 10) / 10 : 0;

    // Weekly picks success
    const weeklyPicksInGame = user.picks.filter(p => !p.castaway.eliminated).length;
    const totalWeeklyPicks = user.picks.length;
    const weeklyAccuracy = totalWeeklyPicks > 0 ? Math.round((weeklyPicksInGame / totalWeeklyPicks) * 100) : 0;

    return {
      userId: user.id,
      name: user.name,
      draftAccuracy,
      draftPicksInGame,
      totalDraftPicks,
      avgDraftPointsPerPick,
      weeklyAccuracy,
      weeklyPicksInGame,
      totalWeeklyPicks
    };
  });

  accuracy.sort((a, b) => b.draftAccuracy - a.draftAccuracy);
  res.json(accuracy);
});

router.get("/analytics/leaderboard", async (req, res) => {
  const { leagueId } = req.query;
  const scoreWhere = leagueId ? { leagueId: leagueId as string } : {};
  const draftWhere = leagueId ? { leagueId: leagueId as string } : {};

  const standings = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      scores: {
        where: scoreWhere,
        select: { points: true }
      },
      draftPicks: {
        where: draftWhere,
        include: { castaway: true }
      }
    }
  });

  const leaderboard = standings
    .map(user => {
      const totalPoints = user.scores.reduce((sum, s) => sum + s.points, 0);
      const weeksParticipated = user.scores.length;
      const avgPoints = weeksParticipated > 0 ? Math.round((totalPoints / weeksParticipated) * 10) / 10 : 0;
      const eliminatedDraftPicks = user.draftPicks.filter(dp => dp.castaway.eliminated).length;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        totalPoints,
        weeksParticipated,
        avgPoints,
        draftPicksEliminated: eliminatedDraftPicks,
        totalDraftPicks: user.draftPicks.length
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((user, index) => ({ ...user, rank: index + 1 }));

  res.json(leaderboard);
});

const castawaySchema = z.object({
  name: z.string().min(1),
  age: z.number().int().positive().optional(),
  tribe: z.string().optional(),
  occupation: z.string().optional(),
  hometown: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  eliminated: z.boolean().optional()
});

router.post("/castaway", async (req, res) => {
  const adminId = (req as any).user?.id;
  const payload = castawaySchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ error: payload.error.flatten() });
  }
  const castaway = await prisma.castaway.create({ data: payload.data });
  logger.info({ adminId, action: "CREATE_CASTAWAY", castawayId: castaway.id, name: castaway.name }, "Admin action: castaway created");
  res.status(201).json(castaway);
});

router.put("/castaway/:id", async (req, res) => {
  const adminId = (req as any).user?.id;
  const payload = castawaySchema.partial().safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ error: payload.error.flatten() });
  }
  const { id } = req.params;
  const updated = await prisma.castaway.update({
    where: { id },
    data: payload.data
  });
  logger.info({ adminId, action: "UPDATE_CASTAWAY", castawayId: id, changes: Object.keys(payload.data) }, "Admin action: castaway updated");
  res.json(updated);
});

router.delete("/castaway/:id", async (req, res) => {
  const adminId = (req as any).user?.id;
  const { id } = req.params;
  try {
    await prisma.castaway.delete({ where: { id } });
    logger.info({ adminId, action: "DELETE_CASTAWAY", castawayId: id }, "Admin action: castaway deleted");
    res.status(204).end();
  } catch (error: any) {
    // Handle foreign key constraint violation
    if (error.code === "P2003" || error.code === "P2014") {
      return res.status(409).json({
        error: "Cannot delete castaway: still referenced in picks, draft picks, rankings, or weekly results. Mark as eliminated instead."
      });
    }
    logger.error({ adminId, castawayId: id, error }, "Delete castaway error");
    res.status(500).json({ error: "Failed to delete castaway" });
  }
});

const weekSchema = z.object({
  weekNumber: z.number().int().positive(),
  isActive: z.boolean().optional()
});

router.post("/week", async (req, res) => {
  const adminId = (req as any).user?.id;
  const rawWeekNumber = Number(req.body.weekNumber ?? req.body.number ?? req.body.week);
  const payload = weekSchema.safeParse({
    weekNumber: rawWeekNumber,
    isActive: Boolean(req.body.isActive)
  });
  if (!payload.success) {
    return res.status(400).json({ error: payload.error.flatten() });
  }

  const { weekNumber, isActive } = payload.data;
  const existingWeek = await prisma.week.findFirst({ where: { weekNumber } });
  const week = existingWeek
    ? await prisma.week.update({
        where: { id: existingWeek.id },
        data: { isActive }
      })
    : await prisma.week.create({
        data: { weekNumber, isActive: Boolean(isActive) }
      });

  if (isActive) {
    await prisma.week.updateMany({
      where: { weekNumber: { not: weekNumber } },
      data: { isActive: false }
    });
  }

  logger.info({ adminId, action: existingWeek ? "UPDATE_WEEK" : "CREATE_WEEK", weekNumber, isActive }, "Admin action: week modified");
  res.status(201).json(week);
});

const scoreSchema = z.object({
  userId: z.string().uuid(),
  weekId: z.string().uuid(),
  points: z.number().int()
});

router.post("/score", async (req, res) => {
  const adminId = (req as any).user?.id;
  const payload = scoreSchema.safeParse({
    userId: req.body.userId,
    weekId: req.body.weekId,
    points: Number(req.body.points)
  });
  if (!payload.success) {
    return res.status(400).json({ error: payload.error.flatten() });
  }

  const { userId, weekId, points } = payload.data;
  const existing = await prisma.score.findFirst({
    where: { userId, weekId }
  });

  const score = existing
    ? await prisma.score.update({
        where: { id: existing.id },
        data: { points }
      })
    : await prisma.score.create({ data: { userId, weekId, points } });

  logger.info({ adminId, action: existing ? "UPDATE_SCORE" : "CREATE_SCORE", userId, weekId, points }, "Admin action: score modified");
  res.json(score);
});

// Update week pick schedule
router.post("/weeks/:weekNumber/schedule", async (req, res) => {
  const adminId = (req as any).user?.id;
  const weekNumber = Number(req.params.weekNumber);
  const { picksOpenAt, picksCloseAt } = req.body as {
    picksOpenAt?: string;
    picksCloseAt?: string;
  };

  const week = await prisma.week.findFirst({ where: { weekNumber } });
  if (!week) {
    return res.status(404).json({ error: "Week not found" });
  }

  const updated = await prisma.week.update({
    where: { id: week.id },
    data: {
      picksOpenAt: picksOpenAt ? new Date(picksOpenAt) : undefined,
      picksCloseAt: picksCloseAt ? new Date(picksCloseAt) : undefined
    }
  });

  logger.info({ adminId, action: "UPDATE_WEEK_SCHEDULE", weekNumber, picksOpenAt, picksCloseAt }, "Admin action: week schedule updated");
  res.json(updated);
});

// Manually trigger auto-pick for a specific week
router.post("/weeks/:weekNumber/auto-pick", async (req, res) => {
  const adminId = (req as any).user?.id;
  const weekNumber = Number(req.params.weekNumber);

  try {
    const count = await processAutoPicksForWeek(weekNumber);
    logger.info({ adminId, action: "TRIGGER_AUTO_PICK", weekNumber, usersAffected: count }, "Admin action: auto-pick triggered");
    res.json({
      success: true,
      message: `Auto-picked for ${count} users`,
      count
    });
  } catch (error: any) {
    logger.error({ adminId, weekNumber, error }, "Auto-pick failed");
    res.status(500).json({ error: error.message });
  }
});

export default router;
