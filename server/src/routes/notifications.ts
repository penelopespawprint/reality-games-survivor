import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/authenticate.js';
import { supabase, supabaseAdmin } from '../config/supabase.js';

const router = Router();

// POST /api/notifications/send-reminders - Send reminders (cron)
router.post('/send-reminders', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type } = req.body;

    if (!['pick', 'draft', 'waiver'].includes(type)) {
      return res.status(400).json({ error: 'type must be pick, draft, or waiver' });
    }

    const now = new Date();
    let sent = 0;
    const notifications: Array<{ user_id: string; type: string; subject: string; body: string }> = [];

    if (type === 'pick') {
      // Find users who haven't made their pick for the current episode
      const { data: episodes } = await supabaseAdmin
        .from('episodes')
        .select('id, number, season_id, picks_lock_at')
        .gte('picks_lock_at', now.toISOString())
        .order('picks_lock_at', { ascending: true })
        .limit(1);

      const episode = episodes?.[0];
      if (!episode) {
        return res.json({ sent: 0, message: 'No upcoming episode' });
      }

      // Get active leagues for this season
      const { data: leagues } = await supabaseAdmin
        .from('leagues')
        .select('id')
        .eq('season_id', episode.season_id)
        .eq('status', 'active');

      if (!leagues) {
        return res.json({ sent: 0, message: 'No active leagues' });
      }

      for (const league of leagues) {
        // Get members who haven't picked
        const { data: members } = await supabaseAdmin
          .from('league_members')
          .select('user_id, users(id, display_name, notification_email)')
          .eq('league_id', league.id);

        const { data: existingPicks } = await supabaseAdmin
          .from('weekly_picks')
          .select('user_id')
          .eq('league_id', league.id)
          .eq('episode_id', episode.id);

        const pickedUserIds = new Set(existingPicks?.map((p) => p.user_id) || []);

        for (const member of members || []) {
          if (pickedUserIds.has(member.user_id)) continue;

          const user = (member as any).users;
          if (!user?.notification_email) continue;

          const lockTime = new Date(episode.picks_lock_at);
          const hoursLeft = Math.round((lockTime.getTime() - now.getTime()) / (1000 * 60 * 60));

          notifications.push({
            user_id: member.user_id,
            type: 'email',
            subject: `⏰ Make your pick for Episode ${episode.number}`,
            body: `Hey ${user.display_name}, you haven't made your pick for Episode ${episode.number} yet. Picks lock in ${hoursLeft} hours!`,
          });
        }
      }
    } else if (type === 'draft') {
      // Find users in leagues with pending drafts
      const { data: leagues } = await supabaseAdmin
        .from('leagues')
        .select('id, name, season_id, seasons(draft_deadline)')
        .eq('draft_status', 'pending');

      for (const league of leagues || []) {
        const deadline = new Date((league as any).seasons?.draft_deadline);
        const hoursLeft = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));

        if (hoursLeft > 0 && hoursLeft <= 48) {
          const { data: members } = await supabaseAdmin
            .from('league_members')
            .select('user_id, users(id, display_name, notification_email)')
            .eq('league_id', league.id);

          for (const member of members || []) {
            const user = (member as any).users;
            if (!user?.notification_email) continue;

            notifications.push({
              user_id: member.user_id,
              type: 'email',
              subject: `🏝️ Draft deadline approaching for ${league.name}`,
              body: `Hey ${user.display_name}, the draft for ${league.name} closes in ${hoursLeft} hours. Make sure to complete your draft!`,
            });
          }
        }
      }
    } else if (type === 'waiver') {
      // Find users with eliminated castaways who haven't submitted rankings
      const { data: episodes } = await supabaseAdmin
        .from('episodes')
        .select('id, number, season_id, waiver_closes_at')
        .lte('waiver_opens_at', now.toISOString())
        .gte('waiver_closes_at', now.toISOString())
        .limit(1);

      const episode = episodes?.[0];
      if (!episode) {
        return res.json({ sent: 0, message: 'No open waiver window' });
      }

      const { data: leagues } = await supabaseAdmin
        .from('leagues')
        .select('id')
        .eq('season_id', episode.season_id)
        .eq('status', 'active');

      for (const league of leagues || []) {
        const { data: members } = await supabaseAdmin
          .from('league_members')
          .select('user_id, users(id, display_name, notification_email)')
          .eq('league_id', league.id);

        const { data: existingRankings } = await supabaseAdmin
          .from('waiver_rankings')
          .select('user_id')
          .eq('league_id', league.id)
          .eq('episode_id', episode.id);

        const rankedUserIds = new Set(existingRankings?.map((r) => r.user_id) || []);

        for (const member of members || []) {
          if (rankedUserIds.has(member.user_id)) continue;

          // Check if user has eliminated castaway
          const { data: rosters } = await supabaseAdmin
            .from('rosters')
            .select('castaways!inner(status)')
            .eq('league_id', league.id)
            .eq('user_id', member.user_id)
            .is('dropped_at', null);

          const hasEliminated = rosters?.some((r: any) => r.castaways?.status === 'eliminated');
          if (!hasEliminated) continue;

          const user = (member as any).users;
          if (!user?.notification_email) continue;

          notifications.push({
            user_id: member.user_id,
            type: 'email',
            subject: '🔄 Submit your waiver rankings',
            body: `Hey ${user.display_name}, you have an eliminated castaway. Submit your waiver rankings before the window closes!`,
          });
        }
      }
    }

    // Insert notifications
    if (notifications.length > 0) {
      const { error } = await supabaseAdmin.from('notifications').insert(
        notifications.map((n) => ({
          user_id: n.user_id,
          type: n.type,
          subject: n.subject,
          body: n.body,
          sent_at: now.toISOString(),
        }))
      );

      if (!error) {
        sent = notifications.length;
      }
    }

    // TODO: Actually send emails via Resend
    // For now, we just log to notifications table

    res.json({ sent });
  } catch (err) {
    console.error('POST /api/notifications/send-reminders error:', err);
    res.status(500).json({ error: 'Failed to send reminders' });
  }
});

// POST /api/notifications/send-results - Send episode results (cron)
router.post('/send-results', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { episode_id } = req.body;

    if (!episode_id) {
      return res.status(400).json({ error: 'episode_id is required' });
    }

    const now = new Date();

    // Get episode
    const { data: episode } = await supabaseAdmin
      .from('episodes')
      .select('*, seasons(*)')
      .eq('id', episode_id)
      .single();

    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    if (!episode.is_scored) {
      return res.status(400).json({ error: 'Episode is not yet scored' });
    }

    // Get all leagues for this season
    const { data: leagues } = await supabaseAdmin
      .from('leagues')
      .select('id, name')
      .eq('season_id', episode.season_id)
      .eq('status', 'active');

    if (!leagues) {
      return res.json({ sent: 0 });
    }

    const notifications: Array<{ user_id: string; type: string; subject: string; body: string }> = [];

    for (const league of leagues) {
      // Get members with their picks and points
      const { data: members } = await supabaseAdmin
        .from('league_members')
        .select(`
          user_id,
          total_points,
          rank,
          users(id, display_name, notification_email)
        `)
        .eq('league_id', league.id)
        .order('total_points', { ascending: false });

      for (const member of members || []) {
        const user = (member as any).users;
        if (!user?.notification_email) continue;

        // Get this user's pick for the episode
        const { data: pick } = await supabaseAdmin
          .from('weekly_picks')
          .select('points_earned, castaways(name)')
          .eq('league_id', league.id)
          .eq('user_id', member.user_id)
          .eq('episode_id', episode_id)
          .single();

        const pointsEarned = pick?.points_earned || 0;
        const castawayName = (pick as any)?.castaways?.name || 'Unknown';

        notifications.push({
          user_id: member.user_id,
          type: 'email',
          subject: `📊 Episode ${episode.number} Results - ${pointsEarned} points!`,
          body: `Hey ${user.display_name}, Episode ${episode.number} has been scored!\n\nYour pick: ${castawayName}\nPoints earned: ${pointsEarned}\nTotal points: ${member.total_points}\nCurrent rank: #${member.rank} in ${league.name}`,
        });
      }
    }

    // Insert notifications
    let sent = 0;
    if (notifications.length > 0) {
      const { error } = await supabaseAdmin.from('notifications').insert(
        notifications.map((n) => ({
          user_id: n.user_id,
          type: n.type,
          subject: n.subject,
          body: n.body,
          sent_at: now.toISOString(),
        }))
      );

      if (!error) {
        sent = notifications.length;
      }
    }

    // TODO: Actually send emails via Resend

    res.json({ sent });
  } catch (err) {
    console.error('POST /api/notifications/send-results error:', err);
    res.status(500).json({ error: 'Failed to send results' });
  }
});

export default router;
