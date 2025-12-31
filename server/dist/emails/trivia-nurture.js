/**
 * Trivia Completion Nurture Email Templates
 * For users who completed trivia but haven't joined a league
 */
import { emailWrapper, heading, paragraph, button, card } from './base.js';
export function triviaNurtureEmailTemplate(data) {
    const scorePercentage = Math.round((data.triviaScore / data.totalQuestions) * 100);
    const isPerfect = data.triviaScore === data.totalQuestions;
    const isGood = scorePercentage >= 80;
    return emailWrapper(`
    ${heading(isPerfect ? '👑 Perfect Score!' : isGood ? '🔥 Great Job!' : '📺 Nice Try!', 1, 'gold')}
    ${paragraph(`Hey ${data.displayName},`)}
    ${paragraph(isPerfect
        ? "You got a perfect score on our Survivor trivia! You clearly know your stuff. Now it's time to prove it in fantasy leagues."
        : isGood
            ? `You scored ${data.triviaScore}/${data.totalQuestions} on our Survivor trivia! That's impressive knowledge. Ready to put it to the test?`
            : `You scored ${data.triviaScore}/${data.totalQuestions} on our Survivor trivia. You've got the knowledge - now use it to dominate fantasy leagues!`)}
    
    ${card(`
      <div style="padding: 24px; text-align: center;">
        <h2 style="font-family: Georgia, serif; color: #8B0000; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
          Ready to Compete?
        </h2>
        <p style="color: #1F2937; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          Join Season 50: In the Hands of the Fans and compete in fantasy leagues with real strategy, real scoring, and real bragging rights.
        </p>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin: 24px 0;">
          <div style="padding: 16px; background: #F5F0E8; border-radius: 8px;">
            <div style="font-size: 32px; margin-bottom: 8px;">👥</div>
            <p style="font-weight: 600; color: #8B0000; margin: 0 0 4px 0;">Join Leagues</p>
            <p style="font-size: 12px; color: #6B7280; margin: 0;">Compete with friends</p>
          </div>
          <div style="padding: 16px; background: #F5F0E8; border-radius: 8px;">
            <div style="font-size: 32px; margin-bottom: 8px;">⭐</div>
            <p style="font-weight: 600; color: #8B0000; margin: 0 0 4px 0;">100+ Rules</p>
            <p style="font-size: 12px; color: #6B7280; margin: 0;">Real strategy</p>
          </div>
          <div style="padding: 16px; background: #F5F0E8; border-radius: 8px;">
            <div style="font-size: 32px; margin-bottom: 8px;">🏆</div>
            <p style="font-weight: 600; color: #8B0000; margin: 0 0 4px 0;">Win Bragging Rights</p>
            <p style="font-size: 12px; color: #6B7280; margin: 0;">Prove you're the best</p>
          </div>
        </div>
      </div>
    `, 'immunity')}
    
    ${button('Join Season 50', data.dashboardUrl, 'gold')}
    
    <div style="text-align: center; margin-top: 32px;">
      <p style="color: #8A7654; font-size: 14px; margin: 0 0 8px 0;">Quick Links:</p>
      <p style="margin: 4px 0;">
        <a href="${data.howToPlayUrl}" style="color: #8B0000; text-decoration: underline;">How to Play</a> • 
        <a href="${data.castawaysUrl}" style="color: #8B0000; text-decoration: underline;">View Castaways</a>
      </p>
    </div>
  `, isPerfect ? "Perfect Trivia Score - Now Join Season 50!" : "You Completed Trivia - Ready to Play?");
}
//# sourceMappingURL=trivia-nurture.js.map