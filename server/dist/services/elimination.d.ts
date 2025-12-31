/**
 * Castaway Elimination Service
 *
 * Handles castaway elimination logic including:
 * - Updating castaway status
 * - Finding affected users via rosters
 * - Sending notifications (email/SMS) for:
 *   - Torch snuffed (both castaways eliminated)
 *   - Elimination alert (one castaway remaining)
 * - Updating league_members for eliminated users
 */
export interface EliminationResult {
    castaway: any;
    notificationsSent: {
        torchSnuffed: number;
        eliminationAlert: number;
        smsCount: number;
        emailCount: number;
    };
    affectedUsers: number;
}
interface EliminateParams {
    castawayId: string;
    episodeId: string;
    placement?: number;
}
/**
 * Eliminate a castaway and notify affected users
 */
export declare function eliminateCastaway(params: EliminateParams): Promise<EliminationResult>;
export {};
//# sourceMappingURL=elimination.d.ts.map