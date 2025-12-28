// @ts-nocheck
import { createLogger, logError } from "./logger.js";
const logger = createLogger("waitlist");
import { Router } from "express";
import { z } from "zod";
import prisma from "./prisma.js";
import { sendWaitlistConfirmationEmail, addToWaitlistAudience } from "./email.js";

const router = Router();

// Validation schema
const waitlistSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  source: z.string().optional(), // web, mobile, referral
  referralCode: z.string().optional(),
});

/**
 * POST /api/waitlist/join
 * Join the waitlist for the next season (PENDING status)
 */
router.post("/join", async (req, res) => {
  try {
    const data = waitlistSchema.parse(req.body);

    // Find season in PENDING or COLLECTING status
    const targetSeason = await prisma.season.findFirst({
      where: {
        OR: [
          { status: "COLLECTING" },
          { leagues: { some: { status: "PENDING" } } }
        ]
      },
      orderBy: { number: "desc" }
    });

    if (!targetSeason) {
      return res.status(400).json({
        error: "No upcoming season available for waitlist"
      });
    }

    // Find the official league for this season
    const officialLeague = await prisma.league.findFirst({
      where: {
        seasonId: targetSeason.id,
        type: "OFFICIAL"
      }
    });

    // Check if already on waitlist
    const existing = await prisma.waitlist.findFirst({
      where: {
        email: data.email.toLowerCase(),
        seasonId: targetSeason.id
      }
    });

    if (existing) {
      return res.status(409).json({
        error: "Already on waitlist",
        position: await getWaitlistPosition(existing.id, targetSeason.id)
      });
    }

    // Handle referral
    let referredBy: string | null = null;
    if (data.referralCode) {
      const referrer = await prisma.waitlist.findFirst({
        where: { id: data.referralCode }
      });
      if (referrer) {
        referredBy = referrer.id;
      }
    }

    // Create waitlist entry
    const entry = await prisma.waitlist.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        phone: data.phone,
        source: data.source || "web",
        referredBy,
        seasonId: targetSeason.id,
        leagueId: officialLeague?.id
      }
    });

    // Get position
    const position = await getWaitlistPosition(entry.id, targetSeason.id);
    const baseUrl = process.env.CLIENT_URL || "https://realitygamesfantasyleague.com";
    const referralLink = `${baseUrl}/join?ref=${entry.id}`;

    // Send confirmation email (async, don't block response)
    sendWaitlistConfirmationEmail(
      entry.email,
      entry.name,
      position,
      referralLink,
      targetSeason.name
    ).catch((err) => logger.error("Failed to send waitlist email:", err));

    // Add to Resend "Season 50 Launch Waitlist" audience for drip campaign
    // This enables automated email sequences via Resend Broadcasts
    const nameParts = entry.name?.split(" ") || [];
    addToWaitlistAudience(
      entry.email,
      nameParts[0] || null,
      nameParts.slice(1).join(" ") || null
    ).catch((err) => logger.error("Failed to add to waitlist audience:", err));

    res.status(201).json({
      success: true,
      message: `You're on the waitlist for Season ${targetSeason.number}!`,
      entry: {
        id: entry.id,
        email: entry.email,
        position,
        seasonNumber: targetSeason.number,
        seasonName: targetSeason.name,
        referralCode: entry.id, // Their unique referral code
        referralLink
      }
    });
  } catch (error: any) {
    logger.error("Waitlist join error:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    res.status(500).json({ error: "Failed to join waitlist" });
  }
});

/**
 * GET /api/waitlist/status/:email
 * Check waitlist status for an email
 */
router.get("/status/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const entry = await prisma.waitlist.findFirst({
      where: { email: email.toLowerCase() },
      include: {
        season: { select: { number: true, name: true, status: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!entry) {
      return res.status(404).json({ error: "Not found on waitlist" });
    }

    const position = await getWaitlistPosition(entry.id, entry.seasonId!);
    const referralCount = await prisma.waitlist.count({
      where: { referredBy: entry.id }
    });

    const baseUrl = process.env.CLIENT_URL || "https://realitygamesfantasyleague.com";
    res.json({
      email: entry.email,
      name: entry.name,
      position,
      referralCode: entry.id,
      referralCount,
      referralLink: `${baseUrl}/join?ref=${entry.id}`,
      season: entry.season,
      notified: entry.notified,
      joinedAt: entry.createdAt
    });
  } catch (error) {
    logger.error("Waitlist status error:", error);
    res.status(500).json({ error: "Failed to check waitlist status" });
  }
});

/**
 * GET /api/waitlist/count
 * Get total waitlist count for upcoming season
 */
router.get("/count", async (req, res) => {
  try {
    // Find the next upcoming season (COLLECTING status)
    const targetSeason = await prisma.season.findFirst({
      where: { status: "COLLECTING" },
      orderBy: { number: "desc" }
    });

    if (!targetSeason) {
      return res.json({ count: 0, seasonNumber: null });
    }

    const count = await prisma.waitlist.count({
      where: { seasonId: targetSeason.id }
    });

    res.json({
      count,
      seasonNumber: targetSeason.number,
      seasonName: targetSeason.name
    });
  } catch (error) {
    logger.error("Waitlist count error:", error);
    res.status(500).json({ error: "Failed to get waitlist count" });
  }
});

/**
 * GET /api/waitlist/leaderboard
 * Top referrers leaderboard
 */
router.get("/leaderboard", async (req, res) => {
  try {
    const targetSeason = await prisma.season.findFirst({
      where: { status: "COLLECTING" },
      orderBy: { number: "desc" }
    });

    if (!targetSeason) {
      return res.json({ leaderboard: [] });
    }

    // Get referral counts
    const referrals = await prisma.waitlist.groupBy({
      by: ["referredBy"],
      where: {
        seasonId: targetSeason.id,
        referredBy: { not: null }
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10
    });

    // Get referrer details
    const referrerIds = referrals.map(r => r.referredBy).filter(Boolean) as string[];
    const referrers = await prisma.waitlist.findMany({
      where: { id: { in: referrerIds } },
      select: { id: true, name: true, email: true }
    });

    const leaderboard = referrals.map(r => {
      const referrer = referrers.find(ref => ref.id === r.referredBy);
      return {
        name: referrer?.name || referrer?.email?.split("@")[0] || "Anonymous",
        referralCount: r._count.id
      };
    });

    res.json({ leaderboard, seasonNumber: targetSeason.number });
  } catch (error) {
    logger.error("Waitlist leaderboard error:", error);
    res.status(500).json({ error: "Failed to get leaderboard" });
  }
});

// Helper function
async function getWaitlistPosition(entryId: string, seasonId: string): Promise<number> {
  const entry = await prisma.waitlist.findUnique({
    where: { id: entryId },
    select: { createdAt: true }
  });

  if (!entry) return 0;

  const position = await prisma.waitlist.count({
    where: {
      seasonId,
      createdAt: { lte: entry.createdAt }
    }
  });

  return position;
}

export default router;
