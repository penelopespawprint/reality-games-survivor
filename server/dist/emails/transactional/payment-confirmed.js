import { emailWrapper, heading, paragraph, button, card } from '../base.js';
export function paymentConfirmedEmail({ displayName, leagueName, amount, currency, transactionDate, leagueId }) {
    const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
    }).format(amount);
    const content = `
    ${heading('Payment Confirmed')}
    
    ${paragraph(`Hey ${displayName},`)}
    
    ${paragraph(`Your payment for <strong style="color: #A52A2A;">${leagueName}</strong> has been processed.`)}

    ${card(`
      ${heading('Receipt', 2)}
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="color: #4A3728;">
        <tr style="border-bottom: 1px solid #EDE5D5;">
          <td style="padding: 12px 0; color: #8A7654;">League</td>
          <td style="padding: 12px 0; text-align: right; font-weight: 500;">${leagueName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #EDE5D5;">
          <td style="padding: 12px 0; color: #8A7654;">Amount</td>
          <td style="padding: 12px 0; text-align: right; color: #A52A2A; font-weight: 700; font-size: 18px;">${formattedAmount}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; color: #8A7654;">Date</td>
          <td style="padding: 12px 0; text-align: right; font-weight: 500;">${transactionDate}</td>
        </tr>
      </table>
    `)}

    ${button('Go to League', `https://survivor.realitygamesfantasyleague.com/leagues/${leagueId}`)}

    <p style="color: #8A7654; font-size: 12px; text-align: center; margin: 24px 0 0 0;">This is your official receipt. Keep it for your records.</p>
  `;
    return emailWrapper(content, `Payment receipt for ${leagueName}: ${formattedAmount}`);
}
//# sourceMappingURL=payment-confirmed.js.map