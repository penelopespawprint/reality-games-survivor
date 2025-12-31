/**
 * SMS Command Handlers
 *
 * Processes incoming SMS commands from users via Twilio webhook.
 * Each command handler returns a response string.
 */
export interface SmsContext {
    phone: string;
    userId: string | null;
    rawMessage: string;
    command: string;
    args: string[];
}
export interface SmsResult {
    response: string;
    parsedData: Record<string, unknown>;
}
export declare function handleStop(ctx: SmsContext): Promise<SmsResult>;
export declare function handleStart(ctx: SmsContext): Promise<SmsResult>;
export declare function handlePick(ctx: SmsContext): Promise<SmsResult>;
export declare function handleStatus(ctx: SmsContext): Promise<SmsResult>;
export declare function handleTeam(ctx: SmsContext): Promise<SmsResult>;
export declare function handleHelp(ctx: SmsContext): SmsResult;
export declare function processSmsCommand(ctx: SmsContext): Promise<SmsResult>;
//# sourceMappingURL=commands.d.ts.map