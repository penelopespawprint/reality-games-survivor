import { emailWrapper, heading, paragraph, button, card, centeredText } from '../base.js';
export function torchSnuffedEmail({ displayName, leagueName, leagueId, episodeNumber }) {
    const content = `
    ${heading('Your Torch Has Been Snuffed', 1, 'error')}
    
    ${paragraph(`Hey ${displayName},`)}

    ${card(`
      ${centeredText(`
        <p style="font-size: 64px; margin: 0 0 16px 0;">🔥</p>
        <p style="font-family: Georgia, 'Times New Roman', serif; color: #DC2626; font-weight: 700; font-size: 24px; margin: 0 0 8px 0;">
          Both your castaways have been eliminated
        </p>
        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #991B1B; margin: 0; font-size: 16px;">
          You can no longer compete in ${leagueName}
        </p>
      `)}
    `, 'error')}

    ${card(`
      ${heading('What This Means', 2)}
      ${paragraph(`Both castaways on your roster have been voted out. You cannot make picks for Episode ${episodeNumber} or future episodes.`)}
      ${paragraph('You can still:')}
      ${paragraph('• Watch the leaderboard and standings')}
      ${paragraph('• Participate in league discussions')}
      ${paragraph('• Join other leagues (if spots are available)')}
    `)}

    ${button('View League Standings', `https://survivor.realitygamesfantasyleague.com/leagues/${leagueId}/standings`)}
  `;
    return emailWrapper(content, `Your torch has been snuffed in ${leagueName}`, 'tribal_council');
}
//# sourceMappingURL=torch-snuffed.js.map