import { supabaseAdmin } from '../config/supabase.js';

/**
 * Auto-complete incomplete drafts after deadline
 * Assigns remaining castaways randomly to players with empty roster slots
 * Runs: One-time Mar 2 8pm PST (draft deadline)
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

  let totalAutoPicks = 0;

  for (const league of leagues) {
    // Get all members and their current roster counts
    const { data: members } = await supabaseAdmin
      .from('league_members')
      .select('user_id, draft_position')
      .eq('league_id', league.id)
      .order('draft_position', { ascending: true });

    if (!members) continue;

    // Get current rosters
    const { data: rosters } = await supabaseAdmin
      .from('rosters')
      .select('user_id, castaway_id')
      .eq('league_id', league.id)
      .is('dropped_at', null);

    // Get all available castaways
    const { data: allCastaways } = await supabaseAdmin
      .from('castaways')
      .select('id')
      .eq('season_id', season.id);

    const draftedCastawayIds = new Set(rosters?.map((r) => r.castaway_id) || []);
    const availableCastaways =
      allCastaways?.filter((c) => !draftedCastawayIds.has(c.id)) || [];

    // Count picks per user
    const userPickCounts = new Map<string, number>();
    for (const roster of rosters || []) {
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

    // Shuffle available castaways
    const shuffled = [...availableCastaways].sort(() => Math.random() - 0.5);

    // Assign remaining castaways
    let castawayIndex = 0;
    for (const need of usersNeedingPicks) {
      if (castawayIndex >= shuffled.length) break;

      const castaway = shuffled[castawayIndex++];
      const pickNumber =
        need.round === 1
          ? members.findIndex((m) => m.user_id === need.userId) + 1
          : members.length * 2 -
            members.findIndex((m) => m.user_id === need.userId);

      await supabaseAdmin.from('rosters').insert({
        league_id: league.id,
        user_id: need.userId,
        castaway_id: castaway.id,
        draft_round: need.round,
        draft_pick: pickNumber,
        acquired_via: 'auto_draft',
      });

      totalAutoPicks++;
    }

    // Mark draft as completed
    await supabaseAdmin
      .from('leagues')
      .update({
        draft_status: 'completed',
        draft_completed_at: now.toISOString(),
        status: 'active',
      })
      .eq('id', league.id);
  }

  console.log(
    `Finalized ${leagues.length} leagues with ${totalAutoPicks} auto-picks`
  );

  return {
    finalizedLeagues: leagues.length,
    autoPicks: totalAutoPicks,
  };
}

export default finalizeDrafts;
