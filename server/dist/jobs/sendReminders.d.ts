interface ReminderResult {
    sent: number;
    type: string;
}
/**
 * Send pick reminders to users who haven't submitted
 * Runs: Wed 12pm PST
 */
export declare function sendPickReminders(): Promise<ReminderResult>;
/**
 * Send draft reminders to users with incomplete drafts
 * Runs: Daily 9am during draft window
 */
export declare function sendDraftReminders(): Promise<ReminderResult>;
declare const _default: {
    sendPickReminders: typeof sendPickReminders;
    sendDraftReminders: typeof sendDraftReminders;
};
export default _default;
//# sourceMappingURL=sendReminders.d.ts.map