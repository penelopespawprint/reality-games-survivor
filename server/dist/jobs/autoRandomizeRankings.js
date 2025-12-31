import { supabaseAdmin } from '../config/supabase.js';
/**
 * Auto-generate random rankings for users who haven't submitted by deadline
 * This ensures every user has rankings before the draft begins
 * Runs: After draft_order_deadline passes (Jan 5, 2026 12:00 PM PST)
 */
export async function autoRandomizeRankings() {
    const now = new Date();
    // Get active season with draft_order_deadline
    const { data: season, error: seasonError } = await supabaseAdmin
        .from('seasons')
        .select('id, name, draft_order_deadline')
        .eq('is_active', true)
        .single();
    if (seasonError || !season) {
        console.log('No active season found');
        return { usersProcessed: 0, skipped: 0 };
    }
    // Check if we're past the draft order deadline
    const deadline = new Date(season.draft_order_deadline);
    if (now < deadline) {
        console.log(`Draft order deadline not yet passed: ${deadline.toISOString()}`);
        return { usersProcessed: 0, skipped: 0 };
    }
    // Get all castaways for this season
    const { data: castaways, error: castawaysError } = await supabaseAdmin
        .from('castaways')
        .select('id')
        .eq('season_id', season.id)
        .eq('status', 'active');
    if (castawaysError || !castaways || castaways.length === 0) {
        console.log('No castaways found for season');
        return { usersProcessed: 0, skipped: 0 };
    }
    const castawayIds = castaways.map(c => c.id);
    // Get all users who are members of leagues for this season
    // They need rankings to participate in the draft
    const { data: leagueMembers, error: membersError } = await supabaseAdmin
        .from('league_members')
        .select(`
      user_id,
      leagues!inner(season_id)
    `)
        .eq('leagues.season_id', season.id);
    if (membersError) {
        console.error('Error fetching league members:', membersError);
        return { usersProcessed: 0, skipped: 0 };
    }
    // Get unique user IDs
    const userIds = [...new Set(leagueMembers?.map(m => m.user_id) || [])];
    if (userIds.length === 0) {
        console.log('No users in leagues for this season');
        return { usersProcessed: 0, skipped: 0 };
    }
    // Get users who already have rankings
    const { data: existingRankings, error: rankingsError } = await supabaseAdmin
        .from('draft_rankings')
        .select('user_id')
        .eq('season_id', season.id);
    if (rankingsError) {
        console.error('Error fetching existing rankings:', rankingsError);
        return { usersProcessed: 0, skipped: 0 };
    }
    const usersWithRankings = new Set(existingRankings?.map(r => r.user_id) || []);
    // Find users who need auto-generated rankings
    const usersNeedingRankings = userIds.filter(id => !usersWithRankings.has(id));
    console.log(`Found ${usersNeedingRankings.length} users without rankings`);
    if (usersNeedingRankings.length === 0) {
        return { usersProcessed: 0, skipped: userIds.length };
    }
    // Generate and insert random rankings for each user
    let usersProcessed = 0;
    for (const userId of usersNeedingRankings) {
        // Shuffle castaways randomly for this user
        const shuffled = [...castawayIds].sort(() => Math.random() - 0.5);
        const { error: insertError } = await supabaseAdmin
            .from('draft_rankings')
            .insert({
            user_id: userId,
            season_id: season.id,
            rankings: shuffled,
            submitted_at: now.toISOString(),
            updated_at: now.toISOString(),
        });
        if (insertError) {
            console.error(`Error inserting rankings for user ${userId}:`, insertError);
            continue;
        }
        usersProcessed++;
    }
    console.log(`Auto-generated rankings for ${usersProcessed} users (${usersWithRankings.size} already had rankings)`);
    return {
        usersProcessed,
        skipped: usersWithRankings.size,
    };
}
export default autoRandomizeRankings;
//# sourceMappingURL=autoRandomizeRankings.js.map