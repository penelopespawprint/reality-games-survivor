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
export declare class EmailService {
    static sendWelcome(data: WelcomeEmailData): Promise<boolean>;
    static sendTriviaWelcome(data: TriviaWelcomeEmailData): Promise<boolean>;
    static sendLeagueCreated(data: LeagueCreatedEmailData): Promise<boolean>;
    static sendLeagueJoined(data: LeagueJoinedEmailData): Promise<boolean>;
    static sendDraftPickConfirmed(data: DraftPickConfirmedEmailData): Promise<boolean>;
    static sendDraftComplete(data: DraftCompleteEmailData): Promise<boolean>;
    static sendPickConfirmed(data: PickConfirmedEmailData): Promise<boolean>;
    static sendAutoPickAlert(data: AutoPickAlertEmailData): Promise<boolean>;
    static sendPaymentConfirmed(data: PaymentConfirmedEmailData): Promise<boolean>;
    static sendDraftReminder(data: DraftReminderEmailData): Promise<boolean>;
    static sendDraftFinalWarning(data: DraftFinalWarningEmailData): Promise<boolean>;
    static sendPickReminder(data: PickReminderEmailData): Promise<boolean>;
    static sendPickFinalWarning(data: PickFinalWarningEmailData): Promise<boolean>;
    static sendEpisodeResults(data: EpisodeResultsEmailData): Promise<boolean>;
    static sendEliminationAlert(data: EliminationAlertEmailData): Promise<boolean>;
    static sendPaymentRecovery(data: PaymentRecoveryEmailData): Promise<boolean>;
    static sendTorchSnuffed(data: TorchSnuffedEmailData): Promise<boolean>;
    static logNotification(userId: string, type: 'email' | 'sms' | 'push', subject: string, body: string): Promise<void>;
}
export default EmailService;
//# sourceMappingURL=service.d.ts.map