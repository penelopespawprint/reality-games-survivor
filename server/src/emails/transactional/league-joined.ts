import { emailWrapper, button } from '../base.js';

interface LeagueJoinedEmailParams {
  displayName: string;
  leagueName: string;
  seasonName: string;
  memberCount: number;
  maxPlayers: number;
  leagueId: string;
}

export function leagueJoinedEmail({ displayName, leagueName, seasonName, memberCount, maxPlayers, leagueId }: LeagueJoinedEmailParams): string {
  return emailWrapper(`
    <h1>You're In! 🎊</h1>
    <p>Hey ${displayName},</p>
    <p>You've joined <span class="highlight">${leagueName}</span> for ${seasonName}!</p>

    <div class="card">
      <p><strong>Current Members:</strong> ${memberCount}/${maxPlayers}</p>
      <p>The draft will begin once all players have joined and the commissioner starts it.</p>
    </div>

    ${button('View League', `https://rgfl.app/leagues/${leagueId}`)}

    <h2>What's Next?</h2>
    <p>🎯 Wait for the draft to begin</p>
    <p>🏝️ Draft 2 castaways for your team</p>
    <p>📊 Make weekly picks and compete!</p>

    <p>May the best fan win!</p>
  `, `You've joined ${leagueName} - get ready to draft!`);
}
