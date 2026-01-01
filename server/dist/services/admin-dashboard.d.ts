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
 * Get draft status overview
 */
export declare function getDraftStats(): Promise<{
    pending: number;
    inProgress: number;
    completed: number;
    total: number;
    awaitingDraft: number;
}>;
/**
 * Get payment/revenue stats
 */
export declare function getPaymentStats(): Promise<{
    totalPayments: number;
    byStatus: {
        completed: number;
        pending: number;
        failed: number;
    };
    revenue: {
        today: number;
        thisWeek: number;
        thisMonth: number;
        allTime: number;
    };
}>;
/**
 * Get trivia engagement stats
 */
export declare function getTriviaStats(): Promise<{
    totalAttempts: number;
    completedTrivia: number;
    inProgress: number;
    completionRate: number;
    avgQuestionsAnswered: number;
    avgQuestionsCorrect: number;
}>;
/**
 * Get league breakdown by type
 */
export declare function getLeagueBreakdown(): Promise<{
    byVisibility: {
        public: number;
        private: number;
    };
    byPayment: {
        paid: number;
        free: number;
    };
}>;
/**
 * Get notification stats
 */
export declare function getNotificationStats(): Promise<{
    email: {
        enabled: number;
        percentage: number;
    };
    sms: {
        enabled: number;
        percentage: number;
    };
    push: {
        enabled: number;
        percentage: number;
    };
    totalUsers: number;
}>;
/**
 * Get system health status
 */
export declare function getSystemHealth(): Promise<SystemHealth>;
export {};
//# sourceMappingURL=admin-dashboard.d.ts.map