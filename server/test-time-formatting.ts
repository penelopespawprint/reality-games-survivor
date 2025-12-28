/**
 * Test the frontend time formatting logic
 * Copied from ActivityFeed.tsx to verify behavior
 */

function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 1000 / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

console.log('=== Time Formatting Test ===\n');

const now = new Date();

const testCases = [
  {
    name: 'Just now (30 seconds ago)',
    timestamp: new Date(now.getTime() - 30 * 1000).toISOString(),
    expected: 'just now',
  },
  {
    name: '5 minutes ago',
    timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
    expected: '5m ago',
  },
  {
    name: '45 minutes ago',
    timestamp: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
    expected: '45m ago',
  },
  {
    name: '2 hours ago',
    timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    expected: '2h ago',
  },
  {
    name: '12 hours ago',
    timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
    expected: '12h ago',
  },
  {
    name: '1 day ago',
    timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    expected: '1d ago',
  },
  {
    name: '3 days ago',
    timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    expected: '3d ago',
  },
  {
    name: '7 days ago',
    timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    expected: /^(Dec|Jan|Nov) \d{1,2}$/, // Should show date format
  },
  {
    name: '30 days ago',
    timestamp: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    expected: /^(Nov|Dec) \d{1,2}$/, // Should show date format
  },
];

let passed = 0;
let failed = 0;

testCases.forEach((test) => {
  const result = formatTimeAgo(test.timestamp);
  const matches =
    typeof test.expected === 'string'
      ? result === test.expected
      : test.expected.test(result);

  if (matches) {
    console.log(`✅ PASS: ${test.name}`);
    console.log(`   Result: "${result}"`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${test.name}`);
    console.log(`   Expected: ${test.expected}`);
    console.log(`   Got: "${result}"`);
    failed++;
  }
});

console.log(`\n=== Results ===`);
console.log(`Passed: ${passed}/${testCases.length}`);
console.log(`Failed: ${failed}/${testCases.length}`);

if (failed === 0) {
  console.log('✅ All time formatting tests passed!');
} else {
  console.log('❌ Some tests failed');
}
