// Email Service - Centralized email sending with templates and triggers
import { sendEmail, sendEmailCritical, enqueueEmail } from '../config/email.js';
import { supabaseAdmin } from '../config/supabase.js';
import { emailWrapper, button, statBox, card, heading, paragraph, highlight, divider, formatDate, BASE_URL, } from './base.js';
// ============================================
// EMAIL TEMPLATES
// ============================================
function welcomeEmailTemplate({ displayName }) {
    return emailWrapper(`
    ${heading("You're In. Let's Play.")}
    ${paragraph(`Hey ${displayName},`)}
    ${paragraph(`Welcome to Reality Games Fantasy League — where real Survivor strategy actually matters. No random drafts. No luck-based nonsense. Just you, your knowledge, and 100+ scoring rules that reward players who actually watch the show.`)}
    ${divider()}
    ${card(`
      ${heading('The Game in 4 Steps', 2)}
      ${paragraph(`<strong>1. Join or create a league</strong> — Play with friends in a private league or compete in the global rankings. Everyone's automatically in the Global League.`)}
      ${paragraph(`<strong>2. Rank all 24 castaways</strong> — Your rankings determine who you draft. Rank smart — the snake draft means strategy matters.`)}
      ${paragraph(`<strong>3. Make weekly picks</strong> — Each week, choose which of your 2 castaways to "start." Only your starter scores points.`)}
      ${paragraph(`<strong>4. Dominate</strong> — Points accumulate all season. Climb the leaderboard. Earn bragging rights.`)}
    `)}
    ${button('Go to Your Dashboard', `${BASE_URL}/dashboard`)}
    ${divider()}
    ${card(`
      ${heading('Key Dates for Season 50', 2)}
      ${paragraph(`<strong>Premiere:</strong> Wednesday, February 26, 2025 at 8:00 PM ET`)}
      ${paragraph(`<strong>Draft deadline:</strong> Monday, March 3, 2025 at 5:00 PM PT`)}
      ${paragraph(`<strong>First pick due:</strong> Wednesday, March 5, 2025 at 5:00 PM PT (Episode 2)`)}
    `)}
    ${paragraph(`Questions? Check out our <a href="${BASE_URL}/how-to-play" style="color:#8B0000; font-weight: 600;">How to Play</a> guide or reply to this email.`)}
    ${paragraph(`<strong style="color: #8B0000;">The tribe has spoken. Time to prove you belong.</strong>`)}
  `, 'Welcome to Reality Games: Survivor');
}
function leagueCreatedEmailTemplate(data) {
    return emailWrapper(`
    ${heading('Your League is Live!')}
    ${paragraph(`Hey ${data.displayName},`)}
    ${paragraph(`${highlight(data.leagueName)} is ready to go. As League Creator, you're in charge of getting your crew together and making this the most competitive league of Season 50.`)}
    ${card(`
      <p style="color: #666666; margin: 0 0 8px 0; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; text-align: center;">Your Invite Link</p>
      <div style="font-family: -apple-system, sans-serif; font-size: 18px; font-weight: 700; color: #8B0000; text-align: center; margin: 12px 0;">rgfl.app/join/${data.leagueCode}</div>
      <p style="color: #666666; margin: 12px 0 0 0; font-size: 13px; text-align: center;">Share this link with your friends to get them in</p>
    `, 'immunity')}
    ${button('Manage Your League', `${BASE_URL}/leagues/${data.leagueCode}`)}
    ${divider()}
    ${heading('What You Can Do', 2)}
    ${paragraph('As League Creator:')}
    ${paragraph('• Invite 2-12 players to your league')}
    ${paragraph('• Set an optional donation amount')}
    ${paragraph('• Customize your league name and settings')}
    ${card(`
      ${heading('Key Dates', 2)}
      ${paragraph(`<strong>Premiere:</strong> Wednesday, February 26, 2025 at 8:00 PM ET`)}
      ${paragraph(`<strong>Draft deadline:</strong> Monday, March 3, 2025 at 5:00 PM PT`)}
      ${paragraph(`<strong>First pick due:</strong> Wednesday, March 5, 2025 at 5:00 PM PT`)}
    `)}
    ${paragraph(`<strong style="color: #8B0000;">Now go recruit your tribe.</strong>`)}
  `, `Your league "${data.leagueName}" is ready - start inviting players!`);
}
function leagueJoinedEmailTemplate(data) {
    return emailWrapper(`
    ${heading("You're In. Game On.")}
    ${paragraph(`Hey ${data.displayName},`)}
    ${paragraph(`Welcome to ${highlight(data.leagueName)}. You're locked in for ${data.seasonName} — now it's time to prove you know Survivor better than everyone else.`)}
    ${card(`
      <div style="text-align: center;">
        <div style="font-family: -apple-system, sans-serif; font-size: 48px; font-weight: 700; color: #8B0000;">${data.memberCount}<span style="color: #666666; font-size: 24px;">/${data.maxMembers}</span></div>
        <p style="color: #666666; margin: 4px 0 0 0; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">Players Joined</p>
      </div>
    `)}
    ${button('View Your League', `${BASE_URL}/leagues/${data.leagueId}`)}
    ${card(`
      ${heading('Key Dates', 2)}
      ${paragraph(`<strong>Premiere:</strong> Wednesday, February 26, 2025 at 8:00 PM ET`)}
      ${paragraph(`<strong>Draft deadline:</strong> Monday, March 3, 2025 at 5:00 PM PT`)}
      ${paragraph(`<strong>First pick due:</strong> Wednesday, March 5, 2025 at 5:00 PM PT (Episode 2)`)}
    `)}
    ${divider()}
    ${heading('How The Draft Works', 2)}
    ${paragraph('• Rank all 24 castaways from 1-24 based on who you think will score the most')}
    ${paragraph('• A random draw determines the turn order')}
    ${paragraph('• Snake draft: pick order reverses each round')}
    ${paragraph("• You'll get 2 castaways — that's your team for the season")}
    ${paragraph(`<strong style="color: #8B0000;">Rank smart. Your picks depend on it.</strong>`)}
  `, `You've joined "${data.leagueName}" - get ready to play!`);
}
function draftPickConfirmedEmailTemplate(data) {
    return emailWrapper(`
    ${heading('Draft Pick Confirmed')}
    ${paragraph(`Hey ${data.displayName},`)}
    ${paragraph(`You've been assigned ${highlight(data.castawayName)} in Round ${data.round} for ${highlight(data.leagueName)}.`)}
    <div style="text-align: center; margin: 24px 0;">
      ${statBox(data.pickNumber, 'Pick Number')}
      ${statBox(`${data.round}/${data.totalRounds}`, 'Round')}
    </div>
    ${data.round < data.totalRounds
        ? `<p style="text-align: center; color: #8A7654;">Next pick: <strong style="color: #5C1717;">Round ${data.round + 1}</strong></p>`
        : `<p style="text-align: center; color: #8A7654;">Draft complete! Your team is set.</p>`}
    ${button('View Your Team', `${BASE_URL}/leagues/${data.leagueId}/team`)}
  `, `Draft pick confirmed: ${data.castawayName}`);
}
function draftCompleteEmailTemplate(data) {
    const castawayList = data.castaways.map((c, i) => `
    <div style="display: flex; align-items: center; padding: 12px 0; ${i < data.castaways.length - 1 ? 'border-bottom: 1px solid #D4C4A8;' : ''}">
      <span style="background: #8B0000; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; margin-right: 12px;">${i + 1}</span>
      <span style="color: #333333;"><strong style="color: #1F1F1F;">${c.name}</strong> <span style="color:#666666;">• ${c.tribe}</span></span>
    </div>
  `).join('');
    return emailWrapper(`
    ${heading('Your Team is Locked In')}
    ${paragraph(`Hey ${data.displayName},`)}
    ${paragraph(`The draft for ${highlight(data.leagueName)} is complete. These are your castaways for the entire season — choose wisely each week.`)}
    ${card(`
      <h2 style="font-family: Georgia, serif; color: #B8860B; margin: 0 0 16px 0; font-size: 20px;">Your Castaways</h2>
      ${castawayList}
    `, 'immunity')}
    ${button('View Your Team', `${BASE_URL}/leagues/${data.leagueId}/team`)}
    ${card(`
      ${heading("What's Next", 2)}
      ${paragraph(`<strong>Premiere:</strong> Wednesday, February 26, 2025 at 8:00 PM ET`)}
      ${paragraph(`<strong>First pick due:</strong> Wednesday, March 5, 2025 at 5:00 PM PT (Episode 2)`)}
      ${paragraph(`No pick needed for the premiere — both castaways score. Starting Episode 2, you choose who to start each week.`)}
    `)}
    ${paragraph(`<strong style="color: #8B0000;">Time to prove you drafted right.</strong>`)}
  `, 'Your draft is complete - see your team!');
}
function pickConfirmedEmailTemplate(data) {
    return emailWrapper(`
    ${heading('Pick Confirmed')}
    ${paragraph(`Hey ${data.displayName},`)}
    ${card(`
      <p style="color: #8A7654; margin: 0 0 8px 0; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; text-align: center;">Your Pick for Episode ${data.episodeNumber}</p>
      <div style="font-family: Georgia, serif; font-size: 32px; font-weight: 700; color: #A52A2A; text-align: center;">${data.castawayName}</div>
      <p style="color: #5C1717; font-size: 14px; margin: 12px 0 0 0; text-align: center;">${data.leagueName}</p>
    `)}
    ${paragraph(`<p style="text-align: center;">You have until <strong>${formatDate(data.picksLockAt, { includeTime: true })}</strong> to change your pick.</p>`)}
    ${button('View Pick', `${BASE_URL}/leagues/${data.leagueId}/pick`)}
    ${paragraph(`<em style="color: #8A7654; text-align: center; display: block;">Good luck!</em>`)}
  `, `Pick confirmed: ${data.castawayName} for Episode ${data.episodeNumber}`);
}
function autoPickAlertEmailTemplate(data) {
    return emailWrapper(`
    ${heading('Auto-Pick Applied')}
    ${paragraph(`Hey ${data.displayName},`)}
    ${paragraph(`You missed the pick deadline for Episode ${data.episodeNumber} in ${highlight(data.leagueName)}.`)}
    ${card(`
      <p style="color: #92400E; margin: 0; font-weight: 600; font-size: 18px; text-align: center;">Auto-selected: ${data.castawayName}</p>
      <p style="color: #A16207; margin: 8px 0 0 0; font-size: 14px; text-align: center;">We selected the castaway you didn't play last week.</p>
    `, 'warning')}
    ${button('View Your Team', `${BASE_URL}/leagues/${data.leagueId}/team`)}
    ${paragraph(`<strong style="color: #8B0000;">Don't let it happen again — set a reminder for next Wednesday before 8pm ET / 5pm PT.</strong>`)}
  `, `Auto-pick applied: ${data.castawayName} for Episode ${data.episodeNumber}`);
}
function paymentConfirmedEmailTemplate(data) {
    return emailWrapper(`
    ${heading('Payment Received')}
    ${paragraph(`Hey ${data.displayName},`)}
    ${paragraph(`Your payment for ${highlight(data.leagueName)} has been received. Thank you!`)}
    ${card(`
      ${heading('Receipt', 2)}
      <table style="width: 100%; color: #5C1717; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #EDE5D5;">
          <td style="padding: 12px 0; color: #8A7654;">League</td>
          <td style="padding: 12px 0; text-align: right; font-weight: 500;">${data.leagueName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #EDE5D5;">
          <td style="padding: 12px 0; color: #8A7654;">Amount</td>
          <td style="padding: 12px 0; text-align: right; color: #A52A2A; font-weight: 700; font-size: 18px;">$${data.amount.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; color: #8A7654;">Date</td>
          <td style="padding: 12px 0; text-align: right; font-weight: 500;">${formatDate(data.date)}</td>
        </tr>
      </table>
    `)}
    ${button('Go to League', `${BASE_URL}/leagues/${data.leagueId}`)}
    <p style="color: #8A7654; font-size: 12px; text-align: center; margin-top: 24px;">This is your official receipt. Keep it for your records.</p>
    <p style="font-size: 11px; color: #8A7654; margin-top: 16px; text-align: center; border-top: 1px solid #EDE5D5; padding-top: 16px;">Reality Games Fantasy League is a program of Follow the Unicorn Productions, a 501(c)(3) nonprofit (EIN: 99-3779763). All contributions are tax-deductible to the extent allowed by law.</p>
  `, `Payment confirmed: $${data.amount.toFixed(2)} for ${data.leagueName}`);
}
function draftReminderEmailTemplate(data) {
    return emailWrapper(`
    ${heading('Complete Your Draft')}
    ${paragraph(`Hey ${data.displayName},`)}
    <div style="text-align: center; margin: 24px 0;">
      <div style="background: #FEF3C7; border: 2px solid #F59E0B; border-radius: 12px; padding: 20px; display: inline-block; min-width: 140px;">
        <div style="font-family: -apple-system, sans-serif; font-size: 36px; font-weight: 700; color: #B45309;">${data.daysRemaining}</div>
        <div style="color: #92400E; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">Days Remaining</div>
      </div>
    </div>
    ${paragraph(`<p style="text-align: center;">Rank your castaways for ${highlight(data.leagueName)} before the deadline.</p>`)}
    ${button('Complete Your Draft', `${BASE_URL}/leagues/${data.leagueId}/draft`)}
    ${paragraph(`<p style="color: #8A7654; font-size: 14px; text-align: center;">If you don't complete your rankings, castaways will be auto-assigned from remaining available players.</p>`)}
  `, `${data.daysRemaining} days left to complete your draft`);
}
function draftFinalWarningEmailTemplate(data) {
    return emailWrapper(`
    ${heading('RANKINGS CLOSE SOON!', 1, 'error')}
    ${paragraph(`Hey ${data.displayName},`)}
    ${card(`
      <div style="font-family: -apple-system, sans-serif; font-size: 56px; font-weight: 700; color: #DC2626; text-align: center;">${data.hoursRemaining}h</div>
      <div style="color: #991B1B; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; font-weight: 600; text-align: center;">Until Rankings Close</div>
    `, 'error')}
    ${paragraph(`<p style="text-align: center;">Complete your castaway rankings for ${highlight(data.leagueName)} now!</p>`)}
    ${paragraph(`<p style="text-align: center; color: #8A7654; font-size: 14px;">Players will be assigned the following day.</p>`)}
    ${button('COMPLETE RANKINGS NOW', `${BASE_URL}/leagues/${data.leagueId}/draft`, 'urgent')}
  `, `URGENT: Only ${data.hoursRemaining} hours to complete your rankings!`);
}
function pickReminderEmailTemplate(data) {
    return emailWrapper(`
    ${heading('Make Your Pick!')}
    ${paragraph(`Hey ${data.displayName},`)}
    ${paragraph(`You haven't locked in your pick for ${highlight(`Episode ${data.episodeNumber}`)} yet.`)}
    <div style="text-align: center; margin: 24px 0;">
      <div style="background: #FEF3C7; border: 2px solid #F59E0B; border-radius: 12px; padding: 20px; display: inline-block; min-width: 140px;">
        <div style="font-family: -apple-system, sans-serif; font-size: 36px; font-weight: 700; color: #B45309;">${data.hoursRemaining}h</div>
        <div style="color: #92400E; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">Until Picks Lock</div>
      </div>
    </div>
    ${button('Make Your Pick', `${BASE_URL}/dashboard`)}
  `, `${data.hoursRemaining} hours to make your Episode ${data.episodeNumber} pick!`);
}
function pickFinalWarningEmailTemplate(data) {
    return emailWrapper(`
    ${heading('PICKS LOCK IN 30 MINUTES!', 1, 'error')}
    ${paragraph(`Hey ${data.displayName},`)}
    ${card(`
      <div style="font-family: -apple-system, sans-serif; font-size: 56px; font-weight: 700; color: #DC2626; text-align: center;">${data.minutesRemaining}m</div>
      <div style="color: #991B1B; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; font-weight: 600; text-align: center;">Until Picks Lock</div>
    `, 'error')}
    ${paragraph(`<p style="text-align: center;">Lock in your pick for Episode ${data.episodeNumber} now.</p>`)}
    ${button('PICK NOW', `${BASE_URL}/dashboard`, 'urgent')}
  `, `URGENT: Only ${data.minutesRemaining} minutes to make your pick!`);
}
function episodeResultsEmailTemplate(data) {
    // SPOILER-SAFE: No scores, names, or outcomes in the email body
    // User must click through to see results
    return emailWrapper(`
    ${heading(`Episode ${data.episodeNumber} Results Are Ready`, 1)}
    ${paragraph(`Hey ${data.displayName},`)}
    ${paragraph(`The latest episode has been scored and your results are ready to view.`)}
    ${card(`
      <div style="text-align: center; padding: 16px;">
        <p style="color: #92400E; margin: 0 0 12px 0; font-weight: 600; font-size: 16px;">Spoiler Warning</p>
        <p style="color: #A16207; margin: 0 0 16px 0; font-size: 14px;">Click the button below to reveal your scores and standings. This will show episode results including eliminations and gameplay events.</p>
        ${button('View My Results', `${BASE_URL}/dashboard`)}
      </div>
    `, 'warning')}
    ${paragraph(`Not ready to see spoilers? No problem! Results will be available in your dashboard whenever you're ready.`)}
    ${paragraph(`<em style="color: #8A7654;">The tribe has spoken.</em>`)}
  `, `Episode ${data.episodeNumber} results are ready to view`);
}
function eliminationAlertEmailTemplate(data) {
    // SPOILER-SAFE: No castaway names or elimination details in the email body
    // User must click through to see what happened
    return emailWrapper(`
    ${heading('This Week\'s Results Are Ready', 1)}
    ${paragraph(`Hey ${data.displayName},`)}
    ${paragraph(`There's been a change to your roster in ${highlight(data.leagueName)}. Log in to see the details.`)}
    ${card(`
      <div style="text-align: center; padding: 16px;">
        <p style="color: #92400E; margin: 0 0 12px 0; font-weight: 600; font-size: 16px;">Spoiler Warning</p>
        <p style="color: #A16207; margin: 0 0 16px 0; font-size: 14px;">Click the button below to see this week's results, including any roster changes and what it means for your team.</p>
        ${button('View Results', `${BASE_URL}/leagues/${data.leagueId}/team`)}
      </div>
    `, 'warning')}
    ${paragraph(`Not ready to see spoilers? No problem! Your results will be available whenever you're ready.`)}
  `, `This week's results are ready`);
}
function paymentRecoveryEmailTemplate(data) {
    return emailWrapper(`
    ${heading('Complete Your Payment')}
    ${paragraph(`Hey ${data.displayName},`)}
    ${paragraph(`Your payment for ${highlight(data.leagueName)} wasn't completed. No worries — you can try again anytime!`)}
    ${card(`
      <div style="text-align: center;">
        <p style="color: #8A7654; margin: 0 0 8px 0; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">League Entry Fee</p>
        <div style="font-family: -apple-system, sans-serif; font-size: 36px; font-weight: 700; color: #A52A2A;">$${data.amount.toFixed(2)}</div>
        <p style="color: #5C1717; font-size: 14px; margin: 8px 0 0 0;">${data.leagueName}</p>
      </div>
    `)}
    ${button('Complete Payment', `${BASE_URL}/join/${data.leagueCode}`)}
    ${card(`
      ${heading('What Happened?', 2)}
      ${paragraph('Your checkout session expired or the payment was not completed. This can happen if:')}
      ${paragraph('- You closed the payment page before completing')}
      ${paragraph('- Your card was declined')}
      ${paragraph('- The session timed out')}
      ${paragraph(`<strong>Don't worry</strong> — just click the button above to try again!`)}
    `)}
    ${paragraph(`<p style="color: #8A7654; font-size: 14px; text-align: center;">Need help? Reply to this email or contact us at support@realitygamesfantasyleague.com</p>`)}
  `, `Complete your payment for ${data.leagueName}`);
}
function torchSnuffedEmailTemplate(data) {
    // SPOILER-SAFE: No details about what happened - just a generic "results ready" message
    // User must click through to see the full details
    return emailWrapper(`
    ${heading('This Week\'s Results Are Ready')}
    ${paragraph(`Hey ${data.displayName},`)}
    ${paragraph(`There's an important update about your status in ${highlight(data.leagueName)}. Log in to see the details.`)}
    ${card(`
      <div style="text-align: center; padding: 16px;">
        <p style="color: #92400E; margin: 0 0 12px 0; font-weight: 600; font-size: 16px;">Spoiler Warning</p>
        <p style="color: #A16207; margin: 0 0 16px 0; font-size: 14px;">Click the button below to see this week's results and what they mean for your team.</p>
        ${button('View Results', `${BASE_URL}/leagues/${data.leagueId}`)}
      </div>
    `, 'warning')}
    ${paragraph(`Not ready to see spoilers? No problem! Your results will be available whenever you're ready.`)}
  `, `This week's results are ready`);
}
function triviaWelcomeEmailTemplate({ displayName }) {
    return emailWrapper(`
    ${heading('Nice. You Know Your Survivor.')}
    ${paragraph(`Hey ${displayName},`)}
    ${paragraph(`You crushed our trivia — clearly you've been watching. Now let's see if that knowledge translates to fantasy glory.`)}
    ${divider()}
    ${card(`
      ${heading('How Fantasy Works', 2)}
      ${paragraph(`<strong>1. Join or create a league</strong> — Play with friends or compete globally`)}
      ${paragraph(`<strong>2. Rank all 24 castaways</strong> — Your rankings determine who you draft in the snake draft`)}
      ${paragraph(`<strong>3. Make weekly picks</strong> — Choose which castaway to "start" each episode`)}
      ${paragraph(`<strong>4. Score points</strong> — 100+ rules that reward actual Survivor gameplay`)}
    `)}
    ${button('Join a League', `${BASE_URL}/leagues`)}
    ${divider()}
    ${card(`
      ${heading('Season 50: In the Hands of the Fans', 2)}
      ${paragraph(`<strong>Premiere:</strong> Wednesday, February 26, 2025 at 8:00 PM ET`)}
      ${paragraph(`<strong>Draft deadline:</strong> Monday, March 3, 2025 at 5:00 PM PT`)}
    `)}
    ${paragraph(`Learn more: <a href="${BASE_URL}/how-to-play" style="color:#8B0000; font-weight: 600;">How to Play</a>`)}
    ${paragraph(`<strong style="color: #8B0000;">Trivia was the warm-up. Fantasy is the real game.</strong>`)}
  `, 'Welcome to Reality Games: Survivor');
}
function triviaSignupWelcomeEmailTemplate(_data) {
    return emailWrapper(`
    ${heading("You're In for Trivia")}
    ${paragraph(`Hey Survivor Fan,`)}
    ${paragraph(`You're signed up for our 24-question Survivor trivia challenge. Create an account to play and see how you stack up against other superfans.`)}
    ${divider()}
    ${card(`
      ${heading('How Trivia Works', 2)}
      ${paragraph(`<strong>24 Questions</strong> — Spanning all 50 seasons of Survivor`)}
      ${paragraph(`<strong>20 Seconds Each</strong> — Think fast`)}
      ${paragraph(`<strong>2-Hour Lockout</strong> — Miss one? Come back soon`)}
      ${paragraph(`<strong>Leaderboard</strong> — Complete all 24 to claim your spot`)}
    `)}
    ${button('Create Account & Play', `${BASE_URL}/signup`)}
    ${divider()}
    ${card(`
      ${heading('Want More Than Trivia?', 2)}
      ${paragraph(`Our fantasy leagues let you draft castaways, make weekly picks, and compete for real bragging rights all season long.`)}
      ${paragraph(`<strong>Season 50 draft deadline:</strong> Monday, March 3, 2025 at 5:00 PM PT`)}
    `)}
    ${paragraph(`<strong style="color: #8B0000;">Prove you know your Survivor.</strong>`)}
  `, "You're signed up for Survivor Trivia");
}
// ============================================
// NEW LIFECYCLE EMAIL TEMPLATES
// ============================================
function triviaProgressEmailTemplate(data) {
    const percentComplete = Math.round((data.questionsAnswered / data.totalQuestions) * 100);
    const accuracy = data.questionsAnswered > 0
        ? Math.round((data.questionsCorrect / data.questionsAnswered) * 100)
        : 0;
    return emailWrapper(`
    ${heading('Keep Going - You\'re Doing Great')}
    ${paragraph(`Hey ${data.displayName},`)}
    ${paragraph(`You've been crushing our Survivor trivia! Here's how you're doing:`)}
    <div style="text-align: center; margin: 24px 0;">
      ${statBox(`${percentComplete}%`, 'Complete')}
      ${statBox(`${accuracy}%`, 'Accuracy')}
      ${statBox(`${data.questionsCorrect}`, 'Correct')}
    </div>
    ${card(`
      ${paragraph(`You've answered ${data.questionsAnswered} of ${data.totalQuestions} questions. ${data.totalQuestions - data.questionsAnswered} more to go!`)}
      ${paragraph(`Complete all questions correctly to earn your spot on the leaderboard and show off your Survivor expertise.`)}
    `)}
    ${button('Continue Trivia', `${BASE_URL}/trivia`)}
    ${paragraph(`<em style="color: #8A7654;">The tribe is watching. Keep it up!</em>`)}
  `, 'Your trivia progress');
}
function joinLeagueNudgeEmailTemplate(data) {
    return emailWrapper(`
    ${heading("You're Missing Out")}
    ${paragraph(`Hey ${data.displayName},`)}
    ${paragraph(`You signed up ${data.daysSinceSignup} days ago but you're not in a league yet. Season 50 is about to start — don't sit this one out.`)}
    ${card(`
      <div style="text-align: center;">
        ${heading(`Season 50: In the Hands of the Fans`, 2)}
        ${paragraph(`<strong>Premiere:</strong> Wednesday, February 26, 2025 at 8:00 PM ET`)}
        ${paragraph(`<strong>Draft deadline:</strong> Monday, March 3, 2025 at 5:00 PM PT`)}
      </div>
    `)}
    ${divider()}
    ${heading('Three Ways to Play', 2)}
    ${paragraph(`<strong>1. Create a Private League</strong> — Get your friends involved and talk trash all season`)}
    ${paragraph(`<strong>2. Join a Public League</strong> — Find other fans looking for competition`)}
    ${paragraph(`<strong>3. Global Rankings</strong> — You're already in! Compete against everyone`)}
    ${button('Join a League Now', `${BASE_URL}/leagues`)}
    ${paragraph(`<strong style="color: #8B0000;">The draft deadline is coming. Don't get left behind.</strong>`)}
  `, 'Join a league before the season starts');
}
function preSeasonHypeEmailTemplate(data) {
    const hasLeagueContent = data.hasLeague
        ? `You're locked in with ${highlight(data.leagueName || 'your league')}. Make sure your rankings are set before the draft deadline.`
        : `You're not in a league yet. There's still time — but not much.`;
    return emailWrapper(`
    ${heading(`${data.daysUntilPremiere} Days Until Season 50`)}
    ${paragraph(`Hey ${data.displayName},`)}
    ${paragraph(`${data.seasonName} premieres in ${data.daysUntilPremiere} days. The draft deadline is coming fast.`)}
    ${card(`
      <div style="text-align: center;">
        <div style="font-family: Georgia, serif; font-size: 48px; font-weight: 700; color: #8B0000;">${data.daysUntilPremiere}</div>
        <p style="color: #666666; margin: 4px 0 0 0; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">Days to Go</p>
      </div>
    `, 'immunity')}
    ${paragraph(hasLeagueContent)}
    ${data.hasLeague
        ? button('Finalize Your Rankings', `${BASE_URL}/dashboard`)
        : button('Join a League', `${BASE_URL}/leagues`)}
    ${divider()}
    ${card(`
      ${heading('Key Dates', 2)}
      ${paragraph(`<strong>Premiere:</strong> Wednesday, February 26, 2025 at 8:00 PM ET`)}
      ${paragraph(`<strong>Draft deadline:</strong> Monday, March 3, 2025 at 5:00 PM PT`)}
      ${paragraph(`<strong>First pick due:</strong> Wednesday, March 5, 2025 at 5:00 PM PT`)}
    `)}
    ${paragraph(`<strong style="color: #8B0000;">Rank your castaways. The draft won't wait.</strong>`)}
  `, `${data.daysUntilPremiere} days until Season ${data.seasonNumber}`);
}
function postSeasonWrapUpEmailTemplate(data) {
    return emailWrapper(`
    ${heading('Season Complete - Thanks for Playing')}
    ${paragraph(`Hey ${data.displayName},`)}
    ${paragraph(`${data.seasonName} has come to an end. ${data.winnerName} took home the title of Sole Survivor!`)}
    ${card(`
      ${heading('Your Season Stats', 2)}
      <div style="text-align: center; margin: 16px 0;">
        ${statBox(data.totalPoints, 'Total Points', 'gold')}
        ${statBox(`#${data.bestRank}`, 'Best Rank', 'burgundy')}
        ${statBox(data.leaguesPlayed, 'Leagues', 'dark')}
      </div>
    `, 'immunity')}
    ${paragraph(`Thanks for being part of Reality Games Fantasy League this season. We hope you had a blast competing!`)}
    ${divider()}
    ${card(`
      ${heading('What\'s Next', 2)}
      ${paragraph(`Stay tuned for the next season of Survivor. We'll let you know when registration opens so you can defend your title — or seek redemption!`)}
      ${paragraph(`In the meantime, challenge your friends to our Survivor trivia and keep your knowledge sharp.`)}
    `)}
    ${button('Play Trivia', `${BASE_URL}/trivia`)}
    ${paragraph(`<em style="color: #8A7654;">See you next season!</em>`)}
  `, `Season wrap-up: ${data.seasonName}`);
}
function privateLeagueWelcomeEmailTemplate(data) {
    return emailWrapper(`
    ${heading('Welcome to ' + data.leagueName)}
    ${paragraph(`Hey ${data.displayName},`)}
    ${paragraph(`You're in. ${highlight(data.commissionerName)} set up this league for ${data.seasonName} — now it's time to compete.`)}
    ${card(`
      <div style="text-align: center;">
        <div style="font-family: -apple-system, sans-serif; font-size: 48px; font-weight: 700; color: #8B0000;">${data.memberCount}<span style="color: #666666; font-size: 24px;">/${data.maxMembers}</span></div>
        <p style="color: #666666; margin: 4px 0 0 0; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">Players Joined</p>
      </div>
    `)}
    ${button('View League', `${BASE_URL}/leagues/${data.leagueId}`)}
    ${divider()}
    ${heading('What to Do Now', 2)}
    ${paragraph(`<strong>1. Rank all 24 castaways</strong> — Your rankings determine who you draft. Think strategically.`)}
    ${paragraph(`<strong>2. Get more people in</strong> — More players = more competition. Share the league.`)}
    ${paragraph(`<strong>3. Start the trash talk</strong> — Private leagues are where rivalries are born.`)}
    ${card(`
      ${heading('Key Dates', 2)}
      ${paragraph(`<strong>Draft deadline:</strong> Monday, March 3, 2025 at 5:00 PM PT`)}
      ${paragraph(`<strong>Premiere:</strong> Wednesday, February 26, 2025 at 8:00 PM ET`)}
    `)}
    ${paragraph(`<strong style="color: #8B0000;">Rank smart. Beat your friends. Earn the bragging rights.</strong>`)}
  `, `You've joined ${data.leagueName}`);
}
function inactivityReminderEmailTemplate(data) {
    return emailWrapper(`
    ${heading("You're Falling Behind")}
    ${paragraph(`Hey ${data.displayName},`)}
    ${paragraph(`It's been ${data.daysSinceLastActivity} days. The season is still going and your team needs you making picks.`)}
    ${data.missedEpisodes > 0 ? card(`
      <div style="text-align: center;">
        <div style="font-family: -apple-system, sans-serif; font-size: 36px; font-weight: 700; color: #DC2626;">${data.missedEpisodes}</div>
        <p style="color: #991B1B; margin: 4px 0 0 0; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">Episodes Missed</p>
      </div>
      ${paragraph(`Auto-picks were applied for ${data.missedEpisodes} episode${data.missedEpisodes > 1 ? 's' : ''}. You'd probably do better choosing yourself.`)}
    `, 'warning') : ''}
    ${button('Get Back In', `${BASE_URL}/dashboard`)}
    ${divider()}
    ${card(`
      ${heading('Quick Catch-Up', 2)}
      ${paragraph('• Check your standings')}
      ${paragraph("• See who's still in the game")}
      ${paragraph('• Lock in your pick for the next episode')}
    `)}
    ${paragraph(`<strong style="color: #8B0000;">Picks lock every Wednesday at 5pm PT. Don't miss another one.</strong>`)}
  `, 'Your fantasy team needs you');
}
// ============================================
// EMAIL SERVICE CLASS
// ============================================
export class EmailService {
    // Send welcome email when user signs up
    static async sendWelcome(data) {
        return EmailService.sendFromCMS('welcome', {
            displayName: data.displayName,
            dashboardUrl: `${BASE_URL}/dashboard`,
            howToPlayUrl: `${BASE_URL}/how-to-play`,
        }, {
            subject: 'Welcome to Reality Games: Survivor',
            html: welcomeEmailTemplate(data),
        }, {
            to: data.email,
            critical: false,
        });
    }
    // Send trivia welcome email when user starts playing trivia
    static async sendTriviaWelcome(data) {
        const html = triviaWelcomeEmailTemplate(data);
        return sendEmail({
            to: data.email,
            subject: 'Welcome, Survivor Fan - Here\'s How to Play',
            html,
        });
    }
    // Send trivia signup welcome email (for homepage signup form)
    static async sendTriviaSignupWelcome(data) {
        const html = triviaSignupWelcomeEmailTemplate(data);
        return sendEmail({
            to: data.email,
            subject: "You're Signed Up for Survivor Trivia!",
            html,
        });
    }
    // Send league created email to commissioner
    static async sendLeagueCreated(data) {
        const html = leagueCreatedEmailTemplate(data);
        return sendEmail({
            to: data.email,
            subject: `Your league "${data.leagueName}" is ready`,
            html,
        });
    }
    // Send league joined email to new member (CRITICAL - part of payment flow)
    static async sendLeagueJoined(data) {
        return EmailService.sendFromCMS('league-joined', {
            displayName: data.displayName,
            leagueName: data.leagueName,
            seasonName: data.seasonName,
            memberCount: data.memberCount.toString(),
            maxMembers: data.maxMembers.toString(),
            premiereDate: formatDate(data.premiereDate),
            draftDeadline: formatDate(data.draftDeadline),
            firstPickDue: formatDate(data.firstPickDue),
            leagueUrl: `${BASE_URL}/leagues/${data.leagueId}`,
        }, {
            subject: `You've joined ${data.leagueName}`,
            html: leagueJoinedEmailTemplate(data),
        }, {
            to: data.email,
            critical: true, // Part of payment flow - must be delivered
        });
    }
    // Send draft pick confirmation (CRITICAL - draft confirmations must be delivered)
    static async sendDraftPickConfirmed(data) {
        const html = draftPickConfirmedEmailTemplate(data);
        return sendEmailCritical({
            to: data.email,
            subject: `Draft Pick: ${data.castawayName}`,
            html,
        });
    }
    // Send draft complete email
    static async sendDraftComplete(data) {
        const html = draftCompleteEmailTemplate(data);
        return sendEmail({
            to: data.email,
            subject: `Your team is set for ${data.leagueName}`,
            html,
        });
    }
    // Send weekly pick confirmation (CRITICAL - pick confirmations must be delivered)
    static async sendPickConfirmed(data) {
        const html = pickConfirmedEmailTemplate(data);
        return sendEmailCritical({
            to: data.email,
            subject: `Pick confirmed: ${data.castawayName}`,
            html,
        });
    }
    // Send auto-pick alert
    static async sendAutoPickAlert(data) {
        const html = autoPickAlertEmailTemplate(data);
        return sendEmail({
            to: data.email,
            subject: `Auto-pick applied: ${data.castawayName}`,
            html,
        });
    }
    // Send payment confirmation (CRITICAL - uses retry logic)
    static async sendPaymentConfirmed(data) {
        return EmailService.sendFromCMS('payment-confirmation', {
            displayName: data.displayName,
            leagueName: data.leagueName,
            amount: data.amount.toFixed(2),
            date: formatDate(data.date),
            leagueUrl: `${BASE_URL}/leagues/${data.leagueId}`,
        }, {
            subject: `Payment received - ${data.leagueName}`,
            html: paymentConfirmedEmailTemplate(data),
        }, {
            to: data.email,
            critical: true, // Uses retry logic for critical payment confirmation
        });
    }
    // Send tax receipt for nonprofit donations (CRITICAL - IRS compliance)
    static async sendTaxReceipt(data) {
        const { generateTaxReceiptHtml, generateTaxReceiptText } = await import('./templates/taxReceipt.js');
        // TODO: Replace with actual nonprofit info from environment variables
        const organizationName = process.env.NONPROFIT_NAME || 'Reality Games Fantasy League';
        const ein = process.env.NONPROFIT_EIN || '[Your EIN Here]';
        const address = process.env.NONPROFIT_ADDRESS || '[Your Address Here]';
        const emailData = {
            ...data,
            organizationName,
            ein,
            address,
        };
        const html = generateTaxReceiptHtml(emailData);
        const text = generateTaxReceiptText(emailData);
        return sendEmailCritical({
            to: data.email,
            subject: `Tax Receipt - ${organizationName} (${data.leagueName})`,
            html,
            text,
        });
    }
    // Send draft reminder (enqueued for background delivery)
    static async sendDraftReminder(data) {
        const html = draftReminderEmailTemplate(data);
        const result = await enqueueEmail({
            to: data.email,
            subject: `${data.daysRemaining} days left to complete your draft`,
            html,
            type: 'normal',
        });
        return result !== null;
    }
    // Send draft final warning (enqueued for background delivery)
    static async sendDraftFinalWarning(data) {
        const html = draftFinalWarningEmailTemplate(data);
        const result = await enqueueEmail({
            to: data.email,
            subject: `URGENT: ${data.hoursRemaining} hours to complete rankings`,
            html,
            type: 'normal',
        });
        return result !== null;
    }
    // Send pick reminder (enqueued for background delivery)
    static async sendPickReminder(data) {
        const html = pickReminderEmailTemplate(data);
        const result = await enqueueEmail({
            to: data.email,
            subject: `${data.hoursRemaining} hours to make your pick`,
            html,
            type: 'normal',
        });
        return result !== null;
    }
    // Send pick final warning (enqueued for background delivery)
    static async sendPickFinalWarning(data) {
        const html = pickFinalWarningEmailTemplate(data);
        const result = await enqueueEmail({
            to: data.email,
            subject: `PICKS LOCK IN ${data.minutesRemaining} MINUTES`,
            html,
            type: 'normal',
        });
        return result !== null;
    }
    // Send episode results - SPOILER-SAFE subject (doesn't reveal points in subject)
    static async sendEpisodeResults(data) {
        const html = episodeResultsEmailTemplate(data);
        const result = await enqueueEmail({
            to: data.email,
            subject: `Episode ${data.episodeNumber} results are ready`,
            html,
            type: 'normal',
        });
        return result !== null;
    }
    // Send elimination alert - SPOILER-SAFE version (doesn't reveal who was eliminated)
    static async sendEliminationAlert(data) {
        const html = eliminationAlertEmailTemplate(data);
        const result = await enqueueEmail({
            to: data.email,
            subject: `This week's results are ready - ${data.leagueName}`,
            html,
            type: 'normal',
        });
        return result !== null;
    }
    // Send payment recovery email when checkout expires (enqueued for background delivery)
    static async sendPaymentRecovery(data) {
        const html = paymentRecoveryEmailTemplate(data);
        const result = await enqueueEmail({
            to: data.email,
            subject: `Complete your payment for ${data.leagueName}`,
            html,
            type: 'normal',
        });
        return result !== null;
    }
    // Send torch snuffed notification - SPOILER-SAFE version (doesn't reveal details)
    static async sendTorchSnuffed(data) {
        const html = torchSnuffedEmailTemplate(data);
        return sendEmailCritical({
            to: data.email,
            subject: `This week's results are ready - ${data.leagueName}`,
            html,
        });
    }
    // ============================================
    // NEW LIFECYCLE EMAILS
    // ============================================
    // Send trivia progress encouragement email
    static async sendTriviaProgress(data) {
        const html = triviaProgressEmailTemplate(data);
        const result = await enqueueEmail({
            to: data.email,
            subject: 'Keep going - you\'re doing great',
            html,
            type: 'normal',
        });
        return result !== null;
    }
    // Send nudge to join a league (for users who signed up but haven't joined)
    static async sendJoinLeagueNudge(data) {
        const html = joinLeagueNudgeEmailTemplate(data);
        const result = await enqueueEmail({
            to: data.email,
            subject: 'Ready to play? Join a league before the season starts',
            html,
            type: 'normal',
        });
        return result !== null;
    }
    // Send pre-season hype/reminder email
    static async sendPreSeasonHype(data) {
        const html = preSeasonHypeEmailTemplate(data);
        const result = await enqueueEmail({
            to: data.email,
            subject: `${data.daysUntilPremiere} days until Season ${data.seasonNumber} premieres`,
            html,
            type: 'normal',
        });
        return result !== null;
    }
    // Send post-season wrap-up email
    static async sendPostSeasonWrapUp(data) {
        const html = postSeasonWrapUpEmailTemplate(data);
        const result = await enqueueEmail({
            to: data.email,
            subject: `Season complete - thanks for playing ${data.seasonName}`,
            html,
            type: 'normal',
        });
        return result !== null;
    }
    // Send private league welcome email (different from global league join)
    static async sendPrivateLeagueWelcome(data) {
        const html = privateLeagueWelcomeEmailTemplate(data);
        return sendEmailCritical({
            to: data.email,
            subject: `Welcome to ${data.leagueName}`,
            html,
        });
    }
    // Send inactivity reminder to bring users back
    static async sendInactivityReminder(data) {
        const html = inactivityReminderEmailTemplate(data);
        const result = await enqueueEmail({
            to: data.email,
            subject: 'We miss you - your fantasy team needs you',
            html,
            type: 'normal',
        });
        return result !== null;
    }
    /**
     * Send email using CMS template (database) with fallback to hardcoded template
     *
     * This method integrates the database-driven CMS with the email sending system.
     * It tries to load the template from the database first, then falls back to
     * a provided hardcoded template if the database template doesn't exist or is inactive.
     *
     * @param slug - Template slug in database (e.g., 'welcome', 'pick-reminder')
     * @param variables - Variables to replace in template (e.g., {displayName: 'John'})
     * @param fallback - Hardcoded template to use if database template doesn't exist
     * @param options - Email sending options (critical, queue, etc.)
     * @returns Promise<boolean> indicating success
     */
    static async sendFromCMS(slug, variables, fallback, options) {
        try {
            // Import template loader
            const { renderEmailTemplate } = await import('./templateLoader.js');
            // Render template (tries DB first, falls back to hardcoded)
            const rendered = await renderEmailTemplate(slug, variables, fallback);
            // Log which source was used
            if (rendered.source === 'database') {
                console.log(`[Email] Using CMS template: ${slug}`);
            }
            else {
                console.log(`[Email] Using fallback template: ${slug} (CMS template not found)`);
            }
            // Send email based on options
            if (options.critical) {
                return sendEmailCritical({
                    to: options.to,
                    subject: rendered.subject,
                    html: rendered.html,
                    text: rendered.text || undefined,
                });
            }
            else if (options.queue) {
                const result = await enqueueEmail({
                    to: options.to,
                    subject: rendered.subject,
                    html: rendered.html,
                    text: rendered.text || undefined,
                    type: 'normal',
                });
                return result !== null;
            }
            else {
                return sendEmail({
                    to: options.to,
                    subject: rendered.subject,
                    html: rendered.html,
                    text: rendered.text || undefined,
                });
            }
        }
        catch (err) {
            console.error(`Failed to send email from CMS (${slug}):`, err);
            return false;
        }
    }
    // Log email to notifications table
    static async logNotification(userId, type, subject, body) {
        try {
            await supabaseAdmin.from('notifications').insert({
                user_id: userId,
                type,
                subject,
                body,
                sent_at: new Date().toISOString(),
            });
        }
        catch (err) {
            console.error('Failed to log notification:', err);
        }
    }
}
export default EmailService;
//# sourceMappingURL=service.js.map