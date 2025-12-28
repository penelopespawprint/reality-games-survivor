import { supabaseAdmin } from './src/config/supabase.js';
import { DateTime } from 'luxon';

async function checkActivityData() {
  console.log('=== Checking Activity Feed Data ===\n');

  try {
    // Check user signups
    const { data: users, count: userCount } = await supabaseAdmin
      .from('users')
      .select('id, display_name, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5);
    console.log(`Total Users: ${userCount}`);
    console.log('Recent Signups (5):');
    users?.forEach(u => console.log(`  - ${u.display_name} (${u.created_at})`));

    // Check leagues
    const { data: leagues, count: leagueCount } = await supabaseAdmin
      .from('leagues')
      .select('id, name, created_at, commissioner_id', { count: 'exact' })
      .eq('is_global', false)
      .order('created_at', { ascending: false })
      .limit(5);
    console.log(`\nTotal Leagues (non-global): ${leagueCount}`);
    console.log('Recent Leagues (5):');
    leagues?.forEach(l => console.log(`  - ${l.name} (${l.created_at})`));

    // Check payments
    const { data: payments, count: paymentCount } = await supabaseAdmin
      .from('payments')
      .select('id, amount, status, created_at', { count: 'exact' })
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5);
    console.log(`\nTotal Completed Payments: ${paymentCount}`);
    console.log('Recent Payments (5):');
    payments?.forEach(p => console.log(`  - $${(p.amount / 100).toFixed(2)} (${p.created_at})`));

    // Check episodes scored
    const { data: episodes, count: episodeCount } = await supabaseAdmin
      .from('episodes')
      .select('id, number, title, updated_at, is_scored', { count: 'exact' })
      .eq('is_scored', true)
      .order('updated_at', { ascending: false })
      .limit(5);
    console.log(`\nTotal Scored Episodes: ${episodeCount}`);
    console.log('Recent Scored Episodes (5):');
    episodes?.forEach(e => console.log(`  - Episode ${e.number}: ${e.title || 'Untitled'} (${e.updated_at})`));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkActivityData();
