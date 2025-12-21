import { emailWrapper, button } from '../base.js';

interface WaiverOpenEmailParams {
  displayName: string;
  leagueName: string;
  eliminatedCastawayName: string;
  waiverClosesAt: string;
  leagueId: string;
}

export function waiverOpenEmail({ displayName, leagueName, eliminatedCastawayName, waiverClosesAt, leagueId }: WaiverOpenEmailParams): string {
  return emailWrapper(`
    <h1>🔄 Waiver Wire Open</h1>
    <p>Hey ${displayName},</p>
    <p>Your castaway <span style="color: #ef4444; text-decoration: line-through;">${eliminatedCastawayName}</span> has been eliminated from Survivor.</p>

    <div class="card">
      <h2>Time to Make a Move!</h2>
      <p>The waiver wire is now open for <span class="highlight">${leagueName}</span>. Submit your ranked preferences for available castaways.</p>
      <p style="color: #b8a; font-size: 14px;">Waiver claims process in reverse standings order - lower-ranked players get priority!</p>
    </div>

    ${button('Submit Waiver Rankings', `https://rgfl.app/leagues/${leagueId}/waivers`)}

    <p>Window closes: <strong>${waiverClosesAt}</strong></p>
  `, `Waiver wire open: Replace ${eliminatedCastawayName} in ${leagueName}`);
}
