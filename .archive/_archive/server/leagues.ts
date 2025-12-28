// @ts-nocheck
import { createLogger, logError } from "./logger.js";
const logger = createLogger("leagues");
import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from './prisma.js';
import { authenticate, withSeasonContext } from './middleware.js';
import bcrypt from 'bcryptjs';
import { sendLeagueInviteEmail } from './email.js';
import { AuthenticatedRequest, isPrismaError, isZodError, getErrorMessage } from './types.js';

const router = Router();

// Apply season context to all routes
router.use(withSeasonContext);

// Validation schemas
const createLeagueSchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().max(200).optional(),
  maxPlayers: z.number().min(8).max(12),
  isPasswordProtected: z.boolean(),
  password: z.string().min(6).optional(),
  seasonNumber: z.number().optional(), // Optional: specify which season
  // Paid league / charity fields
  entryFee: z.number().min(0).max(50).optional(),
  charityEnabled: z.boolean().optional(),
  charityPercentage: z.number().min(50).max(100).optional(),
});

// Helper to get target season for league creation
async function getTargetSeasonForLeague(req: AuthenticatedRequest): Promise<string | null> {
  // 1. If specific season requested in body
  const requestedSeasonNumber = req.body.seasonNumber;
  if (requestedSeasonNumber) {
    const season = await prisma.season.findUnique({ where: { number: requestedSeasonNumber } });
    if (season && !season.seasonLocked) {
      return season.id;
    }
  }

  // 2. Prefer COLLECTING season (e.g., Season 50 for signups)
  const collectingSeason = await prisma.season.findFirst({
    where: { status: 'COLLECTING' },
    orderBy: { number: 'asc' },
  });
  if (collectingSeason) {
    return collectingSeason.id;
  }

  // 3. Fall back to DRAFT_WEEK season (still accepting leagues)
  const draftWeekSeason = await prisma.season.findFirst({
    where: { status: 'DRAFT_WEEK', seasonLocked: false },
    orderBy: { number: 'desc' },
  });
  if (draftWeekSeason) {
    return draftWeekSeason.id;
  }

  // 4. Use season from context (active season)
  return req.season?.id || null;
}

const joinLeagueSchema = z.object({
  code: z.string(),
  password: z.string().optional(),
});

/**
 * Generate unique league code with random suffix to prevent race conditions
 * Format: NAME-TIMESTAMP-RANDOM (e.g., SURV-KJ5F2-X7A)
 */
function generateLeagueCode(name: string): string {
  const prefix = name.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  const timestamp = Date.now().toString(36).toUpperCase().slice(-5);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// POST /api/leagues/create - Create a custom league
router.post('/create', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      description,
      maxPlayers,
      isPasswordProtected,
      password,
      entryFee,
      charityEnabled,
      charityPercentage,
    } = createLeagueSchema.parse(req.body);

    if (isPasswordProtected && !password) {
      return res.status(400).json({ error: 'Password required for protected leagues' });
    }

    // Get target season for this league
    const seasonId = await getTargetSeasonForLeague(req);
    if (!seasonId) {
      return res.status(400).json({ error: 'No season available for league creation' });
    }

    // Get season info for response
    const season = await prisma.season.findUnique({ where: { id: seasonId } });

    // Hash password if provided
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    // Create league with retry for code collision (race condition protection)
    let league = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (!league && attempts < maxAttempts) {
      attempts++;
      const code = generateLeagueCode(name);

      try {
        league = await prisma.league.create({
          data: {
            name,
            code,
            type: 'CUSTOM',
            description,
            maxPlayers,
            currentPlayers: 1, // Creator is first member
            status: 'OPEN',
            isPasswordProtected,
            password: hashedPassword,
            createdBy: req.user!.id,
            picksPerUser: 2,
            seasonId, // Attach to season
            // Paid league / charity fields
            entryFee: entryFee || 0,
            charityEnabled: charityEnabled || false,
            charityPercentage: charityEnabled ? (charityPercentage || 100) : null,
            memberships: {
              create: {
                userId: req.user!.id,
                role: 'ADMIN',
              },
            },
          },
          include: {
            memberships: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        });
      } catch (err: unknown) {
        // P2002 is Prisma's unique constraint violation error
        if (!isPrismaError(err) || err.code !== 'P2002' || attempts >= maxAttempts) {
          throw err;
        }
        // Retry with new code on collision
      }
    }

    if (!league) {
      return res.status(500).json({ error: 'Failed to generate unique league code' });
    }

    res.json({
      message: 'League created successfully',
      league: {
        id: league.id,
        name: league.name,
        code: league.code,
        description: league.description,
        maxPlayers: league.maxPlayers,
        currentPlayers: league.currentPlayers,
        status: league.status,
        isPasswordProtected: league.isPasswordProtected,
        createdBy: league.createdBy,
        members: league.memberships,
        seasonId: league.seasonId,
        seasonNumber: season?.number,
        seasonName: season?.name,
      },
    });
  } catch (error: unknown) {
    logger.error('Error creating league:', error);
    if (isZodError(error)) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create league' });
  }
});

// POST /api/leagues/join - Join a league by code (mobile-friendly)
router.post('/join', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, password } = req.body as { code?: string; password?: string };

    if (!code) {
      return res.status(400).json({ error: 'League code is required' });
    }

    // Find league by code
    const league = await prisma.league.findFirst({
      where: { code: code.toUpperCase() },
      include: { memberships: true },
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Check if league is full
    if (league.currentPlayers >= league.maxPlayers) {
      return res.status(400).json({ error: 'League is full' });
    }

    // Check if user is already a member
    const existingMembership = league.memberships.find(m => m.userId === req.user!.id);
    if (existingMembership) {
      return res.status(400).json({ error: 'Already a member of this league' });
    }

    // Check password if protected
    if (league.isPasswordProtected) {
      if (!password) {
        return res.status(400).json({ error: 'Password required' });
      }
      const passwordMatch = await bcrypt.compare(password, league.password!);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Incorrect password' });
      }
    }

    // Add user to league with atomic race condition protection
    await prisma.$transaction(async (tx) => {
      // Atomic update: only increment if still under max
      const updated = await tx.league.updateMany({
        where: {
          id: league.id,
          currentPlayers: { lt: league.maxPlayers },
        },
        data: {
          currentPlayers: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        throw new Error('LEAGUE_FULL');
      }

      await tx.leagueMembership.create({
        data: {
          userId: req.user!.id,
          leagueId: league.id,
          role: 'MEMBER',
        },
      });

      // Update status if now full
      const updatedLeague = await tx.league.findUnique({ where: { id: league.id } });
      if (updatedLeague && updatedLeague.currentPlayers >= updatedLeague.maxPlayers) {
        await tx.league.update({
          where: { id: league.id },
          data: { status: 'FULL' },
        });
      }
    });

    res.json({
      message: 'Successfully joined league',
      league: {
        id: league.id,
        name: league.name,
        code: league.code,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'LEAGUE_FULL') {
      return res.status(400).json({ error: 'League is full' });
    }
    logger.error('Error joining league by code:', error);
    res.status(500).json({ error: 'Failed to join league' });
  }
});

// POST /api/leagues/:id/join - Join a league
router.post('/:id/join', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { code, password } = joinLeagueSchema.parse(req.body);

    // Find league by ID or code
    const league = await prisma.league.findFirst({
      where: {
        OR: [
          { id },
          { code },
        ],
      },
      include: {
        memberships: true,
      },
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Check if league is full
    if (league.currentPlayers >= league.maxPlayers) {
      return res.status(400).json({ error: 'League is full' });
    }

    // Check if user is already a member
    const existingMembership = league.memberships.find(m => m.userId === req.user!.id);
    if (existingMembership) {
      return res.status(400).json({ error: 'Already a member of this league' });
    }

    // Check password if protected
    if (league.isPasswordProtected) {
      if (!password) {
        return res.status(400).json({ error: 'Password required' });
      }
      const passwordMatch = await bcrypt.compare(password, league.password!);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Incorrect password' });
      }
    }

    // Add user to league with atomic race condition protection
    await prisma.$transaction(async (tx) => {
      // Atomic update: only increment if still under max
      const updated = await tx.league.updateMany({
        where: {
          id: league.id,
          currentPlayers: { lt: league.maxPlayers },
        },
        data: {
          currentPlayers: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        throw new Error('LEAGUE_FULL');
      }

      await tx.leagueMembership.create({
        data: {
          userId: req.user!.id,
          leagueId: league.id,
          role: 'MEMBER',
        },
      });

      // Update status if now full
      const updatedLeague = await tx.league.findUnique({ where: { id: league.id } });
      if (updatedLeague && updatedLeague.currentPlayers >= updatedLeague.maxPlayers) {
        await tx.league.update({
          where: { id: league.id },
          data: { status: 'FULL' },
        });
      }
    });

    res.json({
      message: 'Successfully joined league',
      league: {
        id: league.id,
        name: league.name,
        code: league.code,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'LEAGUE_FULL') {
      return res.status(400).json({ error: 'League is full' });
    }
    logger.error('Error joining league:', error);
    if (isZodError(error)) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to join league' });
  }
});

// GET /api/leagues/my-leagues - Get user's leagues
router.get('/my-leagues', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Optional: filter by season
    const seasonFilter = req.query.season ? { number: parseInt(req.query.season as string) } : undefined;

    const memberships = await prisma.leagueMembership.findMany({
      where: {
        userId: req.user!.id,
        isActive: true,
        ...(seasonFilter && { league: { season: seasonFilter } }),
      },
      include: {
        league: {
          include: {
            season: {
              select: {
                id: true,
                number: true,
                name: true,
                status: true,
              },
            },
            memberships: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { league: { season: { number: 'desc' } } }, // Most recent season first
        { league: { type: 'asc' } }, // OFFICIAL first
        { joinedAt: 'asc' },
      ],
    });

    const leagues = memberships.map(m => ({
      id: m.league.id,
      name: m.league.name,
      code: m.league.code,
      type: m.league.type,
      description: m.league.description,
      maxPlayers: m.league.maxPlayers,
      currentPlayers: m.league.currentPlayers,
      status: m.league.status,
      draftStatus: m.league.draftStatus,
      myRole: m.role,
      joinedAt: m.joinedAt,
      // Season info
      seasonId: m.league.seasonId,
      seasonNumber: m.league.season?.number,
      seasonName: m.league.season?.name,
      seasonStatus: m.league.season?.status,
      members: m.league.memberships.map(mem => ({
        userId: mem.user.id,
        name: mem.user.name,
        email: mem.user.email,
        role: mem.role,
        joinedAt: mem.joinedAt,
      })),
    }));

    // Group by season for easier frontend display
    const bySeason = leagues.reduce((acc, league) => {
      const key = league.seasonNumber || 'unknown';
      if (!acc[key]) acc[key] = [];
      acc[key].push(league);
      return acc;
    }, {} as Record<string | number, typeof leagues>);

    res.json({ leagues, bySeason });
  } catch (error) {
    logger.error('Error fetching user leagues:', error);
    res.status(500).json({ error: 'Failed to fetch leagues' });
  }
});

// GET /api/leagues/public - Browse open leagues
// Default: shows leagues for COLLECTING season (Season 50 signups)
// Use ?season=49 to see specific season's leagues
router.get('/public', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    let seasonId: string | undefined;

    // If specific season requested
    if (req.query.season) {
      const season = await prisma.season.findUnique({
        where: { number: parseInt(req.query.season as string) },
      });
      seasonId = season?.id;
    } else {
      // Default to COLLECTING season for signups
      const collectingSeason = await prisma.season.findFirst({
        where: { status: 'COLLECTING' },
        orderBy: { number: 'asc' },
      });
      seasonId = collectingSeason?.id || req.season?.id;
    }

    const leagues = await prisma.league.findMany({
      where: {
        type: 'CUSTOM',
        status: 'OPEN',
        isPasswordProtected: false,
        ...(seasonId && { seasonId }),
      },
      include: {
        season: {
          select: {
            number: true,
            name: true,
            status: true,
          },
        },
        memberships: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    const publicLeagues = leagues.map(league => ({
      id: league.id,
      name: league.name,
      code: league.code,
      description: league.description,
      maxPlayers: league.maxPlayers,
      currentPlayers: league.currentPlayers,
      draftStatus: league.draftStatus,
      createdAt: league.createdAt,
      isMember: league.memberships.some(m => m.userId === req.user!.id),
      seasonNumber: league.season?.number,
      seasonName: league.season?.name,
      seasonStatus: league.season?.status,
      // Payment fields
      entryFee: league.entryFee,
      charityEnabled: league.charityEnabled,
    }));

    res.json({ leagues: publicLeagues });
  } catch (error) {
    logger.error('Error fetching public leagues:', error);
    res.status(500).json({ error: 'Failed to fetch public leagues' });
  }
});

// GET /api/leagues/:code/preview - Preview league before joining (for payment flow)
router.get('/:code/preview', authenticate, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const league = await prisma.league.findFirst({
      where: { code: code.toUpperCase() },
      include: {
        season: {
          select: {
            number: true,
            name: true,
            status: true,
          },
        },
        memberships: {
          where: { userId: req.user!.id },
          select: { userId: true },
        },
      },
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    res.json({
      league: {
        id: league.id,
        name: league.name,
        code: league.code,
        description: league.description,
        maxPlayers: league.maxPlayers,
        currentPlayers: league.currentPlayers,
        status: league.status,
        isPasswordProtected: league.isPasswordProtected,
        // Payment fields
        entryFee: league.entryFee,
        charityEnabled: league.charityEnabled,
        charityPercentage: league.charityPercentage,
        // Season info
        seasonNumber: league.season?.number,
        seasonName: league.season?.name,
        // Membership check
        isMember: league.memberships.length > 0,
      },
    });
  } catch (error) {
    logger.error('Error previewing league:', error);
    res.status(500).json({ error: 'Failed to preview league' });
  }
});

// GET /api/leagues/:id - Get league details
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const league = await prisma.league.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                displayName: true,
                city: true,
                state: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Check if user is a member - required for ALL league types
    const membership = league.memberships.find(m => m.userId === req.user!.id);
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this league' });
    }

    res.json({
      league: {
        id: league.id,
        name: league.name,
        code: league.code,
        type: league.type,
        description: league.description,
        maxPlayers: league.maxPlayers,
        currentPlayers: league.currentPlayers,
        status: league.status,
        draftStatus: league.draftStatus,
        draftRunAt: league.draftRunAt,
        rankingLockAt: league.rankingLockAt,
        picksPerUser: league.picksPerUser,
        createdBy: league.createdBy,
        createdAt: league.createdAt,
        members: league.memberships.map(m => ({
          userId: m.user.id,
          name: m.user.name,
          displayName: m.user.displayName,
          email: m.user.email,
          city: m.user.city,
          state: m.user.state,
          role: m.role,
          joinedAt: m.joinedAt,
        })),
        myRole: membership?.role,
      },
    });
  } catch (error) {
    logger.error('Error fetching league details:', error);
    res.status(500).json({ error: 'Failed to fetch league details' });
  }
});

// Invite validation schema
const inviteSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(10),
});

/**
 * POST /api/leagues/:id/invite - Invite friends to join a league
 * CEREBRO Skills: 54 (Viral Loops), 43-55 (Product/Growth)
 */
router.post('/:id/invite', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { emails } = inviteSchema.parse(req.body);

    // Get league
    const league = await prisma.league.findUnique({
      where: { id },
      include: {
        memberships: {
          where: { userId: req.user!.id },
        },
      },
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Check if user is a member of this league
    if (league.memberships.length === 0) {
      return res.status(403).json({ error: 'You must be a member of this league to invite others' });
    }

    // Get inviter info
    const inviter = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { name: true, displayName: true },
    });

    const inviterName = inviter?.displayName || inviter?.name || 'A friend';
    const clientUrl = process.env.CLIENT_URL || 'https://realitygamesfantasyleague.com';
    const joinUrl = `${clientUrl}/join-league?code=${league.code}`;

    // Send invites (async, don't block response)
    const results = await Promise.allSettled(
      emails.map((email) =>
        sendLeagueInviteEmail(email, inviterName, league.name, league.code, joinUrl)
      )
    );

    const sent = results.filter((r) => r.status === 'fulfilled' && r.value).length;
    const failed = emails.length - sent;

    res.json({
      message: `Invited ${sent} friend${sent !== 1 ? 's' : ''} to ${league.name}`,
      sent,
      failed,
      leagueCode: league.code,
      joinUrl,
    });
  } catch (error: unknown) {
    logger.error('Error sending league invites:', error);
    if (isZodError(error)) {
      return res.status(400).json({ error: 'Invalid email addresses', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to send invites' });
  }
});

export default router;
