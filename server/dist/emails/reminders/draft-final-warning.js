import { emailWrapper, heading, paragraph, button, card, highlight, centeredText } from '../base.js';
export function draftFinalWarningEmail({ displayName, leagueName, hoursLeft, leagueId }) {
    const content = `
    ${heading('Draft Closes Soon', 1, 'error')}
    
    ${paragraph(`Hey ${displayName},`)}
    
    ${paragraph(`The draft for ${highlight(leagueName)} closes in <strong style="color: #DC2626;">${hoursLeft} hours</strong>.`)}

    ${card(`
      ${centeredText(`
        <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 56px; font-weight: 700; color: #DC2626; margin: 0;">${hoursLeft}h</p>
        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #991B1B; margin: 8px 0 0 0;">Until Auto-Draft</p>
      `)}
    `, 'error')}

    ${button('Complete Draft Now', `https://survivor.realitygamesfantasyleague.com/leagues/${leagueId}/draft`, 'urgent')}

    ${paragraph(`<span style="color: #DC2626; font-size: 14px;">After the deadline, remaining picks will be auto-assigned.</span>`)}
  `;
    return emailWrapper(content, `URGENT: ${hoursLeft} hours left to complete your draft`, 'tribal_council');
}
//# sourceMappingURL=draft-final-warning.js.map