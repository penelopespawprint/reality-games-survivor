import { DateTime } from 'luxon';
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
export function pstToCron(hour, minute, dayOfWeek) {
    // Create a datetime in Pacific timezone for current year
    // We use a reference date to determine current DST offset
    const now = DateTime.now().setZone('America/Los_Angeles');
    // Create datetime with specified hour/minute in Pacific time
    const pacificTime = DateTime.now()
        .setZone('America/Los_Angeles')
        .set({ hour, minute, second: 0, millisecond: 0 });
    // Convert to UTC
    const utcTime = pacificTime.toUTC();
    // Build cron expression
    const cronMinute = utcTime.minute;
    const cronHour = utcTime.hour;
    const cronDay = dayOfWeek !== undefined ? dayOfWeek : '*';
    return `${cronMinute} ${cronHour} * * ${cronDay}`;
}
/**
 * Get current UTC offset for Pacific Time
 * @returns Offset in hours (e.g., -7 for PDT, -8 for PST)
 */
export function getPacificOffset() {
    const pacificTime = DateTime.now().setZone('America/Los_Angeles');
    return pacificTime.offset / 60; // Convert minutes to hours
}
/**
 * Check if Pacific Time is currently observing DST
 * @returns true if PDT (daylight time), false if PST (standard time)
 */
export function isPacificDST() {
    const pacificTime = DateTime.now().setZone('America/Los_Angeles');
    return pacificTime.isInDST;
}
/**
 * Format a cron expression with timezone info for logging
 */
export function formatCronWithTimezone(cron, originalHour, originalMinute) {
    const isDST = isPacificDST();
    const offset = getPacificOffset();
    const tzAbbr = isDST ? 'PDT' : 'PST';
    return `${cron} (${originalHour}:${originalMinute.toString().padStart(2, '0')} ${tzAbbr} = UTC${offset >= 0 ? '+' : ''}${offset})`;
}
//# sourceMappingURL=timezone-utils.js.map