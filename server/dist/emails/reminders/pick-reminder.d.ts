interface PickReminderEmailParams {
    displayName: string;
    episodeNumber: number;
    episodeTitle?: string;
    hoursLeft: number;
    leagueId: string;
}
export declare function pickReminderEmail({ displayName, episodeNumber, episodeTitle, hoursLeft, leagueId }: PickReminderEmailParams): string;
export {};
//# sourceMappingURL=pick-reminder.d.ts.map