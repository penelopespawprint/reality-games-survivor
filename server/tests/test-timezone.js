import { DateTime } from 'luxon';
import { pstToCron, getPacificOffset, isPacificDST, formatCronWithTimezone } from './src/lib/timezone-utils.js';

console.log('=== TIMEZONE TEST SUITE ===\n');

// Test 1: Current DST status
console.log('1. CURRENT PACIFIC TIMEZONE STATUS');
console.log('   Is DST Active:', isPacificDST());
console.log('   UTC Offset:', getPacificOffset(), 'hours');
console.log('   Current Pacific Time:', DateTime.now().setZone('America/Los_Angeles').toISO());
console.log('   Current UTC Time:', DateTime.now().toUTC().toISO());
console.log('');

// Test 2: Pick deadline (Wednesday 3pm PST)
console.log('2. PICK DEADLINE: Wednesday 3pm PST/PDT');
const pickCron = pstToCron(15, 0, 3);
console.log('   Cron Expression:', pickCron);
console.log('   Formatted:', formatCronWithTimezone(pickCron, 15, 0));
console.log('');

// Test 3: Results release (Friday 2pm PST)
console.log('3. RESULTS RELEASE: Friday 2pm PST/PDT');
const resultsCron = pstToCron(14, 0, 5);
console.log('   Cron Expression:', resultsCron);
console.log('   Formatted:', formatCronWithTimezone(resultsCron, 14, 0));
console.log('');

// Test 4: DST transition testing (March 2026)
console.log('4. DST TRANSITIONS FOR 2026');
console.log('');

// March 2, 2026 8pm PST (Draft Deadline - BEFORE DST transition)
console.log('   Draft Deadline: Mar 2, 2026 8pm PST (BEFORE DST)');
const draftDeadlinePST = DateTime.fromObject(
  { year: 2026, month: 3, day: 2, hour: 20, minute: 0 },
  { zone: 'America/Los_Angeles' }
);
console.log('   Pacific Time:', draftDeadlinePST.toISO());
console.log('   UTC Time:', draftDeadlinePST.toUTC().toISO());
console.log('   Is DST?:', draftDeadlinePST.isInDST);
console.log('   UTC Offset:', draftDeadlinePST.offset / 60, 'hours');
console.log('');

// March 9, 2026 - AFTER DST transition (2am on March 8)
console.log('   After DST Transition: Mar 9, 2026 3pm PDT');
const afterDST = DateTime.fromObject(
  { year: 2026, month: 3, day: 9, hour: 15, minute: 0 },
  { zone: 'America/Los_Angeles' }
);
console.log('   Pacific Time:', afterDST.toISO());
console.log('   UTC Time:', afterDST.toUTC().toISO());
console.log('   Is DST?:', afterDST.isInDST);
console.log('   UTC Offset:', afterDST.offset / 60, 'hours');
console.log('');

// Test 5: Episode air times
console.log('5. EPISODE AIR TIMES (8pm PST/PDT Wednesdays)');
const episodeAir = DateTime.fromObject(
  { year: 2026, month: 3, day: 11, hour: 20, minute: 0 },
  { zone: 'America/Los_Angeles' }
);
console.log('   Example: Mar 11, 2026 8pm PDT');
console.log('   Pacific Time:', episodeAir.toISO());
console.log('   UTC Time:', episodeAir.toUTC().toISO());
console.log('');

// Test 6: Critical datetime comparisons
console.log('6. CRITICAL TEST: Deadline enforcement');
console.log('');

// Simulate Wed 2:59pm PST (picks NOT locked)
const beforeDeadline = DateTime.fromObject(
  { year: 2026, month: 3, day: 4, hour: 14, minute: 59 },
  { zone: 'America/Los_Angeles' }
);
const deadline = DateTime.fromObject(
  { year: 2026, month: 3, day: 4, hour: 15, minute: 0 },
  { zone: 'America/Los_Angeles' }
);
const afterDeadline = DateTime.fromObject(
  { year: 2026, month: 3, day: 4, hour: 15, minute: 1 },
  { zone: 'America/Los_Angeles' }
);

console.log('   Deadline:', deadline.toISO());
console.log('   Before (2:59pm):', beforeDeadline < deadline ? 'ALLOWED' : 'BLOCKED');
console.log('   At (3:00pm):', deadline >= deadline ? 'BLOCKED' : 'ALLOWED');
console.log('   After (3:01pm):', afterDeadline >= deadline ? 'BLOCKED' : 'ALLOWED');
console.log('');

// Test 7: Cron expressions across DST boundary
console.log('7. CRON SCHEDULE CORRECTNESS');
console.log('   NOTE: The cron expression is calculated based on CURRENT time');
console.log('   This means schedules will drift when DST changes!');
console.log('');
console.log('   Current Wednesday 3pm cron:', pickCron);
console.log('   This will execute at:', isPacificDST() ? '22:00 UTC (PDT)' : '23:00 UTC (PST)');
console.log('');

console.log('=== CRITICAL FINDINGS ===');
console.log('WARNING: pstToCron() uses DateTime.now() to determine DST offset.');
console.log('This means cron schedules are calculated ONCE at server startup.');
console.log('If server starts during PST (winter) but DST begins (spring), schedules will be WRONG by 1 hour!');
console.log('');
console.log('RECOMMENDATION: Cron jobs should recalculate on DST transitions OR use dynamic scheduling.');
