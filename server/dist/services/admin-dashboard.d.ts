interface TimelineEvent {
    type: 'episode' | 'deadline' | 'job' | 'waiver';
    title: string;
    description: string;
    timestamp: string;
    status: 'upcoming' | 'in-progress' | 'completed';
    actionUrl?: string;
    icon?: string;
    metadata?: Record<string, any>;
}
interface DashboardStats {
    players: {
        total: number;
        activeThisWeek: number;
        newToday: number;
        newThisWeek: number;
        growthRate?: number;
    };
    leagues: {
        total: number;
        activeThisWeek: number;
        globalLeagueSize: number;
        averageSize: number;
    };
    game: {
        picksThisWeek: number;
        picksCompletionRate: number;
        castawaysRemaining: number;
        castawaysEliminated: number;
        episodesScored: number;
        totalEpisodes: number;
    };
    systemHealth: {
        dbResponseTimeMs: number;
        jobFailuresLast24h: number;
        emailQueueSize: number;
        failedEmailsCount: number;
    };
}
interface ActivityItem {
    type: 'user_signup' | 'league_created' | 'draft_completed' | 'pick_submitted' | 'payment_received' | 'admin_action';
    message: string;
    user?: {
        id: string;
        display_name: string;
    };
    timestamp: string;
    icon: string;
    metadata?: Record<string, any>;
}
interface SystemHealth {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: {
        database: boolean;
        jobs: boolean;
        emailQueue: boolean;
    };
    lastCheckTime: string;
    issues: string[];
}
/**
 * Get timeline of upcoming events
 */
export declare function getTimeline(): Promise<TimelineEvent[]>;
/**
 * Get comprehensive dashboard stats
 */
export declare function getDashboardStats(): Promise<DashboardStats>;
/**
 * Get recent platform activity
 */
export declare function getRecentActivity(limit?: number): Promise<ActivityItem[]>;
/**
 * Get system health status
 */
export declare function getSystemHealth(): Promise<SystemHealth>;
export {};
//# sourceMappingURL=admin-dashboard.d.ts.map