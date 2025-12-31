interface RefundIssuedEmailParams {
    displayName: string;
    leagueName: string;
    amount: number;
    currency: string;
    reason?: string;
}
export declare function refundIssuedEmail({ displayName, leagueName, amount, currency, reason }: RefundIssuedEmailParams): string;
export {};
//# sourceMappingURL=refund-issued.d.ts.map