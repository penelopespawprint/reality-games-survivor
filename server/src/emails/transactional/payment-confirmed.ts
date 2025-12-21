import { emailWrapper, button } from '../base.js';

interface PaymentConfirmedEmailParams {
  displayName: string;
  leagueName: string;
  amount: number;
  currency: string;
  transactionDate: string;
  leagueId: string;
}

export function paymentConfirmedEmail({ displayName, leagueName, amount, currency, transactionDate, leagueId }: PaymentConfirmedEmailParams): string {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);

  return emailWrapper(`
    <h1>Payment Confirmed! 💳</h1>
    <p>Hey ${displayName},</p>
    <p>Your payment for <span class="highlight">${leagueName}</span> has been processed successfully.</p>

    <div class="card">
      <h2>Receipt</h2>
      <table style="width: 100%; color: #e8d0df;">
        <tr>
          <td>League</td>
          <td style="text-align: right; color: #fff;">${leagueName}</td>
        </tr>
        <tr>
          <td>Amount</td>
          <td style="text-align: right; color: #d4a656; font-weight: bold;">${formattedAmount}</td>
        </tr>
        <tr>
          <td>Date</td>
          <td style="text-align: right; color: #fff;">${transactionDate}</td>
        </tr>
      </table>
    </div>

    ${button('Go to League', `https://rgfl.app/leagues/${leagueId}`)}

    <p style="color: #b8a; font-size: 12px;">This is your official receipt. Keep it for your records.</p>
  `, `Payment receipt for ${leagueName}: ${formattedAmount}`);
}
