import { emailWrapper, heading, paragraph, button, card } from '../base.js';
export function refundIssuedEmail({ displayName, leagueName, amount, currency, reason }) {
    const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
    }).format(amount);
    const content = `
    ${heading('Refund Processed')}
    
    ${paragraph(`Hey ${displayName},`)}
    
    ${paragraph(`A refund has been issued for your <strong style="color: #A52A2A;">${leagueName}</strong> entry fee.`)}

    ${card(`
      ${heading('Refund Details', 2)}
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="color: #4A3728;">
        <tr style="border-bottom: 1px solid #EDE5D5;">
          <td style="padding: 12px 0; color: #8A7654;">League</td>
          <td style="padding: 12px 0; text-align: right; font-weight: 500;">${leagueName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #EDE5D5;">
          <td style="padding: 12px 0; color: #8A7654;">Refund Amount</td>
          <td style="padding: 12px 0; text-align: right; color: #166534; font-weight: 700; font-size: 18px;">${formattedAmount}</td>
        </tr>
        ${reason ? `<tr><td style="padding: 12px 0; color: #8A7654;">Reason</td><td style="padding: 12px 0; text-align: right; font-weight: 500;">${reason}</td></tr>` : ''}
      </table>
    `)}

    ${paragraph('The refund will appear on your original payment method within 5-10 business days.')}

    ${button('View Payment History', 'https://survivor.realitygamesfantasyleague.com/profile/payments')}

    ${paragraph(`<span style="color: #8A7654; font-size: 14px;">Questions? Reply to this email for support.</span>`)}
  `;
    return emailWrapper(content, `Refund issued: ${formattedAmount} for ${leagueName}`, 'merge');
}
//# sourceMappingURL=refund-issued.js.map