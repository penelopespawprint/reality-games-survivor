import { DateTime } from 'luxon';
import { supabaseAdmin } from '../config/supabase.js';
/**
 * Service for managing season configuration with caching
 */
class SeasonConfig {
    cachedSeason = null;
    cacheExpiry = 0;
    CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour
    /**
     * Load the current active season from database
     * Uses in-memory cache to avoid repeated DB queries
     */
    async loadCurrentSeason() {
        const now = Date.now();
        // Return cached data if still valid
        if (this.cachedSeason && now < this.cacheExpiry) {
            return this.cachedSeason;
        }
        try {
            const { data, error } = await supabaseAdmin
                .from('seasons')
                .select('*')
                .eq('is_active', true)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    // No active season found
                    console.log('No active season found');
                    this.cachedSeason = null;
                    this.cacheExpiry = now + this.CACHE_DURATION_MS;
                    return null;
                }
                throw error;
            }
            this.cachedSeason = data;
            this.cacheExpiry = now + this.CACHE_DURATION_MS;
            console.log(`Loaded active season: ${data.name} (Season ${data.number})`);
            return this.cachedSeason;
        }
        catch (err) {
            console.error('Failed to load current season:', err);
            throw err;
        }
    }
    /**
     * Invalidate the cache (call after updating season dates)
     */
    invalidateCache() {
        this.cachedSeason = null;
        this.cacheExpiry = 0;
        console.log('Season config cache invalidated');
    }
    /**
     * Get the draft deadline as Luxon DateTime in Pacific timezone
     * @returns DateTime in America/Los_Angeles timezone or null if no active season
     */
    async getDraftDeadline() {
        const season = await this.loadCurrentSeason();
        if (!season || !season.draft_deadline) {
            return null;
        }
        return DateTime.fromISO(season.draft_deadline, { zone: 'America/Los_Angeles' });
    }
    /**
     * Get the draft order deadline as Luxon DateTime in Pacific timezone
     * @returns DateTime in America/Los_Angeles timezone or null if no active season
     */
    async getDraftOrderDeadline() {
        const season = await this.loadCurrentSeason();
        if (!season || !season.draft_order_deadline) {
            return null;
        }
        return DateTime.fromISO(season.draft_order_deadline, { zone: 'America/Los_Angeles' });
    }
    /**
     * Get the registration close date as Luxon DateTime in Pacific timezone
     * @returns DateTime in America/Los_Angeles timezone or null if no active season
     */
    async getRegistrationClose() {
        const season = await this.loadCurrentSeason();
        if (!season || !season.registration_closes_at) {
            return null;
        }
        return DateTime.fromISO(season.registration_closes_at, { zone: 'America/Los_Angeles' });
    }
    /**
     * Get the premiere date as Luxon DateTime in Pacific timezone
     * @returns DateTime in America/Los_Angeles timezone or null if no active season
     */
    async getPremiereDate() {
        const season = await this.loadCurrentSeason();
        if (!season || !season.premiere_at) {
            return null;
        }
        return DateTime.fromISO(season.premiere_at, { zone: 'America/Los_Angeles' });
    }
    /**
     * Get the picks lock time configuration
     * This is a recurring schedule (every Wednesday at 3pm PST), not a one-time date
     * @returns Object with day of week and time
     */
    getPicksLockTime() {
        return {
            dayOfWeek: 3, // Wednesday (0 = Sunday)
            hour: 15, // 3pm
            minute: 0,
        };
    }
    /**
     * Check if there is an active season
     */
    async hasActiveSeason() {
        const season = await this.loadCurrentSeason();
        return season !== null;
    }
    /**
     * Get the current season info (useful for logging)
     */
    async getSeasonInfo() {
        const season = await this.loadCurrentSeason();
        if (!season) {
            return null;
        }
        const draftDeadline = await this.getDraftDeadline();
        const draftOrderDeadline = await this.getDraftOrderDeadline();
        const registrationClose = await this.getRegistrationClose();
        return {
            number: season.number,
            name: season.name,
            draftDeadline: draftDeadline?.toISO() || null,
            draftOrderDeadline: draftOrderDeadline?.toISO() || null,
            registrationClose: registrationClose?.toISO() || null,
        };
    }
}
// Export singleton instance
export const seasonConfig = new SeasonConfig();
export default seasonConfig;
//# sourceMappingURL=season-config.js.map