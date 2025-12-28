/**
 * Season utilities for ensuring queries are properly scoped
 */

import prisma from '../prisma.js';

/**
 * Get the currently active season
 * Returns null if no active season is found
 */
export async function getActiveSeason() {
  return prisma.season.findFirst({
    where: { isActive: true },
    orderBy: { number: 'desc' },
  });
}

/**
 * Get the active season ID
 * Throws error if no active season is found (use when season is required)
 */
export async function requireActiveSeason() {
  const season = await getActiveSeason();
  if (!season) {
    throw new Error('No active season found');
  }
  return season;
}

/**
 * Build a season filter for Prisma queries
 * Returns a where clause that can be spread into queries
 */
export async function getSeasonFilter(): Promise<{ seasonId?: string }> {
  const season = await getActiveSeason();
  return season ? { seasonId: season.id } : {};
}
