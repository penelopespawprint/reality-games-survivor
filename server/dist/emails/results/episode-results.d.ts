interface EpisodeResultsEmailParams {
    displayName: string;
    leagueName: string;
    episodeNumber: number;
    episodeTitle?: string;
    castawayName: string;
    pointsEarned: number;
    totalPoints: number;
    rank: number;
    totalPlayers: number;
    rankChange: number;
    leagueId: string;
    episodeId: string;
}
export declare function episodeResultsEmail({ displayName, leagueName, episodeNumber, episodeTitle, castawayName, pointsEarned, totalPoints, rank, totalPlayers, rankChange, leagueId, episodeId, }: EpisodeResultsEmailParams): string;
export {};
//# sourceMappingURL=episode-results.d.ts.map