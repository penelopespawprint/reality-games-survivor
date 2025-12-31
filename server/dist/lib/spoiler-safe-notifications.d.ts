/**
 * Spoiler-Safe Notification Service
 *
 * Sends notifications about episode results WITHOUT spoilers
 * - Email: Generic subject, click-to-reveal content
 * - SMS: No scores/names, just prompt to check app
 * - Push: Generic message (future)
 */
interface User {
    id: string;
    email: string;
    display_name: string;
    phone: string | null;
}
interface Episode {
    id: string;
    number: number;
    week_number?: number;
    season_id: string;
}
/**
 * Send spoiler-safe notification to a user
 */
export declare function sendSpoilerSafeNotification(user: User, episode: Episode): Promise<void>;
/**
 * Verify results token and mark as used
 */
export declare function verifyResultsToken(token: string): Promise<{
    valid: boolean;
    userId?: string;
    episodeId?: string;
}>;
export {};
//# sourceMappingURL=spoiler-safe-notifications.d.ts.map