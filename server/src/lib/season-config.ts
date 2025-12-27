import { DateTime } from 'luxon';
import { supabaseAdmin } from '../config/supabase.js';

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
class SeasonConfig {
  private cachedSeason: Season | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Load the current active season from database
   * Uses in-memory cache to avoid repeated DB queries
   */
  async loadCurrentSeason(): Promise<Season | null> {
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

      this.cachedSeason = data as Season;
      this.cacheExpiry = now + this.CACHE_DURATION_MS;

      console.log(`Loaded active season: ${data.name} (Season ${data.number})`);
      return this.cachedSeason;
    } catch (err) {
      console.error('Failed to load current season:', err);
      throw err;
    }
  }

  /**
   * Invalidate the cache (call after updating season dates)
   */
  invalidateCache(): void {
    this.cachedSeason = null;
    this.cacheExpiry = 0;
    console.log('Season config cache invalidated');
  }

  /**
   * Get the draft deadline as Luxon DateTime in Pacific timezone
   * @returns DateTime in America/Los_Angeles timezone or null if no active season
   */
  async getDraftDeadline(): Promise<DateTime | null> {
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
  async getDraftOrderDeadline(): Promise<DateTime | null> {
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
  async getRegistrationClose(): Promise<DateTime | null> {
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
  async getPremiereDate(): Promise<DateTime | null> {
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
  getPicksLockTime(): { dayOfWeek: number; hour: number; minute: number } {
    return {
      dayOfWeek: 3, // Wednesday (0 = Sunday)
      hour: 15, // 3pm
      minute: 0,
    };
  }

  /**
   * Check if there is an active season
   */
  async hasActiveSeason(): Promise<boolean> {
    const season = await this.loadCurrentSeason();
    return season !== null;
  }

  /**
   * Get the current season info (useful for logging)
   */
  async getSeasonInfo(): Promise<{
    number: number;
    name: string;
    draftDeadline: string | null;
    draftOrderDeadline: string | null;
    registrationClose: string | null;
  } | null> {
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
