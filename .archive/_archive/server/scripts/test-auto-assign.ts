/**
 * Test script to debug auto-assign function
 * Run: npx tsx server/scripts/test-auto-assign.ts
 */
import prisma from '../prisma.js';
import { autoAssignToOfficialLeague } from '../utils/league-assignment.js';

async function testAutoAssign() {
  console.log('=== Auto-Assign Debug Test ===\n');

  // 1. Check active season
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
    orderBy: { number: 'desc' },
  });
  console.log('Active Season:', activeSeason?.number, activeSeason?.name, 'ID:', activeSeason?.id);

  // 2. Check Official leagues for that season
  const leagues = await prisma.league.findMany({
    where: {
      type: 'OFFICIAL',
      status: { in: ['OPEN', 'ACTIVE'] },
      ...(activeSeason ? { seasonId: activeSeason.id } : {}),
    },
  });
  console.log('\nOfficial Leagues for Season:', leagues.length);
  leagues.forEach(l => {
    console.log(`  - ${l.name}: ${l.currentPlayers}/${l.maxPlayers} (${l.status})`);
  });

  // 3. Find a test user
  const testUser = await prisma.user.findFirst({
    where: { email: { startsWith: 'final_' } },
    orderBy: { createdAt: 'desc' },
  });
  console.log('\nTest User:', testUser?.email, 'ID:', testUser?.id);

  if (!testUser) {
    console.log('No test user found');
    process.exit(1);
  }

  // 4. Check existing membership
  const existing = await prisma.leagueMembership.findFirst({
    where: {
      userId: testUser.id,
      league: { type: 'OFFICIAL' },
      isActive: true,
    },
  });
  console.log('Existing Membership:', existing ? 'Yes' : 'No');

  // 5. Try auto-assign
  console.log('\n=== Running autoAssignToOfficialLeague ===');
  try {
    await autoAssignToOfficialLeague(testUser.id);
    console.log('✅ Auto-assign completed successfully');
  } catch (error) {
    console.error('❌ Auto-assign failed:', error);
  }

  // 6. Check result
  const membership = await prisma.leagueMembership.findFirst({
    where: { userId: testUser.id },
    include: { league: true },
  });
  console.log('\nFinal Membership:', membership?.league?.name || 'None');

  await prisma.$disconnect();
}

testAutoAssign().catch(console.error);
