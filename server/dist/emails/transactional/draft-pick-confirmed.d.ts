interface DraftPickConfirmedEmailParams {
    displayName: string;
    leagueName: string;
    castawayName: string;
    pickNumber: number;
    round: number;
    totalRounds: number;
    isComplete: boolean;
    nextPickerName?: string;
    leagueId: string;
}
export declare function draftPickConfirmedEmail({ displayName, leagueName, castawayName, pickNumber, round, totalRounds, isComplete, nextPickerName, leagueId, }: DraftPickConfirmedEmailParams): string;
export {};
//# sourceMappingURL=draft-pick-confirmed.d.ts.map