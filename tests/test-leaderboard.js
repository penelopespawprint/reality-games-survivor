// Quick test of optimized leaderboard endpoint
const API_URL = process.env.API_URL || 'https://rgfl-api-production.up.railway.app';

async function testLeaderboard() {
  console.log('Testing optimized global leaderboard...\n');

  const start = Date.now();
  const response = await fetch(`${API_URL}/api/leagues/global-leaderboard?limit=10`);
  const elapsed = Date.now() - start;

  if (!response.ok) {
    console.error('❌ Request failed:', response.status, response.statusText);
    return;
  }

  const data = await response.json();

  console.log('✅ Request successful!');
  console.log(`⏱️  Response time: ${elapsed}ms`);
  console.log(`👥 Total players: ${data.summary.totalPlayers}`);
  console.log(`🔥 Active torches: ${data.summary.activeTorches}`);
  console.log(`🏆 Top score: ${data.summary.topScore}\n`);

  console.log('Top 5 players:');
  data.leaderboard.slice(0, 5).forEach((player, index) => {
    console.log(`${index + 1}. ${player.displayName} - ${player.weightedScore} pts (${player.leagueCount} leagues)`);
  });

  // Verify performance target
  if (elapsed < 100) {
    console.log(`\n✅ Performance target met! (${elapsed}ms < 100ms)`);
  } else {
    console.log(`\n⚠️  Performance target missed: ${elapsed}ms > 100ms`);
  }
}

testLeaderboard().catch(console.error);
