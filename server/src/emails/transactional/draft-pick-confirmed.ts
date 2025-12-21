import { emailWrapper, button, statBox } from '../base.js';

interface DraftPickConfirmedEmailParams {
  displayName: string;
  leagueName: string;
  castawayName: string;
  pickNumber: number;
  round: number;
  totalRounds: number;
  isComplete: boolean;
  nextPickerName?: string;
  leagueId: string;
}

export function draftPickConfirmedEmail({
  displayName,
  leagueName,
  castawayName,
  pickNumber,
  round,
  totalRounds,
  isComplete,
  nextPickerName,
  leagueId,
}: DraftPickConfirmedEmailParams): string {
  const content = isComplete
    ? `
      <h1>Draft Complete! 🏆</h1>
      <p>Hey ${displayName},</p>
      <p>You've drafted <span class="highlight">${castawayName}</span> in Round ${round} and completed your draft for <span class="highlight">${leagueName}</span>!</p>

      <div style="display: flex; gap: 16px; flex-wrap: wrap;">
        ${statBox(pickNumber, 'Pick #')}
        ${statBox(`${round}/${totalRounds}`, 'Round')}
      </div>

      ${button('View Your Team', `https://rgfl.app/leagues/${leagueId}/team`)}

      <div class="card">
        <h2>What's Next?</h2>
        <p>Once all players complete their drafts, you'll be able to make your first weekly pick. Check back before Episode 1 airs!</p>
      </div>
    `
    : `
      <h1>Pick Confirmed! ✓</h1>
      <p>Hey ${displayName},</p>
      <p>You've drafted <span class="highlight">${castawayName}</span> in Round ${round} for <span class="highlight">${leagueName}</span>.</p>

      <div style="display: flex; gap: 16px; flex-wrap: wrap;">
        ${statBox(pickNumber, 'Pick #')}
        ${statBox(`${round}/${totalRounds}`, 'Round')}
      </div>

      ${nextPickerName ? `<p>Next up: <strong>${nextPickerName}</strong></p>` : ''}

      ${button('Back to Draft', `https://rgfl.app/leagues/${leagueId}/draft`)}
    `;

  return emailWrapper(content, `You drafted ${castawayName} in ${leagueName}`);
}
