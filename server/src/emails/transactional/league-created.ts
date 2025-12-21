import { emailWrapper, button } from '../base.js';

interface LeagueCreatedEmailParams {
  displayName: string;
  leagueName: string;
  leagueCode: string;
  seasonName: string;
  inviteUrl: string;
}

export function leagueCreatedEmail({ displayName, leagueName, leagueCode, seasonName, inviteUrl }: LeagueCreatedEmailParams): string {
  return emailWrapper(`
    <h1>Your League is Ready! 🏆</h1>
    <p>Hey ${displayName},</p>
    <p>You've successfully created <span class="highlight">${leagueName}</span> for ${seasonName}. As commissioner, you're in charge of inviting players and managing the league.</p>

    <div class="card" style="text-align: center;">
      <p style="color: #b8a; margin-bottom: 8px;">League Code</p>
      <div style="font-size: 36px; font-weight: bold; color: #d4a656; letter-spacing: 4px;">${leagueCode}</div>
    </div>

    <h2>Share Your League</h2>
    <p>Send this invite link to your friends:</p>
    <div style="background: #4a1d3c; padding: 12px; border-radius: 8px; word-break: break-all; font-family: monospace; color: #d4a656;">
      ${inviteUrl}
    </div>

    ${button('Manage Your League', `https://rgfl.app/leagues/${leagueCode}`)}

    <h2>Next Steps</h2>
    <p>✅ Invite 2-12 players to join</p>
    <p>✅ Set the draft order (or randomize)</p>
    <p>✅ Wait for all players, then start the draft</p>

    <p>Good luck, Commissioner!</p>
  `, `Your league "${leagueName}" is ready - invite your friends!`);
}
