/**
 * Daily Stats Capture Job
 *
 * Captures key metrics daily for historical trend analysis.
 * Runs at midnight PST to capture end-of-day stats.
 */
import { supabaseAdmin } from '../config/supabase.js';
export async function captureStats() {
    console.log('[Stats Capture] Starting daily stats capture...');
    const now = new Date().toISOString();
    const stats = [];
    try {
        // Executive Stats
        const { count: totalUsers } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true });
        stats.push({ stat_name: 'total_users', stat_category: 'executive', stat_value: totalUsers || 0 });
        const { count: activeUsers7d } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('last_active_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
        stats.push({ stat_name: 'active_users_7d', stat_category: 'executive', stat_value: activeUsers7d || 0 });
        const { count: newUsersToday } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        stats.push({ stat_name: 'new_users_today', stat_category: 'executive', stat_value: newUsersToday || 0 });
        const { count: totalLeagues } = await supabaseAdmin
            .from('leagues')
            .select('*', { count: 'exact', head: true });
        stats.push({ stat_name: 'total_leagues', stat_category: 'executive', stat_value: totalLeagues || 0 });
        const { count: publicLeagues } = await supabaseAdmin
            .from('leagues')
            .select('*', { count: 'exact', head: true })
            .eq('is_public', true);
        stats.push({ stat_name: 'public_leagues', stat_category: 'executive', stat_value: publicLeagues || 0 });
        const { count: totalPayments } = await supabaseAdmin
            .from('payments')
            .select('*', { count: 'exact', head: true });
        stats.push({ stat_name: 'total_payments', stat_category: 'executive', stat_value: totalPayments || 0 });
        // Engagement Stats
        const { count: totalPicks } = await supabaseAdmin
            .from('weekly_picks')
            .select('*', { count: 'exact', head: true });
        stats.push({ stat_name: 'total_picks', stat_category: 'engagement', stat_value: totalPicks || 0 });
        const { count: picksToday } = await supabaseAdmin
            .from('weekly_picks')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        stats.push({ stat_name: 'picks_today', stat_category: 'engagement', stat_value: picksToday || 0 });
        const { count: totalRosters } = await supabaseAdmin
            .from('rosters')
            .select('*', { count: 'exact', head: true });
        stats.push({ stat_name: 'total_rosters', stat_category: 'engagement', stat_value: totalRosters || 0 });
        const { count: triviaAnswers } = await supabaseAdmin
            .from('trivia_answers')
            .select('*', { count: 'exact', head: true });
        stats.push({ stat_name: 'total_trivia_answers', stat_category: 'engagement', stat_value: triviaAnswers || 0 });
        const { count: leagueMessages } = await supabaseAdmin
            .from('league_messages')
            .select('*', { count: 'exact', head: true });
        stats.push({ stat_name: 'total_chat_messages', stat_category: 'engagement', stat_value: leagueMessages || 0 });
        // Operations Stats
        const { count: emailsSent } = await supabaseAdmin
            .from('email_events')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        stats.push({ stat_name: 'emails_sent_today', stat_category: 'operations', stat_value: emailsSent || 0 });
        const { count: failedEmails } = await supabaseAdmin
            .from('failed_emails')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        stats.push({ stat_name: 'emails_failed_today', stat_category: 'operations', stat_value: failedEmails || 0 });
        const { count: jobsRun } = await supabaseAdmin
            .from('job_runs')
            .select('*', { count: 'exact', head: true })
            .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        stats.push({ stat_name: 'jobs_run_today', stat_category: 'operations', stat_value: jobsRun || 0 });
        const { count: jobsFailed } = await supabaseAdmin
            .from('job_runs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'failed')
            .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        stats.push({ stat_name: 'jobs_failed_today', stat_category: 'operations', stat_value: jobsFailed || 0 });
        // Insert all stats
        const { error } = await supabaseAdmin
            .from('stats_history')
            .insert(stats.map(s => ({ ...s, recorded_at: now })));
        if (error) {
            console.error('[Stats Capture] Insert error:', error);
            throw error;
        }
        console.log(`[Stats Capture] Captured ${stats.length} stats successfully`);
        return { captured: stats.length, stats };
    }
    catch (err) {
        console.error('[Stats Capture] Error:', err);
        throw err;
    }
}
//# sourceMappingURL=captureStats.js.map