/**
 * Tax Receipt Email Template (IRS Compliance)
 *
 * Required elements for 501(c)(3) donation receipts:
 * 1. Organization name and EIN
 * 2. Donation amount
 * 3. Date of donation
 * 4. Statement that no goods/services were provided
 * 5. 501(c)(3) status confirmation
 */
export function generateTaxReceiptHtml(data) {
    const { displayName, donationAmount, donationDate, transactionId, leagueName, organizationName, ein, address, } = data;
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Receipt - ${organizationName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2563eb;
      margin: 0 0 10px 0;
      font-size: 24px;
    }
    .header p {
      color: #666;
      margin: 5px 0;
      font-size: 14px;
    }
    .receipt-box {
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      padding: 24px;
      margin: 20px 0;
    }
    .receipt-box h2 {
      margin-top: 0;
      color: #1e40af;
      font-size: 18px;
    }
    .receipt-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .receipt-row:last-child {
      border-bottom: none;
    }
    .receipt-label {
      font-weight: 600;
      color: #475569;
    }
    .receipt-value {
      color: #0f172a;
    }
    .donation-amount {
      font-size: 32px;
      font-weight: bold;
      color: #059669;
      text-align: center;
      margin: 20px 0;
    }
    .disclaimer {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 24px 0;
      font-size: 14px;
    }
    .nonprofit-info {
      background: #ecfdf5;
      border-left: 4px solid #10b981;
      padding: 16px;
      margin: 24px 0;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 13px;
    }
    .tax-note {
      font-weight: bold;
      color: #dc2626;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${organizationName}</h1>
    <p>${address}</p>
    <p>Federal Tax ID (EIN): ${ein}</p>
    <p>501(c)(3) Nonprofit Organization</p>
  </div>

  <h2 style="color: #1e40af; text-align: center;">Official Donation Receipt</h2>

  <div class="donation-amount">
    $${donationAmount.toFixed(2)}
  </div>

  <div class="receipt-box">
    <h2>Donation Details</h2>

    <div class="receipt-row">
      <span class="receipt-label">Donor Name:</span>
      <span class="receipt-value">${displayName}</span>
    </div>

    <div class="receipt-row">
      <span class="receipt-label">Donation Amount:</span>
      <span class="receipt-value">$${donationAmount.toFixed(2)}</span>
    </div>

    <div class="receipt-row">
      <span class="receipt-label">Date of Donation:</span>
      <span class="receipt-value">${donationDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    })}</span>
    </div>

    <div class="receipt-row">
      <span class="receipt-label">League:</span>
      <span class="receipt-value">${leagueName}</span>
    </div>

    <div class="receipt-row">
      <span class="receipt-label">Transaction ID:</span>
      <span class="receipt-value">${transactionId}</span>
    </div>
  </div>

  <div class="nonprofit-info">
    <p style="margin: 0 0 8px 0;"><strong>✅ Tax-Deductible Donation</strong></p>
    <p style="margin: 0; font-size: 13px;">
      This donation is tax-deductible to the full extent allowed by law.
      ${organizationName} is a 501(c)(3) nonprofit organization recognized by the IRS.
    </p>
  </div>

  <div class="disclaimer">
    <p style="margin: 0 0 8px 0;"><strong>⚠️ Required IRS Statement:</strong></p>
    <p style="margin: 0; font-size: 13px;">
      No goods or services were provided in exchange for this contribution.
      Your donation supports our charitable mission to provide engaging fantasy sports
      experiences that raise funds for charitable organizations selected by our community.
    </p>
  </div>

  <div class="receipt-box">
    <h2>How Your Donation is Used</h2>
    <ul style="margin: 12px 0; padding-left: 20px;">
      <li><strong>7%</strong> supports platform operations and administration</li>
      <li><strong>93%</strong> directed to charitable causes selected by league winners</li>
    </ul>
    <p style="margin: 12px 0 0 0; font-size: 13px; color: #475569;">
      Your donation directly supports charitable giving in your community.
    </p>
  </div>

  <p class="tax-note">
    ⭐ Please retain this receipt for your tax records.
  </p>

  <div class="footer">
    <p><strong>${organizationName}</strong></p>
    <p>${address}</p>
    <p>EIN: ${ein}</p>
    <p style="margin-top: 16px;">
      Questions about this donation? Contact us at
      <a href="mailto:donations@realitygamesfantasyleague.com" style="color: #2563eb;">
        donations@realitygamesfantasyleague.com
      </a>
    </p>
  </div>
</body>
</html>
  `;
}
export function generateTaxReceiptText(data) {
    const { displayName, donationAmount, donationDate, transactionId, leagueName, organizationName, ein, address, } = data;
    return `
OFFICIAL TAX RECEIPT

${organizationName}
${address}
Federal Tax ID (EIN): ${ein}
501(c)(3) Nonprofit Organization

================================================
DONATION DETAILS
================================================

Donor Name: ${displayName}
Donation Amount: $${donationAmount.toFixed(2)}
Date of Donation: ${donationDate.toLocaleDateString('en-US')}
League: ${leagueName}
Transaction ID: ${transactionId}

================================================
TAX-DEDUCTIBLE CONTRIBUTION
================================================

This donation is tax-deductible to the full extent allowed by law.
${organizationName} is a 501(c)(3) nonprofit organization recognized by the IRS.

REQUIRED IRS STATEMENT:
No goods or services were provided in exchange for this contribution.

HOW YOUR DONATION IS USED:
- 7% supports platform operations and administration
- 93% directed to charitable causes selected by league winners

Your donation directly supports charitable giving in your community.

⭐ Please retain this receipt for your tax records.

Questions? Contact: donations@realitygamesfantasyleague.com
  `.trim();
}
//# sourceMappingURL=taxReceipt.js.map