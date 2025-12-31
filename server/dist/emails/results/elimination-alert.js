import { emailWrapper, heading, paragraph, button, card, centeredText } from '../base.js';
export function eliminationAlertEmail({ displayName, leagueName, castawayName, episodeNumber, leagueId, }) {
    const content = `
    ${heading('Castaway Eliminated', 1, 'error')}
    
    ${paragraph(`Hey ${displayName},`)}
    
    ${paragraph(`Bad news from the island...`)}

    ${card(`
      ${centeredText(`
        <p style="font-size: 64px; margin: 0 0 12px 0;">🔥</p>
        <p style="font-family: Georgia, 'Times New Roman', serif; color: #DC2626; font-weight: 700; font-size: 28px; margin: 0;">${castawayName}</p>
        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #8A7654; margin: 12px 0 0 0;">Voted out in Episode ${episodeNumber}</p>
      `)}
    `, 'error')}

    ${card(`
      ${heading('What Now?', 2)}
      ${paragraph(`You still have your other castaway to play for in ${leagueName}. If both of your castaways have been eliminated, your season is over but you can still follow along with the standings.`)}
    `)}

    ${button('View League', `https://survivor.realitygamesfantasyleague.com/leagues/${leagueId}`)}
  `;
    return emailWrapper(content, `${castawayName} eliminated in Episode ${episodeNumber}`, 'tribal_council');
}
//# sourceMappingURL=elimination-alert.js.map