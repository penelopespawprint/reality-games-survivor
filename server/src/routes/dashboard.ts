import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/authenticate.js';
import { supabase } from '../config/supabase.js';

const router = Router();

type Phase = 'picks_locked' | 'awaiting_results' | 'results_posted' | 'make_pick' | 'pre_season' | 'draft';

interface DashboardResponse {
  phase: Phase;
  primaryCta: {
    label: string;
    action: string;
    urgent: boolean;
  };
  countdown: {
    label: string;
    targetTime: string;
  } | null;
  currentEpisode: {
    number: number;
    airDate: string;
    title?: string;
  } | null;
  userStatus: {
    pickSubmitted: boolean;
    draftComplete: boolean;
  };
  standings: {
    rank: number;
    totalPlayers: number;
    points: number;
    movement: number;
  } | null;
  alerts: Array<{ type: string; message: string }>;
}

function getCurrentPhase(now: Date, episode: any): Phase {
  if (!episode) return 'pre_season';

  const picksLockAt = new Date(episode.picks_lock_at);
  const airDate = new Date(episode.air_date);
  const resultsPostedAt = episode.results_posted_at ? new Date(episode.results_posted_at) : null;

  if (now < picksLockAt) return 'make_pick';
  if (now < airDate) return 'picks_locked';
  if (!resultsPostedAt || now < resultsPostedAt) return 'awaiting_results';
  return 'results_posted';
}

// GET /api/dashboard - Phase-aware dashboard data
router.get('/dashboard', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const leagueId = req.query.league_id as string | undefined;

    // Get active season
    const { data: season } = await supabase
      .from('seasons')
      .select('*')
      .eq('is_active', true)
      .single();

    if (!season) {
      return res.json({
        phase: 'pre_season',
        primaryCta: { label: 'No Active Season', action: '/', urgent: false },
        countdown: null,
        currentEpisode: null,
        userStatus: { pickSubmitted: false, draftComplete: false },
        standings: null,
        alerts: [],
      } as DashboardResponse);
    }

    // Get current/next episode
    const now = new Date();
    const { data: episodes } = await supabase
      .from('episodes')
      .select('*')
      .eq('season_id', season.id)
      .gte('air_date', now.toISOString())
      .order('air_date', { ascending: true })
      .limit(1);

    const currentEpisode = episodes?.[0] || null;
    const phase = getCurrentPhase(now, currentEpisode);

    // Get user's league membership
    let standings = null;
    let userStatus = {
      pickSubmitted: false,
      draftComplete: false,
    };

    if (leagueId) {
      // Get membership
      const { data: membership } = await supabase
        .from('league_members')
        .select('*')
        .eq('league_id', leagueId)
        .eq('user_id', userId)
        .single();

      if (membership) {
        // Get total members in league
        const { count } = await supabase
          .from('league_members')
          .select('*', { count: 'exact', head: true })
          .eq('league_id', leagueId);

        standings = {
          rank: membership.rank || 0,
          totalPlayers: count || 0,
          points: membership.total_points || 0,
          movement: 0, // TODO: Calculate from previous week
        };
      }

      // Check if draft complete
      const { data: league } = await supabase
        .from('leagues')
        .select('draft_status')
        .eq('id', leagueId)
        .single();

      userStatus.draftComplete = league?.draft_status === 'completed';

      // Check if pick submitted for current episode
      if (currentEpisode) {
        const { data: pick } = await supabase
          .from('weekly_picks')
          .select('id')
          .eq('league_id', leagueId)
          .eq('user_id', userId)
          .eq('episode_id', currentEpisode.id)
          .single();

        userStatus.pickSubmitted = !!pick;
      }
    }

    // Build primary CTA based on phase
    let primaryCta = { label: 'View Dashboard', action: '/dashboard', urgent: false };
    let countdown = null;

    switch (phase) {
      case 'draft':
        primaryCta = { label: 'Complete Your Draft', action: `/leagues/${leagueId}/draft`, urgent: true };
        break;
      case 'make_pick':
        if (!userStatus.pickSubmitted) {
          primaryCta = { label: 'Make Your Pick', action: `/leagues/${leagueId}/pick`, urgent: true };
          if (currentEpisode) {
            countdown = { label: 'Picks lock in', targetTime: currentEpisode.picks_lock_at };
          }
        } else {
          primaryCta = { label: 'View Your Pick', action: `/leagues/${leagueId}/pick`, urgent: false };
        }
        break;
      case 'picks_locked':
        primaryCta = { label: "View Tonight's Episode", action: `/leagues/${leagueId}`, urgent: false };
        if (currentEpisode) {
          countdown = { label: 'Episode airs in', targetTime: currentEpisode.air_date };
        }
        break;
      case 'awaiting_results':
        primaryCta = { label: 'Results Coming Friday', action: `/leagues/${leagueId}`, urgent: false };
        break;
      case 'results_posted':
        primaryCta = { label: 'View Your Scores', action: `/leagues/${leagueId}/episodes/${currentEpisode?.id}`, urgent: false };
        break;
    }

    const alerts: Array<{ type: string; message: string }> = [];

    res.json({
      phase,
      primaryCta,
      countdown,
      currentEpisode: currentEpisode ? {
        number: currentEpisode.number,
        airDate: currentEpisode.air_date,
        title: currentEpisode.title,
      } : null,
      userStatus,
      standings,
      alerts,
    } as DashboardResponse);
  } catch (err) {
    console.error('GET /api/dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

export default router;
