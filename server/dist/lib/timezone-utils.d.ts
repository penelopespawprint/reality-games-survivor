/**
 * Converts a Pacific Time (PST/PDT) schedule to UTC cron expression
 * Automatically handles daylight saving time transitions
 *
 * @param hour - Hour in Pacific Time (0-23)
 * @param minute - Minute (0-59)
 * @param dayOfWeek - Day of week (0-6, where 0 = Sunday, 3 = Wednesday, etc.)
 * @returns Cron expression in UTC time
 *
 * Example:
 *   pstToCron(15, 0, 3) // Wednesday 3pm PST
 *   Returns: "0 22 * * 3" (during PDT, UTC-7)
 *   Returns: "0 23 * * 3" (during PST, UTC-8)
 */
export declare function pstToCron(hour: number, minute: number, dayOfWeek?: number): string;
/**
 * Get current UTC offset for Pacific Time
 * @returns Offset in hours (e.g., -7 for PDT, -8 for PST)
 */
export declare function getPacificOffset(): number;
/**
 * Check if Pacific Time is currently observing DST
 * @returns true if PDT (daylight time), false if PST (standard time)
 */
export declare function isPacificDST(): boolean;
/**
 * Format a cron expression with timezone info for logging
 */
export declare function formatCronWithTimezone(cron: string, originalHour: number, originalMinute: number): string;
//# sourceMappingURL=timezone-utils.d.ts.map