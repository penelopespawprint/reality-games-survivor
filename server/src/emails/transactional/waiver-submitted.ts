import { emailWrapper, button } from '../base.js';

interface WaiverSubmittedEmailParams {
  displayName: string;
  leagueName: string;
  rankings: Array<{ name: string; rank: number }>;
  waiverClosesAt: string;
  leagueId: string;
}

export function waiverSubmittedEmail({ displayName, leagueName, rankings, waiverClosesAt, leagueId }: WaiverSubmittedEmailParams): string {
  const rankingList = rankings
    .map((r) => `<p><strong>#${r.rank}:</strong> ${r.name}</p>`)
    .join('');

  return emailWrapper(`
    <h1>Waiver Rankings Submitted ✓</h1>
    <p>Hey ${displayName},</p>
    <p>Your waiver rankings for <span class="highlight">${leagueName}</span> have been saved.</p>

    <div class="card">
      <h2>Your Rankings</h2>
      ${rankingList}
    </div>

    <p>Waivers will be processed after <strong>${waiverClosesAt}</strong>. You can update your rankings until then.</p>

    ${button('Update Rankings', `https://rgfl.app/leagues/${leagueId}/waivers`)}

    <p style="color: #b8a; font-size: 14px;">Remember: Lower standings get priority in waiver claims!</p>
  `, `Waiver rankings saved for ${leagueName}`);
}
