interface LeagueJoinedEmailParams {
    displayName: string;
    leagueName: string;
    seasonName: string;
    memberCount: number;
    maxPlayers: number;
    leagueId: string;
}
export declare function leagueJoinedEmail({ displayName, leagueName, seasonName, memberCount, maxPlayers, leagueId }: LeagueJoinedEmailParams): string;
export {};
//# sourceMappingURL=league-joined.d.ts.map