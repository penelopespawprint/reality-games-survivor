/**
 * Stats API Routes
 * 
 * Public endpoints for fun stats and leaderboards.
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Stat 13: Most Leagues Joined
 * GET /api/stats/most-leagues
 */
router.get('/most-leagues', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.rpc('get_most_leagues_joined');
    
    if (error) {
      // If function doesn't exist, use fallback query
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('league_members')
        .select(`
          user_id,
          users!inner(display_name)
        `);
      
      if (fallbackError) throw fallbackError;
      
      // Aggregate counts
      const userCounts: Record<string, { user_id: string; display_name: string; count: number }> = {};
      (fallbackData || []).forEach((member: any) => {
        if (!userCounts[member.user_id]) {
          userCounts[member.user_id] = {
            user_id: member.user_id,
            display_name: member.users?.display_name || 'Unknown',
            count: 0,
          };
        }
        userCounts[member.user_id].count++;
      });
      
      const leaderboard = Object.values(userCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((u) => ({
          user_id: u.user_id,
          display_name: u.display_name,
          league_count: u.count,
        }));
      
      return res.json({ data: { leaderboard } });
    }
    
    res.json({ data: { leaderboard: data || [] } });
  } catch (err) {
    console.error('Error fetching most-leagues stat:', err);
    res.status(500).json({ error: 'Failed to fetch stat' });
  }
});

/**
 * Stat 19: Scoring Efficiency
 * GET /api/stats/scoring-efficiency
 */
router.get('/scoring-efficiency', async (_req: Request, res: Response) => {
  try {
    // Get active season
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .single();
    
    if (!season) {
      return res.json({ data: { leaderboard: [] } });
    }
    
    // Get castaways with their scores
    const { data: castaways, error: castawaysError } = await supabase
      .from('castaways')
      .select('id, name, status, eliminated_episode_id')
      .eq('season_id', season.id);
    
    if (castawaysError) throw castawaysError;
    
    // Get all episode scores
    const { data: scores, error: scoresError } = await supabase
      .from('episode_scores')
      .select('castaway_id, points, episode_id');
    
    if (scoresError) throw scoresError;
    
    // Get scored episodes count
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id, number')
      .eq('season_id', season.id)
      .eq('is_scored', true);
    
    if (episodesError) throw episodesError;
    
    const scoredEpisodeIds = new Set(episodes?.map((e) => e.id) || []);
    
    // Calculate efficiency per castaway
    const castawayScores: Record<string, { total: number; episodes: Set<string> }> = {};
    
    (scores || []).forEach((score) => {
      if (!scoredEpisodeIds.has(score.episode_id)) return;
      
      if (!castawayScores[score.castaway_id]) {
        castawayScores[score.castaway_id] = { total: 0, episodes: new Set() };
      }
      castawayScores[score.castaway_id].total += Number(score.points) || 0;
      castawayScores[score.castaway_id].episodes.add(score.episode_id);
    });
    
    const leaderboard = (castaways || [])
      .map((c) => {
        const stats = castawayScores[c.id] || { total: 0, episodes: new Set() };
        const episodesPlayed = stats.episodes.size;
        return {
          castaway_id: c.id,
          name: c.name,
          total_points: stats.total,
          episodes_played: episodesPlayed,
          efficiency: episodesPlayed > 0 ? stats.total / episodesPlayed : 0,
        };
      })
      .filter((c) => c.episodes_played > 0)
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 10);
    
    res.json({ data: { leaderboard } });
  } catch (err) {
    console.error('Error fetching scoring-efficiency stat:', err);
    res.status(500).json({ error: 'Failed to fetch stat' });
  }
});

/**
 * Stat 22: League Scoring
 * GET /api/stats/league-scoring
 */
router.get('/league-scoring', async (_req: Request, res: Response) => {
  try {
    // Get active season
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .single();
    
    if (!season) {
      return res.json({ data: { leaderboard: [] } });
    }
    
    // Get all leagues for this season with member counts and total points
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select(`
        id,
        name,
        league_members(total_points)
      `)
      .eq('season_id', season.id);
    
    if (leaguesError) throw leaguesError;
    
    const leaderboard = (leagues || [])
      .map((league: any) => {
        const members = league.league_members || [];
        const totalPoints = members.reduce((sum: number, m: any) => sum + (m.total_points || 0), 0);
        const memberCount = members.length;
        return {
          league_id: league.id,
          name: league.name,
          total_points: totalPoints,
          member_count: memberCount,
          avg_per_member: memberCount > 0 ? totalPoints / memberCount : 0,
        };
      })
      .filter((l) => l.member_count > 0)
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, 10);
    
    res.json({ data: { leaderboard } });
  } catch (err) {
    console.error('Error fetching league-scoring stat:', err);
    res.status(500).json({ error: 'Failed to fetch stat' });
  }
});

/**
 * Stat 23: Tribe Scoring
 * GET /api/stats/tribe-scoring
 */
router.get('/tribe-scoring', async (_req: Request, res: Response) => {
  try {
    // Get active season
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .single();
    
    if (!season) {
      return res.json({ data: { tribes: [] } });
    }
    
    // Get castaways grouped by tribe
    const { data: castaways, error: castawaysError } = await supabase
      .from('castaways')
      .select('id, name, tribe_original')
      .eq('season_id', season.id);
    
    if (castawaysError) throw castawaysError;
    
    // Get all scores
    const { data: scores, error: scoresError } = await supabase
      .from('episode_scores')
      .select('castaway_id, points');
    
    if (scoresError) throw scoresError;
    
    // Calculate scores by castaway
    const castawayScores: Record<string, number> = {};
    (scores || []).forEach((s) => {
      castawayScores[s.castaway_id] = (castawayScores[s.castaway_id] || 0) + Number(s.points);
    });
    
    // Aggregate by tribe
    const tribeStats: Record<string, { total: number; count: number }> = {};
    (castaways || []).forEach((c) => {
      const tribe = c.tribe_original || 'Unknown';
      if (!tribeStats[tribe]) {
        tribeStats[tribe] = { total: 0, count: 0 };
      }
      tribeStats[tribe].total += castawayScores[c.id] || 0;
      tribeStats[tribe].count++;
    });
    
    const tribes = Object.entries(tribeStats)
      .map(([name, stats]) => ({
        name,
        total_points: stats.total,
        castaway_count: stats.count,
        avg_per_castaway: stats.count > 0 ? stats.total / stats.count : 0,
      }))
      .sort((a, b) => b.total_points - a.total_points);
    
    res.json({ data: { tribes } });
  } catch (err) {
    console.error('Error fetching tribe-scoring stat:', err);
    res.status(500).json({ error: 'Failed to fetch stat' });
  }
});

/**
 * Stat 25: Activity by Day
 * GET /api/stats/activity-by-day
 */
router.get('/activity-by-day', async (_req: Request, res: Response) => {
  try {
    // Get pick activity by day
    const { data: picks, error: picksError } = await supabase
      .from('weekly_picks')
      .select('submitted_at')
      .not('submitted_at', 'is', null);
    
    if (picksError) throw picksError;
    
    // Get chat message activity by day
    const { data: messages, error: messagesError } = await supabase
      .from('league_messages')
      .select('created_at');
    
    if (messagesError) throw messagesError;
    
    // Count by day of week (0 = Sunday, 6 = Saturday)
    const dayCounts: Record<number, { picks: number; messages: number }> = {};
    for (let i = 0; i < 7; i++) {
      dayCounts[i] = { picks: 0, messages: 0 };
    }
    
    (picks || []).forEach((p) => {
      if (p.submitted_at) {
        const day = new Date(p.submitted_at).getUTCDay();
        dayCounts[day].picks++;
      }
    });
    
    (messages || []).forEach((m) => {
      if (m.created_at) {
        const day = new Date(m.created_at).getUTCDay();
        dayCounts[day].messages++;
      }
    });
    
    const days = Object.entries(dayCounts).map(([day, counts]) => ({
      day: parseInt(day),
      picks: counts.picks,
      messages: counts.messages,
      total: counts.picks + counts.messages,
    }));
    
    res.json({ data: { days } });
  } catch (err) {
    console.error('Error fetching activity-by-day stat:', err);
    res.status(500).json({ error: 'Failed to fetch stat' });
  }
});

/**
 * Stat 26: Activity by Hour
 * GET /api/stats/activity-by-hour
 */
router.get('/activity-by-hour', async (_req: Request, res: Response) => {
  try {
    // Get pick activity by hour
    const { data: picks, error: picksError } = await supabase
      .from('weekly_picks')
      .select('submitted_at')
      .not('submitted_at', 'is', null);
    
    if (picksError) throw picksError;
    
    // Get chat message activity by hour
    const { data: messages, error: messagesError } = await supabase
      .from('league_messages')
      .select('created_at');
    
    if (messagesError) throw messagesError;
    
    // Count by hour (0-23)
    const hourCounts: Record<number, { picks: number; messages: number }> = {};
    for (let i = 0; i < 24; i++) {
      hourCounts[i] = { picks: 0, messages: 0 };
    }
    
    (picks || []).forEach((p) => {
      if (p.submitted_at) {
        const hour = new Date(p.submitted_at).getUTCHours();
        hourCounts[hour].picks++;
      }
    });
    
    (messages || []).forEach((m) => {
      if (m.created_at) {
        const hour = new Date(m.created_at).getUTCHours();
        hourCounts[hour].messages++;
      }
    });
    
    const hours = Object.entries(hourCounts).map(([hour, counts]) => ({
      hour: parseInt(hour),
      picks: counts.picks,
      messages: counts.messages,
      total: counts.picks + counts.messages,
    }));
    
    res.json({ data: { hours } });
  } catch (err) {
    console.error('Error fetching activity-by-hour stat:', err);
    res.status(500).json({ error: 'Failed to fetch stat' });
  }
});

/**
 * Stat 4: Last-Minute Larry
 * GET /api/stats/last-minute-larry
 * 
 * Percentage of picks submitted in final hour before deadline
 */
router.get('/last-minute-larry', async (_req: Request, res: Response) => {
  try {
    // Get active season
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .single();
    
    if (!season) {
      return res.json({ data: { leaderboard: [] } });
    }

    // Get all episodes with their lock times
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id, picks_lock_at')
      .eq('season_id', season.id);
    
    if (episodesError) throw episodesError;

    const episodeLockTimes: Record<string, Date> = {};
    (episodes || []).forEach((e) => {
      if (e.picks_lock_at) {
        episodeLockTimes[e.id] = new Date(e.picks_lock_at);
      }
    });

    // Get all picks with user info
    const { data: picks, error: picksError } = await supabase
      .from('weekly_picks')
      .select(`
        user_id,
        episode_id,
        submitted_at,
        users!inner(display_name)
      `)
      .not('submitted_at', 'is', null);
    
    if (picksError) throw picksError;

    // Count last-minute picks per user
    const userStats: Record<string, { 
      user_id: string; 
      display_name: string; 
      last_minute: number; 
      total: number 
    }> = {};

    (picks || []).forEach((pick: any) => {
      const lockTime = episodeLockTimes[pick.episode_id];
      if (!lockTime || !pick.submitted_at) return;

      const submittedAt = new Date(pick.submitted_at);
      const hourBeforeLock = new Date(lockTime.getTime() - 60 * 60 * 1000);
      const isLastMinute = submittedAt >= hourBeforeLock && submittedAt <= lockTime;

      if (!userStats[pick.user_id]) {
        userStats[pick.user_id] = {
          user_id: pick.user_id,
          display_name: pick.users?.display_name || 'Unknown',
          last_minute: 0,
          total: 0,
        };
      }

      userStats[pick.user_id].total++;
      if (isLastMinute) {
        userStats[pick.user_id].last_minute++;
      }
    });

    const leaderboard = Object.values(userStats)
      .filter((u) => u.total >= 3) // Minimum picks threshold
      .map((u) => ({
        user_id: u.user_id,
        display_name: u.display_name,
        last_minute_picks: u.last_minute,
        total_picks: u.total,
        ratio: u.total > 0 ? Math.round((u.last_minute / u.total) * 100) : 0,
      }))
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 10);

    res.json({ data: { leaderboard } });
  } catch (err) {
    console.error('Error fetching last-minute-larry stat:', err);
    res.status(500).json({ error: 'Failed to fetch stat' });
  }
});

/**
 * Stat 5: Early Bird
 * GET /api/stats/early-bird
 * 
 * Percentage of picks submitted within first hour of window opening
 */
router.get('/early-bird', async (_req: Request, res: Response) => {
  try {
    // Get active season
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .single();
    
    if (!season) {
      return res.json({ data: { leaderboard: [] } });
    }

    // Get all episodes with air dates (pick window opens after previous ep)
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id, number, air_date, picks_lock_at')
      .eq('season_id', season.id)
      .order('number', { ascending: true });
    
    if (episodesError) throw episodesError;

    // Build pick window open times (after previous episode air date)
    const episodeWindowOpen: Record<string, Date> = {};
    (episodes || []).forEach((e, i) => {
      if (i > 0 && episodes[i - 1].air_date) {
        // Pick window opens after previous episode airs
        episodeWindowOpen[e.id] = new Date(episodes[i - 1].air_date);
      } else if (e.air_date) {
        // For first episode, use a week before
        const windowOpen = new Date(e.air_date);
        windowOpen.setDate(windowOpen.getDate() - 7);
        episodeWindowOpen[e.id] = windowOpen;
      }
    });

    // Get all picks with user info
    const { data: picks, error: picksError } = await supabase
      .from('weekly_picks')
      .select(`
        user_id,
        episode_id,
        submitted_at,
        users!inner(display_name)
      `)
      .not('submitted_at', 'is', null);
    
    if (picksError) throw picksError;

    // Count early bird picks per user
    const userStats: Record<string, { 
      user_id: string; 
      display_name: string; 
      early: number; 
      total: number 
    }> = {};

    (picks || []).forEach((pick: any) => {
      const windowOpen = episodeWindowOpen[pick.episode_id];
      if (!windowOpen || !pick.submitted_at) return;

      const submittedAt = new Date(pick.submitted_at);
      const hourAfterOpen = new Date(windowOpen.getTime() + 60 * 60 * 1000);
      const isEarly = submittedAt >= windowOpen && submittedAt <= hourAfterOpen;

      if (!userStats[pick.user_id]) {
        userStats[pick.user_id] = {
          user_id: pick.user_id,
          display_name: pick.users?.display_name || 'Unknown',
          early: 0,
          total: 0,
        };
      }

      userStats[pick.user_id].total++;
      if (isEarly) {
        userStats[pick.user_id].early++;
      }
    });

    const leaderboard = Object.values(userStats)
      .filter((u) => u.total >= 3)
      .map((u) => ({
        user_id: u.user_id,
        display_name: u.display_name,
        early_picks: u.early,
        total_picks: u.total,
        ratio: u.total > 0 ? Math.round((u.early / u.total) * 100) : 0,
      }))
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 10);

    res.json({ data: { leaderboard } });
  } catch (err) {
    console.error('Error fetching early-bird stat:', err);
    res.status(500).json({ error: 'Failed to fetch stat' });
  }
});

/**
 * Stat 27: Submission Speed
 * GET /api/stats/submission-speed
 * 
 * Average time from window open to submission
 */
router.get('/submission-speed', async (_req: Request, res: Response) => {
  try {
    // Get active season
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .single();
    
    if (!season) {
      return res.json({ data: { leaderboard: [] } });
    }

    // Get all episodes with air dates
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id, number, air_date')
      .eq('season_id', season.id)
      .order('number', { ascending: true });
    
    if (episodesError) throw episodesError;

    // Build pick window open times
    const episodeWindowOpen: Record<string, Date> = {};
    (episodes || []).forEach((e, i) => {
      if (i > 0 && episodes[i - 1].air_date) {
        episodeWindowOpen[e.id] = new Date(episodes[i - 1].air_date);
      } else if (e.air_date) {
        const windowOpen = new Date(e.air_date);
        windowOpen.setDate(windowOpen.getDate() - 7);
        episodeWindowOpen[e.id] = windowOpen;
      }
    });

    // Get all picks with user info
    const { data: picks, error: picksError } = await supabase
      .from('weekly_picks')
      .select(`
        user_id,
        episode_id,
        submitted_at,
        users!inner(display_name)
      `)
      .not('submitted_at', 'is', null);
    
    if (picksError) throw picksError;

    // Calculate submission times per user
    const userStats: Record<string, { 
      user_id: string; 
      display_name: string; 
      total_hours: number;
      fastest: number;
      slowest: number;
      count: number 
    }> = {};

    (picks || []).forEach((pick: any) => {
      const windowOpen = episodeWindowOpen[pick.episode_id];
      if (!windowOpen || !pick.submitted_at) return;

      const submittedAt = new Date(pick.submitted_at);
      const hoursToSubmit = (submittedAt.getTime() - windowOpen.getTime()) / (1000 * 60 * 60);
      
      if (hoursToSubmit < 0) return; // Invalid - submitted before window

      if (!userStats[pick.user_id]) {
        userStats[pick.user_id] = {
          user_id: pick.user_id,
          display_name: pick.users?.display_name || 'Unknown',
          total_hours: 0,
          fastest: Infinity,
          slowest: 0,
          count: 0,
        };
      }

      userStats[pick.user_id].total_hours += hoursToSubmit;
      userStats[pick.user_id].count++;
      userStats[pick.user_id].fastest = Math.min(userStats[pick.user_id].fastest, hoursToSubmit);
      userStats[pick.user_id].slowest = Math.max(userStats[pick.user_id].slowest, hoursToSubmit);
    });

    const leaderboard = Object.values(userStats)
      .filter((u) => u.count >= 3)
      .map((u) => ({
        user_id: u.user_id,
        display_name: u.display_name,
        avg_hours_to_submit: u.count > 0 ? u.total_hours / u.count : 0,
        fastest_submission: u.fastest === Infinity ? 0 : u.fastest,
        slowest_submission: u.slowest,
      }))
      .sort((a, b) => a.avg_hours_to_submit - b.avg_hours_to_submit) // Fastest first
      .slice(0, 10);

    res.json({ data: { leaderboard } });
  } catch (err) {
    console.error('Error fetching submission-speed stat:', err);
    res.status(500).json({ error: 'Failed to fetch stat' });
  }
});

/**
 * Stat 24: Submission Timing Distribution
 * GET /api/stats/submission-timing
 * 
 * First hour vs last hour pick distribution per user
 */
router.get('/submission-timing', async (_req: Request, res: Response) => {
  try {
    // Get active season
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .single();
    
    if (!season) {
      return res.json({ data: { early_birds: [], procrastinators: [] } });
    }

    // Get all episodes with window times
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id, number, air_date, picks_lock_at')
      .eq('season_id', season.id)
      .order('number', { ascending: true });
    
    if (episodesError) throw episodesError;

    // Build episode timing info
    const episodeTiming: Record<string, { windowOpen: Date; lockTime: Date }> = {};
    (episodes || []).forEach((e, i) => {
      const lockTime = e.picks_lock_at ? new Date(e.picks_lock_at) : null;
      let windowOpen: Date | null = null;
      
      if (i > 0 && episodes[i - 1].air_date) {
        windowOpen = new Date(episodes[i - 1].air_date);
      } else if (e.air_date) {
        windowOpen = new Date(e.air_date);
        windowOpen.setDate(windowOpen.getDate() - 7);
      }

      if (windowOpen && lockTime) {
        episodeTiming[e.id] = { windowOpen, lockTime };
      }
    });

    // Get all picks with user info
    const { data: picks, error: picksError } = await supabase
      .from('weekly_picks')
      .select(`
        user_id,
        episode_id,
        submitted_at,
        users!inner(display_name)
      `)
      .not('submitted_at', 'is', null);
    
    if (picksError) throw picksError;

    // Track timing per user
    const userStats: Record<string, { 
      user_id: string; 
      display_name: string;
      first_hour: number;
      last_hour: number;
      total: number 
    }> = {};

    (picks || []).forEach((pick: any) => {
      const timing = episodeTiming[pick.episode_id];
      if (!timing || !pick.submitted_at) return;

      const submittedAt = new Date(pick.submitted_at);
      const firstHourEnd = new Date(timing.windowOpen.getTime() + 60 * 60 * 1000);
      const lastHourStart = new Date(timing.lockTime.getTime() - 60 * 60 * 1000);

      const isFirstHour = submittedAt >= timing.windowOpen && submittedAt <= firstHourEnd;
      const isLastHour = submittedAt >= lastHourStart && submittedAt <= timing.lockTime;

      if (!userStats[pick.user_id]) {
        userStats[pick.user_id] = {
          user_id: pick.user_id,
          display_name: pick.users?.display_name || 'Unknown',
          first_hour: 0,
          last_hour: 0,
          total: 0,
        };
      }

      userStats[pick.user_id].total++;
      if (isFirstHour) userStats[pick.user_id].first_hour++;
      if (isLastHour) userStats[pick.user_id].last_hour++;
    });

    const allUsers = Object.values(userStats).filter((u) => u.total >= 3);

    const early_birds = allUsers
      .map((u) => ({
        user_id: u.user_id,
        display_name: u.display_name,
        first_hour_picks: u.first_hour,
        total_picks: u.total,
        ratio: u.total > 0 ? Math.round((u.first_hour / u.total) * 100) : 0,
      }))
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 5);

    const procrastinators = allUsers
      .map((u) => ({
        user_id: u.user_id,
        display_name: u.display_name,
        last_hour_picks: u.last_hour,
        total_picks: u.total,
        ratio: u.total > 0 ? Math.round((u.last_hour / u.total) * 100) : 0,
      }))
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 5);

    res.json({ data: { early_birds, procrastinators } });
  } catch (err) {
    console.error('Error fetching submission-timing stat:', err);
    res.status(500).json({ error: 'Failed to fetch stat' });
  }
});

export default router;
