import { emailWrapper, button } from '../base.js';

interface WaiverResultEmailParams {
  displayName: string;
  leagueName: string;
  droppedCastaway: string;
  acquiredCastaway: string | null;
  waiverPosition: number;
  leagueId: string;
}

export function waiverResultEmail({ displayName, leagueName, droppedCastaway, acquiredCastaway, waiverPosition, leagueId }: WaiverResultEmailParams): string {
  const acquired = acquiredCastaway
    ? `
      <div class="card" style="text-align: center;">
        <p style="color: #22c55e; margin: 0;">✅ Waiver Claim Successful!</p>
        <p style="margin: 16px 0 0 0;">
          <span style="color: #ef4444; text-decoration: line-through;">${droppedCastaway}</span>
          →
          <span class="highlight">${acquiredCastaway}</span>
        </p>
      </div>
    `
    : `
      <div class="card" style="text-align: center; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3);">
        <p style="color: #ef4444; margin: 0;">❌ No Waiver Claim Made</p>
        <p style="color: #b8a; margin: 16px 0 0 0;">
          ${droppedCastaway} was dropped but no replacement was claimed.
        </p>
      </div>
    `;

  return emailWrapper(`
    <h1>Waiver Results 🔄</h1>
    <p>Hey ${displayName},</p>
    <p>Waivers have been processed for <span class="highlight">${leagueName}</span>. Your waiver position was <strong>#${waiverPosition}</strong>.</p>

    ${acquired}

    ${button('View Your Team', `https://rgfl.app/leagues/${leagueId}/team`)}

    <p>Get ready for the next episode!</p>
  `, acquiredCastaway ? `Waiver claim: You acquired ${acquiredCastaway}` : 'Waiver results for ' + leagueName);
}
