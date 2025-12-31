import { emailWrapper, heading, paragraph, button, card, highlight, centeredText } from '../base.js';
export function draftReminderEmail({ displayName, leagueName, daysLeft, leagueId }) {
    const content = `
    ${heading('Draft Reminder')}
    
    ${paragraph(`Hey ${displayName},`)}
    
    ${paragraph(`You have ${highlight(`${daysLeft} day${daysLeft !== 1 ? 's' : ''}`)} left to complete your draft for ${highlight(leagueName)}.`)}

    ${card(`
      ${centeredText(`
        <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 48px; font-weight: 700; color: #8B6914; margin: 0;">${daysLeft}</p>
        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #8A7654; margin: 8px 0 0 0;">Days Remaining</p>
      `)}
    `, 'warning')}

    ${button('Complete Your Draft', `https://survivor.realitygamesfantasyleague.com/leagues/${leagueId}/draft`)}

    ${paragraph(`<span style="color: #8A7654; font-size: 14px;">If you don't complete your draft, castaways will be auto-assigned from remaining available players.</span>`)}
  `;
    return emailWrapper(content, `${daysLeft} days left to complete your draft for ${leagueName}`);
}
//# sourceMappingURL=draft-reminder.js.map