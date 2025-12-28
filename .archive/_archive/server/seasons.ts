// @ts-nocheck
/**
 * Season Routes
 *
 * Handles multi-season support for Survivor Fantasy
 *
 * Public endpoints:
 *   GET /api/seasons - List all seasons
 *   GET /api/seasons/active - Get current active season
 *   GET /api/seasons/:number - Get season by number
 *
 * Admin endpoints:
 *   POST /api/seasons - Create a new season
 *   PUT /api/seasons/:number - Update season details
 *   POST /api/seasons/:number/transition - Trigger season state transition
 */

import { Router, Request, Response } from 'express';
import prisma from './prisma.js';
import { authenticate, requireAdmin } from './middleware.js';
import { SeasonStatus } from '@prisma/client';
import { createLogger, logError } from "./logger.js";

const logger = createLogger("seasons");

const router = Router();

// =============================================================================
// PUBLIC ENDPOINTS
// =============================================================================

/**
 * GET /api/seasons
 * List all seasons (most recent first)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const seasons = await prisma.season.findMany({
      orderBy: { number: 'desc' },
      select: {
        id: true,
        number: true,
        name: true,
        status: true,
        isActive: true,
        rankingsOpen: true,
        seasonLocked: true,
        episode1Date: true,
        episode2Date: true,
        finaleDate: true,
        _count: {
          select: {
            leagues: true,
            castaways: true,
          },
        },
      },
    });

    res.json(seasons);
  } catch (error) {
    logger.error('Error fetching seasons:', error);
    res.status(500).json({ error: 'Failed to fetch seasons' });
  }
});

/**
 * GET /api/seasons/active
 * Get the current active season with full details
 */
router.get('/active', async (req: Request, res: Response) => {
  try {
    const activeSeason = await prisma.season.findFirst({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            leagues: true,
            castaways: true,
            weeks: true,
          },
        },
      },
    });

    if (!activeSeason) {
      // Fall back to most recent season
      const latestSeason = await prisma.season.findFirst({
        orderBy: { number: 'desc' },
        include: {
          _count: {
            select: {
              leagues: true,
              castaways: true,
              weeks: true,
            },
          },
        },
      });

      if (!latestSeason) {
        return res.status(404).json({ error: 'No seasons found' });
      }

      return res.json(latestSeason);
    }

    res.json(activeSeason);
  } catch (error) {
    logger.error('Error fetching active season:', error);
    res.status(500).json({ error: 'Failed to fetch active season' });
  }
});

/**
 * GET /api/seasons/collecting
 * Get seasons that are in COLLECTING status (accepting signups for Season 50)
 */
router.get('/collecting', async (req: Request, res: Response) => {
  try {
    const collectingSeasons = await prisma.season.findMany({
      where: { status: 'COLLECTING' },
      orderBy: { number: 'asc' },
      include: {
        _count: {
          select: {
            leagues: true,
          },
        },
      },
    });

    res.json(collectingSeasons);
  } catch (error) {
    logger.error('Error fetching collecting seasons:', error);
    res.status(500).json({ error: 'Failed to fetch collecting seasons' });
  }
});

/**
 * GET /api/seasons/:number
 * Get a specific season by number with full details
 */
router.get('/:number', async (req: Request, res: Response) => {
  try {
    const seasonNumber = parseInt(req.params.number, 10);

    if (isNaN(seasonNumber)) {
      return res.status(400).json({ error: 'Invalid season number' });
    }

    const season = await prisma.season.findUnique({
      where: { number: seasonNumber },
      include: {
        castaways: {
          orderBy: { number: 'asc' },
          select: {
            id: true,
            name: true,
            number: true,
            tribe: true,
            eliminated: true,
            eliminatedWeek: true,
            imageUrl: true,
          },
        },
        weeks: {
          orderBy: { weekNumber: 'asc' },
          select: {
            id: true,
            weekNumber: true,
            isActive: true,
            picksOpenAt: true,
            picksCloseAt: true,
          },
        },
        _count: {
          select: {
            leagues: true,
            picks: true,
            scores: true,
          },
        },
      },
    });

    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }

    res.json(season);
  } catch (error) {
    logger.error('Error fetching season:', error);
    res.status(500).json({ error: 'Failed to fetch season' });
  }
});

// =============================================================================
// ADMIN ENDPOINTS
// =============================================================================

/**
 * POST /api/seasons
 * Create a new season (admin only)
 */
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      number,
      name,
      episode1Date,
      draftDeadline,
      episode2Date,
      finaleDate,
    } = req.body;

    if (!number || !name) {
      return res.status(400).json({ error: 'Season number and name are required' });
    }

    // Check if season already exists
    const existing = await prisma.season.findUnique({ where: { number } });
    if (existing) {
      return res.status(409).json({ error: `Season ${number} already exists` });
    }

    const season = await prisma.season.create({
      data: {
        number,
        name,
        status: 'COLLECTING',
        isActive: false,
        rankingsOpen: false,
        draftExecuted: false,
        seasonLocked: false,
        episode1Date: episode1Date ? new Date(episode1Date) : null,
        draftDeadline: draftDeadline ? new Date(draftDeadline) : null,
        episode2Date: episode2Date ? new Date(episode2Date) : null,
        finaleDate: finaleDate ? new Date(finaleDate) : null,
      },
    });

    res.status(201).json(season);
  } catch (error) {
    logger.error('Error creating season:', error);
    res.status(500).json({ error: 'Failed to create season' });
  }
});

/**
 * PUT /api/seasons/:number
 * Update season details (admin only)
 */
router.put('/:number', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const seasonNumber = parseInt(req.params.number, 10);

    if (isNaN(seasonNumber)) {
      return res.status(400).json({ error: 'Invalid season number' });
    }

    const {
      name,
      episode1Date,
      draftDeadline,
      episode2Date,
      finaleDate,
      archiveDate,
    } = req.body;

    const season = await prisma.season.update({
      where: { number: seasonNumber },
      data: {
        ...(name && { name }),
        ...(episode1Date !== undefined && { episode1Date: episode1Date ? new Date(episode1Date) : null }),
        ...(draftDeadline !== undefined && { draftDeadline: draftDeadline ? new Date(draftDeadline) : null }),
        ...(episode2Date !== undefined && { episode2Date: episode2Date ? new Date(episode2Date) : null }),
        ...(finaleDate !== undefined && { finaleDate: finaleDate ? new Date(finaleDate) : null }),
        ...(archiveDate !== undefined && { archiveDate: archiveDate ? new Date(archiveDate) : null }),
      },
    });

    res.json(season);
  } catch (error) {
    logger.error('Error updating season:', error);
    res.status(500).json({ error: 'Failed to update season' });
  }
});

/**
 * POST /api/seasons/:number/transition
 * Trigger a season state transition (admin only)
 *
 * Valid transitions:
 *   COLLECTING -> DRAFT_WEEK (opens rankings)
 *   DRAFT_WEEK -> ACTIVE (locks season, starts scoring)
 *   ACTIVE -> GRACE (finale aired)
 *   GRACE -> ARCHIVED (read-only)
 */
router.post('/:number/transition', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const seasonNumber = parseInt(req.params.number, 10);
    const { targetStatus } = req.body;

    if (isNaN(seasonNumber)) {
      return res.status(400).json({ error: 'Invalid season number' });
    }

    if (!targetStatus || !['COLLECTING', 'DRAFT_WEEK', 'ACTIVE', 'GRACE', 'ARCHIVED'].includes(targetStatus)) {
      return res.status(400).json({ error: 'Invalid target status' });
    }

    const season = await prisma.season.findUnique({ where: { number: seasonNumber } });
    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }

    // Validate transition
    const validTransitions: Record<SeasonStatus, SeasonStatus[]> = {
      COLLECTING: ['DRAFT_WEEK'],
      DRAFT_WEEK: ['ACTIVE'],
      ACTIVE: ['GRACE'],
      GRACE: ['ARCHIVED'],
      ARCHIVED: [],
    };

    if (!validTransitions[season.status].includes(targetStatus as SeasonStatus)) {
      return res.status(400).json({
        error: `Invalid transition from ${season.status} to ${targetStatus}`,
        validTransitions: validTransitions[season.status],
      });
    }

    // Determine state flags based on target status
    let updateData: any = { status: targetStatus as SeasonStatus };

    switch (targetStatus) {
      case 'DRAFT_WEEK':
        updateData.rankingsOpen = true;
        break;
      case 'ACTIVE':
        updateData.seasonLocked = true;
        updateData.draftExecuted = true;
        // If this is becoming active, deactivate other seasons
        await prisma.season.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });
        updateData.isActive = true;
        break;
      case 'GRACE':
        // No additional flags
        break;
      case 'ARCHIVED':
        updateData.isActive = false;
        break;
    }

    const updatedSeason = await prisma.season.update({
      where: { number: seasonNumber },
      data: updateData,
    });

    res.json({
      message: `Season ${seasonNumber} transitioned from ${season.status} to ${targetStatus}`,
      season: updatedSeason,
    });
  } catch (error) {
    logger.error('Error transitioning season:', error);
    res.status(500).json({ error: 'Failed to transition season' });
  }
});

/**
 * POST /api/seasons/:number/set-active
 * Set a season as the active season (admin only)
 */
router.post('/:number/set-active', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const seasonNumber = parseInt(req.params.number, 10);

    if (isNaN(seasonNumber)) {
      return res.status(400).json({ error: 'Invalid season number' });
    }

    // Deactivate all seasons
    await prisma.season.updateMany({
      data: { isActive: false },
    });

    // Activate the specified season
    const season = await prisma.season.update({
      where: { number: seasonNumber },
      data: { isActive: true },
    });

    res.json({
      message: `Season ${seasonNumber} is now the active season`,
      season,
    });
  } catch (error) {
    logger.error('Error setting active season:', error);
    res.status(500).json({ error: 'Failed to set active season' });
  }
});

export default router;
