import { supabaseAdmin } from '../config/supabase.js';

/**
 * Auto-fill missing picks for users who didn't submit before deadline
 * Picks highest-ranked available castaway from roster
 * Runs: Wed 3:05pm PST (5 min after lock)
 */
export async function autoPick(): Promise<{ autoPicked: number; users: string[] }> {
  const now = new Date();

  // Find current episode where picks just locked
  const { data: episodes } = await supabaseAdmin
    .from('episodes')
    .select('id, season_id')
    .lte('picks_lock_at', now.toISOString())
    .eq('is_scored', false)
    .order('picks_lock_at', { ascending: false })
    .limit(1);

  const episode = episodes?.[0];
  if (!episode) {
    return { autoPicked: 0, users: [] };
  }

  // Get all active leagues for this season
  const { data: leagues } = await supabaseAdmin
    .from('leagues')
    .select('id')
    .eq('season_id', episode.season_id)
    .eq('status', 'active');

  if (!leagues) {
    return { autoPicked: 0, users: [] };
  }

  const autoPickedUsers: string[] = [];

  for (const league of leagues) {
    // Get members who haven't picked
    const { data: members } = await supabaseAdmin
      .from('league_members')
      .select('user_id')
      .eq('league_id', league.id);

    const { data: existingPicks } = await supabaseAdmin
      .from('weekly_picks')
      .select('user_id')
      .eq('league_id', league.id)
      .eq('episode_id', episode.id);

    const pickedUserIds = new Set(existingPicks?.map((p) => p.user_id) || []);
    const missingUsers = members?.filter((m) => !pickedUserIds.has(m.user_id)) || [];

    for (const member of missingUsers) {
      // Get user's active roster (castaways not eliminated)
      const { data: roster } = await supabaseAdmin
        .from('rosters')
        .select('castaway_id, castaways!inner(id, name, status)')
        .eq('league_id', league.id)
        .eq('user_id', member.user_id)
        .is('dropped_at', null);

      // Filter to active castaways
      const activeCastaways = roster?.filter(
        (r: any) => r.castaways?.status === 'active'
      );

      if (!activeCastaways || activeCastaways.length === 0) {
        continue; // No active castaways to pick
      }

      // Pick first available (could add ranking logic here)
      const autoCastaway = activeCastaways[0];

      // Create auto-pick
      const { error } = await supabaseAdmin.from('weekly_picks').insert({
        league_id: league.id,
        user_id: member.user_id,
        episode_id: episode.id,
        castaway_id: autoCastaway.castaway_id,
        status: 'auto_picked',
        picked_at: now.toISOString(),
        locked_at: now.toISOString(),
      });

      if (!error) {
        autoPickedUsers.push(member.user_id);
      }
    }
  }

  console.log(`Auto-picked for ${autoPickedUsers.length} users`);

  return {
    autoPicked: autoPickedUsers.length,
    users: autoPickedUsers,
  };
}

export default autoPick;
