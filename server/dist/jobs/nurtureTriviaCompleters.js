/**
 * Nurture Trivia Completers Job
 * Sends nurture emails to users who completed trivia but haven't joined a league
 */
import { supabaseAdmin } from '../config/supabase.js';
import { enqueueEmail } from '../lib/email-queue.js';
import { triviaNurtureEmailTemplate } from '../emails/trivia-nurture.js';
export async function nurtureTriviaCompleters() {
    const result = {
        success: false,
        usersNotified: 0,
        errors: [],
    };
    try {
        // Get all users who completed trivia
        const { data: triviaCompleters, error: usersError } = await supabaseAdmin
            .from('users')
            .select('id, email, display_name, trivia_score, trivia_completed_at')
            .eq('trivia_completed', true)
            .not('email', 'is', null);
        if (usersError || !triviaCompleters || triviaCompleters.length === 0) {
            result.errors.push('No trivia completers found');
            return result;
        }
        // Check which users are in at least one league
        const { data: leagueMembers } = await supabaseAdmin
            .from('league_members')
            .select('user_id')
            .in('user_id', triviaCompleters.map((u) => u.id));
        const usersInLeagues = new Set(leagueMembers?.map((m) => m.user_id) || []);
        // Filter to users who completed trivia but haven't joined a league
        const usersToNurture = triviaCompleters.filter((u) => !usersInLeagues.has(u.id));
        if (usersToNurture.length === 0) {
            result.success = true;
            return result;
        }
        // Send nurture emails
        const baseUrl = process.env.FRONTEND_URL || 'https://survivor.realitygamesfantasyleague.com';
        const totalQuestions = 24; // Total trivia questions
        for (const user of usersToNurture) {
            try {
                await enqueueEmail({
                    to: user.email,
                    subject: user.trivia_score === totalQuestions
                        ? "Perfect Trivia Score - Now Join Season 50!"
                        : "You Completed Trivia - Ready to Play?",
                    html: triviaNurtureEmailTemplate({
                        displayName: user.display_name || 'Survivor Fan',
                        triviaScore: user.trivia_score || 0,
                        totalQuestions,
                        dashboardUrl: `${baseUrl}/dashboard`,
                        howToPlayUrl: `${baseUrl}/how-to-play`,
                        castawaysUrl: `${baseUrl}/castaways`,
                    }),
                });
                result.usersNotified++;
            }
            catch (error) {
                result.errors.push(`Failed to send to ${user.email}: ${error}`);
            }
        }
        result.success = true;
        return result;
    }
    catch (error) {
        result.errors.push(`Unexpected error: ${error}`);
        return result;
    }
}
//# sourceMappingURL=nurtureTriviaCompleters.js.map