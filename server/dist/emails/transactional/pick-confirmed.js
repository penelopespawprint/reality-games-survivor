import { emailWrapper, heading, paragraph, button, card, highlight, centeredText } from '../base.js';
export function pickConfirmedEmail({ displayName, leagueName, castawayName, episodeNumber, picksLockAt, leagueId }) {
    const content = `
    ${heading('Pick Confirmed')}
    
    ${paragraph(`Hey ${displayName},`)}
    
    ${paragraph(`You've selected ${highlight(castawayName)} for Episode ${episodeNumber} in ${highlight(leagueName)}.`)}

    ${card(`
      ${centeredText(`
        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #8A7654; margin: 0 0 12px 0;">Your Pick</p>
        <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 32px; font-weight: 700; color: #A52A2A; margin: 0;">${castawayName}</p>
        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #8A7654; margin: 12px 0 0 0;">Episode ${episodeNumber}</p>
      `)}
    `, 'highlight')}

    ${paragraph(`Picks lock at <strong style="color: #A52A2A;">${picksLockAt}</strong>. You can change your pick until then.`)}

    ${button('View Pick', `https://survivor.realitygamesfantasyleague.com/leagues/${leagueId}/pick`)}
  `;
    return emailWrapper(content, `Pick confirmed: ${castawayName} for Episode ${episodeNumber}`, 'tribal');
}
//# sourceMappingURL=pick-confirmed.js.map