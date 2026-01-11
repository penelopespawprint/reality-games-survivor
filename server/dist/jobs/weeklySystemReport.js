import { supabaseAdmin } from '../config/supabase.js';
import { sendEmail } from '../emails/index.js';
import { emailWrapper, heading, paragraph, statsRow, card, divider, button } from '../emails/base.js';
const ADMIN_EMAIL = 'blake@realitygamesfantasyleague.com';
/**
 * Send weekly system report with comprehensive stats to admin
 * Runs: Sunday at noon PST
 */
export async function sendWeeklySystemReport() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekAgoISO = oneWeekAgo.toISOString();
    // Fetch all stats in parallel
    const [usersResult, newUsersResult, activeUsersResult, profilesCompleteResult, leaguesResult, activeLeaguesResult, newLeaguesResult, membersResult, picksResult, picksThisWeekResult, triviaResult, triviaThisWeekResult, totalPaymentsResult, paymentsThisWeekResult, revenueThisWeekResult, emailsTotalResult, emailsDeliveredResult, emailsOpenResult, emailsClickResult, jobsTotalResult, jobsFailedResult,] = await Promise.all([
        // Total users
        supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
        // New users this week
        supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).gte('created_at', weekAgoISO),
        // Active users this week (had activity)
        supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).gte('last_active_at', weekAgoISO),
        // Profiles complete
        supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('profile_setup_complete', true),
        // Total leagues
        supabaseAdmin.from('leagues').select('id', { count: 'exact', head: true }),
        // Active leagues
        supabaseAdmin.from('leagues').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        // New leagues this week
        supabaseAdmin.from('leagues').select('id', { count: 'exact', head: true }).gte('created_at', weekAgoISO),
        // Total league members
        supabaseAdmin.from('league_members').select('id', { count: 'exact', head: true }),
        // Total picks
        supabaseAdmin.from('weekly_picks').select('id', { count: 'exact', head: true }),
        // Picks this week
        supabaseAdmin.from('weekly_picks').select('id', { count: 'exact', head: true }).gte('created_at', weekAgoISO),
        // Trivia completers
        supabaseAdmin.from('users').select('trivia_score', { count: 'exact' }).eq('trivia_completed', true),
        // Trivia completers this week
        supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('trivia_completed', true).gte('trivia_completed_at', weekAgoISO),
        // Total payments (count only, avoid 1000 row limit)
        supabaseAdmin.from('payments').select('id', { count: 'exact', head: true }),
        // Payments this week (count only)
        supabaseAdmin.from('payments').select('id', { count: 'exact', head: true }).gte('created_at', weekAgoISO),
        // Revenue this week (sum amounts - need actual data, but payments per week unlikely to exceed 1000)
        supabaseAdmin.from('payments').select('amount').gte('created_at', weekAgoISO),
        // Email counts by event type (separate queries to avoid 1000 row limit)
        supabaseAdmin.from('email_events').select('id', { count: 'exact', head: true }).gte('created_at', weekAgoISO),
        supabaseAdmin.from('email_events').select('id', { count: 'exact', head: true }).eq('event_type', 'delivered').gte('created_at', weekAgoISO),
        supabaseAdmin.from('email_events').select('id', { count: 'exact', head: true }).eq('event_type', 'open').gte('created_at', weekAgoISO),
        supabaseAdmin.from('email_events').select('id', { count: 'exact', head: true }).eq('event_type', 'click').gte('created_at', weekAgoISO),
        // Job counts (separate queries to avoid 1000 row limit)
        supabaseAdmin.from('job_runs').select('id', { count: 'exact', head: true }).gte('started_at', weekAgoISO),
        supabaseAdmin.from('job_runs').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('started_at', weekAgoISO),
    ]);
    // Calculate stats
    const totalUsers = usersResult.count || 0;
    const newUsersThisWeek = newUsersResult.count || 0;
    const activeUsersThisWeek = activeUsersResult.count || 0;
    const profilesComplete = profilesCompleteResult.count || 0;
    const totalLeagues = leaguesResult.count || 0;
    const activeLeagues = activeLeaguesResult.count || 0;
    const newLeaguesThisWeek = newLeaguesResult.count || 0;
    const totalLeagueMembers = membersResult.count || 0;
    const avgMembersPerLeague = totalLeagues > 0 ? Math.round((totalLeagueMembers / totalLeagues) * 10) / 10 : 0;
    const totalPicks = picksResult.count || 0;
    const picksThisWeek = picksThisWeekResult.count || 0;
    // Trivia stats
    const triviaData = triviaResult.data || [];
    const triviaCompleted = triviaResult.count || 0;
    const triviaCompletedThisWeek = triviaThisWeekResult.count || 0;
    const avgTriviaScore = triviaData.length > 0
        ? Math.round(triviaData.reduce((sum, u) => sum + (u.trivia_score || 0), 0) / triviaData.length * 10) / 10
        : 0;
    // Payment stats (using accurate counts from separate queries)
    const totalPayments = totalPaymentsResult.count || 0;
    const paymentsThisWeek = paymentsThisWeekResult.count || 0;
    const weekPayments = (revenueThisWeekResult.data || []);
    const revenueThisWeek = weekPayments.reduce((sum, p) => sum + (parseFloat(String(p.amount)) || 0), 0);
    // Email stats (using accurate counts from separate queries)
    const emailsSentThisWeek = emailsTotalResult.count || 0;
    const deliveredEvents = emailsDeliveredResult.count || 0;
    const openEvents = emailsOpenResult.count || 0;
    const clickEvents = emailsClickResult.count || 0;
    const emailOpenRate = deliveredEvents > 0 ? Math.round((openEvents / deliveredEvents) * 100) : 0;
    const emailClickRate = deliveredEvents > 0 ? Math.round((clickEvents / deliveredEvents) * 100) : 0;
    // Job stats (using accurate counts from separate queries)
    const jobsRun = jobsTotalResult.count || 0;
    const jobFailures = jobsFailedResult.count || 0;
    // Calculate pick completion rate (users who made picks / total active league members)
    const pickCompletionRate = totalLeagueMembers > 0 ? Math.round((picksThisWeek / totalLeagueMembers) * 100) : 0;
    const stats = {
        totalUsers,
        newUsersThisWeek,
        activeUsersThisWeek,
        profilesComplete,
        totalLeagues,
        activeLeagues,
        newLeaguesThisWeek,
        totalLeagueMembers,
        avgMembersPerLeague,
        totalPicks,
        picksThisWeek,
        pickCompletionRate,
        triviaCompleted,
        triviaCompletedThisWeek,
        avgTriviaScore,
        totalPayments,
        paymentsThisWeek,
        revenueThisWeek,
        emailsSentThisWeek,
        emailOpenRate,
        emailClickRate,
        jobsRun,
        jobFailures,
    };
    // Build email content
    const content = `
    ${heading('📊 Weekly System Report', 1)}
    ${paragraph(`Here's your weekly snapshot for the week ending ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.`)}

    ${divider()}

    ${heading('👥 User Metrics', 2)}
    ${statsRow([
        { value: totalUsers, label: 'Total Users', color: 'burgundy' },
        { value: `+${newUsersThisWeek}`, label: 'New This Week', color: 'green' },
        { value: activeUsersThisWeek, label: 'Active This Week', color: 'gold' },
    ])}
    ${card(`
      <p style="margin: 0 0 8px 0;"><strong>Profiles Complete:</strong> ${profilesComplete} (${totalUsers > 0 ? Math.round((profilesComplete / totalUsers) * 100) : 0}%)</p>
      <p style="margin: 0;"><strong>Profile Completion Rate:</strong> ${totalUsers > 0 ? Math.round((profilesComplete / totalUsers) * 100) : 0}%</p>
    `)}

    ${divider()}

    ${heading('🏆 League Metrics', 2)}
    ${statsRow([
        { value: totalLeagues, label: 'Total Leagues', color: 'burgundy' },
        { value: activeLeagues, label: 'Active Leagues', color: 'gold' },
        { value: `+${newLeaguesThisWeek}`, label: 'New This Week', color: 'green' },
    ])}
    ${card(`
      <p style="margin: 0 0 8px 0;"><strong>Total League Members:</strong> ${totalLeagueMembers}</p>
      <p style="margin: 0;"><strong>Avg Members per League:</strong> ${avgMembersPerLeague}</p>
    `)}

    ${divider()}

    ${heading('🎯 Engagement Metrics', 2)}
    ${statsRow([
        { value: totalPicks, label: 'Total Picks', color: 'burgundy' },
        { value: picksThisWeek, label: 'Picks This Week', color: 'gold' },
        { value: `${pickCompletionRate}%`, label: 'Pick Rate', color: pickCompletionRate >= 70 ? 'green' : 'red' },
    ])}

    ${divider()}

    ${heading('🧠 Trivia Metrics', 2)}
    ${statsRow([
        { value: triviaCompleted, label: 'Completers', color: 'burgundy' },
        { value: `+${triviaCompletedThisWeek}`, label: 'New This Week', color: 'green' },
        { value: avgTriviaScore, label: 'Avg Score', color: 'gold' },
    ])}

    ${divider()}

    ${heading('💰 Revenue Metrics', 2)}
    ${statsRow([
        { value: totalPayments, label: 'Total Payments', color: 'burgundy' },
        { value: paymentsThisWeek, label: 'Payments This Week', color: 'gold' },
        { value: `$${revenueThisWeek.toFixed(2)}`, label: 'Revenue This Week', color: 'green' },
    ])}

    ${divider()}

    ${heading('📧 Email Metrics', 2)}
    ${statsRow([
        { value: emailsSentThisWeek, label: 'Emails Sent', color: 'burgundy' },
        { value: `${emailOpenRate}%`, label: 'Open Rate', color: emailOpenRate >= 30 ? 'green' : 'gold' },
        { value: `${emailClickRate}%`, label: 'Click Rate', color: emailClickRate >= 5 ? 'green' : 'gold' },
    ])}

    ${divider()}

    ${heading('⚙️ System Health', 2)}
    ${statsRow([
        { value: jobsRun, label: 'Jobs Run', color: 'burgundy' },
        { value: jobFailures, label: 'Failures', color: jobFailures === 0 ? 'green' : 'red' },
        { value: jobsRun > 0 ? `${Math.round(((jobsRun - jobFailures) / jobsRun) * 100)}%` : '100%', label: 'Success Rate', color: 'gold' },
    ])}

    ${divider()}

    ${button('View Admin Dashboard', `${process.env.FRONTEND_URL || process.env.WEB_URL || 'https://survivor.realitygamesfantasyleague.com'}/admin`)}

    ${paragraph('This report is automatically generated every Sunday at noon PST. To adjust the reporting settings, visit the CMS.', true)}
  `;
    const emailHtml = emailWrapper(content, 'Your weekly system report for Reality Games');
    await sendEmail({
        to: ADMIN_EMAIL,
        subject: `📊 Weekly System Report - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        html: emailHtml,
    });
    console.log(`Sent weekly system report to ${ADMIN_EMAIL}`);
    return { sent: true, stats };
}
export default sendWeeklySystemReport;
//# sourceMappingURL=weeklySystemReport.js.map