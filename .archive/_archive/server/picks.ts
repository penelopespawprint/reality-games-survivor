import { Router } from "express";
import prisma from "./prisma.js";
import { authenticate, requireAdmin, withSeasonContext, getLeagueId } from "./middleware.js";
import { sendSMS, formatPhone } from "./simpletexting.js";
import { picksLogger, logError } from "./logger.js";

const router = Router();

router.use(authenticate);
router.use(withSeasonContext);

// Get user's draft picks (castaways assigned to them)
router.get("/my-draft", async (req, res) => {
  const userId = (req as any).user?.id;
  const leagueId = getLeagueId(req);

  try {
    const draftPicks = await prisma.draftPick.findMany({
      where: {
        userId,
        ...(leagueId && { leagueId }),
      },
      include: {
        castaway: true,
      },
      orderBy: { round: "asc" },
    });

    res.json({
      picks: draftPicks,
      hasDraft: draftPicks.length > 0,
    });
  } catch (error) {
    logError(picksLogger, error, { userId, leagueId, context: "fetch_draft_picks" });
    res.status(500).json({ error: "Failed to fetch draft picks" });
  }
});

router.get("/me", async (req, res) => {
  const userId = (req as any).user?.id;
  const seasonId = (req as any).season?.id;
  const leagueId = getLeagueId(req);

  // Find active week for the current season
  const week = await prisma.week.findFirst({
    where: {
      isActive: true,
      ...(seasonId && { seasonId }),
    },
  });
  if (!week) {
    return res.status(404).json({ error: "No active week" });
  }

  const pick = await prisma.pick.findFirst({
    where: {
      userId,
      weekNumber: week.weekNumber,
      ...(leagueId && { leagueId }),
    },
    include: { castaway: true }
  });

  const assigned = await prisma.draftPick.findMany({
    where: {
      userId,
      ...(leagueId && { leagueId }),
    },
    include: { castaway: true },
    orderBy: { round: "asc" }
  });

  // Get previous week's pick for suggestion
  const previousPick = await prisma.pick.findFirst({
    where: {
      userId,
      weekNumber: week.weekNumber - 1,
      ...(leagueId && { leagueId }),
    },
    include: { castaway: true }
  });

  // Suggest opposite pick from last week
  let suggestedCastaway = null;
  if (previousPick && assigned.length > 0) {
    suggestedCastaway = assigned.find(
      a => a.castawayId !== previousPick.castawayId
    )?.castaway;
  }

  res.json({
    pick,
    assigned,
    week,
    previousPick,
    suggestedCastaway
  });
});

router.post("/me", async (req, res) => {
  const userId = (req as any).user?.id;
  const seasonId = (req as any).season?.id;
  const leagueId = getLeagueId(req);
  const { castawayId } = req.body as { castawayId?: string };

  if (!castawayId) {
    return res.status(400).json({ error: "castawayId is required" });
  }

  const week = await prisma.week.findFirst({
    where: {
      isActive: true,
      ...(seasonId && { seasonId }),
    },
  });
  if (!week) {
    return res.status(404).json({ error: "No active week" });
  }

  // Check pick window timing
  const now = new Date();
  if (week.picksCloseAt && now > week.picksCloseAt) {
    return res.status(423).json({ error: "Pick window has closed" });
  }

  if (week.picksOpenAt && now < week.picksOpenAt) {
    return res.status(423).json({ error: "Pick window not open yet" });
  }

  // Legacy lock check
  if (week.lockAt && now > week.lockAt) {
    return res.status(423).json({ error: "Weekly picks are locked" });
  }

  // Validate castaway exists, belongs to current season, and is not eliminated
  const castaway = await prisma.castaway.findUnique({
    where: { id: castawayId }
  });
  if (!castaway) {
    return res.status(400).json({ error: "Invalid castaway" });
  }
  if (seasonId && castaway.seasonId !== seasonId) {
    return res.status(400).json({ error: "Castaway not in current season" });
  }
  if (castaway.eliminated) {
    return res.status(400).json({ error: "Cannot pick eliminated castaway" });
  }

  const assigned = await prisma.draftPick.findMany({
    where: {
      userId,
      ...(leagueId && { leagueId }),
    }
  });
  if (assigned.length === 0) {
    return res.status(409).json({ error: "Draft not completed yet" });
  }

  const allowedCastawayIds = new Set(assigned.map((pick) => pick.castawayId));
  if (!allowedCastawayIds.has(castawayId)) {
    return res.status(400).json({ error: "Castaway not assigned to this user" });
  }

  const existing = await prisma.pick.findFirst({
    where: {
      userId,
      weekNumber: week.weekNumber,
      ...(leagueId && { leagueId }),
    }
  });

  const pick = existing
    ? await prisma.pick.update({
        where: { id: existing.id },
        data: {
          castawayId,
          submittedAt: now,
          updatedAt: now
        },
        include: { castaway: true }
      })
    : await prisma.pick.create({
        data: {
          userId,
          weekNumber: week.weekNumber,
          weekId: week.id,
          castawayId,
          submittedAt: now,
          seasonId,
          leagueId, // Attach to selected league
        },
        include: { castaway: true }
      });

  picksLogger.info({
    userId,
    weekNumber: week.weekNumber,
    castawayId: pick.castawayId,
    castawayName: pick.castaway.name,
    pickId: pick.id,
    isUpdate: !!existing,
    leagueId,
  }, "Pick saved");

  // Send SMS confirmation if user has SMS enabled
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true, smsEnabled: true, name: true }
  });

  if (user?.phone && user.smsEnabled) {
    try {
      // Create idempotency key: week:userId:pick:castawayId
      const eventKey = `pick:${week.weekNumber}:${userId}:${castawayId}`;

      // Check if we already sent this exact pick confirmation
      const existingSMS = await prisma.sMSLog.findUnique({
        where: { eventKey }
      });

      if (!existingSMS) {
        const deadline = week.picksCloseAt
          ? new Date(week.picksCloseAt).toLocaleDateString("en-US", {
              weekday: "short",
              hour: "numeric",
              minute: "2-digit",
              timeZone: "America/Los_Angeles"
            })
          : "TBD";

        const smsResponse = await sendSMS({
          to: user.phone,
          text: `Your Week ${week.weekNumber} pick: ${pick.castaway.name} ✓ Deadline: ${deadline}. Reply BOARD for top 5.`
        });

        // Log SMS with eventKey for idempotency
        await prisma.sMSLog.create({
          data: {
            userId,
            phone: user.phone,
            direction: 'OUTBOUND',
            command: 'PICK_CONFIRMATION',
            outboundText: `Your Week ${week.weekNumber} pick: ${pick.castaway.name} ✓`,
            success: true,
            messageId: smsResponse.id,
            credits: smsResponse.credits,
            eventKey
          }
        });

        picksLogger.info({ userName: user.name, weekNumber: week.weekNumber }, "SMS pick confirmation sent");
      } else {
        picksLogger.debug({ userName: user.name, eventKey }, "Skipped duplicate SMS");
      }
    } catch (smsError) {
      logError(picksLogger, smsError, { userId, context: "sms_confirmation" });
      // Don't fail the request if SMS fails
    }
  }

  picksLogger.debug({ pickId: pick.id, weekNumber: week.weekNumber, castawayId: pick.castawayId }, "Returning pick to client");
  res.json(pick);
});

router.get("/week/:weekNumber", requireAdmin, async (req, res) => {
  const weekNumber = Number(req.params.weekNumber);
  const picks = await prisma.pick.findMany({
    where: { weekNumber },
    include: { user: true, castaway: true }
  });
  res.json(picks);
});

router.get("/all", async (req, res) => {
  const leagueId = getLeagueId(req);

  try {
    // Get users who are in the selected league (if specified)
    let users;
    if (leagueId) {
      const leagueMembers = await prisma.leagueMembership.findMany({
        where: { leagueId },
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      });
      users = leagueMembers.map((m: { user: { id: string; name: string; email: string } }) => m.user);
    } else {
      users = await prisma.user.findMany({
        select: { id: true, name: true, email: true }
      });
    }

    // Get picks with castaway details, filtered by league if specified
    const picks = await prisma.pick.findMany({
      where: leagueId ? { leagueId } : undefined,
      include: {
        castaway: true
      },
      orderBy: [{ weekNumber: "asc" }, { userId: "asc" }]
    });

    picksLogger.debug({ pickCount: picks.length, leagueId }, "Fetched all picks");

    // Get draft picks filtered by league if specified
    const draftPicks = await prisma.draftPick.findMany({
      where: leagueId ? { leagueId } : undefined,
      include: {
        castaway: true
      }
    });

    // Get all castaways to check elimination status
    const castaways = await prisma.castaway.findMany();

    // Get all weeks
    const weeks = await prisma.week.findMany({
      orderBy: { weekNumber: "asc" }
    });

    res.json({
      users,
      picks,
      draftPicks,
      castaways,
      weeks
    });
  } catch (error) {
    logError(picksLogger, error, { leagueId, context: "fetch_all_picks" });
    res.status(500).json({ error: "Failed to fetch picks data" });
  }
});

// Admin endpoint to get weekly picks log
router.get("/admin/log", requireAdmin, async (req, res) => {
  try {
    const picks = await prisma.pick.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        castaway: { select: { id: true, name: true, tribe: true } },
        week: { select: { weekNumber: true, picksCloseAt: true } }
      },
      orderBy: [
        { weekNumber: "desc" },
        { submittedAt: "desc" }
      ]
    });

    res.json({ picks });
  } catch (error) {
    logError(picksLogger, error, { context: "fetch_weekly_log" });
    res.status(500).json({ error: "Failed to fetch weekly picks log" });
  }
});

// Admin endpoint to submit pick on behalf of a user
router.post("/admin/submit", requireAdmin, async (req, res) => {
  const { userId, castawayId } = req.body as { userId?: string; castawayId?: string };

  if (!userId || !castawayId) {
    return res.status(400).json({ error: "userId and castawayId are required" });
  }

  const week = await prisma.week.findFirst({ where: { isActive: true } });
  if (!week) {
    return res.status(404).json({ error: "No active week" });
  }

  // Validate castaway exists and is not eliminated
  const castaway = await prisma.castaway.findUnique({
    where: { id: castawayId }
  });
  if (!castaway) {
    return res.status(400).json({ error: "Invalid castaway" });
  }
  if (castaway.eliminated) {
    return res.status(400).json({ error: "Cannot pick eliminated castaway" });
  }

  const assigned = await prisma.draftPick.findMany({ where: { userId } });
  if (assigned.length === 0) {
    return res.status(409).json({ error: "User has no draft picks assigned" });
  }

  const allowedCastawayIds = new Set(assigned.map((pick) => pick.castawayId));
  if (!allowedCastawayIds.has(castawayId)) {
    return res.status(400).json({ error: "Castaway not assigned to this user" });
  }

  const existing = await prisma.pick.findFirst({
    where: { userId, weekNumber: week.weekNumber }
  });

  const now = new Date();
  const pick = existing
    ? await prisma.pick.update({
        where: { id: existing.id },
        data: {
          castawayId,
          submittedAt: now,
          updatedAt: now
        },
        include: { castaway: true, user: true }
      })
    : await prisma.pick.create({
        data: {
          userId,
          weekNumber: week.weekNumber,
          weekId: week.id,
          castawayId,
          submittedAt: now
        },
        include: { castaway: true, user: true }
      });

  picksLogger.info({
    adminAction: true,
    userId,
    userName: pick.user.name,
    weekNumber: week.weekNumber,
    castawayName: pick.castaway.name,
    pickId: pick.id,
  }, "Admin submitted pick");

  res.json(pick);
});

// Admin debug endpoint to check picks status
router.get("/admin/debug", requireAdmin, async (req, res) => {
  try {
    const [weeks, allPicks, draftPicks, users] = await Promise.all([
      prisma.week.findMany({ orderBy: { weekNumber: "asc" } }),
      prisma.pick.findMany({
        include: {
          user: { select: { name: true, email: true } },
          castaway: { select: { name: true } }
        },
        orderBy: { submittedAt: "desc" }
      }),
      prisma.draftPick.findMany({
        include: {
          user: { select: { name: true, email: true } },
          castaway: { select: { name: true } }
        }
      }),
      prisma.user.findMany({ select: { id: true, name: true, email: true } })
    ]);

    const activeWeek = weeks.find(w => w.isActive);

    res.json({
      activeWeek: activeWeek || null,
      totalWeeks: weeks.length,
      totalPicks: allPicks.length,
      totalDraftPicks: draftPicks.length,
      totalUsers: users.length,
      recentPicks: allPicks.slice(0, 5),
      weeks: weeks.map(w => ({
        weekNumber: w.weekNumber,
        isActive: w.isActive,
        picksOpenAt: w.picksOpenAt,
        picksCloseAt: w.picksCloseAt
      }))
    });
  } catch (error) {
    logError(picksLogger, error, { context: "fetch_debug_info" });
    res.status(500).json({ error: "Failed to fetch debug info" });
  }
});

export default router;
