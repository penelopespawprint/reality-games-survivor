// @ts-nocheck
import prisma from '../prisma.js';

// Island-themed league names in order
const OFFICIAL_LEAGUE_NAMES = [
  'Borneo League',
  'Australian Outback League',
  'Africa League',
  'Marquesas League',
  'Thailand League',
  'Amazon League',
  'Pearl Islands League',
  'All-Stars League',
  'Vanuatu League',
  'Palau League',
  'Guatemala League',
  'Panama League',
  'Cook Islands League',
  'Fiji League',
  'China League',
  'Gabon League',
  'Tocantins League',
  'Samoa League',
  'Heroes vs. Villains League',
  'Nicaragua League',
];

/**
 * Automatically assign a user to an Official League
 * Creates new leagues as needed when existing ones fill up
 */
export async function autoAssignToOfficialLeague(userId: string): Promise<void> {
  try {
    // Check if user is already in an Official League
    const existingMembership = await prisma.leagueMembership.findFirst({
      where: {
        userId,
        league: {
          type: 'OFFICIAL',
        },
        isActive: true,
      },
    });

    if (existingMembership) {
      console.log(`User ${userId} already in Official League ${existingMembership.leagueId}`);
      return;
    }

    // Find the active season
    const activeSeason = await prisma.season.findFirst({
      where: { isActive: true },
      orderBy: { number: 'desc' },
    });

    // Find first available Official League for the active season (not full)
    const potentialLeagues = await prisma.league.findMany({
      where: {
        type: 'OFFICIAL',
        status: { in: ['OPEN', 'ACTIVE'] },
        ...(activeSeason ? { seasonId: activeSeason.id } : {}),
      },
      orderBy: {
        createdAt: 'asc', // Fill oldest leagues first
      },
    });

    // Filter for leagues that aren't full (currentPlayers < maxPlayers)
    let availableLeague = potentialLeagues.find(
      (league) => league.currentPlayers < league.maxPlayers
    );

    // If no available league, create a new one for the active season
    if (!availableLeague) {
      availableLeague = await createNextOfficialLeague(activeSeason?.id);
    }

    // Add user to the league
    await prisma.$transaction(async (tx) => {
      await tx.leagueMembership.create({
        data: {
          userId,
          leagueId: availableLeague!.id,
          role: 'MEMBER',
        },
      });

      const newPlayerCount = availableLeague!.currentPlayers + 1;

      await tx.league.update({
        where: { id: availableLeague!.id },
        data: {
          currentPlayers: newPlayerCount,
          // Mark as CLOSED when full (use maxPlayers, not hardcoded 18)
          status: newPlayerCount >= availableLeague!.maxPlayers ? 'CLOSED' : 'OPEN',
        },
      });
    });

    console.log(`User ${userId} assigned to Official League: ${availableLeague.name}`);
  } catch (error) {
    console.error('Error auto-assigning user to Official League:', error);
    throw error;
  }
}

/**
 * Create the next Official League for a season
 */
async function createNextOfficialLeague(seasonId?: string) {
  // Count existing Official Leagues
  const count = await prisma.league.count({
    where: { type: 'OFFICIAL' },
  });

  // Get the next league name
  const leagueName = OFFICIAL_LEAGUE_NAMES[count] || `Official League ${count + 1}`;

  // Generate code
  const code = `${leagueName.substring(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  const newLeague = await prisma.league.create({
    data: {
      name: leagueName,
      code,
      type: 'OFFICIAL',
      description: `Official ${leagueName} for Reality Games Fantasy League`,
      maxPlayers: 24,
      currentPlayers: 0,
      status: 'OPEN',
      isPasswordProtected: false,
      picksPerUser: 2,
      draftStatus: 'PENDING',
      ...(seasonId ? { seasonId } : {}),
    },
  });

  console.log(`Created new Official League: ${leagueName} (${code}) for season ${seasonId || 'none'}`);
  return newLeague;
}

/**
 * Get user's Official League
 */
export async function getUserOfficialLeague(userId: string) {
  const membership = await prisma.leagueMembership.findFirst({
    where: {
      userId,
      league: {
        type: 'OFFICIAL',
      },
      isActive: true,
    },
    include: {
      league: true,
    },
  });

  return membership?.league || null;
}

/**
 * Check if a league should be marked as full
 */
export async function checkAndUpdateLeagueStatus(leagueId: string) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
  });

  if (!league) return;

  const shouldBeFull = league.currentPlayers >= league.maxPlayers;

  if (shouldBeFull && league.status !== 'CLOSED') {
    await prisma.league.update({
      where: { id: leagueId },
      data: { status: 'CLOSED' },
    });
    console.log(`League ${league.name} marked as CLOSED (full)`);
  } else if (!shouldBeFull && league.status === 'CLOSED') {
    await prisma.league.update({
      where: { id: leagueId },
      data: { status: 'OPEN' },
    });
    console.log(`League ${league.name} reopened`);
  }
}
