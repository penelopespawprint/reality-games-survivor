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

/**
 * Stat 1: Successful Pick Ratio
 * GET /api/stats/successful-pick-ratio
 * 
 * Percentage of picks where the started castaway scored above episode average
 */
router.get('/successful-pick-ratio', async (_req: Request, res: Response) => {
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

    // Get scored episodes
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id')
      .eq('season_id', season.id)
      .eq('is_scored', true);
    
    if (episodesError) throw episodesError;
    const scoredEpisodeIds = new Set((episodes || []).map((e) => e.id));
    if (scoredEpisodeIds.size === 0) {
      return res.json({ data: { leaderboard: [] } });
    }

    // Get all episode scores to calculate averages
    const { data: scores, error: scoresError } = await supabase
      .from('episode_scores')
      .select('episode_id, castaway_id, points');
    
    if (scoresError) throw scoresError;

    // Calculate total points per castaway per episode
    const castawayEpisodePoints: Record<string, Record<string, number>> = {};
    (scores || []).forEach((s) => {
      if (!scoredEpisodeIds.has(s.episode_id)) return;
      if (!castawayEpisodePoints[s.episode_id]) {
        castawayEpisodePoints[s.episode_id] = {};
      }
      if (!castawayEpisodePoints[s.episode_id][s.castaway_id]) {
        castawayEpisodePoints[s.episode_id][s.castaway_id] = 0;
      }
      castawayEpisodePoints[s.episode_id][s.castaway_id] += Number(s.points) || 0;
    });

    // Calculate episode averages
    const episodeAverages: Record<string, number> = {};
    Object.entries(castawayEpisodePoints).forEach(([episodeId, castaways]) => {
      const values = Object.values(castaways);
      episodeAverages[episodeId] = values.length > 0 
        ? values.reduce((a, b) => a + b, 0) / values.length 
        : 0;
    });

    // Get all picks with user info
    const { data: picks, error: picksError } = await supabase
      .from('weekly_picks')
      .select(`
        user_id,
        episode_id,
        castaway_id,
        users!inner(display_name)
      `)
      .not('castaway_id', 'is', null);
    
    if (picksError) throw picksError;

    // Calculate success per user
    const userStats: Record<string, { 
      user_id: string; 
      display_name: string; 
      successful: number; 
      total: number 
    }> = {};

    (picks || []).forEach((pick: any) => {
      if (!scoredEpisodeIds.has(pick.episode_id)) return;
      if (!pick.castaway_id) return;

      const castawayPoints = castawayEpisodePoints[pick.episode_id]?.[pick.castaway_id] || 0;
      const avgPoints = episodeAverages[pick.episode_id] || 0;
      const isSuccessful = castawayPoints >= avgPoints;

      if (!userStats[pick.user_id]) {
        userStats[pick.user_id] = {
          user_id: pick.user_id,
          display_name: pick.users?.display_name || 'Unknown',
          successful: 0,
          total: 0,
        };
      }

      userStats[pick.user_id].total++;
      if (isSuccessful) {
        userStats[pick.user_id].successful++;
      }
    });

    const leaderboard = Object.values(userStats)
      .filter((u) => u.total >= 3)
      .map((u) => ({
        user_id: u.user_id,
        display_name: u.display_name,
        successful_picks: u.successful,
        total_picks: u.total,
        ratio: u.total > 0 ? Math.round((u.successful / u.total) * 100) : 0,
      }))
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 10);

    res.json({ data: { leaderboard } });
  } catch (err) {
    console.error('Error fetching successful-pick-ratio stat:', err);
    res.status(500).json({ error: 'Failed to fetch stat' });
  }
});

/**
 * Stat 14: Most Active Player
 * GET /api/stats/most-active
 * 
 * Composite engagement score from picks, messages, and activity
 */
router.get('/most-active', async (_req: Request, res: Response) => {
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

    // Get pick counts per user
    const { data: picks, error: picksError } = await supabase
      .from('weekly_picks')
      .select(`
        user_id,
        users!inner(display_name)
      `);
    
    if (picksError) throw picksError;

    // Get message counts per user
    const { data: messages, error: messagesError } = await supabase
      .from('league_messages')
      .select('user_id');
    
    if (messagesError) throw messagesError;

    // Get chat message counts per user  
    const { data: chatMessages, error: chatError } = await supabase
      .from('chat_messages')
      .select('user_id');
    
    if (chatError) throw chatError;

    // Aggregate activity
    const userActivity: Record<string, { 
      user_id: string; 
      display_name: string; 
      picks: number;
      messages: number;
    }> = {};

    (picks || []).forEach((p: any) => {
      if (!userActivity[p.user_id]) {
        userActivity[p.user_id] = {
          user_id: p.user_id,
          display_name: p.users?.display_name || 'Unknown',
          picks: 0,
          messages: 0,
        };
      }
      userActivity[p.user_id].picks++;
    });

    (messages || []).forEach((m) => {
      if (userActivity[m.user_id]) {
        userActivity[m.user_id].messages++;
      }
    });

    (chatMessages || []).forEach((m) => {
      if (userActivity[m.user_id]) {
        userActivity[m.user_id].messages++;
      }
    });

    // Calculate composite score (weighted)
    const leaderboard = Object.values(userActivity)
      .map((u) => ({
        user_id: u.user_id,
        display_name: u.display_name,
        picks_count: u.picks,
        messages_count: u.messages,
        // Picks count more (x3) than messages (x1)
        composite_score: (u.picks * 3) + u.messages,
      }))
      .filter((u) => u.composite_score > 0)
      .sort((a, b) => b.composite_score - a.composite_score)
      .slice(0, 10);

    res.json({ data: { leaderboard } });
  } catch (err) {
    console.error('Error fetching most-active stat:', err);
    res.status(500).json({ error: 'Failed to fetch stat' });
  }
});

/**
 * Stat 15: Most Improved / Most Declined
 * GET /api/stats/improvement-trend
 * 
 * Week over week point trends
 */
router.get('/improvement-trend', async (_req: Request, res: Response) => {
  try {
    // Get active season
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .single();
    
    if (!season) {
      return res.json({ data: { most_improved: [], most_declined: [] } });
    }

    // Get scored episodes in order
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id, number')
      .eq('season_id', season.id)
      .eq('is_scored', true)
      .order('number', { ascending: true });
    
    if (episodesError) throw episodesError;

    if (!episodes || episodes.length < 4) {
      return res.json({ data: { most_improved: [], most_declined: [] } });
    }

    const episodeIds = episodes.map((e) => e.id);
    const midpoint = Math.floor(episodeIds.length / 2);
    const firstHalfIds = new Set(episodeIds.slice(0, midpoint));
    const secondHalfIds = new Set(episodeIds.slice(midpoint));

    // Get all episode scores
    const { data: scores, error: scoresError } = await supabase
      .from('episode_scores')
      .select('episode_id, castaway_id, points');
    
    if (scoresError) throw scoresError;

    // Calculate castaway points per episode
    const castawayEpisodePoints: Record<string, Record<string, number>> = {};
    (scores || []).forEach((s) => {
      if (!castawayEpisodePoints[s.episode_id]) {
        castawayEpisodePoints[s.episode_id] = {};
      }
      if (!castawayEpisodePoints[s.episode_id][s.castaway_id]) {
        castawayEpisodePoints[s.episode_id][s.castaway_id] = 0;
      }
      castawayEpisodePoints[s.episode_id][s.castaway_id] += Number(s.points) || 0;
    });

    // Get all picks with user info
    const { data: picks, error: picksError } = await supabase
      .from('weekly_picks')
      .select(`
        user_id,
        episode_id,
        castaway_id,
        users!inner(display_name)
      `)
      .not('castaway_id', 'is', null);
    
    if (picksError) throw picksError;

    // Calculate points per half for each user
    const userStats: Record<string, { 
      user_id: string; 
      display_name: string;
      first_half_total: number;
      first_half_count: number;
      second_half_total: number;
      second_half_count: number;
    }> = {};

    (picks || []).forEach((pick: any) => {
      if (!pick.castaway_id) return;
      
      const isFirstHalf = firstHalfIds.has(pick.episode_id);
      const isSecondHalf = secondHalfIds.has(pick.episode_id);
      if (!isFirstHalf && !isSecondHalf) return;

      const points = castawayEpisodePoints[pick.episode_id]?.[pick.castaway_id] || 0;

      if (!userStats[pick.user_id]) {
        userStats[pick.user_id] = {
          user_id: pick.user_id,
          display_name: pick.users?.display_name || 'Unknown',
          first_half_total: 0,
          first_half_count: 0,
          second_half_total: 0,
          second_half_count: 0,
        };
      }

      if (isFirstHalf) {
        userStats[pick.user_id].first_half_total += points;
        userStats[pick.user_id].first_half_count++;
      } else {
        userStats[pick.user_id].second_half_total += points;
        userStats[pick.user_id].second_half_count++;
      }
    });

    // Calculate improvement
    const allUsers = Object.values(userStats)
      .filter((u) => u.first_half_count >= 2 && u.second_half_count >= 2)
      .map((u) => {
        const firstHalfAvg = u.first_half_count > 0 ? u.first_half_total / u.first_half_count : 0;
        const secondHalfAvg = u.second_half_count > 0 ? u.second_half_total / u.second_half_count : 0;
        return {
          user_id: u.user_id,
          display_name: u.display_name,
          first_half_avg: Math.round(firstHalfAvg * 10) / 10,
          second_half_avg: Math.round(secondHalfAvg * 10) / 10,
          improvement: Math.round((secondHalfAvg - firstHalfAvg) * 10) / 10,
        };
      });

    const most_improved = allUsers
      .filter((u) => u.improvement > 0)
      .sort((a, b) => b.improvement - a.improvement)
      .slice(0, 5);

    const most_declined = allUsers
      .filter((u) => u.improvement < 0)
      .sort((a, b) => a.improvement - b.improvement) // Most negative first
      .slice(0, 5)
      .map((u) => ({
        ...u,
        decline: Math.abs(u.improvement),
      }));

    res.json({ data: { most_improved, most_declined } });
  } catch (err) {
    console.error('Error fetching improvement-trend stat:', err);
    res.status(500).json({ error: 'Failed to fetch stat' });
  }
});

/**
 * Stat 2: Luckiest Player
 * GET /api/stats/luckiest-player
 * 
 * Most points earned from castaways in their final episode before elimination
 */
router.get('/luckiest-player', async (_req: Request, res: Response) => {
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

    // Get eliminated castaways
    const { data: castaways, error: castawaysError } = await supabase
      .from('castaways')
      .select('id, name, eliminated_episode_id')
      .eq('season_id', season.id)
      .eq('status', 'eliminated')
      .not('eliminated_episode_id', 'is', null);
    
    if (castawaysError) throw castawaysError;

    // Build map of castaway to elimination episode
    const eliminationEpisodes: Record<string, string> = {};
    (castaways || []).forEach((c) => {
      if (c.eliminated_episode_id) {
        eliminationEpisodes[c.id] = c.eliminated_episode_id;
      }
    });

    if (Object.keys(eliminationEpisodes).length === 0) {
      return res.json({ data: { leaderboard: [] } });
    }

    // Get all episode scores for eliminated castaways
    const { data: scores, error: scoresError } = await supabase
      .from('episode_scores')
      .select('episode_id, castaway_id, points');
    
    if (scoresError) throw scoresError;

    // Calculate final episode points per castaway
    const finalEpisodePoints: Record<string, number> = {};
    (scores || []).forEach((s) => {
      const elimEp = eliminationEpisodes[s.castaway_id];
      if (elimEp === s.episode_id) {
        finalEpisodePoints[s.castaway_id] = (finalEpisodePoints[s.castaway_id] || 0) + Number(s.points);
      }
    });

    // Get picks where user had the eliminated castaway in their final episode
    const { data: picks, error: picksError } = await supabase
      .from('weekly_picks')
      .select(`
        user_id,
        episode_id,
        castaway_id,
        users!inner(display_name)
      `)
      .not('castaway_id', 'is', null);
    
    if (picksError) throw picksError;

    // Calculate luck points per user
    const userStats: Record<string, { 
      user_id: string; 
      display_name: string; 
      luck_points: number;
      castaways_count: number;
    }> = {};

    (picks || []).forEach((pick: any) => {
      if (!pick.castaway_id) return;
      
      const elimEp = eliminationEpisodes[pick.castaway_id];
      if (elimEp !== pick.episode_id) return; // Only count if this was the elimination episode

      const points = finalEpisodePoints[pick.castaway_id] || 0;

      if (!userStats[pick.user_id]) {
        userStats[pick.user_id] = {
          user_id: pick.user_id,
          display_name: pick.users?.display_name || 'Unknown',
          luck_points: 0,
          castaways_count: 0,
        };
      }

      userStats[pick.user_id].luck_points += points;
      userStats[pick.user_id].castaways_count++;
    });

    const leaderboard = Object.values(userStats)
      .filter((u) => u.castaways_count > 0)
      .sort((a, b) => b.luck_points - a.luck_points)
      .slice(0, 10);

    res.json({ data: { leaderboard } });
  } catch (err) {
    console.error('Error fetching luckiest-player stat:', err);
    res.status(500).json({ error: 'Failed to fetch stat' });
  }
});

/**
 * Stat 3: Unluckiest Player
 * GET /api/stats/unluckiest-player
 * 
 * Most potential points lost due to castaways being eliminated right after being drafted/added
 */
router.get('/unluckiest-player', async (_req: Request, res: Response) => {
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

    // Get episodes in order
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id, number')
      .eq('season_id', season.id)
      .order('number', { ascending: true });
    
    if (episodesError) throw episodesError;

    const episodeNumbers: Record<string, number> = {};
    (episodes || []).forEach((e) => {
      episodeNumbers[e.id] = e.number;
    });

    // Get eliminated castaways
    const { data: castaways, error: castawaysError } = await supabase
      .from('castaways')
      .select('id, name, eliminated_episode_id')
      .eq('season_id', season.id)
      .eq('status', 'eliminated')
      .not('eliminated_episode_id', 'is', null);
    
    if (castawaysError) throw castawaysError;

    // Map castaway to elimination episode number
    const eliminationNumbers: Record<string, number> = {};
    (castaways || []).forEach((c) => {
      if (c.eliminated_episode_id && episodeNumbers[c.eliminated_episode_id]) {
        eliminationNumbers[c.id] = episodeNumbers[c.eliminated_episode_id];
      }
    });

    // Get all rosters (draft picks)
    const { data: rosters, error: rostersError } = await supabase
      .from('rosters')
      .select(`
        user_id,
        castaway_id,
        acquired_at,
        users!inner(display_name)
      `);
    
    if (rostersError) throw rostersError;

    // Calculate missed points (assume average of 10 points per episode remaining)
    const userStats: Record<string, { 
      user_id: string; 
      display_name: string; 
      missed_points: number;
      eliminations_count: number;
    }> = {};

    const totalEpisodes = episodes?.length || 14;

    (rosters || []).forEach((roster: any) => {
      if (!roster.castaway_id) return;
      
      const elimNumber = eliminationNumbers[roster.castaway_id];
      if (!elimNumber) return; // Castaway not eliminated

      // Estimate missed potential points: ~10 points per episode remaining
      const episodesRemaining = totalEpisodes - elimNumber;
      const missedPoints = Math.max(0, episodesRemaining * 10);

      if (!userStats[roster.user_id]) {
        userStats[roster.user_id] = {
          user_id: roster.user_id,
          display_name: roster.users?.display_name || 'Unknown',
          missed_points: 0,
          eliminations_count: 0,
        };
      }

      userStats[roster.user_id].missed_points += missedPoints;
      userStats[roster.user_id].eliminations_count++;
    });

    const leaderboard = Object.values(userStats)
      .filter((u) => u.eliminations_count > 0)
      .sort((a, b) => b.missed_points - a.missed_points)
      .slice(0, 10);

    res.json({ data: { leaderboard } });
  } catch (err) {
    console.error('Error fetching unluckiest-player stat:', err);
    res.status(500).json({ error: 'Failed to fetch stat' });
  }
});

/**
 * Stat 9: Curse Carrier
 * GET /api/stats/curse-carrier
 * 
 * Users whose newly added castaways get eliminated most frequently
 */
router.get('/curse-carrier', async (_req: Request, res: Response) => {
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

    // Get episodes in order
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id, number')
      .eq('season_id', season.id)
      .order('number', { ascending: true });
    
    if (episodesError) throw episodesError;

    const episodeNumbers: Record<string, number> = {};
    (episodes || []).forEach((e) => {
      episodeNumbers[e.id] = e.number;
    });

    // Get eliminated castaways
    const { data: castaways, error: castawaysError } = await supabase
      .from('castaways')
      .select('id, name, eliminated_episode_id')
      .eq('season_id', season.id)
      .eq('status', 'eliminated')
      .not('eliminated_episode_id', 'is', null);
    
    if (castawaysError) throw castawaysError;

    // Map castaway to elimination episode number
    const eliminationNumbers: Record<string, number> = {};
    (castaways || []).forEach((c) => {
      if (c.eliminated_episode_id && episodeNumbers[c.eliminated_episode_id]) {
        eliminationNumbers[c.id] = episodeNumbers[c.eliminated_episode_id];
      }
    });

    // Get all rosters
    const { data: rosters, error: rostersError } = await supabase
      .from('rosters')
      .select(`
        user_id,
        castaway_id,
        draft_round,
        users!inner(display_name)
      `);
    
    if (rostersError) throw rostersError;

    // Track cursed castaways per user (eliminated within 2 episodes of being drafted)
    const userStats: Record<string, { 
      user_id: string; 
      display_name: string; 
      cursed_castaways: number;
      total_castaways: number;
    }> = {};

    (rosters || []).forEach((roster: any) => {
      if (!roster.castaway_id) return;

      if (!userStats[roster.user_id]) {
        userStats[roster.user_id] = {
          user_id: roster.user_id,
          display_name: roster.users?.display_name || 'Unknown',
          cursed_castaways: 0,
          total_castaways: 0,
        };
      }

      userStats[roster.user_id].total_castaways++;

      const elimNumber = eliminationNumbers[roster.castaway_id];
      if (!elimNumber) return; // Not eliminated

      // Consider "cursed" if eliminated in first 3 episodes after draft
      // Since draft happens before episode 1, eliminated in eps 1-3 = cursed
      if (elimNumber <= 3) {
        userStats[roster.user_id].cursed_castaways++;
      }
    });

    const leaderboard = Object.values(userStats)
      .filter((u) => u.total_castaways >= 2)
      .map((u) => ({
        ...u,
        curse_rate: u.total_castaways > 0 
          ? Math.round((u.cursed_castaways / u.total_castaways) * 100) 
          : 0,
      }))
      .sort((a, b) => b.cursed_castaways - a.cursed_castaways)
      .slice(0, 10);

    res.json({ data: { leaderboard } });
  } catch (err) {
    console.error('Error fetching curse-carrier stat:', err);
    res.status(500).json({ error: 'Failed to fetch stat' });
  }
});

/**
 * Stat 16: Biggest Bust (Castaway)
 * GET /api/stats/biggest-bust
 * 
 * Castaway with highest average draft position but lowest points per game
 */
router.get('/biggest-bust', async (_req: Request, res: Response) => {
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

    // Get castaways
    const { data: castaways, error: castawaysError } = await supabase
      .from('castaways')
      .select('id, name')
      .eq('season_id', season.id);
    
    if (castawaysError) throw castawaysError;

    // Get draft picks to calculate average draft position
    const { data: rosters, error: rostersError } = await supabase
      .from('rosters')
      .select('castaway_id, draft_pick');
    
    if (rostersError) throw rostersError;

    // Calculate average draft position per castaway
    const draftStats: Record<string, { totalPick: number; count: number }> = {};
    (rosters || []).forEach((r) => {
      if (!r.castaway_id || !r.draft_pick) return;
      if (!draftStats[r.castaway_id]) {
        draftStats[r.castaway_id] = { totalPick: 0, count: 0 };
      }
      draftStats[r.castaway_id].totalPick += r.draft_pick;
      draftStats[r.castaway_id].count++;
    });

    // Get episode scores
    const { data: scores, error: scoresError } = await supabase
      .from('episode_scores')
      .select('castaway_id, episode_id, points');
    
    if (scoresError) throw scoresError;

    // Calculate points per episode per castaway
    const pointStats: Record<string, { total: number; episodes: Set<string> }> = {};
    (scores || []).forEach((s) => {
      if (!pointStats[s.castaway_id]) {
        pointStats[s.castaway_id] = { total: 0, episodes: new Set() };
      }
      pointStats[s.castaway_id].total += Number(s.points) || 0;
      pointStats[s.castaway_id].episodes.add(s.episode_id);
    });

    // Calculate bust score for each castaway
    const leaderboard = (castaways || [])
      .map((c) => {
        const draft = draftStats[c.id];
        const points = pointStats[c.id];
        
        if (!draft || draft.count === 0) return null;
        if (!points || points.episodes.size === 0) return null;

        const avgDraftPosition = draft.totalPick / draft.count;
        const pointsPerEpisode = points.total / points.episodes.size;
        
        // Bust score: higher = bigger bust (early draft pick with low PPE)
        // We want to highlight high picks who underperformed
        // Only consider early picks (top 12) as potential busts
        if (avgDraftPosition > 12) return null;
        
        const bustScore = pointsPerEpisode > 0 ? (13 - avgDraftPosition) / pointsPerEpisode : 0;

        return {
          castaway_id: c.id,
          name: c.name,
          avg_draft_position: Math.round(avgDraftPosition * 10) / 10,
          points_per_episode: Math.round(pointsPerEpisode * 10) / 10,
          bust_score: Math.round(bustScore * 100) / 100,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => b.bust_score - a.bust_score) // Higher = bigger bust
      .slice(0, 10);

    res.json({ data: { leaderboard } });
  } catch (err) {
    console.error('Error fetching biggest-bust stat:', err);
    res.status(500).json({ error: 'Failed to fetch stat' });
  }
});

/**
 * Stat 17: Biggest Steal (Castaway)
 * GET /api/stats/biggest-steal
 * 
 * Castaway with lowest average draft position but highest points per game
 */
router.get('/biggest-steal', async (_req: Request, res: Response) => {
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

    // Get castaways
    const { data: castaways, error: castawaysError } = await supabase
      .from('castaways')
      .select('id, name')
      .eq('season_id', season.id);
    
    if (castawaysError) throw castawaysError;

    // Get draft picks to calculate average draft position
    const { data: rosters, error: rostersError } = await supabase
      .from('rosters')
      .select('castaway_id, draft_pick');
    
    if (rostersError) throw rostersError;

    // Calculate average draft position per castaway
    const draftStats: Record<string, { totalPick: number; count: number }> = {};
    (rosters || []).forEach((r) => {
      if (!r.castaway_id || !r.draft_pick) return;
      if (!draftStats[r.castaway_id]) {
        draftStats[r.castaway_id] = { totalPick: 0, count: 0 };
      }
      draftStats[r.castaway_id].totalPick += r.draft_pick;
      draftStats[r.castaway_id].count++;
    });

    // Get episode scores
    const { data: scores, error: scoresError } = await supabase
      .from('episode_scores')
      .select('castaway_id, episode_id, points');
    
    if (scoresError) throw scoresError;

    // Calculate points per episode per castaway
    const pointStats: Record<string, { total: number; episodes: Set<string> }> = {};
    (scores || []).forEach((s) => {
      if (!pointStats[s.castaway_id]) {
        pointStats[s.castaway_id] = { total: 0, episodes: new Set() };
      }
      pointStats[s.castaway_id].total += Number(s.points) || 0;
      pointStats[s.castaway_id].episodes.add(s.episode_id);
    });

    // Calculate steal score for each castaway
    const leaderboard = (castaways || [])
      .map((c) => {
        const draft = draftStats[c.id];
        const points = pointStats[c.id];
        
        if (!draft || draft.count === 0) return null;
        if (!points || points.episodes.size === 0) return null;

        const avgDraftPosition = draft.totalPick / draft.count;
        const pointsPerEpisode = points.total / points.episodes.size;
        
        // Steal score: higher = bigger steal (late draft position, high PPE)
        // Only consider late picks (pick 10+) as potential steals
        if (avgDraftPosition < 10) return null;
        
        const stealScore = pointsPerEpisode * avgDraftPosition;

        return {
          castaway_id: c.id,
          name: c.name,
          avg_draft_position: Math.round(avgDraftPosition * 10) / 10,
          points_per_episode: Math.round(pointsPerEpisode * 10) / 10,
          steal_score: Math.round(stealScore * 100) / 100,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => b.steal_score - a.steal_score) // Higher = bigger steal
      .slice(0, 10);

    res.json({ data: { leaderboard } });
  } catch (err) {
    console.error('Error fetching biggest-steal stat:', err);
    res.status(500).json({ error: 'Failed to fetch stat' });
  }
});

/**
 * Stat 18: Most Consistent / Most Volatile (Castaway)
 * GET /api/stats/consistency
 * 
 * Standard deviation of weekly scores
 */
router.get('/consistency', async (_req: Request, res: Response) => {
  try {
    // Get active season
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .single();
    
    if (!season) {
      return res.json({ data: { most_consistent: [], most_volatile: [] } });
    }

    // Get castaways
    const { data: castaways, error: castawaysError } = await supabase
      .from('castaways')
      .select('id, name')
      .eq('season_id', season.id);
    
    if (castawaysError) throw castawaysError;

    // Get scored episodes
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id')
      .eq('season_id', season.id)
      .eq('is_scored', true);
    
    if (episodesError) throw episodesError;
    const scoredEpisodeIds = new Set((episodes || []).map((e) => e.id));

    // Get episode scores
    const { data: scores, error: scoresError } = await supabase
      .from('episode_scores')
      .select('castaway_id, episode_id, points');
    
    if (scoresError) throw scoresError;

    // Group scores by castaway and episode
    const castawayEpisodePoints: Record<string, Record<string, number>> = {};
    (scores || []).forEach((s) => {
      if (!scoredEpisodeIds.has(s.episode_id)) return;
      if (!castawayEpisodePoints[s.castaway_id]) {
        castawayEpisodePoints[s.castaway_id] = {};
      }
      if (!castawayEpisodePoints[s.castaway_id][s.episode_id]) {
        castawayEpisodePoints[s.castaway_id][s.episode_id] = 0;
      }
      castawayEpisodePoints[s.castaway_id][s.episode_id] += Number(s.points) || 0;
    });

    // Calculate standard deviation for each castaway
    const castawayStats = (castaways || [])
      .map((c) => {
        const episodeScores = castawayEpisodePoints[c.id];
        if (!episodeScores) return null;
        
        const values = Object.values(episodeScores);
        if (values.length < 2) return null; // Need at least 2 episodes

        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(variance);

        return {
          castaway_id: c.id,
          name: c.name,
          avg_points: Math.round(mean * 10) / 10,
          std_dev: Math.round(stdDev * 10) / 10,
          episodes_played: values.length,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    const most_consistent = [...castawayStats]
      .sort((a, b) => a.std_dev - b.std_dev) // Lower std dev = more consistent
      .slice(0, 5);

    const most_volatile = [...castawayStats]
      .sort((a, b) => b.std_dev - a.std_dev) // Higher std dev = more volatile
      .slice(0, 5);

    res.json({ data: { most_consistent, most_volatile } });
  } catch (err) {
    console.error('Error fetching consistency stat:', err);
    res.status(500).json({ error: 'Failed to fetch stat' });
  }
});

export default router;