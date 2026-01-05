interface WelcomeEmailData {
    displayName: string;
    email: string;
}
interface LeagueCreatedEmailData {
    displayName: string;
    email: string;
    leagueName: string;
    leagueCode: string;
    seasonName: string;
    registrationCloses: Date;
    premiereDate: Date;
    draftDeadline: Date;
}
interface LeagueJoinedEmailData {
    displayName: string;
    email: string;
    leagueName: string;
    leagueId: string;
    seasonName: string;
    memberCount: number;
    maxMembers: number;
    premiereDate: Date;
    draftDeadline: Date;
    firstPickDue: Date;
}
interface DraftPickConfirmedEmailData {
    displayName: string;
    email: string;
    castawayName: string;
    leagueName: string;
    leagueId: string;
    round: number;
    pickNumber: number;
    totalRounds: number;
}
interface DraftCompleteEmailData {
    displayName: string;
    email: string;
    leagueName: string;
    leagueId: string;
    castaways: Array<{
        name: string;
        tribe: string;
    }>;
    premiereDate: Date;
    firstPickDue: Date;
}
interface PickConfirmedEmailData {
    displayName: string;
    email: string;
    castawayName: string;
    leagueName: string;
    leagueId: string;
    episodeNumber: number;
    picksLockAt: Date;
}
interface AutoPickAlertEmailData {
    displayName: string;
    email: string;
    castawayName: string;
    leagueName: string;
    leagueId: string;
    episodeNumber: number;
}
interface PaymentConfirmedEmailData {
    displayName: string;
    email: string;
    leagueName: string;
    leagueId: string;
    amount: number;
    date: Date;
}
interface DraftReminderEmailData {
    displayName: string;
    email: string;
    leagueName: string;
    leagueId: string;
    daysRemaining: number;
}
interface DraftFinalWarningEmailData {
    displayName: string;
    email: string;
    leagueName: string;
    leagueId: string;
    hoursRemaining: number;
}
interface PickReminderEmailData {
    displayName: string;
    email: string;
    episodeNumber: number;
    hoursRemaining: number;
}
interface PickFinalWarningEmailData {
    displayName: string;
    email: string;
    episodeNumber: number;
    minutesRemaining: number;
}
interface EpisodeResultsEmailData {
    displayName: string;
    email: string;
    episodeNumber: number;
    castawayName: string;
    pointsEarned: number;
    leagues: Array<{
        name: string;
        totalPoints: number;
        rank: number;
        rankChange: number;
        totalPlayers: number;
    }>;
}
interface EliminationAlertEmailData {
    displayName: string;
    email: string;
    castawayName: string;
    leagueName: string;
    leagueId: string;
}
interface PaymentRecoveryEmailData {
    displayName: string;
    email: string;
    leagueName: string;
    leagueCode: string;
    amount: number;
}
interface TorchSnuffedEmailData {
    displayName: string;
    email: string;
    leagueName: string;
    leagueId: string;
    episodeNumber: number;
}
interface TriviaWelcomeEmailData {
    displayName: string;
    email: string;
}
interface TriviaProgressEmailData {
    displayName: string;
    email: string;
    questionsAnswered: number;
    questionsCorrect: number;
    totalQuestions: number;
}
interface TriviaSignupWelcomeEmailData {
    email: string;
}
interface JoinLeagueNudgeEmailData {
    displayName: string;
    email: string;
    daysSinceSignup: number;
    seasonName: string;
    premiereDate: Date;
}
interface PreSeasonHypeEmailData {
    displayName: string;
    email: string;
    seasonName: string;
    seasonNumber: number;
    premiereDate: Date;
    daysUntilPremiere: number;
    hasLeague: boolean;
    leagueName?: string;
}
interface PostSeasonWrapUpEmailData {
    displayName: string;
    email: string;
    seasonName: string;
    totalPoints: number;
    bestRank: number;
    leaguesPlayed: number;
    winnerName: string;
}
interface PrivateLeagueWelcomeEmailData {
    displayName: string;
    email: string;
    leagueName: string;
    leagueId: string;
    commissionerName: string;
    seasonName: string;
    memberCount: number;
    maxMembers: number;
}
interface InactivityReminderEmailData {
    displayName: string;
    email: string;
    daysSinceLastActivity: number;
    missedEpisodes: number;
}
export declare class EmailService {
    static sendWelcome(data: WelcomeEmailData): Promise<boolean>;
    static sendTriviaWelcome(data: TriviaWelcomeEmailData): Promise<boolean>;
    static sendTriviaSignupWelcome(data: TriviaSignupWelcomeEmailData): Promise<boolean>;
    static sendLeagueCreated(data: LeagueCreatedEmailData): Promise<boolean>;
    static sendLeagueJoined(data: LeagueJoinedEmailData): Promise<boolean>;
    static sendDraftPickConfirmed(data: DraftPickConfirmedEmailData): Promise<boolean>;
    static sendDraftComplete(data: DraftCompleteEmailData): Promise<boolean>;
    static sendPickConfirmed(data: PickConfirmedEmailData): Promise<boolean>;
    static sendAutoPickAlert(data: AutoPickAlertEmailData): Promise<boolean>;
    static sendPaymentConfirmed(data: PaymentConfirmedEmailData): Promise<boolean>;
    static sendTaxReceipt(data: {
        displayName: string;
        email: string;
        donationAmount: number;
        donationDate: Date;
        transactionId: string;
        leagueName: string;
    }): Promise<boolean>;
    static sendDraftReminder(data: DraftReminderEmailData): Promise<boolean>;
    static sendDraftFinalWarning(data: DraftFinalWarningEmailData): Promise<boolean>;
    static sendPickReminder(data: PickReminderEmailData): Promise<boolean>;
    static sendPickFinalWarning(data: PickFinalWarningEmailData): Promise<boolean>;
    static sendEpisodeResults(data: EpisodeResultsEmailData): Promise<boolean>;
    static sendEliminationAlert(data: EliminationAlertEmailData): Promise<boolean>;
    static sendPaymentRecovery(data: PaymentRecoveryEmailData): Promise<boolean>;
    static sendTorchSnuffed(data: TorchSnuffedEmailData): Promise<boolean>;
    static sendTriviaProgress(data: TriviaProgressEmailData): Promise<boolean>;
    static sendJoinLeagueNudge(data: JoinLeagueNudgeEmailData): Promise<boolean>;
    static sendPreSeasonHype(data: PreSeasonHypeEmailData): Promise<boolean>;
    static sendPostSeasonWrapUp(data: PostSeasonWrapUpEmailData): Promise<boolean>;
    static sendPrivateLeagueWelcome(data: PrivateLeagueWelcomeEmailData): Promise<boolean>;
    static sendInactivityReminder(data: InactivityReminderEmailData): Promise<boolean>;
    /**
     * Send email using CMS template (database) with fallback to hardcoded template
     *
     * This method integrates the database-driven CMS with the email sending system.
     * It tries to load the template from the database first, then falls back to
     * a provided hardcoded template if the database template doesn't exist or is inactive.
     *
     * @param slug - Template slug in database (e.g., 'welcome', 'pick-reminder')
     * @param variables - Variables to replace in template (e.g., {displayName: 'John'})
     * @param fallback - Hardcoded template to use if database template doesn't exist
     * @param options - Email sending options (critical, queue, etc.)
     * @returns Promise<boolean> indicating success
     */
    static sendFromCMS(slug: string, variables: Record<string, string | number | boolean>, fallback: {
        subject: string;
        html: string;
        text?: string;
    }, options: {
        to: string;
        critical?: boolean;
        queue?: boolean;
    }): Promise<boolean>;
    static logNotification(userId: string, type: 'email' | 'sms' | 'push', subject: string, body: string): Promise<void>;
}
export default EmailService;
//# sourceMappingURL=service.d.ts.map