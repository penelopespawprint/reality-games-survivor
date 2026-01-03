/**
 * Seed helper: create three test leagues with 12, 7, and 4 players.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-test-leagues.js
 *
 * Notes:
 * - Uses the service role key to create auth users and corresponding rows in public.users.
 * - Picks the active season; if none exists, uses the most recent season by number.
 * - Generates unique emails per run: seed{timestamp}+p{n}@example.com
 * - Does not create rosters or picks—only leagues and membership counts.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'TestPassword123!';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const runId = `seed${Date.now()}`;

const players = [
  'Alex Rivers',
  'Bailey Morgan',
  'Casey Jordan',
  'Dakota Flynn',
  'Elliot Parker',
  'Finley Avery',
  'Gray Emerson',
  'Harper Lane',
  'Indy Brooks',
  'Jordan Reese',
  'Kai Sutton',
  'Logan Avery',
  'Marley Quinn',
  'Noel Carter',
  'Oakley Drew',
  'Parker Shane',
  'Quinn Taylor',
  'Riley Lane',
  'Sawyer Blake',
  'Tatum Ellis',
  'Urban Lee',
  'Vaughn Price',
  'Winter Reed',
];

function makeEmail(index) {
  return `${runId}+p${index}@example.com`;
}

async function getSeasonId() {
  const { data: active, error: activeError } = await supabase
    .from('seasons')
    .select('id, number, name')
    .eq('is_active', true)
    .order('number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeError) {
    throw new Error(`Failed to fetch seasons: ${activeError.message}`);
  }

  if (active) {
    return active.id;
  }

  const { data: fallback, error: fallbackError } = await supabase
    .from('seasons')
    .select('id, number, name')
    .order('number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fallbackError || !fallback) {
    throw new Error('No seasons found in database.');
  }

  return fallback.id;
}

async function createUser(displayName, email) {
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });

  if (createError) {
    throw new Error(`Create user failed for ${email}: ${createError.message}`);
  }

  const userId = created.user.id;

  const { error: profileError } = await supabase.from('users').upsert({
    id: userId,
    email,
    display_name: displayName,
    role: 'player',
    notification_email: true,
    notification_push: true,
    timezone: 'America/Los_Angeles',
  });

  if (profileError) {
    throw new Error(`Upsert users row failed for ${email}: ${profileError.message}`);
  }

  return { id: userId, email, displayName };
}

function generateLeagueCode(label) {
  const token = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${label}${token}`.replace(/[^A-Z0-9]/g, '').slice(0, 10);
}

async function createLeague({ name, members, seasonId, label }) {
  const commissioner = members[0];
  const code = generateLeagueCode(label);
  const maxPlayers = Math.max(commissioner ? members.length : 0, 12);

  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .insert({
      season_id: seasonId,
      name,
      code,
      commissioner_id: commissioner.id,
      max_players: maxPlayers,
      is_public: false,
      is_global: false,
      require_donation: false,
      status: 'forming',
      draft_status: 'pending',
    })
    .select('id, code, name')
    .single();

  if (leagueError) {
    throw new Error(`Create league failed (${name}): ${leagueError.message}`);
  }

  const memberRows = members.map((member, idx) => ({
    league_id: league.id,
    user_id: member.id,
    draft_position: idx + 1,
    total_points: 0,
  }));

  const { error: memberError } = await supabase.from('league_members').upsert(memberRows);
  if (memberError) {
    throw new Error(`Insert league_members failed (${name}): ${memberError.message}`);
  }

  return { id: league.id, code: league.code, name: league.name, memberCount: members.length };
}

async function main() {
  console.log('Starting test league seed...');
  const seasonId = await getSeasonId();
  console.log(`Using season: ${seasonId}`);

  const createdUsers = [];
  for (let i = 0; i < players.length; i++) {
    const displayName = players[i];
    const email = makeEmail(i + 1);
    const user = await createUser(displayName, email);
    createdUsers.push(user);
  }

  const league12 = createdUsers.slice(0, 12);
  const league7 = createdUsers.slice(12, 19);
  const league4 = createdUsers.slice(19, 23);

  const leagues = [];
  leagues.push(
    await createLeague({
      name: 'Test League - Full (12)',
      members: league12,
      seasonId,
      label: 'FULL',
    })
  );
  leagues.push(
    await createLeague({
      name: 'Test League - Mid (7)',
      members: league7,
      seasonId,
      label: 'MID',
    })
  );
  leagues.push(
    await createLeague({
      name: 'Test League - Small (4)',
      members: league4,
      seasonId,
      label: 'SMALL',
    })
  );

  console.log(
    JSON.stringify(
      {
        seasonId,
        leagues,
        usersCreated: createdUsers.length,
        runId,
        password: DEFAULT_PASSWORD,
      },
      null,
      2
    )
  );
  console.log('✅ Seed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
