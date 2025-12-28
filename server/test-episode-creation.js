import { DateTime } from 'luxon';

console.log('=== EPISODE CREATION TIMEZONE TEST ===\n');

// Simulating the admin route: /api/admin/episodes
// Lines 464-470 in src/routes/admin.ts

console.log('SCENARIO: Admin creates episode for Wednesday March 4, 2026 at 8pm PST');
console.log('');

// What the admin submits (air_date as ISO string)
const air_date = '2026-03-04T20:00:00-08:00'; // 8pm PST

console.log('INPUT from Admin:');
console.log('  air_date:', air_date);
console.log('');

// Current code (PROBLEMATIC):
console.log('CURRENT CODE BEHAVIOR:');
const airDate = new Date(air_date);
console.log('  new Date(air_date):', airDate.toISOString());
console.log('  Local interpretation:', airDate.toString());

const picksLockAt = new Date(airDate);
picksLockAt.setHours(15, 0, 0, 0); // 3pm same day
console.log('');
console.log('  picks_lock_at calculation:');
console.log('    - Creates new Date from airDate');
console.log('    - Calls setHours(15, 0, 0, 0)');
console.log('    - Result:', picksLockAt.toISOString());
console.log('    - In Pacific:', DateTime.fromJSDate(picksLockAt).setZone('America/Los_Angeles').toISO());
console.log('');

// CRITICAL BUG: setHours() uses LOCAL timezone, not Pacific!
console.log('CRITICAL BUG ANALYSIS:');
console.log('  - Date.setHours() operates in the LOCAL timezone of the server');
console.log('  - If server runs in UTC, setHours(15, 0, 0, 0) means 3pm UTC, NOT 3pm PST!');
console.log('  - This means picks could lock at the WRONG TIME');
console.log('');

// Demonstration with different server timezones
console.log('IMPACT OF SERVER TIMEZONE:');
console.log('');

// Server in UTC
console.log('1. Server in UTC timezone:');
const airDateUTC = new Date('2026-03-04T20:00:00-08:00'); // 8pm PST = 4am UTC next day
const picksLockUTC = new Date(airDateUTC);
picksLockUTC.setHours(15, 0, 0, 0);
console.log('   Input: 2026-03-04 8pm PST');
console.log('   Picks lock at (UTC):', picksLockUTC.toISOString());
console.log('   Picks lock at (PST):', DateTime.fromJSDate(picksLockUTC).setZone('America/Los_Angeles').toISO());
console.log('   WRONG! Should lock at 3pm PST on March 4, but locks at 3pm UTC on March 5!');
console.log('');

// Server in PST
console.log('2. Server in PST timezone (Railway might be UTC):');
console.log('   If Railway runs in UTC, all times will be WRONG by 8 hours in winter, 7 in summer');
console.log('');

// CORRECT APPROACH
console.log('CORRECT APPROACH WITH LUXON:');
const airDateLuxon = DateTime.fromISO(air_date, { zone: 'America/Los_Angeles' });
console.log('  Input parsed with Luxon:', airDateLuxon.toISO());
console.log('  Set to 3pm PST same day:', airDateLuxon.set({ hour: 15, minute: 0, second: 0 }).toISO());
console.log('  Convert to UTC for database:', airDateLuxon.set({ hour: 15, minute: 0, second: 0 }).toUTC().toISO());
console.log('');

// Test DST transition
console.log('DST TRANSITION IMPACT:');
console.log('');

// Episode on March 11 (AFTER DST, now PDT)
const airDatePDT = '2026-03-11T20:00:00-07:00'; // 8pm PDT
console.log('Episode on March 11, 2026 (AFTER DST):');
console.log('  Input: 8pm PDT');
const airLuxonPDT = DateTime.fromISO(airDatePDT, { zone: 'America/Los_Angeles' });
const picksLockPDT = airLuxonPDT.set({ hour: 15, minute: 0, second: 0 });
console.log('  Picks lock at (PDT):', picksLockPDT.toISO());
console.log('  Picks lock at (UTC):', picksLockPDT.toUTC().toISO());
console.log('');

console.log('=== VERDICT ===');
console.log('CRITICAL BUG: Episode creation uses Date.setHours() without timezone awareness!');
console.log('This will cause picks to lock at the WRONG TIME if server is not in Pacific timezone.');
console.log('');
console.log('SEVERITY: P0 - BLOCKING');
console.log('IMPACT: Picks could lock 7-8 hours early/late depending on server timezone');
console.log('LOCATION: /server/src/routes/admin.ts lines 465-470');
console.log('');
console.log('REQUIRED FIX:');
console.log('1. Use Luxon DateTime instead of native Date');
console.log('2. Parse input with America/Los_Angeles timezone');
console.log('3. Use .set() to change hour in Pacific time');
console.log('4. Convert to UTC only for database storage');
