// @ts-nocheck
import { createLogger, logError } from "./logger.js";
const logger = createLogger("league-scoped");
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from './prisma.js';
import { authenticate } from './middleware.js';

const router = Router();

// Middleware to verify league membership
const requireLeagueMembership = async (req: Request, res: Response, next: Function) => {
  try {
    const { leagueId } = req.params;

    const membership = await prisma.leagueMembership.findFirst({
      where: {
        userId: req.user!.id,
        leagueId,
        isActive: true,
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this league' });
    }

    // Attach membership to request for later use
    (req as any).leagueMembership = membership;
    next();
  } catch (error) {
    logger.error('Error checking league membership:', error);
    res.status(500).json({ error: 'Failed to verify membership' });
  }
};

// GET /api/leagues/:leagueId/standings - Get league standings
router.get('/:leagueId/standings', authenticate, requireLeagueMembership, async (req: Request, res: Response) => {
  try {
    const { leagueId } = req.params;

    // Get all members of the league
    const memberships = await prisma.leagueMembership.findMany({
      where: {
        leagueId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
    });

    // Get all scores for this league
    const scores = await prisma.score.findMany({
      where: {
        leagueId,
      },
      include: {
        week: {
          select: {
            weekNumber: true,
          },
        },
      },
    });

    // Calculate total points per user
    const userPoints = memberships.map(membership => {
      const userScores = scores.filter(s => s.userId === membership.userId);
      const totalPoints = userScores.reduce((sum, s) => sum + s.points, 0);

      return {
        userId: membership.user.id,
        name: membership.user.displayName || membership.user.name,
        totalPoints,
        weeklyScores: userScores.map(s => ({
          weekNumber: s.week.weekNumber,
          points: s.points,
        })).sort((a, b) => a.weekNumber - b.weekNumber),
      };
    });

    // Sort by total points descending
    userPoints.sort((a, b) => b.totalPoints - a.totalPoints);

    // Add ranks
    const standings = userPoints.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));

    res.json({ standings });
  } catch (error) {
    logger.error('Error fetching league standings:', error);
    res.status(500).json({ error: 'Failed to fetch standings' });
  }
});

// GET /api/leagues/:leagueId/picks - Get all picks for a league
router.get('/:leagueId/picks', authenticate, requireLeagueMembership, async (req: Request, res: Response) => {
  try {
    const { leagueId } = req.params;
    const { weekNumber } = req.query;

    const whereClause: any = {
      leagueId,
    };

    if (weekNumber) {
      whereClause.weekNumber = parseInt(weekNumber as string);
    }

    const picks = await prisma.pick.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
        castaway: {
          select: {
            id: true,
            name: true,
            eliminated: true,
            eliminatedWeek: true,
          },
        },
      },
      orderBy: [
        { weekNumber: 'desc' },
        { submittedAt: 'asc' },
      ],
    });

    res.json({ picks });
  } catch (error) {
    logger.error('Error fetching league picks:', error);
    res.status(500).json({ error: 'Failed to fetch picks' });
  }
});

// POST /api/leagues/:leagueId/picks - Submit a pick for a league
router.post('/:leagueId/picks', authenticate, requireLeagueMembership, async (req: Request, res: Response) => {
  try {
    const { leagueId } = req.params;
    const { castawayId, weekNumber } = req.body;

    if (!castawayId || !weekNumber) {
      return res.status(400).json({ error: 'castawayId and weekNumber required' });
    }

    // Get the active week
    const week = await prisma.week.findFirst({
      where: { weekNumber },
    });

    if (!week) {
      return res.status(404).json({ error: 'Week not found' });
    }

    // Check if picks are still open
    if (week.picksCloseAt && new Date() > week.picksCloseAt) {
      return res.status(400).json({ error: 'Picks are closed for this week' });
    }

    // Check if castaway exists and is not eliminated
    const castaway = await prisma.castaway.findUnique({
      where: { id: castawayId },
    });

    if (!castaway) {
      return res.status(404).json({ error: 'Castaway not found' });
    }

    if (castaway.eliminated && castaway.eliminatedWeek && castaway.eliminatedWeek <= weekNumber) {
      return res.status(400).json({ error: 'Cannot pick eliminated castaway' });
    }

    // Check if user has already picked for this week in this league
    const existingPick = await prisma.pick.findFirst({
      where: {
        userId: req.user!.id,
        leagueId,
        weekNumber,
      },
    });

    if (existingPick) {
      // Update existing pick
      const updatedPick = await prisma.pick.update({
        where: { id: existingPick.id },
        data: {
          castawayId,
          submittedAt: new Date(),
        },
        include: {
          castaway: true,
        },
      });

      return res.json({
        message: 'Pick updated successfully',
        pick: updatedPick,
      });
    }

    // Create new pick
    const pick = await prisma.pick.create({
      data: {
        userId: req.user!.id,
        leagueId,
        weekNumber,
        weekId: week.id,
        castawayId,
        submittedAt: new Date(),
      },
      include: {
        castaway: true,
      },
    });

    res.json({
      message: 'Pick submitted successfully',
      pick,
    });
  } catch (error) {
    logger.error('Error submitting pick:', error);
    res.status(500).json({ error: 'Failed to submit pick' });
  }
});

// GET /api/leagues/:leagueId/draft - Get draft results for a league
router.get('/:leagueId/draft', authenticate, requireLeagueMembership, async (req: Request, res: Response) => {
  try {
    const { leagueId } = req.params;

    const draftPicks = await prisma.draftPick.findMany({
      where: {
        leagueId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
        castaway: {
          select: {
            id: true,
            name: true,
            tribe: true,
            eliminated: true,
            eliminatedWeek: true,
          },
        },
      },
      orderBy: [
        { round: 'asc' },
        { pickNumber: 'asc' },
      ],
    });

    // Group by round
    const draftByRound = draftPicks.reduce((acc, pick) => {
      if (!acc[pick.round]) {
        acc[pick.round] = [];
      }
      acc[pick.round].push({
        userId: pick.user.id,
        userName: pick.user.displayName || pick.user.name,
        castawayId: pick.castaway.id,
        castawayName: pick.castaway.name,
        tribe: pick.castaway.tribe,
        eliminated: pick.castaway.eliminated,
        eliminatedWeek: pick.castaway.eliminatedWeek,
        pickNumber: pick.pickNumber,
        assignedAt: pick.assignedAt,
      });
      return acc;
    }, {} as Record<number, any[]>);

    res.json({
      draftPicks: draftByRound,
      totalPicks: draftPicks.length,
    });
  } catch (error) {
    logger.error('Error fetching draft results:', error);
    res.status(500).json({ error: 'Failed to fetch draft results' });
  }
});

// GET /api/leagues/:leagueId/my-castaways - Get user's drafted castaways for a league
router.get('/:leagueId/my-castaways', authenticate, requireLeagueMembership, async (req: Request, res: Response) => {
  try {
    const { leagueId } = req.params;

    const draftPicks = await prisma.draftPick.findMany({
      where: {
        leagueId,
        userId: req.user!.id,
      },
      include: {
        castaway: true,
      },
      orderBy: {
        round: 'asc',
      },
    });

    const castaways = draftPicks.map(pick => ({
      ...pick.castaway,
      draftRound: pick.round,
      draftPickNumber: pick.pickNumber,
      assignedAt: pick.assignedAt,
    }));

    res.json({ castaways });
  } catch (error) {
    logger.error('Error fetching user castaways:', error);
    res.status(500).json({ error: 'Failed to fetch castaways' });
  }
});

export default router;
