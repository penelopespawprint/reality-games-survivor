import { emailWrapper, button } from '../base.js';

interface DraftReminderEmailParams {
  displayName: string;
  leagueName: string;
  daysLeft: number;
  leagueId: string;
}

export function draftReminderEmail({ displayName, leagueName, daysLeft, leagueId }: DraftReminderEmailParams): string {
  return emailWrapper(`
    <h1>⏰ Draft Reminder</h1>
    <p>Hey ${displayName},</p>
    <p>You have <span class="highlight">${daysLeft} day${daysLeft !== 1 ? 's' : ''}</span> left to complete your draft for <span class="highlight">${leagueName}</span>.</p>

    <div class="card" style="text-align: center;">
      <div style="font-size: 48px; font-weight: bold; color: #d4a656;">${daysLeft}</div>
      <div style="color: #b8a; text-transform: uppercase; font-size: 12px;">Days Remaining</div>
    </div>

    ${button('Complete Your Draft', `https://rgfl.app/leagues/${leagueId}/draft`)}

    <p style="color: #b8a;">If you don't complete your draft, castaways will be auto-assigned from remaining available players.</p>
  `, `${daysLeft} days left to complete your draft for ${leagueName}`);
}
