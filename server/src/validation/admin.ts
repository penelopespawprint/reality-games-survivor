import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// UUID validation helper
const uuid = z.string().uuid();

// Season schemas
export const createSeasonSchema = z.object({
  number: z.number().int().positive(),
  name: z.string().min(1).max(100),
  registration_opens_at: z.string().datetime().optional(),
  draft_order_deadline: z.string().datetime().optional(),
  registration_closes_at: z.string().datetime().optional(),
  premiere_at: z.string().datetime(),
  draft_deadline: z.string().datetime(),
  finale_at: z.string().datetime().optional(),
});

export const updateSeasonSchema = z.object({
  number: z.number().int().positive().optional(),
  name: z.string().min(1).max(100).optional(),
  is_active: z.boolean().optional(),
  registration_opens_at: z.string().datetime().optional(),
  draft_order_deadline: z.string().datetime().optional(),
  registration_closes_at: z.string().datetime().optional(),
  premiere_at: z.string().datetime().optional(),
  draft_deadline: z.string().datetime().optional(),
  finale_at: z.string().datetime().optional(),
}).strict();

// Castaway schemas
export const createCastawaySchema = z.object({
  season_id: uuid,
  name: z.string().min(1).max(100),
  age: z.number().int().min(18).max(100).optional(),
  hometown: z.string().max(200).optional(),
  occupation: z.string().max(200).optional(),
  photo_url: z.string().url().optional(),
  tribe_original: z.string().max(50).optional(),
});

export const updateCastawaySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  age: z.number().int().min(18).max(100).optional(),
  hometown: z.string().max(200).optional(),
  occupation: z.string().max(200).optional(),
  photo_url: z.string().url().optional(),
  tribe_original: z.string().max(50).optional(),
  status: z.enum(['active', 'eliminated', 'winner']).optional(),
}).strict();

export const eliminateCastawaySchema = z.object({
  episode_id: uuid,
  placement: z.number().int().min(1).max(24).optional(),
});

// Episode schemas
export const createEpisodeSchema = z.object({
  season_id: uuid,
  number: z.number().int().min(1).max(20),
  title: z.string().max(200).optional(),
  air_date: z.string().datetime(),
  is_finale: z.boolean().optional(),
});

export const updateEpisodeSchema = z.object({
  number: z.number().int().min(1).max(20).optional(),
  title: z.string().max(200).optional(),
  air_date: z.string().datetime().optional(),
  picks_lock_at: z.string().datetime().optional(),
  results_posted_at: z.string().datetime().optional(),
  waiver_opens_at: z.string().datetime().optional(),
  waiver_closes_at: z.string().datetime().optional(),
  is_finale: z.boolean().optional(),
  is_scored: z.boolean().optional(),
}).strict();

// User schemas
export const updateUserRoleSchema = z.object({
  role: z.enum(['player', 'commissioner', 'admin']),
});

// Query parameter schemas
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const usersQuerySchema = paginationSchema.extend({
  role: z.enum(['player', 'commissioner', 'admin']).optional(),
  search: z.string().max(100).optional(),
});

export const leaguesQuerySchema = paginationSchema.extend({
  season_id: uuid.optional(),
  status: z.enum(['forming', 'drafting', 'active', 'completed']).optional(),
  search: z.string().max(100).optional(),
});

export const paymentsQuerySchema = z.object({
  league_id: uuid.optional(),
  status: z.enum(['pending', 'completed', 'refunded', 'failed']).optional(),
});

export const refundSchema = z.object({
  reason: z.string().max(500).optional(),
});

// Validation middleware factory
export function validate<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: result.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    req.query = result.data as any;
    next();
  };
}

export function validateParams<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid URL parameters',
        details: result.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    req.params = result.data as any;
    next();
  };
}

// Common param schemas
export const idParamSchema = z.object({
  id: uuid,
});

export const nameParamSchema = z.object({
  name: z.string().min(1).max(50),
});
