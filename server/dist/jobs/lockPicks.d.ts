/**
 * Lock all pending picks for episodes where picks_lock_at has passed
 * Runs: Wed 3pm PST
 */
export declare function lockPicks(): Promise<{
    locked: number;
    episodes: string[];
}>;
export default lockPicks;
//# sourceMappingURL=lockPicks.d.ts.map