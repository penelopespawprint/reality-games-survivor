import { emailWrapper, heading, paragraph, button, card, highlight, listItem, centeredText } from '../base.js';
export function leagueCreatedEmail({ displayName, leagueName, leagueCode, seasonName, inviteUrl }) {
    const content = `
    ${heading('Your League is Ready!')}
    
    ${paragraph(`Hey ${displayName},`)}
    
    ${paragraph(`You've created ${highlight(leagueName)} for ${seasonName}. As commissioner, you're in charge of inviting players and managing the league.`)}

    ${card(`
      ${centeredText(`
        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #8A7654; margin: 0 0 12px 0;">League Code</p>
        <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 42px; font-weight: 700; color: #A52A2A; letter-spacing: 6px; margin: 0;">${leagueCode}</p>
      `)}
    `, 'highlight')}

    ${heading('Share Your League', 2)}
    ${paragraph('Send this invite link to your friends:')}
    
    ${card(`
      <p style="font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 13px; color: #5C1717; word-break: break-all; margin: 0; line-height: 1.6;">${inviteUrl}</p>
    `)}

    ${button('Manage Your League', `https://survivor.realitygamesfantasyleague.com/leagues/${leagueCode}`)}

    ${heading('Next Steps', 2)}
    ${listItem('Invite 2-12 players to join your league', '✅')}
    ${listItem('Set the draft order (or randomize it)', '✅')}
    ${listItem('Wait for all players, then start the draft', '✅')}
  `;
    return emailWrapper(content, `Your league "${leagueName}" is ready`, 'tribal');
}
//# sourceMappingURL=league-created.js.map