import { emailWrapper, heading, paragraph, button, card, highlight, featureItem, centeredText } from '../base.js';
export function autoPickAlertEmail({ displayName, leagueName, castawayName, episodeNumber, leagueId }) {
    const content = `
    ${heading('Auto-Pick Applied')}
    
    ${paragraph(`Hey ${displayName},`)}
    
    ${paragraph(`You missed the pick deadline for Episode ${episodeNumber} in ${highlight(leagueName)}.`)}

    ${card(`
      ${centeredText(`
        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #8B6914; margin: 0 0 12px 0;">Auto-Selected</p>
        <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 700; color: #8B6914; margin: 0;">${castawayName}</p>
        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #8A7654; margin: 12px 0 0 0;">We selected your highest-performing active castaway.</p>
      `)}
    `, 'warning')}

    ${button('View Your Team', `https://survivor.realitygamesfantasyleague.com/leagues/${leagueId}/team`)}

    ${card(`
      ${heading("Don't Miss Future Picks", 3)}
      ${featureItem('📱', 'Enable SMS Reminders', 'Get text alerts before pick deadlines.')}
      ${featureItem('🔔', 'Turn On Notifications', 'Update your preferences in your profile.')}
    `)}
  `;
    return emailWrapper(content, `Auto-pick: ${castawayName} selected for Episode ${episodeNumber}`, 'immunity');
}
//# sourceMappingURL=auto-pick-alert.js.map