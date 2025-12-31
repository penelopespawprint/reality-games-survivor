interface DraftCompleteEmailParams {
    displayName: string;
    leagueName: string;
    castaways: Array<{
        name: string;
        tribe: string;
    }>;
    leagueId: string;
    premiereDate: string;
}
export declare function draftCompleteEmail({ displayName, leagueName, castaways, leagueId, premiereDate }: DraftCompleteEmailParams): string;
export {};
//# sourceMappingURL=draft-complete.d.ts.map