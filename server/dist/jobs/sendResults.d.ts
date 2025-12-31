interface ResultsResult {
    sent: number;
    episodeId: string | null;
}
/**
 * Send episode results to all league members
 * Runs: Fri 12pm PST (after scoring is finalized)
 */
export declare function sendEpisodeResults(): Promise<ResultsResult>;
/**
 * Send elimination alerts to users whose castaways were eliminated
 * Called after scoring is finalized
 */
export declare function sendEliminationAlerts(episodeId: string): Promise<{
    sent: number;
}>;
declare const _default: {
    sendEpisodeResults: typeof sendEpisodeResults;
    sendEliminationAlerts: typeof sendEliminationAlerts;
};
export default _default;
//# sourceMappingURL=sendResults.d.ts.map