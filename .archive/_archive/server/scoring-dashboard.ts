// @ts-nocheck
/**
 * Scoring Dashboard API
 *
 * Episode-based scoring with 100+ rules organized by category.
 * CEREBRO Skills: 103 (Seasonal Product), 1-5 (Technical)
 */

import { Router } from "express";
import prisma from "./prisma.js";
import { requireAdmin } from "./middleware.js";
import { createLogger } from "./logger.js";

const logger = createLogger("scoring-dashboard");

const router = Router();

// All scoring dashboard routes require admin
router.use(requireAdmin);

/**
 * GET /api/admin/scoring-dashboard/summary
 * Returns summary stats for scoring system
 */
router.get("/summary", async (_, res) => {
  try {
    const [rulesTotal, rulesActive, sessionsTotal, sessionsPublished, sessionsDraft] = await Promise.all([
      prisma.scoringRule.count(),
      prisma.scoringRule.count({ where: { isActive: true } }),
      prisma.scoringSession.count(),
      prisma.scoringSession.count({ where: { status: "PUBLISHED" } }),
      prisma.scoringSession.count({ where: { status: "DRAFT" } })
    ]);

    res.json({
      rules: { total: rulesTotal, active: rulesActive },
      sessions: { total: sessionsTotal, published: sessionsPublished, draft: sessionsDraft }
    });
  } catch (error) {
    logger.error("Failed to get scoring summary:", error);
    res.status(500).json({ error: "Failed to get scoring summary" });
  }
});

/**
 * GET /api/admin/scoring-dashboard/rules
 * Returns all scoring rules grouped by category
 */
router.get("/rules", async (_, res) => {
  try {
    const rules = await prisma.scoringRule.findMany({
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }]
    });

    // Group by category
    const byCategory = rules.reduce((acc, rule) => {
      if (!acc[rule.category]) acc[rule.category] = [];
      acc[rule.category].push(rule);
      return acc;
    }, {} as Record<string, typeof rules>);

    res.json({ rules, byCategory, categories: Object.keys(byCategory) });
  } catch (error) {
    logger.error("Failed to get scoring rules:", error);
    res.status(500).json({ error: "Failed to get scoring rules" });
  }
});

/**
 * POST /api/admin/scoring-dashboard/rules
 * Create or update a scoring rule
 */
router.post("/rules", async (req, res) => {
  try {
    const { id, category, name, description, points, isActive, sortOrder } = req.body;

    if (!category || !name || points === undefined) {
      return res.status(400).json({ error: "category, name, and points are required" });
    }

    const rule = id
      ? await prisma.scoringRule.update({
          where: { id },
          data: { category, name, description, points, isActive, sortOrder }
        })
      : await prisma.scoringRule.create({
          data: { category, name, description, points, isActive: isActive ?? true, sortOrder: sortOrder ?? 0 }
        });

    res.json(rule);
  } catch (error) {
    logger.error("Failed to save scoring rule:", error);
    res.status(500).json({ error: "Failed to save scoring rule" });
  }
});

/**
 * GET /api/admin/scoring-dashboard/sessions/:weekNumber
 * Get or create a scoring session for a specific week
 */
router.get("/sessions/:weekNumber", async (req, res) => {
  try {
    const weekNumber = parseInt(req.params.weekNumber);
    if (isNaN(weekNumber)) {
      return res.status(400).json({ error: "Invalid week number" });
    }

    // Get active season
    const activeSeason = await prisma.season.findFirst({ where: { isActive: true } });
    const seasonId = activeSeason?.id || null;

    // Find or create session
    let session = await prisma.scoringSession.findFirst({
      where: { weekNumber, ...(seasonId && { seasonId }) }
    });

    if (!session) {
      session = await prisma.scoringSession.create({
        data: { weekNumber, seasonId, status: "DRAFT" }
      });
    }

    // Get castaways (non-eliminated for this season)
    const castaways = await prisma.castaway.findMany({
      where: {
        eliminated: false,
        ...(seasonId && { seasonId })
      },
      orderBy: { name: "asc" }
    });

    // Get active rules
    const rules = await prisma.scoringRule.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }]
    });

    // Get entries for this session
    const entries = await prisma.scoreEntry.findMany({
      where: { sessionId: session.id },
      include: { rule: true, castaway: true }
    });

    // Build entry map: entryMap[castawayId][ruleId] = entry
    const entryMap: Record<string, Record<string, typeof entries[0]>> = {};
    const castawayTotals: Record<string, number> = {};

    for (const castaway of castaways) {
      entryMap[castaway.id] = {};
      castawayTotals[castaway.id] = 0;
    }

    for (const entry of entries) {
      if (entryMap[entry.castawayId]) {
        entryMap[entry.castawayId][entry.ruleId] = entry;
        castawayTotals[entry.castawayId] += entry.calculatedPoints;
      }
    }

    // Get categories
    const categories = [...new Set(rules.map(r => r.category))];

    res.json({
      session,
      castaways,
      rules,
      entries,
      entryMap,
      castawayTotals,
      categories
    });
  } catch (error) {
    logger.error("Failed to get scoring session:", error);
    res.status(500).json({ error: "Failed to get scoring session" });
  }
});

/**
 * POST /api/admin/scoring-dashboard/sessions/:id/entries
 * Update a score entry (increment/decrement count)
 */
router.post("/sessions/:id/entries", async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { castawayId, ruleId, count } = req.body;

    if (!castawayId || !ruleId || count === undefined) {
      return res.status(400).json({ error: "castawayId, ruleId, and count are required" });
    }

    // Get the rule to calculate points
    const rule = await prisma.scoringRule.findUnique({ where: { id: ruleId } });
    if (!rule) {
      return res.status(404).json({ error: "Rule not found" });
    }

    const calculatedPoints = count * rule.points;

    // Upsert the entry
    const entry = count > 0
      ? await prisma.scoreEntry.upsert({
          where: {
            sessionId_castawayId_ruleId: { sessionId, castawayId, ruleId }
          },
          update: { count, calculatedPoints },
          create: { sessionId, castawayId, ruleId, count, calculatedPoints }
        })
      : await prisma.scoreEntry.deleteMany({
          where: { sessionId, castawayId, ruleId }
        }).then(() => null);

    // Recalculate castaway total for this session
    const total = await prisma.scoreEntry.aggregate({
      where: { sessionId, castawayId },
      _sum: { calculatedPoints: true }
    });

    res.json({
      entry,
      castawayTotal: total._sum.calculatedPoints || 0
    });
  } catch (error) {
    logger.error("Failed to update score entry:", error);
    res.status(500).json({ error: "Failed to update score entry" });
  }
});

/**
 * POST /api/admin/scoring-dashboard/sessions/:id/publish
 * Publish a scoring session (calculate and save to WeeklyResult)
 */
router.post("/sessions/:id/publish", async (req, res) => {
  try {
    const sessionId = req.params.id;

    const session = await prisma.scoringSession.findUnique({
      where: { id: sessionId },
      include: { entries: true }
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Calculate totals per castaway
    const castawayTotals: Record<string, number> = {};
    for (const entry of session.entries) {
      castawayTotals[entry.castawayId] = (castawayTotals[entry.castawayId] || 0) + entry.calculatedPoints;
    }

    // Create/update WeeklyResult for each castaway
    await prisma.$transaction(async (tx) => {
      for (const [castawayId, points] of Object.entries(castawayTotals)) {
        await tx.weeklyResult.upsert({
          where: {
            seasonId_weekNumber_castawayId: {
              seasonId: session.seasonId || "",
              weekNumber: session.weekNumber,
              castawayId
            }
          },
          update: { points },
          create: {
            weekNumber: session.weekNumber,
            castawayId,
            points,
            seasonId: session.seasonId
          }
        });
      }

      // Update session status
      await tx.scoringSession.update({
        where: { id: sessionId },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date()
        }
      });
    });

    res.json({ success: true, message: "Session published successfully" });
  } catch (error) {
    logger.error("Failed to publish session:", error);
    res.status(500).json({ error: "Failed to publish session" });
  }
});

/**
 * POST /api/admin/scoring-dashboard/seed-rules
 * Seed the 100+ scoring rules (run once)
 */
router.post("/seed-rules", async (_, res) => {
  try {
    // Check if rules already exist
    const existingCount = await prisma.scoringRule.count();
    if (existingCount > 0) {
      return res.json({ message: `${existingCount} rules already exist. Skipping seed.` });
    }

    // 100+ Survivor scoring rules organized by category
    const rules = [
      // CHALLENGES (15 rules)
      { category: "Challenge", name: "Won Individual Immunity", points: 10, sortOrder: 1 },
      { category: "Challenge", name: "Won Individual Reward", points: 5, sortOrder: 2 },
      { category: "Challenge", name: "Won Team Immunity", points: 3, sortOrder: 3 },
      { category: "Challenge", name: "Won Team Reward", points: 2, sortOrder: 4 },
      { category: "Challenge", name: "Sat Out of Challenge", points: -1, sortOrder: 5 },
      { category: "Challenge", name: "First Out of Challenge", points: -2, sortOrder: 6 },
      { category: "Challenge", name: "Last Standing (Not Winner)", points: 3, sortOrder: 7 },
      { category: "Challenge", name: "Won Puzzle Portion", points: 2, sortOrder: 8 },
      { category: "Challenge", name: "Won Physical Portion", points: 2, sortOrder: 9 },
      { category: "Challenge", name: "Found Advantage During Challenge", points: 5, sortOrder: 10 },
      { category: "Challenge", name: "DQ'd from Challenge", points: -3, sortOrder: 11 },
      { category: "Challenge", name: "Medical Timeout in Challenge", points: -2, sortOrder: 12 },
      { category: "Challenge", name: "Won Endurance Challenge", points: 12, sortOrder: 13 },
      { category: "Challenge", name: "Broke Challenge Record", points: 5, sortOrder: 14 },
      { category: "Challenge", name: "Gave Up Challenge Spot", points: -2, sortOrder: 15 },

      // TRIBAL COUNCIL (20 rules)
      { category: "Tribal", name: "Received Vote", points: -1, sortOrder: 1 },
      { category: "Tribal", name: "Vote Negated by Idol", points: 2, sortOrder: 2 },
      { category: "Tribal", name: "Played Idol Successfully", points: 10, sortOrder: 3 },
      { category: "Tribal", name: "Played Idol Unsuccessfully", points: -5, sortOrder: 4 },
      { category: "Tribal", name: "Voted Correctly", points: 2, sortOrder: 5 },
      { category: "Tribal", name: "Voted Incorrectly", points: -1, sortOrder: 6 },
      { category: "Tribal", name: "Blindsided Someone", points: 5, sortOrder: 7 },
      { category: "Tribal", name: "Got Blindsided", points: -3, sortOrder: 8 },
      { category: "Tribal", name: "Zero Votes at Tribal", points: 3, sortOrder: 9 },
      { category: "Tribal", name: "Sole Vote Against", points: 3, sortOrder: 10 },
      { category: "Tribal", name: "Survived Revote", points: 3, sortOrder: 11 },
      { category: "Tribal", name: "Eliminated", points: -15, sortOrder: 12 },
      { category: "Tribal", name: "Idol in Pocket at Elimination", points: -5, sortOrder: 13 },
      { category: "Tribal", name: "Saved by Fire Making", points: 8, sortOrder: 14 },
      { category: "Tribal", name: "Won Fire Making", points: 15, sortOrder: 15 },
      { category: "Tribal", name: "Lost Fire Making", points: -10, sortOrder: 16 },
      { category: "Tribal", name: "Forced Tie Vote", points: 2, sortOrder: 17 },
      { category: "Tribal", name: "No Vote (Advantage Used)", points: 0, sortOrder: 18 },
      { category: "Tribal", name: "Cast Extra Vote", points: 2, sortOrder: 19 },
      { category: "Tribal", name: "Vote Stolen", points: -2, sortOrder: 20 },

      // STRATEGY (20 rules)
      { category: "Strategy", name: "Found Hidden Idol", points: 8, sortOrder: 1 },
      { category: "Strategy", name: "Found Advantage", points: 5, sortOrder: 2 },
      { category: "Strategy", name: "Received Idol from Another", points: 3, sortOrder: 3 },
      { category: "Strategy", name: "Gave Away Idol", points: -2, sortOrder: 4 },
      { category: "Strategy", name: "Correctly Read Another Player", points: 3, sortOrder: 5 },
      { category: "Strategy", name: "Flipped on Alliance", points: 2, sortOrder: 6 },
      { category: "Strategy", name: "Started New Alliance", points: 3, sortOrder: 7 },
      { category: "Strategy", name: "Targeted by Alliance", points: -1, sortOrder: 8 },
      { category: "Strategy", name: "Made Final 3 Deal", points: 2, sortOrder: 9 },
      { category: "Strategy", name: "Broke Final 3 Deal", points: -2, sortOrder: 10 },
      { category: "Strategy", name: "Orchestrated Blindside", points: 8, sortOrder: 11 },
      { category: "Strategy", name: "Won Auction Advantage", points: 3, sortOrder: 12 },
      { category: "Strategy", name: "Used Advantage Successfully", points: 5, sortOrder: 13 },
      { category: "Strategy", name: "Advantage Expired Unused", points: -3, sortOrder: 14 },
      { category: "Strategy", name: "Fake Idol Created", points: 3, sortOrder: 15 },
      { category: "Strategy", name: "Fell for Fake Idol", points: -5, sortOrder: 16 },
      { category: "Strategy", name: "Information Leaked", points: -2, sortOrder: 17 },
      { category: "Strategy", name: "Controlled the Vote", points: 5, sortOrder: 18 },
      { category: "Strategy", name: "On Wrong Side of Vote", points: -2, sortOrder: 19 },
      { category: "Strategy", name: "Swing Vote", points: 4, sortOrder: 20 },

      // SOCIAL (15 rules)
      { category: "Social", name: "Mentioned in Confessional (Positive)", points: 1, sortOrder: 1 },
      { category: "Social", name: "Mentioned in Confessional (Negative)", points: -1, sortOrder: 2 },
      { category: "Social", name: "Crying Scene", points: 1, sortOrder: 3 },
      { category: "Social", name: "Gave Inspiring Speech", points: 2, sortOrder: 4 },
      { category: "Social", name: "Personal Story Shared", points: 2, sortOrder: 5 },
      { category: "Social", name: "Conflict with Tribemate", points: -2, sortOrder: 6 },
      { category: "Social", name: "Resolved Conflict", points: 2, sortOrder: 7 },
      { category: "Social", name: "Caught in Lie", points: -3, sortOrder: 8 },
      { category: "Social", name: "Successful Lie", points: 2, sortOrder: 9 },
      { category: "Social", name: "Comforted Another Player", points: 1, sortOrder: 10 },
      { category: "Social", name: "Public Target", points: -2, sortOrder: 11 },
      { category: "Social", name: "Under the Radar", points: 1, sortOrder: 12 },
      { category: "Social", name: "Camp Leader", points: 2, sortOrder: 13 },
      { category: "Social", name: "Lazy at Camp", points: -2, sortOrder: 14 },
      { category: "Social", name: "Showmance", points: 1, sortOrder: 15 },

      // CAMP LIFE (10 rules)
      { category: "Camp", name: "Made Fire", points: 2, sortOrder: 1 },
      { category: "Camp", name: "Failed Fire Attempt", points: -1, sortOrder: 2 },
      { category: "Camp", name: "Caught Fish", points: 2, sortOrder: 3 },
      { category: "Camp", name: "Found Food", points: 1, sortOrder: 4 },
      { category: "Camp", name: "Cooked Meal", points: 1, sortOrder: 5 },
      { category: "Camp", name: "Built Shelter Improvement", points: 2, sortOrder: 6 },
      { category: "Camp", name: "Got Sick", points: -2, sortOrder: 7 },
      { category: "Camp", name: "Injured at Camp", points: -2, sortOrder: 8 },
      { category: "Camp", name: "Medical Visit", points: -1, sortOrder: 9 },
      { category: "Camp", name: "Medical Evacuation", points: -20, sortOrder: 10 },

      // CONFESSIONALS (10 rules)
      { category: "Confessional", name: "Opening Confessional", points: 3, sortOrder: 1 },
      { category: "Confessional", name: "Closing Confessional", points: 2, sortOrder: 2 },
      { category: "Confessional", name: "Strategic Confessional", points: 1, sortOrder: 3 },
      { category: "Confessional", name: "Emotional Confessional", points: 1, sortOrder: 4 },
      { category: "Confessional", name: "Funny Confessional", points: 1, sortOrder: 5 },
      { category: "Confessional", name: "Winner Edit Moment", points: 3, sortOrder: 6 },
      { category: "Confessional", name: "Villain Edit Moment", points: 2, sortOrder: 7 },
      { category: "Confessional", name: "Hero Edit Moment", points: 2, sortOrder: 8 },
      { category: "Confessional", name: "Invisible Edit (No Confessional)", points: -2, sortOrder: 9 },
      { category: "Confessional", name: "Narrator of Episode", points: 4, sortOrder: 10 },

      // FINALE (15 rules)
      { category: "Finale", name: "Made Final Tribal Council", points: 20, sortOrder: 1 },
      { category: "Finale", name: "Sole Survivor", points: 50, sortOrder: 2 },
      { category: "Finale", name: "Runner Up", points: 25, sortOrder: 3 },
      { category: "Finale", name: "Second Runner Up", points: 15, sortOrder: 4 },
      { category: "Finale", name: "Jury Member", points: 5, sortOrder: 5 },
      { category: "Finale", name: "Received Jury Vote", points: 3, sortOrder: 6 },
      { category: "Finale", name: "Unanimous Winner", points: 10, sortOrder: 7 },
      { category: "Finale", name: "Zero Jury Votes", points: -5, sortOrder: 8 },
      { category: "Finale", name: "Best Final Tribal Performance", points: 5, sortOrder: 9 },
      { category: "Finale", name: "Worst Final Tribal Performance", points: -3, sortOrder: 10 },
      { category: "Finale", name: "Made Fire in Finale", points: 5, sortOrder: 11 },
      { category: "Finale", name: "Immunity Run to End", points: 10, sortOrder: 12 },
      { category: "Finale", name: "Fan Favorite Award", points: 10, sortOrder: 13 },
      { category: "Finale", name: "Sprint Award", points: 5, sortOrder: 14 },
      { category: "Finale", name: "Best Player Never Won", points: 5, sortOrder: 15 },

      // SPECIAL (5 rules)
      { category: "Special", name: "Quit the Game", points: -25, sortOrder: 1 },
      { category: "Special", name: "Removed from Game", points: -25, sortOrder: 2 },
      { category: "Special", name: "Returned from Edge/Redemption", points: 10, sortOrder: 3 },
      { category: "Special", name: "Won Journey Challenge", points: 5, sortOrder: 4 },
      { category: "Special", name: "Shot in the Dark Successful", points: 15, sortOrder: 5 },
    ];

    await prisma.scoringRule.createMany({ data: rules });

    res.json({ success: true, message: `Created ${rules.length} scoring rules` });
  } catch (error) {
    logger.error("Failed to seed rules:", error);
    res.status(500).json({ error: "Failed to seed rules" });
  }
});

export default router;
