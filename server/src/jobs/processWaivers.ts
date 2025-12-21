import { supabaseAdmin } from '../config/supabase.js';

/**
 * Process waiver rankings using inverse standings order (snake if multi-elimination)
 * Runs: Wed 2:55pm PST (before picks lock)
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
    .gte('waiver_closes_at', new Date(now.getTime() - 10 * 60 * 1000).toISOString()) // Within last 10 min
    .eq('is_scored', false);

  if (!episodes || episodes.length === 0) {
    return { processed: 0, transactions: [] };
  }

  const transactions: Array<{ user: string; dropped: string; acquired: string }> = [];

  for (const episode of episodes) {
    // Get all active leagues for this season
    const { data: leagues } = await supabaseAdmin
      .from('leagues')
      .select('id')
      .eq('season_id', episode.season_id)
      .eq('status', 'active');

    if (!leagues) continue;

    for (const league of leagues) {
      // Get standings (inverse order - last place picks first)
      const { data: standings } = await supabaseAdmin
        .from('league_members')
        .select('user_id, total_points, users(display_name)')
        .eq('league_id', league.id)
        .order('total_points', { ascending: true }); // Lowest first

      if (!standings) continue;

      // Get waiver rankings submitted
      const { data: rankings } = await supabaseAdmin
        .from('waiver_rankings')
        .select('user_id, rankings')
        .eq('league_id', league.id)
        .eq('episode_id', episode.id);

      const rankingsMap = new Map<string, string[]>();
      for (const r of rankings || []) {
        rankingsMap.set(r.user_id, r.rankings as string[]);
      }

      // Get available castaways (active, not on any roster in this league)
      const { data: rosters } = await supabaseAdmin
        .from('rosters')
        .select('castaway_id')
        .eq('league_id', league.id)
        .is('dropped_at', null);

      const rosterCastawayIds = new Set(rosters?.map((r) => r.castaway_id) || []);

      const { data: allCastaways } = await supabaseAdmin
        .from('castaways')
        .select('id, name, status')
        .eq('season_id', episode.season_id)
        .eq('status', 'active');

      const availableCastaways = allCastaways?.filter(
        (c) => !rosterCastawayIds.has(c.id)
      ) || [];
      const availableIds = new Set(availableCastaways.map((c) => c.id));
      const castawayNames = new Map(allCastaways?.map((c) => [c.id, c.name]) || []);

      // Process in waiver order (inverse standings)
      let waiverPosition = 1;
      for (const member of standings) {
        const userRankings = rankingsMap.get(member.user_id);
        if (!userRankings || userRankings.length === 0) {
          continue;
        }

        // Check if user has an eliminated castaway to drop
        const { data: userRoster } = await supabaseAdmin
          .from('rosters')
          .select('id, castaway_id, castaways(name, status)')
          .eq('league_id', league.id)
          .eq('user_id', member.user_id)
          .is('dropped_at', null);

        const eliminatedOnRoster = userRoster?.find(
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

        // Execute waiver transaction
        // Drop eliminated castaway
        await supabaseAdmin
          .from('rosters')
          .update({ dropped_at: now.toISOString() })
          .eq('id', eliminatedOnRoster.id);

        // Add new castaway
        await supabaseAdmin.from('rosters').insert({
          league_id: league.id,
          user_id: member.user_id,
          castaway_id: acquiredCastawayId,
          draft_round: 0,
          draft_pick: 0,
          acquired_via: 'waiver',
        });

        // Record waiver result
        await supabaseAdmin.from('waiver_results').insert({
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

  console.log(`Processed ${transactions.length} waiver transactions`);

  return {
    processed: transactions.length,
    transactions,
  };
}

export default processWaivers;
