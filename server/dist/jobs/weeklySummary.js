import { supabaseAdmin } from '../config/supabase.js';
import { sendEmail } from '../emails/index.js';
import { emailWrapper, button, statBox } from '../emails/base.js';
/**
 * Send weekly summary with standings and next episode preview
 * Runs: Sun 10am PST
 */
export async function sendWeeklySummary() {
    // Get active season
    const { data: season } = await supabaseAdmin
        .from('seasons')
        .select('id, name, number')
        .eq('is_active', true)
        .single();
    if (!season)
        return { sent: 0 };
    // Get next episode
    const { data: nextEpisodes } = await supabaseAdmin
        .from('episodes')
        .select('id, number, title, air_date, picks_lock_at')
        .eq('season_id', season.id)
        .eq('is_scored', false)
        .order('air_date', { ascending: true })
        .limit(1);
    const nextEpisode = nextEpisodes?.[0];
    // Get all active leagues
    const { data: leagues } = await supabaseAdmin
        .from('leagues')
        .select('id, name')
        .eq('season_id', season.id)
        .eq('status', 'active');
    if (!leagues)
        return { sent: 0 };
    let sent = 0;
    for (const league of leagues) {
        // Get standings
        const { data: standings } = await supabaseAdmin
            .from('league_members')
            .select('user_id, total_points, rank, users(id, display_name, email, notification_email)')
            .eq('league_id', league.id)
            .order('total_points', { ascending: false })
            .limit(10);
        if (!standings)
            continue;
        // Build standings table HTML
        const standingsRows = standings
            .map((s, i) => {
            const rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
            return `
          <tr style="border-bottom: 1px solid #6b3a5a;">
            <td style="padding: 8px; color: #ffffff;">${rankEmoji} ${i + 1}</td>
            <td style="padding: 8px; color: #ffffff;">${s.users?.display_name || 'Unknown'}</td>
            <td style="padding: 8px; color: #d4a656; font-weight: bold; text-align: right;">${s.total_points}</td>
          </tr>
        `;
        })
            .join('');
        for (const member of standings) {
            const user = member.users;
            if (!user?.email || !user.notification_email)
                continue;
            const content = `
        <h1 style="color: #d4a656; font-size: 28px; margin: 0 0 8px 0;">
          Weekly Summary
        </h1>
        <p style="color: #e8d4dc; font-size: 16px; margin: 0 0 24px 0;">
          Season ${season.number}: ${season.name}
        </p>

        <div style="display: flex; gap: 16px; margin-bottom: 24px;">
          ${statBox(member.rank || '-', 'Your Rank')}
          ${statBox(member.total_points, 'Total Points')}
          ${statBox(standings.length, 'Players')}
        </div>

        <h2 style="color: #ffffff; font-size: 20px; margin: 32px 0 16px 0;">
          ${league.name} Standings
        </h2>

        <table style="width: 100%; border-collapse: collapse; background: rgba(255,255,255,0.05); border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: rgba(212, 166, 86, 0.2);">
              <th style="padding: 12px 8px; text-align: left; color: #d4a656; font-weight: 600;">Rank</th>
              <th style="padding: 12px 8px; text-align: left; color: #d4a656; font-weight: 600;">Player</th>
              <th style="padding: 12px 8px; text-align: right; color: #d4a656; font-weight: 600;">Points</th>
            </tr>
          </thead>
          <tbody>
            ${standingsRows}
          </tbody>
        </table>

        ${nextEpisode
                ? `
          <div style="margin-top: 32px; padding: 20px; background: rgba(212, 166, 86, 0.1); border-radius: 12px; border: 1px solid rgba(212, 166, 86, 0.3);">
            <h3 style="color: #d4a656; font-size: 18px; margin: 0 0 8px 0;">
              Coming Up: Episode ${nextEpisode.number}
            </h3>
            ${nextEpisode.title ? `<p style="color: #ffffff; margin: 0 0 8px 0;">"${nextEpisode.title}"</p>` : ''}
            <p style="color: #e8d4dc; margin: 0 0 16px 0;">
              Airs ${new Date(nextEpisode.air_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                })} at 8pm
            </p>
            <p style="color: #fbbf24; font-size: 14px; margin: 0;">
              Picks lock at ${new Date(nextEpisode.picks_lock_at).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZoneName: 'short',
                })}
            </p>
          </div>
        `
                : ''}

        <div style="margin-top: 32px; text-align: center;">
          ${button('View League', `${process.env.FRONTEND_URL || process.env.WEB_URL || 'https://survivor.realitygamesfantasyleague.com'}/leagues/${league.id}`)}
        </div>
      `;
            const emailHtml = emailWrapper(content, 'Your weekly Survivor Fantasy update');
            await sendEmail({
                to: user.email,
                subject: `Weekly Summary - You're #${member.rank || '-'} in ${league.name}`,
                html: emailHtml,
            });
            sent++;
        }
    }
    console.log(`Sent ${sent} weekly summaries`);
    return { sent };
}
export default sendWeeklySummary;
//# sourceMappingURL=weeklySummary.js.map