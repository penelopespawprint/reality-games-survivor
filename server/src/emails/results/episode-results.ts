import { emailWrapper, button, statBox } from '../base.js';

interface EpisodeResultsEmailParams {
  displayName: string;
  leagueName: string;
  episodeNumber: number;
  episodeTitle?: string;
  castawayName: string;
  pointsEarned: number;
  totalPoints: number;
  rank: number;
  totalPlayers: number;
  rankChange: number; // positive = moved up, negative = moved down
  leagueId: string;
  episodeId: string;
}

export function episodeResultsEmail({
  displayName,
  leagueName,
  episodeNumber,
  episodeTitle,
  castawayName,
  pointsEarned,
  totalPoints,
  rank,
  totalPlayers,
  rankChange,
  leagueId,
  episodeId,
}: EpisodeResultsEmailParams): string {
  const rankEmoji = rank === 1 ? '👑' : rank <= 3 ? '🏆' : '';
  const rankChangeText = rankChange > 0
    ? `<span style="color: #22c55e;">↑${rankChange}</span>`
    : rankChange < 0
    ? `<span style="color: #ef4444;">↓${Math.abs(rankChange)}</span>`
    : '<span style="color: #b8a;">—</span>';

  return emailWrapper(`
    <h1>📊 Episode ${episodeNumber} Results</h1>
    <p>Hey ${displayName},</p>
    <p>The scores are in for ${episodeTitle ? `"${episodeTitle}"` : `Episode ${episodeNumber}`}!</p>

    <div class="card" style="text-align: center;">
      <p style="color: #b8a; margin: 0;">Your Pick</p>
      <div style="font-size: 24px; font-weight: bold; color: #fff; margin: 8px 0;">${castawayName}</div>
      <div style="font-size: 48px; font-weight: bold; color: ${pointsEarned >= 0 ? '#22c55e' : '#ef4444'};">
        ${pointsEarned >= 0 ? '+' : ''}${pointsEarned}
      </div>
      <p style="color: #b8a; margin: 0;">Points This Episode</p>
    </div>

    <div style="display: flex; gap: 16px; flex-wrap: wrap; margin: 24px 0;">
      ${statBox(totalPoints, 'Total Points')}
      ${statBox(`${rankEmoji} #${rank}`, 'League Rank')}
    </div>

    <div class="card">
      <p style="margin: 0;">
        <strong>Movement:</strong> ${rankChangeText} &nbsp;|&nbsp;
        <strong>Standing:</strong> ${rank} of ${totalPlayers} in ${leagueName}
      </p>
    </div>

    ${button('View Full Breakdown', `https://rgfl.app/leagues/${leagueId}/episodes/${episodeId}`)}

    <p>Good luck next week!</p>
  `, `Episode ${episodeNumber}: You earned ${pointsEarned} points with ${castawayName}`);
}
