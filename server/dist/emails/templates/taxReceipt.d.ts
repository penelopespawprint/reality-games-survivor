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
export interface TaxReceiptEmailData {
    displayName: string;
    email: string;
    donationAmount: number;
    donationDate: Date;
    transactionId: string;
    leagueName: string;
    organizationName: string;
    ein: string;
    address: string;
}
export declare function generateTaxReceiptHtml(data: TaxReceiptEmailData): string;
export declare function generateTaxReceiptText(data: TaxReceiptEmailData): string;
//# sourceMappingURL=taxReceipt.d.ts.map