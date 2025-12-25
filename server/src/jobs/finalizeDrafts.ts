import { supabaseAdmin } from '../config/supabase.js';
import { secureShuffle } from '../utils/crypto.js';

/**
 * Auto-complete incomplete drafts after deadline
 * Assigns remaining castaways randomly to players with empty roster slots
 * Runs: One-time Mar 2 8pm PST (draft deadline)
 *
 * OPTIMIZATION: Bulk fetches all data upfront to avoid N+1 queries
 */
export async function finalizeDrafts(): Promise<{
  finalizedLeagues: number;
  autoPicks: number;
}> {
  const now = new Date();

  // Get active season
  const { data: season } = await supabaseAdmin
    .from('seasons')
    .select('id, draft_deadline')
    .eq('is_active', true)
    .single();

  if (!season || new Date(season.draft_deadline) > now) {
    return { finalizedLeagues: 0, autoPicks: 0 };
  }

  // Find leagues with incomplete drafts
  const { data: leagues } = await supabaseAdmin
    .from('leagues')
    .select('id, name')
    .eq('season_id', season.id)
    .in('draft_status', ['pending', 'in_progress']);

  if (!leagues || leagues.length === 0) {
    return { finalizedLeagues: 0, autoPicks: 0 };
  }

  const leagueIds = leagues.map((l) => l.id);

  // BULK FETCH: Get all data in 3 queries instead of 3 * N queries
  const [membersResult, rostersResult, castawaysResult] = await Promise.all([
    // All members for all incomplete leagues
    supabaseAdmin
      .from('league_members')
      .select('league_id, user_id, draft_position')
      .in('league_id', leagueIds)
      .order('draft_position', { ascending: true }),

    // All rosters for all incomplete leagues
    supabaseAdmin
      .from('rosters')
      .select('league_id, user_id, castaway_id')
      .in('league_id', leagueIds)
      .is('dropped_at', null),

    // All castaways for the season (only need to fetch once)
    supabaseAdmin
      .from('castaways')
      .select('id')
      .eq('season_id', season.id),
  ]);

  const allMembers = membersResult.data || [];
  const allRosters = rostersResult.data || [];
  const allCastaways = castawaysResult.data || [];

  // Group data by league for efficient processing
  const membersByLeague = new Map<string, typeof allMembers>();
  const rostersByLeague = new Map<string, typeof allRosters>();

  for (const member of allMembers) {
    const existing = membersByLeague.get(member.league_id) || [];
    existing.push(member);
    membersByLeague.set(member.league_id, existing);
  }

  for (const roster of allRosters) {
    const existing = rostersByLeague.get(roster.league_id) || [];
    existing.push(roster);
    rostersByLeague.set(roster.league_id, existing);
  }

  let totalAutoPicks = 0;
  const rosterInserts: Array<{
    league_id: string;
    user_id: string;
    castaway_id: string;
    draft_round: number;
    draft_pick: number;
    acquired_via: string;
  }> = [];

  for (const league of leagues) {
    const members = membersByLeague.get(league.id) || [];
    const rosters = rostersByLeague.get(league.id) || [];

    if (members.length === 0) continue;

    const draftedCastawayIds = new Set(rosters.map((r) => r.castaway_id));
    const availableCastaways = allCastaways.filter((c) => !draftedCastawayIds.has(c.id));

    // Count picks per user
    const userPickCounts = new Map<string, number>();
    for (const roster of rosters) {
      const count = userPickCounts.get(roster.user_id) || 0;
      userPickCounts.set(roster.user_id, count + 1);
    }

    // Find users who need picks (less than 2)
    const usersNeedingPicks: Array<{ userId: string; round: number }> = [];
    for (const member of members) {
      const pickCount = userPickCounts.get(member.user_id) || 0;
      if (pickCount < 1) {
        usersNeedingPicks.push({ userId: member.user_id, round: 1 });
      }
      if (pickCount < 2) {
        usersNeedingPicks.push({ userId: member.user_id, round: 2 });
      }
    }

    // Shuffle available castaways using cryptographically secure random
    const shuffled = secureShuffle([...availableCastaways]);

    // Prepare roster inserts
    let castawayIndex = 0;
    for (const need of usersNeedingPicks) {
      if (castawayIndex >= shuffled.length) break;

      const castaway = shuffled[castawayIndex++];
      const pickNumber =
        need.round === 1
          ? members.findIndex((m) => m.user_id === need.userId) + 1
          : members.length * 2 - members.findIndex((m) => m.user_id === need.userId);

      rosterInserts.push({
        league_id: league.id,
        user_id: need.userId,
        castaway_id: castaway.id,
        draft_round: need.round,
        draft_pick: pickNumber,
        acquired_via: 'auto_draft',
      });

      totalAutoPicks++;
    }
  }

  // BULK INSERT: All roster entries at once
  if (rosterInserts.length > 0) {
    const { error: insertError } = await supabaseAdmin.from('rosters').insert(rosterInserts);
    if (insertError) {
      console.error('Failed to insert auto-draft rosters:', insertError);
      throw insertError;
    }
  }

  // BULK UPDATE: Mark all drafts as completed
  const { error: updateError } = await supabaseAdmin
    .from('leagues')
    .update({
      draft_status: 'completed',
      draft_completed_at: now.toISOString(),
      status: 'active',
    })
    .in('id', leagueIds);

  if (updateError) {
    console.error('Failed to update league statuses:', updateError);
    throw updateError;
  }

  console.log(`Finalized ${leagues.length} leagues with ${totalAutoPicks} auto-picks`);

  return {
    finalizedLeagues: leagues.length,
    autoPicks: totalAutoPicks,
  };
}

export default finalizeDrafts;
