import { emailWrapper, heading, paragraph, button, card, highlight, centeredText } from '../base.js';
export function draftCompleteEmail({ displayName, leagueName, castaways, leagueId, premiereDate }) {
    const castawayList = castaways
        .map((c, i) => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #EDE5D5;">
          <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 18px; font-weight: 600; color: #5C1717;">${c.name}</span>
          <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #8A7654; margin-left: 8px;">${c.tribe}</span>
        </td>
        <td style="padding: 12px 16px; text-align: right; border-bottom: 1px solid #EDE5D5;">
          <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 600; color: #A52A2A; text-transform: uppercase;">Pick ${i + 1}</span>
        </td>
      </tr>
    `)
        .join('');
    const content = `
    ${heading('Your Team is Set!')}
    
    ${paragraph(`Hey ${displayName},`)}
    
    ${paragraph(`The draft for ${highlight(leagueName)} is complete. Here's your roster:`)}

    ${card(`
      ${centeredText(`<p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #8A7654; margin: 0 0 16px 0;">Your Castaways</p>`)}
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #FEFDFB; border-radius: 8px; overflow: hidden;">
        ${castawayList}
      </table>
    `, 'immunity')}

    ${button('View Your Team', `https://survivor.realitygamesfantasyleague.com/leagues/${leagueId}/team`)}

    ${card(`
      ${centeredText(`
        ${heading('Mark Your Calendar', 3)}
        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #4A3728; margin: 0;">
          The premiere airs on <strong style="color: #A52A2A;">${premiereDate}</strong>.<br/>
          Submit your weekly pick before the episode starts!
        </p>
      `)}
    `)}
  `;
    return emailWrapper(content, `Your draft is complete for ${leagueName}`, 'immunity');
}
//# sourceMappingURL=draft-complete.js.map