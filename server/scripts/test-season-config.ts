#!/usr/bin/env tsx

/**
 * Test script for SeasonConfig service
 *
 * Usage:
 *   npm run test:season-config
 *   or
 *   tsx server/scripts/test-season-config.ts
 */

import { seasonConfig } from '../src/lib/season-config.js';

async function testSeasonConfig() {
  console.log('🧪 Testing SeasonConfig Service\n');

  try {
    // Test 1: Load current season
    console.log('Test 1: Loading current active season...');
    const season = await seasonConfig.loadCurrentSeason();
    if (season) {
      console.log('✅ Found active season:');
      console.log(`   - Season ${season.number}: ${season.name}`);
      console.log(`   - Active: ${season.is_active}`);
    } else {
      console.log('⚠️  No active season found');
    }
    console.log();

    // Test 2: Get season info
    console.log('Test 2: Getting season info...');
    const info = await seasonConfig.getSeasonInfo();
    if (info) {
      console.log('✅ Season info:');
      console.log(`   - Number: ${info.number}`);
      console.log(`   - Name: ${info.name}`);
      console.log(`   - Draft Order Deadline: ${info.draftOrderDeadline || 'Not set'}`);
      console.log(`   - Draft Deadline: ${info.draftDeadline || 'Not set'}`);
      console.log(`   - Registration Close: ${info.registrationClose || 'Not set'}`);
    } else {
      console.log('⚠️  No season info available');
    }
    console.log();

    // Test 3: Get draft deadline as DateTime
    console.log('Test 3: Getting draft deadline...');
    const draftDeadline = await seasonConfig.getDraftDeadline();
    if (draftDeadline) {
      console.log('✅ Draft deadline:');
      console.log(`   - ISO: ${draftDeadline.toISO()}`);
      console.log(`   - Formatted: ${draftDeadline.toFormat('MMMM d, yyyy h:mm a ZZZZ')}`);
      console.log(`   - Unix: ${draftDeadline.toMillis()}`);
      console.log(`   - Timezone: ${draftDeadline.zoneName}`);
      console.log(`   - Offset: UTC${draftDeadline.offset >= 0 ? '+' : ''}${draftDeadline.offset / 60}`);
    } else {
      console.log('⚠️  No draft deadline configured');
    }
    console.log();

    // Test 4: Get draft order deadline
    console.log('Test 4: Getting draft order deadline...');
    const draftOrderDeadline = await seasonConfig.getDraftOrderDeadline();
    if (draftOrderDeadline) {
      console.log('✅ Draft order deadline:');
      console.log(`   - ISO: ${draftOrderDeadline.toISO()}`);
      console.log(`   - Formatted: ${draftOrderDeadline.toFormat('MMMM d, yyyy h:mm a ZZZZ')}`);
    } else {
      console.log('⚠️  No draft order deadline configured');
    }
    console.log();

    // Test 5: Get picks lock time (recurring)
    console.log('Test 5: Getting picks lock time config...');
    const picksLockTime = seasonConfig.getPicksLockTime();
    console.log('✅ Picks lock time (recurring):');
    console.log(`   - Day of week: ${picksLockTime.dayOfWeek} (0=Sun, 3=Wed)`);
    console.log(`   - Hour: ${picksLockTime.hour} (PST/PDT)`);
    console.log(`   - Minute: ${picksLockTime.minute}`);
    console.log();

    // Test 6: Check if active season exists
    console.log('Test 6: Checking for active season...');
    const hasActive = await seasonConfig.hasActiveSeason();
    console.log(`${hasActive ? '✅' : '⚠️ '} Has active season: ${hasActive}`);
    console.log();

    // Test 7: Cache behavior
    console.log('Test 7: Testing cache behavior...');
    console.log('   - Loading season (should hit cache)...');
    const start = Date.now();
    const cachedSeason = await seasonConfig.loadCurrentSeason();
    const duration = Date.now() - start;
    console.log(`✅ Loaded in ${duration}ms (cached)`);
    console.log();

    // Test 8: Cache invalidation
    console.log('Test 8: Testing cache invalidation...');
    seasonConfig.invalidateCache();
    console.log('✅ Cache invalidated');
    console.log('   - Loading season again (should hit database)...');
    const start2 = Date.now();
    const freshSeason = await seasonConfig.loadCurrentSeason();
    const duration2 = Date.now() - start2;
    console.log(`✅ Loaded in ${duration2}ms (fresh from DB)`);
    console.log();

    console.log('🎉 All tests completed successfully!\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testSeasonConfig().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
