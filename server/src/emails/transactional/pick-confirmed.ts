import { emailWrapper, button, statBox } from '../base.js';

interface PickConfirmedEmailParams {
  displayName: string;
  leagueName: string;
  castawayName: string;
  episodeNumber: number;
  picksLockAt: string;
  leagueId: string;
}

export function pickConfirmedEmail({ displayName, leagueName, castawayName, episodeNumber, picksLockAt, leagueId }: PickConfirmedEmailParams): string {
  return emailWrapper(`
    <h1>Pick Confirmed! ✓</h1>
    <p>Hey ${displayName},</p>
    <p>You've selected <span class="highlight">${castawayName}</span> for Episode ${episodeNumber} in <span class="highlight">${leagueName}</span>.</p>

    <div class="card" style="text-align: center;">
      <p style="color: #b8a; margin-bottom: 8px;">Your Pick</p>
      <div style="font-size: 24px; font-weight: bold; color: #d4a656;">${castawayName}</div>
      <p style="color: #b8a; font-size: 12px; margin-top: 8px;">Episode ${episodeNumber}</p>
    </div>

    <p>Picks lock at <strong>${picksLockAt}</strong>. You can change your pick until then.</p>

    ${button('View Pick', `https://rgfl.app/leagues/${leagueId}/pick`)}

    <p>Good luck!</p>
  `, `Your pick is confirmed: ${castawayName} for Episode ${episodeNumber}`);
}
