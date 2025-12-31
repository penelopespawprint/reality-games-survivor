/**
 * Auto-fill missing picks for users who didn't submit before deadline
 * Picks highest-ranked available castaway from roster
 * Detects and notifies users who are eliminated (no active castaways)
 * Runs: Wed 3:05pm PST (5 min after lock)
 */
export declare function autoPick(): Promise<{
    autoPicked: number;
    users: string[];
    eliminated: number;
    eliminatedUsers: string[];
}>;
export default autoPick;
//# sourceMappingURL=autoPick.d.ts.map