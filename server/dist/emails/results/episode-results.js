import { emailWrapper, heading, paragraph, button, card, statsRow, centeredText } from '../base.js';
export function episodeResultsEmail({ displayName, leagueName, episodeNumber, episodeTitle, castawayName, pointsEarned, totalPoints, rank, totalPlayers, rankChange, leagueId, episodeId, }) {
    const rankEmoji = rank === 1 ? '👑' : rank <= 3 ? '🏆' : '';
    const rankChangeText = rankChange > 0
        ? `<span style="color: #22c55e;">↑${rankChange}</span>`
        : rankChange < 0
            ? `<span style="color: #DC2626;">↓${Math.abs(rankChange)}</span>`
            : '<span style="color: #8A7654;">—</span>';
    const content = `
    ${heading(`Episode ${episodeNumber} Results`, 1, 'gold')}
    
    ${paragraph(`Hey ${displayName},`)}
    
    ${paragraph(`The scores are in for ${episodeTitle ? `"${episodeTitle}"` : `Episode ${episodeNumber}`}.`)}

    ${card(`
      ${centeredText(`
        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #8A7654; margin: 0 0 8px 0;">Your Pick</p>
        <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: 700; color: #5C1717; margin: 0 0 12px 0;">${castawayName}</p>
        <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 48px; font-weight: 700; color: ${pointsEarned >= 0 ? '#8B6914' : '#DC2626'}; margin: 0;">
          ${pointsEarned >= 0 ? '+' : ''}${pointsEarned}
        </p>
        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #8A7654; margin: 8px 0 0 0;">Points This Episode</p>
      `)}
    `, 'immunity')}

    ${statsRow([
        { value: totalPoints, label: 'Total Points', color: 'burgundy' },
        { value: `${rankEmoji} #${rank}`, label: 'League Rank', color: 'gold' },
    ])}

    ${card(`
      <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #4A3728; margin: 0; text-align: center;">
        <strong>Movement:</strong> ${rankChangeText} &nbsp;|&nbsp;
        <strong>Standing:</strong> ${rank} of ${totalPlayers} in ${leagueName}
      </p>
    `)}

    ${button('View Full Breakdown', `https://survivor.realitygamesfantasyleague.com/leagues/${leagueId}/episodes/${episodeId}`, 'gold')}
  `;
    return emailWrapper(content, `Episode ${episodeNumber}: You earned ${pointsEarned} points with ${castawayName}`, 'immunity');
}
//# sourceMappingURL=episode-results.js.map