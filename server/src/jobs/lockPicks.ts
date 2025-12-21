import { supabaseAdmin } from '../config/supabase.js';

/**
 * Lock all pending picks for episodes where picks_lock_at has passed
 * Runs: Wed 3pm PST
 */
export async function lockPicks(): Promise<{ locked: number; episodes: string[] }> {
  const now = new Date().toISOString();

  // Find episodes where picks should be locked
  const { data: episodes, error: episodesError } = await supabaseAdmin
    .from('episodes')
    .select('id')
    .lte('picks_lock_at', now)
    .eq('is_scored', false);

  if (episodesError) {
    console.error('Error fetching episodes for lock:', episodesError);
    throw episodesError;
  }

  if (!episodes || episodes.length === 0) {
    return { locked: 0, episodes: [] };
  }

  const episodeIds = episodes.map((e) => e.id);

  // Lock all pending picks for these episodes
  const { data: lockedPicks, error: lockError } = await supabaseAdmin
    .from('weekly_picks')
    .update({
      status: 'locked',
      locked_at: now,
    })
    .eq('status', 'pending')
    .in('episode_id', episodeIds)
    .select('id');

  if (lockError) {
    console.error('Error locking picks:', lockError);
    throw lockError;
  }

  console.log(`Locked ${lockedPicks?.length || 0} picks for ${episodeIds.length} episodes`);

  return {
    locked: lockedPicks?.length || 0,
    episodes: episodeIds,
  };
}

export default lockPicks;
