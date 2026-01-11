/**
 * Quick database data check
 */

import { supabaseAdmin } from './src/config/supabase.js';

async function checkDatabaseData() {
  console.log('📊 Database Data Overview\n');

  // Check users
  const { count: userCount } = await supabaseAdmin
    .from('users')
    .select('*', { count: 'exact', head: true });

  console.log(`Users: ${userCount || 0}`);

  // Check leagues
  const { count: leagueCount } = await supabaseAdmin
    .from('leagues')
    .select('*', { count: 'exact', head: true });

  console.log(`Leagues: ${leagueCount || 0}`);

  // Check league_members
  const { count: memberCount } = await supabaseAdmin
    .from('league_members')
    .select('*', { count: 'exact', head: true });

  console.log(`League Members: ${memberCount || 0}`);

  // Check rosters
  const { count: rosterCount } = await supabaseAdmin
    .from('rosters')
    .select('*', { count: 'exact', head: true });

  console.log(`Rosters: ${rosterCount || 0}`);

  // Check castaways
  const { count: castawayCount } = await supabaseAdmin
    .from('castaways')
    .select('*', { count: 'exact', head: true });

  console.log(`Castaways: ${castawayCount || 0}`);

  // Sample league_members data
  const { data: sampleMembers } = await supabaseAdmin
    .from('league_members')
    .select('user_id, league_id, total_points')
    .limit(5);

  if (sampleMembers && sampleMembers.length > 0) {
    console.log('\n📋 Sample League Members:');
    sampleMembers.forEach(m => {
      console.log(`   User: ${m.user_id.substring(0, 8)}... | League: ${m.league_id.substring(0, 8)}... | Points: ${m.total_points || 0}`);
    });
  }

  process.exit(0);
}

checkDatabaseData().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
