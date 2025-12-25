import { supabaseAdmin } from '../config/supabase.js';

/**
 * Process waiver rankings using inverse standings order (snake if multi-elimination)
 * Runs: Wed 2:55pm PST (before picks lock)
 *
 * OPTIMIZED: Batch queries to avoid N+1 problem
 * - Fetches all rosters per league in one query
 * - Batches all inserts/updates at the end
 */
export async function processWaivers(): Promise<{
  processed: number;
  transactions: Array<{ user: string; dropped: string; acquired: string }>;
}> {
  const now = new Date();

  // Find episodes where waiver window just closed
  const { data: episodes } = await supabaseAdmin
    .from('episodes')
    .select('id, season_id')
    .lte('waiver_closes_at', now.toISOString())
    .gte('waiver_closes_at', new Date(now.getTime() - 10 * 60 * 1000).toISOString())
    .eq('is_scored', false);

  if (!episodes || episodes.length === 0) {
    return { processed: 0, transactions: [] };
  }

  const transactions: Array<{ user: string; dropped: string; acquired: string }> = [];

  // Collect all batch operations
  const rosterDropUpdates: { id: string; dropped_at: string }[] = [];
  const newRosterInserts: Array<{
    league_id: string;
    user_id: string;
    castaway_id: string;
    draft_round: number;
    draft_pick: number;
    acquired_via: string;
  }> = [];
  const waiverResultInserts: Array<{
    league_id: string;
    user_id: string;
    episode_id: string;
    dropped_castaway_id: string;
    acquired_castaway_id: string;
    waiver_position: number;
  }> = [];

  for (const episode of episodes) {
    // Get all active leagues for this season
    const { data: leagues } = await supabaseAdmin
      .from('leagues')
      .select('id')
      .eq('season_id', episode.season_id)
      .eq('status', 'active');

    if (!leagues || leagues.length === 0) continue;

    const leagueIds = leagues.map((l) => l.id);

    // BATCH: Get all standings for all leagues at once
    const { data: allStandings } = await supabaseAdmin
      .from('league_members')
      .select('league_id, user_id, total_points, users(display_name)')
      .in('league_id', leagueIds)
      .order('total_points', { ascending: true });

    // BATCH: Get all waiver rankings for all leagues at once
    const { data: allRankings } = await supabaseAdmin
      .from('waiver_rankings')
      .select('league_id, user_id, rankings')
      .in('league_id', leagueIds)
      .eq('episode_id', episode.id);

    // BATCH: Get all rosters with castaway status for all leagues at once
    const { data: allRosters } = await supabaseAdmin
      .from('rosters')
      .select('id, league_id, user_id, castaway_id, castaways(id, name, status)')
      .in('league_id', leagueIds)
      .is('dropped_at', null);

    // BATCH: Get all active castaways for this season
    const { data: allCastaways } = await supabaseAdmin
      .from('castaways')
      .select('id, name, status')
      .eq('season_id', episode.season_id);

    // Create lookup maps for O(1) access
    const standingsByLeague = new Map<string, typeof allStandings>();
    for (const s of allStandings || []) {
      if (!standingsByLeague.has(s.league_id)) {
        standingsByLeague.set(s.league_id, []);
      }
      standingsByLeague.get(s.league_id)!.push(s);
    }

    const rankingsByLeagueUser = new Map<string, string[]>();
    for (const r of allRankings || []) {
      rankingsByLeagueUser.set(`${r.league_id}:${r.user_id}`, r.rankings as string[]);
    }

    const rostersByLeagueUser = new Map<string, Array<typeof allRosters[0]>>();
    const rosterCastawaysByLeague = new Map<string, Set<string>>();
    for (const r of allRosters || []) {
      // Group by league:user
      const key = `${r.league_id}:${r.user_id}`;
      if (!rostersByLeagueUser.has(key)) {
        rostersByLeagueUser.set(key, []);
      }
      rostersByLeagueUser.get(key)!.push(r);

      // Track all rostered castaways per league
      if (!rosterCastawaysByLeague.has(r.league_id)) {
        rosterCastawaysByLeague.set(r.league_id, new Set());
      }
      rosterCastawaysByLeague.get(r.league_id)!.add(r.castaway_id);
    }

    const castawayNames = new Map(allCastaways?.map((c) => [c.id, c.name]) || []);
    const activeCastawayIds = new Set(
      allCastaways?.filter((c) => c.status === 'active').map((c) => c.id) || []
    );

    // Process each league
    for (const league of leagues) {
      const standings = standingsByLeague.get(league.id) || [];
      const rosterCastawayIds = rosterCastawaysByLeague.get(league.id) || new Set();

      // Available = active castaways not on any roster in this league
      const availableIds = new Set(
        [...activeCastawayIds].filter((id) => !rosterCastawayIds.has(id))
      );

      // Process in waiver order (inverse standings - already sorted by total_points ascending)
      let waiverPosition = 1;
      for (const member of standings) {
        const userRankings = rankingsByLeagueUser.get(`${league.id}:${member.user_id}`);
        if (!userRankings || userRankings.length === 0) {
          continue;
        }

        // Check if user has an eliminated castaway to drop
        const userRoster = rostersByLeagueUser.get(`${league.id}:${member.user_id}`) || [];
        const eliminatedOnRoster = userRoster.find(
          (r: any) => r.castaways?.status === 'eliminated'
        );

        if (!eliminatedOnRoster) {
          continue; // No need to use waiver
        }

        // Find first available castaway from rankings
        let acquiredCastawayId: string | null = null;
        for (const castawayId of userRankings) {
          if (availableIds.has(castawayId)) {
            acquiredCastawayId = castawayId;
            availableIds.delete(castawayId); // Remove from pool
            break;
          }
        }

        if (!acquiredCastawayId) {
          continue; // No ranked castaways available
        }

        // Queue batch operations instead of executing immediately
        rosterDropUpdates.push({
          id: eliminatedOnRoster.id,
          dropped_at: now.toISOString(),
        });

        newRosterInserts.push({
          league_id: league.id,
          user_id: member.user_id,
          castaway_id: acquiredCastawayId,
          draft_round: 0,
          draft_pick: 0,
          acquired_via: 'waiver',
        });

        waiverResultInserts.push({
          league_id: league.id,
          user_id: member.user_id,
          episode_id: episode.id,
          dropped_castaway_id: eliminatedOnRoster.castaway_id,
          acquired_castaway_id: acquiredCastawayId,
          waiver_position: waiverPosition++,
        });

        transactions.push({
          user: (member as any).users?.display_name || member.user_id,
          dropped: (eliminatedOnRoster as any).castaways?.name || 'Unknown',
          acquired: castawayNames.get(acquiredCastawayId) || 'Unknown',
        });
      }
    }
  }

  // Execute batch operations
  if (rosterDropUpdates.length > 0) {
    // Update dropped rosters in batches of 100
    for (let i = 0; i < rosterDropUpdates.length; i += 100) {
      const batch = rosterDropUpdates.slice(i, i + 100);
      const ids = batch.map((r) => r.id);
      await supabaseAdmin
        .from('rosters')
        .update({ dropped_at: now.toISOString() })
        .in('id', ids);
    }
  }

  if (newRosterInserts.length > 0) {
    // Insert new rosters in batches
    for (let i = 0; i < newRosterInserts.length; i += 100) {
      const batch = newRosterInserts.slice(i, i + 100);
      await supabaseAdmin.from('rosters').insert(batch);
    }
  }

  if (waiverResultInserts.length > 0) {
    // Insert waiver results in batches
    for (let i = 0; i < waiverResultInserts.length; i += 100) {
      const batch = waiverResultInserts.slice(i, i + 100);
      await supabaseAdmin.from('waiver_results').insert(batch);
    }
  }

  console.log(`Processed ${transactions.length} waiver transactions`);

  return {
    processed: transactions.length,
    transactions,
  };
}

export default processWaivers;
