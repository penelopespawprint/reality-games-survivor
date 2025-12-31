import { emailWrapper, heading, paragraph, button, card, highlight, centeredText } from '../base.js';
export function pickReminderEmail({ displayName, episodeNumber, episodeTitle, hoursLeft, leagueId }) {
    const episodeText = episodeTitle ? `Episode ${episodeNumber}: "${episodeTitle}"` : `Episode ${episodeNumber}`;
    const content = `
    ${heading('Make Your Pick')}
    
    ${paragraph(`Hey ${displayName},`)}
    
    ${paragraph(`You haven't submitted your pick for ${highlight(episodeText)} yet.`)}

    ${card(`
      ${centeredText(`
        <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 48px; font-weight: 700; color: #8B6914; margin: 0;">${hoursLeft}h</p>
        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #8A7654; margin: 8px 0 0 0;">Until Picks Lock</p>
      `)}
    `, 'warning')}

    ${button('Make Your Pick', `https://survivor.realitygamesfantasyleague.com/leagues/${leagueId}/pick`)}
  `;
    return emailWrapper(content, `${hoursLeft} hours left to make your pick for Episode ${episodeNumber}`);
}
//# sourceMappingURL=pick-reminder.js.map