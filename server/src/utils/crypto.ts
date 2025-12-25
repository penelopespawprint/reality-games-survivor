import { randomInt, randomBytes } from 'crypto';

/**
 * Cryptographically secure Fisher-Yates shuffle
 * Uses crypto.randomInt for unbiased random selection
 */
export function secureShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    // randomInt is exclusive of max, so we use i + 1
    const j = randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Cryptographically secure random selection from array
 */
export function secureRandomElement<T>(array: T[]): T {
  if (array.length === 0) {
    throw new Error('Cannot select from empty array');
  }
  const index = randomInt(0, array.length);
  return array[index];
}

/**
 * Generate a cryptographically secure random integer in range [min, max)
 */
export function secureRandomInt(min: number, max: number): number {
  return randomInt(min, max);
}

/**
 * Generate a cryptographically secure numeric code (for verification, etc.)
 */
export function generateSecureCode(length: number = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += randomInt(0, 10).toString();
  }
  return code;
}

/**
 * Generate a cryptographically secure hex token
 */
export function generateSecureToken(bytes: number = 32): string {
  return randomBytes(bytes).toString('hex');
}
