interface PaymentConfirmedEmailParams {
    displayName: string;
    leagueName: string;
    amount: number;
    currency: string;
    transactionDate: string;
    leagueId: string;
}
export declare function paymentConfirmedEmail({ displayName, leagueName, amount, currency, transactionDate, leagueId }: PaymentConfirmedEmailParams): string;
export {};
//# sourceMappingURL=payment-confirmed.d.ts.map