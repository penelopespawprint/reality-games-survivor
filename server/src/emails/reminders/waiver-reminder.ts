import { emailWrapper, button } from '../base.js';

interface WaiverReminderEmailParams {
  displayName: string;
  leagueName: string;
  hoursLeft: number;
  leagueId: string;
}

export function waiverReminderEmail({ displayName, leagueName, hoursLeft, leagueId }: WaiverReminderEmailParams): string {
  return emailWrapper(`
    <h1>⏰ Waiver Deadline Approaching</h1>
    <p>Hey ${displayName},</p>
    <p>You haven't submitted waiver rankings for <span class="highlight">${leagueName}</span> yet.</p>

    <div class="card" style="text-align: center;">
      <div style="font-size: 48px; font-weight: bold; color: #fbbf24;">${hoursLeft}h</div>
      <div style="color: #b8a; text-transform: uppercase; font-size: 12px;">Until Waiver Closes</div>
    </div>

    ${button('Submit Rankings', `https://rgfl.app/leagues/${leagueId}/waivers`)}

    <p style="color: #b8a;">If you don't submit rankings, you won't be able to replace your eliminated castaway!</p>
  `, `${hoursLeft} hours left to submit waiver rankings for ${leagueName}`);
}
