import { emailWrapper, button } from '../base.js';

interface DraftCompleteEmailParams {
  displayName: string;
  leagueName: string;
  castaways: Array<{ name: string; tribe: string }>;
  leagueId: string;
  premiereDate: string;
}

export function draftCompleteEmail({ displayName, leagueName, castaways, leagueId, premiereDate }: DraftCompleteEmailParams): string {
  const castawayList = castaways
    .map((c, i) => `<p><strong>${i + 1}.</strong> ${c.name} <span style="color:#b8a;">(${c.tribe})</span></p>`)
    .join('');

  return emailWrapper(`
    <h1>Your Team is Set! 🌴</h1>
    <p>Hey ${displayName},</p>
    <p>The draft for <span class="highlight">${leagueName}</span> is complete! Here's your roster:</p>

    <div class="card">
      <h2>Your Castaways</h2>
      ${castawayList}
    </div>

    ${button('View Your Team', `https://rgfl.app/leagues/${leagueId}/team`)}

    <div class="card">
      <h2>Mark Your Calendar 📅</h2>
      <p>The premiere airs on <strong>${premiereDate}</strong>. Make sure to submit your weekly pick before the episode starts!</p>
    </div>

    <p>Good luck this season!</p>
  `, `Your draft is complete for ${leagueName}!`);
}
