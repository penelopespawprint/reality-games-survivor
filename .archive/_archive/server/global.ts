// @ts-nocheck
import { createLogger, logError } from "./logger.js";
const logger = createLogger("global");
import { Router, Request, Response } from 'express';
import prisma from './prisma.js';
import { authenticate } from './middleware.js';

const router = Router();

// GET /api/global/standings and /api/global/leaderboard - Get global standings across all leagues
// Both endpoints return the same data for mobile/web compatibility
router.get(['/standings', '/leaderboard'], authenticate, async (req: Request, res: Response) => {
  try {
    // Get all users who are in at least one league
    const users = await prisma.user.findMany({
      where: {
        leagueMemberships: {
          some: {
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        city: true,
        state: true,
      },
    });

    // Get all scores across all leagues
    const allScores = await prisma.score.findMany({
      include: {
        week: {
          select: {
            weekNumber: true,
          },
        },
        league: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    // Calculate total points per user across ALL leagues
    const userPoints = users.map(user => {
      const userScores = allScores.filter(s => s.userId === user.id);
      const totalPoints = userScores.reduce((sum, s) => sum + s.points, 0);

      // Group scores by league
      const leagueBreakdown = userScores.reduce((acc, score) => {
        if (!score.league) return acc;

        if (!acc[score.league.id]) {
          acc[score.league.id] = {
            leagueId: score.league.id,
            leagueName: score.league.name,
            leagueType: score.league.type,
            points: 0,
          };
        }
        acc[score.league.id].points += score.points;
        return acc;
      }, {} as Record<string, any>);

      return {
        userId: user.id,
        name: user.displayName || user.name,
        city: user.city,
        state: user.state,
        totalPoints,
        leaguesParticipated: Object.keys(leagueBreakdown).length,
        leagueBreakdown: Object.values(leagueBreakdown),
      };
    });

    // Sort by total points descending
    userPoints.sort((a, b) => b.totalPoints - a.totalPoints);

    // Add ranks
    const standings = userPoints.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));

    res.json({
      standings,
      totalPlayers: standings.length,
    });
  } catch (error) {
    logger.error('Error fetching global standings:', error);
    res.status(500).json({ error: 'Failed to fetch global standings' });
  }
});

// GET /api/global/stats - Get global statistics
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const [
      totalLeagues,
      totalOfficialLeagues,
      totalCustomLeagues,
      totalActivePlayers,
      totalPicks,
    ] = await Promise.all([
      prisma.league.count(),
      prisma.league.count({ where: { type: 'OFFICIAL' } }),
      prisma.league.count({ where: { type: 'CUSTOM' } }),
      prisma.leagueMembership.count({ where: { isActive: true } }),
      prisma.pick.count(),
    ]);

    // Get most active leagues
    const mostActiveLeagues = await prisma.league.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        type: true,
        currentPlayers: true,
        maxPlayers: true,
      },
      orderBy: {
        currentPlayers: 'desc',
      },
      take: 10,
    });

    res.json({
      stats: {
        totalLeagues,
        totalOfficialLeagues,
        totalCustomLeagues,
        totalActivePlayers,
        totalPicks,
        mostActiveLeagues,
      },
    });
  } catch (error) {
    logger.error('Error fetching global stats:', error);
    res.status(500).json({ error: 'Failed to fetch global stats' });
  }
});

export default router;
