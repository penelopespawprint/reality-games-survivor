import { emailWrapper, heading, paragraph, button, card, centeredText } from '../base.js';
export function pickFinalWarningEmail({ displayName, episodeNumber, minutesLeft, leagueId }) {
    const content = `
    ${heading('Picks Lock Soon', 1, 'error')}
    
    ${paragraph(`Hey ${displayName},`)}
    
    ${paragraph(`You have <strong style="color: #DC2626;">${minutesLeft} minutes</strong> to submit your pick for Episode ${episodeNumber}.`)}

    ${card(`
      ${centeredText(`
        <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 56px; font-weight: 700; color: #DC2626; margin: 0;">${minutesLeft}m</p>
        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #991B1B; margin: 8px 0 0 0;">Until Picks Lock</p>
      `)}
    `, 'error')}

    ${button('Pick Now', `https://survivor.realitygamesfantasyleague.com/leagues/${leagueId}/pick`, 'urgent')}

    ${paragraph(`<span style="color: #DC2626; font-size: 14px;">After lockout, your highest-ranked castaway will be auto-selected.</span>`)}
  `;
    return emailWrapper(content, `${minutesLeft} minutes to make your Episode ${episodeNumber} pick`, 'tribal_council');
}
//# sourceMappingURL=pick-final-warning.js.map