import { emailWrapper, button } from '../base.js';

interface RefundIssuedEmailParams {
  displayName: string;
  leagueName: string;
  amount: number;
  currency: string;
  reason?: string;
}

export function refundIssuedEmail({ displayName, leagueName, amount, currency, reason }: RefundIssuedEmailParams): string {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);

  return emailWrapper(`
    <h1>Refund Processed 💵</h1>
    <p>Hey ${displayName},</p>
    <p>A refund has been issued for your <span class="highlight">${leagueName}</span> entry fee.</p>

    <div class="card">
      <h2>Refund Details</h2>
      <table style="width: 100%; color: #e8d0df;">
        <tr>
          <td>League</td>
          <td style="text-align: right; color: #fff;">${leagueName}</td>
        </tr>
        <tr>
          <td>Refund Amount</td>
          <td style="text-align: right; color: #22c55e; font-weight: bold;">${formattedAmount}</td>
        </tr>
        ${reason ? `<tr><td>Reason</td><td style="text-align: right; color: #fff;">${reason}</td></tr>` : ''}
      </table>
    </div>

    <p>The refund will appear on your original payment method within 5-10 business days.</p>

    ${button('View Payment History', 'https://rgfl.app/profile/payments')}

    <p>Questions? Reply to this email for support.</p>
  `, `Refund issued: ${formattedAmount} for ${leagueName}`);
}
