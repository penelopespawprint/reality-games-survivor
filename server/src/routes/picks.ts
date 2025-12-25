import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/authenticate.js';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { EmailService } from '../emails/index.js';

const router = Router();

// POST /api/leagues/:id/picks - Submit weekly pick
router.post('/:id/picks', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leagueId = req.params.id;
    const userId = req.user!.id;
    const { castaway_id, episode_id } = req.body;

    if (!castaway_id || !episode_id) {
      return res.status(400).json({ error: 'castaway_id and episode_id are required' });
    }

    // Check episode hasn't locked
    const { data: episode } = await supabase
      .from('episodes')
      .select('*')
      .eq('id', episode_id)
      .single();

    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    const lockTime = new Date(episode.picks_lock_at);
    if (new Date() >= lockTime) {
      return res.status(400).json({ error: 'Picks are locked for this episode' });
    }

    // Check user has this castaway on roster
    const { data: roster } = await supabase
      .from('rosters')
      .select('*')
      .eq('league_id', leagueId)
      .eq('user_id', userId)
      .eq('castaway_id', castaway_id)
      .is('dropped_at', null)
      .single();

    if (!roster) {
      return res.status(400).json({ error: 'Castaway not on your roster' });
    }

    // Check castaway is still active
    const { data: castaway } = await supabase
      .from('castaways')
      .select('status')
      .eq('id', castaway_id)
      .single();

    if (castaway?.status !== 'active') {
      return res.status(400).json({ error: 'Castaway is eliminated' });
    }

    // Upsert pick
    const { data: pick, error } = await supabaseAdmin
      .from('weekly_picks')
      .upsert({
        league_id: leagueId,
        user_id: userId,
        episode_id,
        castaway_id,
        status: 'pending',
        picked_at: new Date().toISOString(),
      }, {
        onConflict: 'league_id,user_id,episode_id',
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Send pick confirmation email (fire and forget)
    (async () => {
      try {
        // Get user and castaway details
        const { data: user } = await supabase
          .from('users')
          .select('email, display_name')
          .eq('id', userId)
          .single();

        const { data: castawayDetails } = await supabase
          .from('castaways')
          .select('name')
          .eq('id', castaway_id)
          .single();

        const { data: league } = await supabase
          .from('leagues')
          .select('name')
          .eq('id', leagueId)
          .single();

        if (user && castawayDetails && league) {
          await EmailService.sendPickConfirmed({
            displayName: user.display_name,
            email: user.email,
            castawayName: castawayDetails.name,
            leagueName: league.name,
            leagueId,
            episodeNumber: episode.number,
            picksLockAt: new Date(episode.picks_lock_at),
          });

          await EmailService.logNotification(
            userId,
            'email',
            `Pick confirmed: ${castawayDetails.name}`,
            `Your pick for Episode ${episode.number} has been confirmed.`
          );
        }
      } catch (emailErr) {
        console.error('Failed to send pick confirmation email:', emailErr);
      }
    })();

    res.json({ pick });
  } catch (err) {
    console.error('POST /api/leagues/:id/picks error:', err);
    res.status(500).json({ error: 'Failed to submit pick' });
  }
});

// GET /api/leagues/:id/picks/current - Get current week pick status
router.get('/:id/picks/current', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leagueId = req.params.id;
    const userId = req.user!.id;

    // Get league
    const { data: league } = await supabase
      .from('leagues')
      .select('season_id')
      .eq('id', leagueId)
      .single();

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Get current/next episode
    const now = new Date();
    const { data: episodes } = await supabase
      .from('episodes')
      .select('*')
      .eq('season_id', league.season_id)
      .gte('picks_lock_at', now.toISOString())
      .order('picks_lock_at', { ascending: true })
      .limit(1);

    const episode = episodes?.[0];

    if (!episode) {
      return res.json({
        episode: null,
        my_pick: null,
        deadline: null,
        roster: [],
      });
    }

    // Get user's pick for this episode
    const { data: pick } = await supabase
      .from('weekly_picks')
      .select('*, castaways(*)')
      .eq('league_id', leagueId)
      .eq('user_id', userId)
      .eq('episode_id', episode.id)
      .single();

    // Get user's roster
    const { data: roster } = await supabase
      .from('rosters')
      .select('*, castaways(*)')
      .eq('league_id', leagueId)
      .eq('user_id', userId)
      .is('dropped_at', null);

    res.json({
      episode: {
        id: episode.id,
        number: episode.number,
        title: episode.title,
        air_date: episode.air_date,
        picks_lock_at: episode.picks_lock_at,
      },
      my_pick: pick ? {
        castaway: (pick as any).castaways,
        status: pick.status,
        picked_at: pick.picked_at,
      } : null,
      deadline: episode.picks_lock_at,
      roster: roster?.map((r: any) => ({
        castaway: r.castaways,
        canPick: r.castaways?.status === 'active',
      })) || [],
    });
  } catch (err) {
    console.error('GET /api/leagues/:id/picks/current error:', err);
    res.status(500).json({ error: 'Failed to fetch current pick' });
  }
});

// POST /api/picks/lock - Lock all picks for current episode (cron)
router.post('/lock', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();

    // Find episodes that should be locked
    const { data: episodes } = await supabaseAdmin
      .from('episodes')
      .select('id')
      .lte('picks_lock_at', now.toISOString())
      .eq('is_scored', false);

    if (!episodes || episodes.length === 0) {
      return res.json({ locked: 0, episodes: [] });
    }

    const episodeIds = episodes.map((e) => e.id);

    // Lock all pending picks
    const { data, error } = await supabaseAdmin
      .from('weekly_picks')
      .update({
        status: 'locked',
        locked_at: now.toISOString(),
      })
      .eq('status', 'pending')
      .in('episode_id', episodeIds)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      locked: data?.length || 0,
      episodes: episodeIds,
    });
  } catch (err) {
    console.error('POST /api/picks/lock error:', err);
    res.status(500).json({ error: 'Failed to lock picks' });
  }
});

// POST /api/picks/auto-fill - Auto-pick for users who didn't submit (cron)
router.post('/auto-fill', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();

    // Find episodes past lock time
    const { data: episodes } = await supabaseAdmin
      .from('episodes')
      .select('id, season_id, number')
      .lte('picks_lock_at', now.toISOString())
      .eq('is_scored', false);

    if (!episodes || episodes.length === 0) {
      return res.json({ auto_picked: 0, users: [] });
    }

    const seasonIds = [...new Set(episodes.map((e) => e.season_id))];
    const episodeIds = episodes.map((e) => e.id);

    // Bulk fetch all data in parallel
    const [leaguesResult, existingPicksResult] = await Promise.all([
      supabaseAdmin
        .from('leagues')
        .select('id, season_id')
        .in('season_id', seasonIds)
        .eq('status', 'active'),
      supabaseAdmin
        .from('weekly_picks')
        .select('user_id, league_id, episode_id')
        .in('episode_id', episodeIds),
    ]);

    const leagues = leaguesResult.data || [];
    const existingPicks = existingPicksResult.data || [];

    if (leagues.length === 0) {
      return res.json({ auto_picked: 0, users: [] });
    }

    const leagueIds = leagues.map((l) => l.id);

    // Bulk fetch members and rosters for all leagues
    const [membersResult, rostersResult] = await Promise.all([
      supabaseAdmin
        .from('league_members')
        .select('user_id, league_id')
        .in('league_id', leagueIds),
      supabaseAdmin
        .from('rosters')
        .select('user_id, league_id, castaway_id, castaways(id, status)')
        .in('league_id', leagueIds)
        .is('dropped_at', null),
    ]);

    const members = membersResult.data || [];
    const rosters = rostersResult.data || [];

    // Build lookup maps for O(1) access
    const leaguesBySeasonMap = new Map<string, typeof leagues>();
    for (const league of leagues) {
      if (!leaguesBySeasonMap.has(league.season_id)) {
        leaguesBySeasonMap.set(league.season_id, []);
      }
      leaguesBySeasonMap.get(league.season_id)!.push(league);
    }

    const membersByLeagueMap = new Map<string, typeof members>();
    for (const member of members) {
      if (!membersByLeagueMap.has(member.league_id)) {
        membersByLeagueMap.set(member.league_id, []);
      }
      membersByLeagueMap.get(member.league_id)!.push(member);
    }

    // Key: `${league_id}:${episode_id}` -> Set of user_ids who picked
    const pickedUsersMap = new Map<string, Set<string>>();
    for (const pick of existingPicks) {
      const key = `${pick.league_id}:${pick.episode_id}`;
      if (!pickedUsersMap.has(key)) {
        pickedUsersMap.set(key, new Set());
      }
      pickedUsersMap.get(key)!.add(pick.user_id);
    }

    // Key: `${league_id}:${user_id}` -> first active castaway_id
    const activeRosterMap = new Map<string, string>();
    for (const roster of rosters) {
      const key = `${roster.league_id}:${roster.user_id}`;
      if (!activeRosterMap.has(key) && (roster as any).castaways?.status === 'active') {
        activeRosterMap.set(key, roster.castaway_id);
      }
    }

    // Build episode lookup
    const episodeMap = new Map(episodes.map((e) => [e.id, e]));

    // Process all combinations in memory
    const autoPicks: Array<{ user_id: string; episode_id: string; league_id: string; castaway_id: string }> = [];
    const picksToInsert: Array<{
      league_id: string;
      user_id: string;
      episode_id: string;
      castaway_id: string;
      status: string;
      picked_at: string;
      locked_at: string;
    }> = [];

    for (const episode of episodes) {
      const seasonLeagues = leaguesBySeasonMap.get(episode.season_id) || [];

      for (const league of seasonLeagues) {
        const leagueMembers = membersByLeagueMap.get(league.id) || [];
        const pickedKey = `${league.id}:${episode.id}`;
        const pickedUsers = pickedUsersMap.get(pickedKey) || new Set();

        for (const member of leagueMembers) {
          if (pickedUsers.has(member.user_id)) continue;

          const rosterKey = `${league.id}:${member.user_id}`;
          const activeCastawayId = activeRosterMap.get(rosterKey);

          if (activeCastawayId) {
            picksToInsert.push({
              league_id: league.id,
              user_id: member.user_id,
              episode_id: episode.id,
              castaway_id: activeCastawayId,
              status: 'auto_picked',
              picked_at: now.toISOString(),
              locked_at: now.toISOString(),
            });

            autoPicks.push({
              user_id: member.user_id,
              episode_id: episode.id,
              league_id: league.id,
              castaway_id: activeCastawayId,
            });
          }
        }
      }
    }

    // Bulk insert all auto-picks
    if (picksToInsert.length > 0) {
      await supabaseAdmin.from('weekly_picks').insert(picksToInsert);
    }

    // Send auto-pick alert emails (fire and forget with bulk lookups)
    if (autoPicks.length > 0) {
      (async () => {
        try {
          // Bulk fetch all needed data for emails
          const userIds = [...new Set(autoPicks.map((p) => p.user_id))];
          const castawayIds = [...new Set(autoPicks.map((p) => p.castaway_id))];
          const leagueIdsForEmail = [...new Set(autoPicks.map((p) => p.league_id))];

          const [usersResult, castawaysResult, leaguesResult] = await Promise.all([
            supabaseAdmin
              .from('users')
              .select('id, email, display_name')
              .in('id', userIds),
            supabaseAdmin
              .from('castaways')
              .select('id, name')
              .in('id', castawayIds),
            supabaseAdmin
              .from('leagues')
              .select('id, name')
              .in('id', leagueIdsForEmail),
          ]);

          const usersMap = new Map((usersResult.data || []).map((u) => [u.id, u]));
          const castawaysMap = new Map((castawaysResult.data || []).map((c) => [c.id, c]));
          const leaguesMap = new Map((leaguesResult.data || []).map((l) => [l.id, l]));

          // Send emails in parallel batches
          await Promise.all(
            autoPicks.map(async (autoPick) => {
              try {
                const user = usersMap.get(autoPick.user_id);
                const castaway = castawaysMap.get(autoPick.castaway_id);
                const league = leaguesMap.get(autoPick.league_id);
                const episode = episodeMap.get(autoPick.episode_id);

                if (user && castaway && league && episode) {
                  await EmailService.sendAutoPickAlert({
                    displayName: user.display_name,
                    email: user.email,
                    castawayName: castaway.name,
                    leagueName: league.name,
                    leagueId: autoPick.league_id,
                    episodeNumber: episode.number,
                  });

                  await EmailService.logNotification(
                    autoPick.user_id,
                    'email',
                    `Auto-pick applied: ${castaway.name}`,
                    `You missed the pick deadline for Episode ${episode.number}. We auto-selected ${castaway.name} for you.`
                  );
                }
              } catch (emailErr) {
                console.error('Failed to send auto-pick alert email:', emailErr);
              }
            })
          );
        } catch (bulkEmailErr) {
          console.error('Failed to send auto-pick alert emails:', bulkEmailErr);
        }
      })();
    }

    res.json({
      auto_picked: autoPicks.length,
      users: autoPicks.map((p) => p.user_id),
    });
  } catch (err) {
    console.error('POST /api/picks/auto-fill error:', err);
    res.status(500).json({ error: 'Failed to auto-fill picks' });
  }
});

export default router;
