import { emailWrapper, heading, paragraph, button, card, highlight, featureItem, centeredText } from '../base.js';
export function leagueJoinedEmail({ displayName, leagueName, seasonName, memberCount, maxPlayers, leagueId }) {
    const content = `
    ${heading("You're In!")}
    
    ${paragraph(`Hey ${displayName},`)}
    
    ${paragraph(`You've joined ${highlight(leagueName)} for ${seasonName}.`)}

    ${card(`
      ${centeredText(`
        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #8A7654; margin: 0 0 8px 0;">Current Members</p>
        <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 36px; font-weight: 700; color: #A52A2A; margin: 0;">${memberCount}<span style="color: #8A7654; font-size: 20px;">/${maxPlayers}</span></p>
        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #8A7654; margin: 12px 0 0 0;">The draft will begin once all players have joined.</p>
      `)}
    `, 'highlight')}

    ${button('View League', `https://survivor.realitygamesfantasyleague.com/leagues/${leagueId}`)}

    ${heading("What's Next?", 2)}
    ${featureItem('🎯', 'Wait for the Draft', 'The commissioner will start the draft once the league is ready.')}
    ${featureItem('🏝️', 'Draft 2 Castaways', 'Build your team in the snake draft.')}
    ${featureItem('📊', 'Make Weekly Picks', 'Choose your castaway each episode and compete!')}
  `;
    return emailWrapper(content, `You've joined ${leagueName}`, 'tribal');
}
//# sourceMappingURL=league-joined.js.map