// @ts-nocheck
/**
 * Shared TypeScript types for the RGFL server
 */

import { Request } from 'express';
import { Season, User, League } from '@prisma/client';

/**
 * User payload attached to authenticated requests
 */
export interface AuthUser {
  id: string;
  email?: string;
  isAdmin?: boolean;
  auth0Id?: string;
}

/**
 * Season context attached to requests
 */
export type SeasonContext = Season | null;

/**
 * Extended Express Request with authentication and context
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  season?: SeasonContext;
  leagueId?: string;
  cookies?: Record<string, string>;
}

/**
 * User profile update fields
 */
export interface UserProfileUpdate {
  name?: string;
  email?: string;
  username?: string | null;
  displayName?: string | null;
  city?: string | null;
  state?: string | null;
  favoriteCastaway?: string | null;
  favoriteCharity?: string | null;
  charityUrl?: string | null;
  about?: string | null;
  phone?: string | null;
  profilePicture?: string | null;
  hasSeenWelcome?: boolean;
  password?: string;
  phoneVerified?: boolean;
  smsEnabled?: boolean;
}

/**
 * Prisma error with code property
 */
export interface PrismaError extends Error {
  code?: string;
  meta?: Record<string, unknown>;
}

/**
 * Type guard for Prisma errors
 */
export function isPrismaError(error: unknown): error is PrismaError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as PrismaError).code === 'string'
  );
}

/**
 * Type guard for Error objects
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

/**
 * Zod validation error check
 */
export function isZodError(error: unknown): error is { name: 'ZodError'; errors: unknown[] } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: string }).name === 'ZodError'
  );
}

/**
 * JWKS signing key type
 */
export interface JwksSigningKey {
  getPublicKey: () => string;
}
