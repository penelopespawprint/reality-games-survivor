import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testTeamCommand() {
  console.log('=== SMS TEAM Command Test ===\n');

  // Step 1: Find users with phone numbers
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email, phone, display_name')
    .not('phone', 'is', null)
    .limit(5);

  if (userError) {
    console.error('Error fetching users:', userError);
    return;
  }

  console.log(`Found ${users?.length || 0} users with phone numbers`);

  if (!users || users.length === 0) {
    console.log('No users with phone numbers found. Need to set up test data.');
    return;
  }

  for (const user of users) {
    console.log(`\n--- Testing user: ${user.email} (${user.phone}) ---`);

    // Get rosters for this user
    const { data: rosters, error: rosterError } = await supabase
      .from('rosters')
      .select('id, user_id, league_id, castaway_id, castaways(name, status), leagues(name)')
      .eq('user_id', user.id)
      .is('dropped_at', null);

    if (rosterError) {
      console.error('Error fetching rosters:', rosterError);
      continue;
    }

    console.log(`Rosters found: ${rosters?.length || 0}`);

    if (rosters && rosters.length > 0) {
      rosters.forEach((r, idx) => {
        console.log(`  ${idx+1}. ${r.castaways?.name} (${r.castaways?.status}) - ${r.leagues?.name}`);
      });

      // This user is good for testing
      console.log('\n✓ User suitable for TEAM command testing');
      console.log(`Phone: ${user.phone}`);
      console.log(`Display Name: ${user.display_name}`);
      break;
    } else {
      console.log('  No rosters found for this user');
    }
  }

  // Check for existing SMS commands
  console.log('\n--- Recent TEAM commands ---');
  const { data: smsCommands, error: smsError } = await supabase
    .from('sms_commands')
    .select('*')
    .eq('command', 'TEAM')
    .order('processed_at', { ascending: false })
    .limit(5);

  if (smsError) {
    console.error('Error fetching SMS commands:', smsError);
  } else {
    console.log(`Found ${smsCommands?.length || 0} recent TEAM commands`);
    if (smsCommands && smsCommands.length > 0) {
      smsCommands.forEach((cmd, idx) => {
        console.log(`\n${idx+1}. Command at ${cmd.processed_at}`);
        console.log(`   Phone: ${cmd.phone}`);
        console.log(`   Response: ${cmd.response_sent?.substring(0, 100)}...`);
      });
    }
  }
}

testTeamCommand().catch(console.error);
