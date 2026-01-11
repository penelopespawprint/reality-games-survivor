import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
export declare const createLeagueSchema: z.ZodObject<{
    name: z.ZodString;
    password: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    donation_amount: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodNull]>>;
    season_id: z.ZodString;
    is_public: z.ZodOptional<z.ZodBoolean>;
    max_players: z.ZodOptional<z.ZodNumber>;
    require_donation: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    season_id: string;
    is_public?: boolean | undefined;
    password?: string | null | undefined;
    donation_amount?: number | null | undefined;
    max_players?: number | undefined;
    require_donation?: boolean | undefined;
}, {
    name: string;
    season_id: string;
    is_public?: boolean | undefined;
    password?: string | null | undefined;
    donation_amount?: number | null | undefined;
    max_players?: number | undefined;
    require_donation?: boolean | undefined;
}>;
export declare const updateLeagueSettingsSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    password: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    require_donation: z.ZodOptional<z.ZodBoolean>;
    donation_amount: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    donation_notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    payout_method: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    is_public: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    is_public?: boolean | undefined;
    password?: string | null | undefined;
    donation_amount?: number | null | undefined;
    require_donation?: boolean | undefined;
    donation_notes?: string | null | undefined;
    payout_method?: string | null | undefined;
}, {
    name?: string | undefined;
    is_public?: boolean | undefined;
    password?: string | null | undefined;
    donation_amount?: number | null | undefined;
    require_donation?: boolean | undefined;
    donation_notes?: string | null | undefined;
    payout_method?: string | null | undefined;
}>;
export declare const joinLeagueSchema: z.ZodObject<{
    password: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    password?: string | undefined;
}, {
    password?: string | undefined;
}>;
export declare const updatePhoneSchema: z.ZodObject<{
    phone: z.ZodString;
}, "strip", z.ZodTypeAny, {
    phone: string;
}, {
    phone: string;
}>;
export declare const verifyPhoneSchema: z.ZodObject<{
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
}, {
    code: string;
}>;
export declare const notificationPrefsSchema: z.ZodObject<{
    email: z.ZodOptional<z.ZodBoolean>;
    sms: z.ZodOptional<z.ZodBoolean>;
    push: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    push?: boolean | undefined;
    email?: boolean | undefined;
    sms?: boolean | undefined;
}, {
    push?: boolean | undefined;
    email?: boolean | undefined;
    sms?: boolean | undefined;
}>;
export declare function validate<T extends z.ZodSchema>(schema: T, source?: 'body' | 'query' | 'params'): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=validation.d.ts.map