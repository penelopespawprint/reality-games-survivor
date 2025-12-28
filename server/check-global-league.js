import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkGlobalLeague() {
  // Check if global league exists
  const { data: globalLeague, error } = await supabase
    .from('leagues')
    .select('*')
    .eq('is_global', true)
    .single();

  if (error) {
    console.log('ERROR:', error.message);
    console.log('\nGLOBAL LEAGUE DOES NOT EXIST!');
  } else {
    console.log('GLOBAL LEAGUE EXISTS:');
    console.log(JSON.stringify(globalLeague, null, 2));
  }

  // Count members in global league
  if (globalLeague) {
    const { count } = await supabase
      .from('league_members')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', globalLeague.id);

    console.log('\nGLOBAL LEAGUE MEMBER COUNT:', count);
  }

  // Count total users
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  console.log('TOTAL USERS:', userCount);

  // Check a sample of users and their league memberships
  const { data: users } = await supabase
    .from('users')
    .select('id, display_name, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\nRECENT USERS:');
  for (const user of users || []) {
    const { count: membershipCount } = await supabase
      .from('league_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    console.log(`- ${user.display_name} (${user.created_at}): ${membershipCount} league(s)`);
  }
}

checkGlobalLeague();
