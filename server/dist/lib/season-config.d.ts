import { DateTime } from 'luxon';
interface Season {
    id: string;
    number: number;
    name: string;
    is_active: boolean;
    registration_opens_at: string;
    draft_order_deadline: string;
    registration_closes_at: string;
    premiere_at: string;
    draft_deadline: string;
    finale_at: string | null;
    created_at: string;
    updated_at: string;
}
/**
 * Service for managing season configuration with caching
 */
declare class SeasonConfig {
    private cachedSeason;
    private cacheExpiry;
    private readonly CACHE_DURATION_MS;
    /**
     * Load the current active season from database
     * Uses in-memory cache to avoid repeated DB queries
     */
    loadCurrentSeason(): Promise<Season | null>;
    /**
     * Invalidate the cache (call after updating season dates)
     */
    invalidateCache(): void;
    /**
     * Get the draft deadline as Luxon DateTime in Pacific timezone
     * @returns DateTime in America/Los_Angeles timezone or null if no active season
     */
    getDraftDeadline(): Promise<DateTime | null>;
    /**
     * Get the draft order deadline as Luxon DateTime in Pacific timezone
     * @returns DateTime in America/Los_Angeles timezone or null if no active season
     */
    getDraftOrderDeadline(): Promise<DateTime | null>;
    /**
     * Get the registration close date as Luxon DateTime in Pacific timezone
     * @returns DateTime in America/Los_Angeles timezone or null if no active season
     */
    getRegistrationClose(): Promise<DateTime | null>;
    /**
     * Get the premiere date as Luxon DateTime in Pacific timezone
     * @returns DateTime in America/Los_Angeles timezone or null if no active season
     */
    getPremiereDate(): Promise<DateTime | null>;
    /**
     * Get the picks lock time configuration
     * This is a recurring schedule (every Wednesday at 3pm PST), not a one-time date
     * @returns Object with day of week and time
     */
    getPicksLockTime(): {
        dayOfWeek: number;
        hour: number;
        minute: number;
    };
    /**
     * Check if there is an active season
     */
    hasActiveSeason(): Promise<boolean>;
    /**
     * Get the current season info (useful for logging)
     */
    getSeasonInfo(): Promise<{
        number: number;
        name: string;
        draftDeadline: string | null;
        draftOrderDeadline: string | null;
        registrationClose: string | null;
    } | null>;
}
export declare const seasonConfig: SeasonConfig;
export default seasonConfig;
//# sourceMappingURL=season-config.d.ts.map