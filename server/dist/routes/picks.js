import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authenticate.js';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { EmailService } from '../emails/index.js';
const router = Router();
// POST /api/leagues/:id/picks - Submit weekly pick
router.post('/:id/picks', authenticate, async (req, res) => {
    try {
        const leagueId = req.params.id;
        const userId = req.user.id;
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
        // Verify league membership
        const { data: membership } = await supabase
            .from('league_members')
            .select('*')
            .eq('league_id', leagueId)
            .eq('user_id', userId)
            .single();
        if (!membership) {
            return res.status(403).json({ error: 'You are not a member of this league' });
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
                    await EmailService.logNotification(userId, 'email', `Pick confirmed: ${castawayDetails.name}`, `Your pick for Episode ${episode.number} has been confirmed.`);
                }
            }
            catch (emailErr) {
                console.error('Failed to send pick confirmation email:', emailErr);
            }
        })();
        res.json({ pick });
    }
    catch (err) {
        console.error('POST /api/leagues/:id/picks error:', err);
        res.status(500).json({ error: 'Failed to submit pick' });
    }
});
// GET /api/leagues/:id/picks/current - Get current week pick status
router.get('/:id/picks/current', authenticate, async (req, res) => {
    try {
        const leagueId = req.params.id;
        const userId = req.user.id;
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
                castaway: pick.castaways,
                status: pick.status,
                picked_at: pick.picked_at,
            } : null,
            deadline: episode.picks_lock_at,
            roster: roster?.map((r) => ({
                castaway: r.castaways,
                canPick: r.castaways?.status === 'active',
            })) || [],
        });
    }
    catch (err) {
        console.error('GET /api/leagues/:id/picks/current error:', err);
        res.status(500).json({ error: 'Failed to fetch current pick' });
    }
});
// POST /api/picks/lock - Lock all picks for current episode (cron)
router.post('/lock', requireAdmin, async (req, res) => {
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
    }
    catch (err) {
        console.error('POST /api/picks/lock error:', err);
        res.status(500).json({ error: 'Failed to lock picks' });
    }
});
// POST /api/picks/auto-fill - Auto-pick for users who didn't submit (cron)
router.post('/auto-fill', requireAdmin, async (req, res) => {
    try {
        const now = new Date();
        // Find episodes past lock time
        const { data: episodes } = await supabaseAdmin
            .from('episodes')
            .select('id, season_id')
            .lte('picks_lock_at', now.toISOString())
            .eq('is_scored', false);
        if (!episodes || episodes.length === 0) {
            return res.json({ auto_picked: 0, users: [] });
        }
        const autoPicks = [];
        for (const episode of episodes) {
            // Get all leagues for this season
            const { data: leagues } = await supabaseAdmin
                .from('leagues')
                .select('id')
                .eq('season_id', episode.season_id)
                .eq('status', 'active');
            if (!leagues)
                continue;
            for (const league of leagues) {
                // Get members who haven't picked
                const { data: members } = await supabaseAdmin
                    .from('league_members')
                    .select('user_id')
                    .eq('league_id', league.id);
                const { data: existingPicks } = await supabaseAdmin
                    .from('weekly_picks')
                    .select('user_id')
                    .eq('league_id', league.id)
                    .eq('episode_id', episode.id);
                const pickedUserIds = new Set(existingPicks?.map((p) => p.user_id) || []);
                const missingUsers = members?.filter((m) => !pickedUserIds.has(m.user_id)) || [];
                for (const member of missingUsers) {
                    // Get user's active roster
                    const { data: roster } = await supabaseAdmin
                        .from('rosters')
                        .select('castaway_id, castaways(id, status)')
                        .eq('league_id', league.id)
                        .eq('user_id', member.user_id)
                        .is('dropped_at', null);
                    // Pick first active castaway
                    const activeCastaway = roster?.find((r) => r.castaways?.status === 'active');
                    if (activeCastaway) {
                        await supabaseAdmin.from('weekly_picks').insert({
                            league_id: league.id,
                            user_id: member.user_id,
                            episode_id: episode.id,
                            castaway_id: activeCastaway.castaway_id,
                            status: 'auto_picked',
                            picked_at: now.toISOString(),
                            locked_at: now.toISOString(),
                        });
                        autoPicks.push({
                            user_id: member.user_id,
                            episode_id: episode.id,
                            league_id: league.id,
                            castaway_id: activeCastaway.castaway_id,
                        });
                    }
                }
            }
        }
        // Send auto-pick alert emails (fire and forget)
        (async () => {
            for (const autoPick of autoPicks) {
                try {
                    // Get user, castaway, league, and episode details
                    const { data: user } = await supabaseAdmin
                        .from('users')
                        .select('email, display_name')
                        .eq('id', autoPick.user_id)
                        .single();
                    const { data: castawayDetails } = await supabaseAdmin
                        .from('castaways')
                        .select('name')
                        .eq('id', autoPick.castaway_id)
                        .single();
                    const { data: leagueDetails } = await supabaseAdmin
                        .from('leagues')
                        .select('name')
                        .eq('id', autoPick.league_id)
                        .single();
                    const { data: episodeDetails } = await supabaseAdmin
                        .from('episodes')
                        .select('number')
                        .eq('id', autoPick.episode_id)
                        .single();
                    if (user && castawayDetails && leagueDetails && episodeDetails) {
                        await EmailService.sendAutoPickAlert({
                            displayName: user.display_name,
                            email: user.email,
                            castawayName: castawayDetails.name,
                            leagueName: leagueDetails.name,
                            leagueId: autoPick.league_id,
                            episodeNumber: episodeDetails.number,
                        });
                        await EmailService.logNotification(autoPick.user_id, 'email', `Auto-pick applied: ${castawayDetails.name}`, `You missed the pick deadline for Episode ${episodeDetails.number}. We auto-selected ${castawayDetails.name} for you.`);
                    }
                }
                catch (emailErr) {
                    console.error('Failed to send auto-pick alert email:', emailErr);
                }
            }
        })();
        res.json({
            auto_picked: autoPicks.length,
            users: autoPicks.map((p) => p.user_id),
        });
    }
    catch (err) {
        console.error('POST /api/picks/auto-fill error:', err);
        res.status(500).json({ error: 'Failed to auto-fill picks' });
    }
});
export default router;
//# sourceMappingURL=picks.js.map