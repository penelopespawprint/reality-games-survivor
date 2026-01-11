/**
 * Daily Stats Capture Job
 *
 * Captures key metrics daily for historical trend analysis.
 * Runs at midnight PST to capture end-of-day stats.
 */
interface StatCapture {
    stat_name: string;
    stat_category: string;
    stat_value: number;
    stat_metadata?: Record<string, unknown>;
}
export declare function captureStats(): Promise<{
    captured: number;
    stats: StatCapture[];
}>;
export {};
//# sourceMappingURL=captureStats.d.ts.map