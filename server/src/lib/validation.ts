import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Common validation patterns
const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Reusable schema types
export const uuidSchema = z.string().regex(uuidRegex, 'Invalid UUID format');
export const phoneSchema = z.string().regex(phoneRegex, 'Invalid phone number format');
export const emailSchema = z.string().email('Invalid email format');

// League schemas
export const createLeagueSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(50, 'Name must be at most 50 characters'),
  password: z.string().max(100, 'Password must be at most 100 characters').optional(),
  donation_amount: z.number().min(0).max(10000).optional(),
  season_id: uuidSchema,
});

export const updateLeagueSettingsSchema = z.object({
  name: z.string().min(3).max(50).optional(),
  password: z.string().max(100).optional().nullable(),
  require_donation: z.boolean().optional(),
  donation_amount: z.number().min(0).max(10000).optional().nullable(),
  donation_notes: z.string().max(500).optional().nullable(),
  payout_method: z.string().max(200).optional().nullable(),
  is_public: z.boolean().optional(),
});

export const joinLeagueSchema = z.object({
  password: z.string().max(100).optional(),
});

// Auth/Phone schemas
export const updatePhoneSchema = z.object({
  phone: phoneSchema,
});

export const verifyPhoneSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d{6}$/, 'Verification code must be numeric'),
});

export const notificationPrefsSchema = z.object({
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
  push: z.boolean().optional(),
});

// Draft schemas
export const draftPickSchema = z.object({
  castaway_id: uuidSchema,
});

export const setDraftOrderSchema = z.union([
  z.object({
    order: z.array(uuidSchema).min(1),
    randomize: z.undefined(),
  }),
  z.object({
    randomize: z.literal(true),
    order: z.undefined(),
  }),
]);

// Weekly picks schema
export const weeklyPickSchema = z.object({
  castaway_id: uuidSchema,
  episode_id: uuidSchema,
});

// Scoring schemas
export const scoringEntrySchema = z.object({
  castaway_id: uuidSchema,
  rule_id: uuidSchema,
  quantity: z.number().int().min(0).max(100),
});

export const saveScoresSchema = z.object({
  scores: z.array(scoringEntrySchema),
});

// Admin schemas
export const createSeasonSchema = z.object({
  number: z.number().int().min(1).max(100),
  name: z.string().min(3).max(100),
  registration_opens_at: z.string().datetime(),
  draft_order_deadline: z.string().datetime(),
  registration_closes_at: z.string().datetime(),
  premiere_at: z.string().datetime(),
  draft_deadline: z.string().datetime(),
  finale_at: z.string().datetime().optional(),
});

export const createCastawaySchema = z.object({
  season_id: uuidSchema,
  name: z.string().min(1).max(100),
  age: z.number().int().min(18).max(100).optional(),
  hometown: z.string().max(100).optional(),
  occupation: z.string().max(100).optional(),
  photo_url: z.string().url().optional(),
  tribe_original: z.string().max(50).optional(),
});

export const createEpisodeSchema = z.object({
  season_id: uuidSchema,
  number: z.number().int().min(1).max(20),
  title: z.string().max(200).optional(),
  air_date: z.string().datetime(),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Validation middleware factory
export function validate<T extends z.ZodSchema>(
  schema: T,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }

    // Replace request data with parsed/validated data
    req[source] = result.data;
    next();
  };
}

// Export types for use in route handlers
export type CreateLeagueInput = z.infer<typeof createLeagueSchema>;
export type UpdateLeagueSettingsInput = z.infer<typeof updateLeagueSettingsSchema>;
export type JoinLeagueInput = z.infer<typeof joinLeagueSchema>;
export type UpdatePhoneInput = z.infer<typeof updatePhoneSchema>;
export type VerifyPhoneInput = z.infer<typeof verifyPhoneSchema>;
export type NotificationPrefsInput = z.infer<typeof notificationPrefsSchema>;
export type DraftPickInput = z.infer<typeof draftPickSchema>;
export type WeeklyPickInput = z.infer<typeof weeklyPickSchema>;
export type SaveScoresInput = z.infer<typeof saveScoresSchema>;
