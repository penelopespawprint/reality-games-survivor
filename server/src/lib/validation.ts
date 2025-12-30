import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Common validation patterns
const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format

// Reusable schema types
const phoneSchema = z.string().regex(phoneRegex, 'Invalid phone number format');

// League schemas
export const createLeagueSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(50, 'Name must be at most 50 characters'),
  password: z.string().max(100).optional().nullable(),
  donation_amount: z.union([z.number().min(0).max(10000), z.null()]).optional(),
  season_id: z.string().uuid(),
  // max_players is always 12, not configurable
  is_public: z.boolean().optional(),
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
export const updatePhoneSchema = z.object({ phone: phoneSchema });
export const verifyPhoneSchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/, 'Verification code must be 6 digits'),
});
export const notificationPrefsSchema = z.object({
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
  push: z.boolean().optional(),
});

// Validation middleware factory
export function validate<T extends z.ZodSchema>(
  schema: T,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      // Format error message for frontend
      const firstError = result.error.errors[0];
      const errorMessage = firstError 
        ? `${firstError.path.join('.')}: ${firstError.message}`
        : 'Validation failed';
      return res.status(400).json({ error: errorMessage });
    }
    req[source] = result.data;
    next();
  };
}
