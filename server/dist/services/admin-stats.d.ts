/**
 * Comprehensive Admin Stats Service
 *
 * Provides detailed analytics across all platform dimensions
 */
export interface RevenueStats {
    totalRevenue: number;
    revenueThisMonth: number;
    revenueLastMonth: number;
    monthOverMonthGrowth: number | null;
    averageDonation: number;
    totalPayments: number;
    paymentsByStatus: {
        completed: number;
        pending: number;
        failed: number;
        refunded: number;
    };
    revenueByLeague: Array<{
        leagueId: string;
        leagueName: string;
        totalAmount: number;
        paymentCount: number;
    }>;
}
export interface UserEngagementStats {
    totalUsers: number;
    profilesComplete: number;
    profileCompletionRate: number;
    triviaStats: {
        started: number;
        completed: number;
        completionRate: number;
        averageScore: number;
        averageAttempts: number;
    };
    usersByRole: {
        players: number;
        commissioners: number;
        admins: number;
    };
    retentionStats: {
        activeToday: number;
        activeThisWeek: number;
        activeThisMonth: number;
        churned30Days: number;
    };
    signupsByDay: Array<{
        date: string;
        count: number;
    }>;
}
export interface LeagueAnalyticsStats {
    totalLeagues: number;
    publicLeagues: number;
    privateLeagues: number;
    paidLeagues: number;
    freeLeagues: number;
    globalLeagueMembers: number;
    draftStats: {
        pending: number;
        inProgress: number;
        completed: number;
        completionRate: number;
    };
    memberDistribution: {
        min: number;
        max: number;
        average: number;
        median: number;
    };
    leaguesByStatus: {
        forming: number;
        drafting: number;
        active: number;
        completed: number;
    };
    topLeagues: Array<{
        id: string;
        name: string;
        memberCount: number;
        isPublic: boolean;
        requireDonation: boolean;
        donationAmount: number | null;
    }>;
}
export interface CommunicationStats {
    chatStats: {
        totalMessages: number;
        messagesThisWeek: number;
        uniqueChatters: number;
        averageMessagesPerUser: number;
    };
    emailStats: {
        totalSent: number;
        sentToday: number;
        queueSize: number;
        failedCount: number;
        deliveryRate: number;
    };
    notificationPrefs: {
        emailEnabled: number;
        smsEnabled: number;
        pushEnabled: number;
        spoilerDelayEnabled: number;
    };
}
export interface GameProgressStats {
    season: {
        id: string;
        name: string;
        number: number;
    } | null;
    episodes: {
        total: number;
        scored: number;
        remaining: number;
        nextAirDate: string | null;
    };
    castaways: {
        total: number;
        active: number;
        eliminated: number;
        winner: number;
    };
    picks: {
        totalThisWeek: number;
        lockedThisWeek: number;
        autoPickedThisWeek: number;
        pendingThisWeek: number;
    };
    scoring: {
        totalPointsAwarded: number;
        averagePointsPerEpisode: number;
        topScorer: {
            name: string;
            points: number;
        } | null;
    };
    tribeBreakdown: Array<{
        tribe: string;
        active: number;
        eliminated: number;
    }>;
}
export interface SystemMetrics {
    database: {
        latencyMs: number;
        status: 'healthy' | 'degraded' | 'unhealthy';
    };
    jobs: {
        totalRuns24h: number;
        successRate: number;
        failures24h: number;
        lastFailure: string | null;
    };
    email: {
        queueSize: number;
        processingRate: number;
        failedToday: number;
    };
    storage: {
        avatarCount: number;
    };
}
export interface ComprehensiveStats {
    generatedAt: string;
    revenue: RevenueStats;
    userEngagement: UserEngagementStats;
    leagueAnalytics: LeagueAnalyticsStats;
    communication: CommunicationStats;
    gameProgress: GameProgressStats;
    systemMetrics: SystemMetrics;
}
export declare function getRevenueStats(): Promise<RevenueStats>;
export declare function getUserEngagementStats(): Promise<UserEngagementStats>;
export declare function getLeagueAnalyticsStats(): Promise<LeagueAnalyticsStats>;
export declare function getCommunicationStats(): Promise<CommunicationStats>;
export declare function getGameProgressStats(): Promise<GameProgressStats>;
export declare function getSystemMetrics(): Promise<SystemMetrics>;
export declare function getComprehensiveStats(): Promise<ComprehensiveStats>;
//# sourceMappingURL=admin-stats.d.ts.map