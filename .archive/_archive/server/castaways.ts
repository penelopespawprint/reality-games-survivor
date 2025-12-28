// @ts-nocheck
import express from "express";
import { createLogger, logError } from "./logger.js";
const logger = createLogger("castaways");
import prisma from "./prisma.js";
import { withSeasonContext } from "./middleware.js";

const router = express.Router();

// Apply season context to all routes
router.use(withSeasonContext);

// GET all castaways for current/specified season
// Use ?season=49 or ?season=50 to specify
router.get("/", async (req, res) => {
  try {
    let seasonId: string | undefined;

    // If specific season requested via query
    if (req.query.season) {
      const season = await prisma.season.findUnique({
        where: { number: parseInt(req.query.season as string) },
      });
      seasonId = season?.id;
    } else {
      // Use season from context (active season)
      seasonId = (req as any).season?.id;
    }

    const castaways = await prisma.castaway.findMany({
      where: seasonId ? { seasonId } : undefined,
      include: {
        season: {
          select: {
            number: true,
            name: true,
          },
        },
      },
      orderBy: [
        { number: "asc" },
        { name: "asc" },
      ],
    });

    // Add season info to response
    const season = (req as any).season;
    res.json({
      castaways,
      season: season ? {
        id: season.id,
        number: season.number,
        name: season.name,
      } : null,
    });
  } catch (error) {
    logger.error("Error fetching castaways:", error);
    res.status(500).json({ error: "Failed to fetch castaways" });
  }
});

// GET single castaway
router.get("/:id", async (req, res) => {
  try {
    const c = await prisma.castaway.findUnique({ where: { id: req.params.id } });
    if (!c) return res.status(404).json({ error: "Castaway not found" });
    res.json(c);
  } catch (error) {
    logger.error("Error fetching castaway:", error);
    res.status(500).json({ error: "Failed to fetch castaway" });
  }
});

// GET castaway weekly results
router.get("/:id/weekly-results", async (req, res) => {
  try {
    const results = await prisma.weeklyResult.findMany({
      where: { castawayId: req.params.id },
      select: {
        weekNumber: true,
        points: true
      },
      orderBy: { weekNumber: "asc" }
    });
    res.json(results);
  } catch (error) {
    logger.error("Error fetching weekly results:", error);
    res.status(500).json({ error: "Failed to fetch weekly results" });
  }
});

// GET castaway owner (which player drafted this castaway)
router.get("/:id/owner", async (req, res) => {
  try {
    const draftPick = await prisma.draftPick.findFirst({
      where: { castawayId: req.params.id },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!draftPick) {
      return res.json(null);
    }

    res.json(draftPick.user);
  } catch (error) {
    logger.error("Error fetching owner:", error);
    res.status(500).json({ error: "Failed to fetch owner" });
  }
});

// ADMIN: Add castaway (if needed)
// router.post("/", ...)

export default router;
