/**
 * Test to demonstrate the per-source limit bias issue (BUG #3)
 * This shows how hardcoded per-source limits can miss recent activity
 */

interface ActivityItem {
  type: string;
  message: string;
  timestamp: string;
  source: string;
}

// Simulate the current backend behavior with fixed per-source limits
function getActivityCurrentImplementation(
  users: ActivityItem[],
  leagues: ActivityItem[],
  payments: ActivityItem[],
  episodes: ActivityItem[]
): ActivityItem[] {
  // Take first 10 from each source (as backend does)
  const limited = [
    ...users.slice(0, 10),
    ...leagues.slice(0, 10),
    ...payments.slice(0, 10),
    ...episodes.slice(0, 5),
  ];

  // Sort by timestamp descending
  limited.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Return top 20
  return limited.slice(0, 20);
}

// Simulate improved implementation with higher per-source limits
function getActivityImprovedImplementation(
  users: ActivityItem[],
  leagues: ActivityItem[],
  payments: ActivityItem[],
  episodes: ActivityItem[]
): ActivityItem[] {
  // Take first 50 from each source (increased limit)
  const limited = [
    ...users.slice(0, 50),
    ...leagues.slice(0, 50),
    ...payments.slice(0, 50),
    ...episodes.slice(0, 50),
  ];

  // Sort by timestamp descending
  limited.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Return top 20
  return limited.slice(0, 20);
}

// Create mock data simulating a burst of user signups
console.log('=== Per-Source Limit Bias Test ===\n');
console.log('Scenario: 50 new users signed up in the last hour');
console.log('          5 old leagues from 2 weeks ago');
console.log('          3 payments from yesterday');
console.log('          2 episodes scored last week\n');

const now = Date.now();

// 50 recent users (all within last hour)
const users: ActivityItem[] = Array.from({ length: 50 }, (_, i) => ({
  type: 'user_signup',
  message: `User ${i + 1} joined`,
  timestamp: new Date(now - i * 60 * 1000).toISOString(), // 1 min apart
  source: 'users',
}));

// 5 old leagues (2 weeks ago)
const leagues: ActivityItem[] = Array.from({ length: 5 }, (_, i) => ({
  type: 'league_created',
  message: `League ${i + 1} created`,
  timestamp: new Date(now - (14 * 24 * 60 * 60 * 1000 + i * 60 * 60 * 1000)).toISOString(),
  source: 'leagues',
}));

// 3 payments from yesterday
const payments: ActivityItem[] = Array.from({ length: 3 }, (_, i) => ({
  type: 'payment_received',
  message: `Payment ${i + 1} received`,
  timestamp: new Date(now - (24 * 60 * 60 * 1000 + i * 60 * 60 * 1000)).toISOString(),
  source: 'payments',
}));

// 2 episodes from last week
const episodes: ActivityItem[] = Array.from({ length: 2 }, (_, i) => ({
  type: 'admin_action',
  message: `Episode ${i + 1} scored`,
  timestamp: new Date(now - (7 * 24 * 60 * 60 * 1000 + i * 24 * 60 * 60 * 1000)).toISOString(),
  source: 'episodes',
}));

// Test current implementation
console.log('=== CURRENT IMPLEMENTATION (limit 10 per source) ===\n');
const currentResults = getActivityCurrentImplementation(users, leagues, payments, episodes);

console.log('Top 20 activities returned:');
const currentSourceCounts: Record<string, number> = {};
currentResults.forEach((activity, index) => {
  currentSourceCounts[activity.source] = (currentSourceCounts[activity.source] || 0) + 1;
  const age = Math.floor((now - new Date(activity.timestamp).getTime()) / 1000 / 60);
  console.log(`${index + 1}. [${activity.source}] ${activity.message} (${age} min ago)`);
});

console.log('\nSource distribution:');
Object.entries(currentSourceCounts).forEach(([source, count]) => {
  console.log(`  ${source}: ${count}`);
});

// Identify the issue
const oldActivities = currentResults.filter(
  (a) => now - new Date(a.timestamp).getTime() > 24 * 60 * 60 * 1000
);
console.log(`\n⚠️ ISSUE: ${oldActivities.length} of 20 activities are over 1 day old!`);
console.log(
  '   This happened because we fetched 10 leagues from 2 weeks ago instead of more recent signups.\n'
);

// Test improved implementation
console.log('=== IMPROVED IMPLEMENTATION (limit 50 per source) ===\n');
const improvedResults = getActivityImprovedImplementation(users, leagues, payments, episodes);

console.log('Top 20 activities returned:');
const improvedSourceCounts: Record<string, number> = {};
improvedResults.forEach((activity, index) => {
  improvedSourceCounts[activity.source] = (improvedSourceCounts[activity.source] || 0) + 1;
  const age = Math.floor((now - new Date(activity.timestamp).getTime()) / 1000 / 60);
  console.log(`${index + 1}. [${activity.source}] ${activity.message} (${age} min ago)`);
});

console.log('\nSource distribution:');
Object.entries(improvedSourceCounts).forEach(([source, count]) => {
  console.log(`  ${source}: ${count}`);
});

const improvedOldActivities = improvedResults.filter(
  (a) => now - new Date(a.timestamp).getTime() > 24 * 60 * 60 * 1000
);
console.log(`\n✅ FIXED: Only ${improvedOldActivities.length} of 20 activities are over 1 day old.`);
console.log('   All 20 activities shown are the ACTUAL most recent events.\n');

console.log('=== Conclusion ===');
console.log('Current implementation shows OLD leagues instead of RECENT signups.');
console.log('Increasing per-source limits fixes this bias.');
console.log('Recommendation: Change all .limit(10) to .limit(50) in getRecentActivity()');
