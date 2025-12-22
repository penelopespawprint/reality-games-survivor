/**
 * Seed Test Data Script
 *
 * Creates test data for development and testing:
 * - Sample league members with rosters
 * - Episode scores
 * - Weekly picks
 *
 * Run with: npx tsx server/scripts/seed-test-data.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qxrgejdfxcvsfktgysop.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const TEST_PLAYERS = [
  { display_name: 'Jeff Probst Fan', email: 'jeff@test.com' },
  { display_name: 'Tribal Council King', email: 'tribal@test.com' },
  { display_name: 'Immunity Queen', email: 'immunity@test.com' },
  { display_name: 'Hidden Idol Hunter', email: 'idol@test.com' },
  { display_name: 'Fire Maker', email: 'fire@test.com' },
  { display_name: 'Merge Master', email: 'merge@test.com' },
  { display_name: 'Alliance Builder', email: 'alliance@test.com' },
  { display_name: 'Blindside Pro', email: 'blindside@test.com' },
];

async function seedTestData(leagueId: string) {
  console.log(`Seeding test data for league: ${leagueId}`);

  // Get league info
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('*, seasons(*)')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    console.error('League not found:', leagueError);
    process.exit(1);
  }

  console.log(`League: ${league.name} (Season ${league.seasons?.number})`);

  // Get castaways for this season
  const { data: castaways, error: castawaysError } = await supabase
    .from('castaways')
    .select('*')
    .eq('season_id', league.season_id)
    .order('name');

  if (castawaysError || !castaways || castaways.length === 0) {
    console.error('No castaways found for this season');
    process.exit(1);
  }

  console.log(`Found ${castaways.length} castaways`);

  // Get episodes
  const { data: episodes } = await supabase
    .from('episodes')
    .select('*')
    .eq('season_id', league.season_id)
    .order('number');

  console.log(`Found ${episodes?.length || 0} episodes`);

  // Get scoring rules
  const { data: scoringRules } = await supabase
    .from('scoring_rules')
    .select('*')
    .eq('season_id', league.season_id)
    .eq('is_active', true);

  console.log(`Found ${scoringRules?.length || 0} scoring rules`);

  // Get existing members
  const { data: existingMembers } = await supabase
    .from('league_members')
    .select('user_id')
    .eq('league_id', leagueId);

  const existingUserIds = new Set(existingMembers?.map(m => m.user_id) || []);
  console.log(`Existing members: ${existingUserIds.size}`);

  // Create test users if they don't exist
  const testUserIds: string[] = [];

  for (const player of TEST_PLAYERS) {
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', player.email)
      .single();

    if (existingUser) {
      testUserIds.push(existingUser.id);
      console.log(`User exists: ${player.display_name}`);
    } else {
      // Create user in auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: player.email,
        password: 'TestPassword123!',
        email_confirm: true,
        user_metadata: { display_name: player.display_name },
      });

      if (authError) {
        console.error(`Failed to create auth user ${player.email}:`, authError);
        continue;
      }

      if (authUser?.user) {
        testUserIds.push(authUser.user.id);
        console.log(`Created user: ${player.display_name}`);
      }
    }
  }

  // Add test users to league
  const membersToAdd = testUserIds.filter(id => !existingUserIds.has(id));

  if (membersToAdd.length > 0) {
    const { error: memberError } = await supabase
      .from('league_members')
      .insert(membersToAdd.map(userId => ({
        league_id: leagueId,
        user_id: userId,
        total_points: Math.floor(Math.random() * 200) + 50,
      })));

    if (memberError) {
      console.error('Failed to add members:', memberError);
    } else {
      console.log(`Added ${membersToAdd.length} members to league`);
    }
  }

  // Assign rosters (2 castaways per player)
  const { data: allMembers } = await supabase
    .from('league_members')
    .select('user_id')
    .eq('league_id', leagueId);

  const availableCastaways = [...castaways];
  let draftPick = 1;

  for (const member of allMembers || []) {
    // Check if user already has roster
    const { data: existingRoster } = await supabase
      .from('rosters')
      .select('id')
      .eq('league_id', leagueId)
      .eq('user_id', member.user_id);

    if (existingRoster && existingRoster.length > 0) {
      console.log(`User already has roster, skipping`);
      continue;
    }

    // Assign 2 random castaways
    for (let round = 1; round <= 2; round++) {
      if (availableCastaways.length === 0) break;

      const randomIndex = Math.floor(Math.random() * availableCastaways.length);
      const castaway = availableCastaways.splice(randomIndex, 1)[0];

      const { error: rosterError } = await supabase
        .from('rosters')
        .insert({
          league_id: leagueId,
          user_id: member.user_id,
          castaway_id: castaway.id,
          draft_round: round,
          draft_pick: draftPick++,
          acquired_via: 'draft',
        });

      if (rosterError) {
        console.error(`Failed to create roster:`, rosterError);
      }
    }
  }

  console.log('Rosters assigned');

  // Add some episode scores if we have episodes and rules
  if (episodes && episodes.length > 0 && scoringRules && scoringRules.length > 0) {
    const firstEpisode = episodes[0];

    // Add random scores for first episode
    for (const castaway of castaways.slice(0, 10)) {
      // Pick 2-4 random rules for each castaway
      const numRules = Math.floor(Math.random() * 3) + 2;
      const selectedRules = scoringRules
        .sort(() => Math.random() - 0.5)
        .slice(0, numRules);

      for (const rule of selectedRules) {
        const quantity = Math.floor(Math.random() * 2) + 1;

        const { error: scoreError } = await supabase
          .from('episode_scores')
          .upsert({
            episode_id: firstEpisode.id,
            castaway_id: castaway.id,
            scoring_rule_id: rule.id,
            quantity,
            points: rule.points * quantity,
          }, {
            onConflict: 'episode_id,castaway_id,scoring_rule_id',
          });

        if (scoreError) {
          console.error('Failed to add score:', scoreError);
        }
      }
    }

    console.log('Episode scores added');
  }

  // Update league status to drafting or active
  await supabase
    .from('leagues')
    .update({
      draft_status: 'completed',
      status: 'active',
    })
    .eq('id', leagueId);

  // Recalculate standings
  const { data: finalMembers } = await supabase
    .from('league_members')
    .select('user_id, total_points')
    .eq('league_id', leagueId)
    .order('total_points', { ascending: false });

  if (finalMembers) {
    for (let i = 0; i < finalMembers.length; i++) {
      await supabase
        .from('league_members')
        .update({ rank: i + 1 })
        .eq('league_id', leagueId)
        .eq('user_id', finalMembers[i].user_id);
    }
    console.log('Rankings updated');
  }

  console.log('Done seeding test data!');
}

// Get league ID from command line
const leagueId = process.argv[2];

if (!leagueId) {
  console.log('Usage: npx tsx server/scripts/seed-test-data.ts <league-id>');
  console.log('');
  console.log('You can find league IDs by querying the leagues table in Supabase.');
  process.exit(1);
}

seedTestData(leagueId).catch(console.error);
