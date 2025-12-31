import { emailWrapper, heading, paragraph, button, card, highlight, statsRow, centeredText } from '../base.js';
export function draftPickConfirmedEmail({ displayName, leagueName, castawayName, pickNumber, round, totalRounds, isComplete, nextPickerName, leagueId, }) {
    const content = isComplete
        ? `
      ${heading('Draft Complete!')}
      
      ${paragraph(`Hey ${displayName},`)}
      
      ${paragraph(`You've drafted ${highlight(castawayName)} in Round ${round} and completed your draft for ${highlight(leagueName)}.`)}

      ${card(`
        ${centeredText(`
          <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #8A7654; margin: 0 0 12px 0;">Final Pick</p>
          <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 700; color: #A52A2A; margin: 0;">${castawayName}</p>
        `)}
      `, 'immunity')}

      ${statsRow([
            { value: pickNumber, label: 'Pick #', color: 'burgundy' },
            { value: `${round}/${totalRounds}`, label: 'Round', color: 'gold' },
        ])}

      ${button('View Your Team', `https://survivor.realitygamesfantasyleague.com/leagues/${leagueId}/team`, 'gold')}

      ${card(`
        ${heading("What's Next?", 3)}
        ${paragraph('Once all players complete their drafts, you\'ll be able to make your first weekly pick.')}
      `)}
    `
        : `
      ${heading('Pick Confirmed')}
      
      ${paragraph(`Hey ${displayName},`)}
      
      ${paragraph(`You've drafted ${highlight(castawayName)} in Round ${round} for ${highlight(leagueName)}.`)}

      ${card(`
        ${centeredText(`
          <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #8A7654; margin: 0 0 12px 0;">You Drafted</p>
          <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 700; color: #A52A2A; margin: 0;">${castawayName}</p>
        `)}
      `, 'highlight')}

      ${statsRow([
            { value: pickNumber, label: 'Pick #', color: 'burgundy' },
            { value: `${round}/${totalRounds}`, label: 'Round', color: 'gold' },
        ])}

      ${nextPickerName ? paragraph(`Next up: <strong style="color: #A52A2A;">${nextPickerName}</strong>`) : ''}

      ${button('Back to Draft', `https://survivor.realitygamesfantasyleague.com/leagues/${leagueId}/draft`)}
    `;
    return emailWrapper(content, `You drafted ${castawayName} in ${leagueName}`, isComplete ? 'immunity' : 'tribal');
}
//# sourceMappingURL=draft-pick-confirmed.js.map