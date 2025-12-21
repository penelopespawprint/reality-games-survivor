import { emailWrapper, button } from '../base.js';

interface DraftFinalWarningEmailParams {
  displayName: string;
  leagueName: string;
  hoursLeft: number;
  leagueId: string;
}

export function draftFinalWarningEmail({ displayName, leagueName, hoursLeft, leagueId }: DraftFinalWarningEmailParams): string {
  return emailWrapper(`
    <h1>🚨 FINAL DRAFT WARNING</h1>
    <p>Hey ${displayName},</p>
    <p>The draft for <span class="highlight">${leagueName}</span> closes in <span style="color: #ef4444; font-weight: bold;">${hoursLeft} hours!</span></p>

    <div class="card" style="background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); text-align: center;">
      <div style="font-size: 48px; font-weight: bold; color: #ef4444;">${hoursLeft}h</div>
      <div style="color: #fbbf24; text-transform: uppercase; font-size: 12px;">Until Auto-Draft</div>
    </div>

    ${button('COMPLETE DRAFT NOW', `https://rgfl.app/leagues/${leagueId}/draft`)}

    <p style="color: #ef4444;">⚠️ After the deadline, remaining picks will be auto-assigned!</p>
  `, `⚠️ URGENT: ${hoursLeft} hours left to complete your draft!`);
}
