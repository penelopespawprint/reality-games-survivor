import { describe, it, expect } from 'vitest';
import { secureShuffle, generateSecureCode, generateSecureToken } from './crypto.js';

describe('crypto utilities', () => {
  describe('secureShuffle', () => {
    it('should return an array of the same length', () => {
      const input = [1, 2, 3, 4, 5];
      const result = secureShuffle(input);
      expect(result).toHaveLength(input.length);
    });

    it('should contain all original elements', () => {
      const input = [1, 2, 3, 4, 5];
      const result = secureShuffle(input);
      expect(result.sort()).toEqual(input.sort());
    });

    it('should not modify the original array', () => {
      const input = [1, 2, 3, 4, 5];
      const original = [...input];
      secureShuffle(input);
      expect(input).toEqual(original);
    });

    it('should produce different orderings over multiple calls', () => {
      const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const results = new Set<string>();

      // Run 100 shuffles and check that we get different results
      for (let i = 0; i < 100; i++) {
        results.add(JSON.stringify(secureShuffle(input)));
      }

      // Should have multiple unique orderings
      expect(results.size).toBeGreaterThan(1);
    });

    it('should handle empty array', () => {
      const result = secureShuffle([]);
      expect(result).toEqual([]);
    });

    it('should handle single element array', () => {
      const result = secureShuffle([1]);
      expect(result).toEqual([1]);
    });
  });

  describe('generateSecureCode', () => {
    it('should generate code of specified length', () => {
      const code = generateSecureCode(6);
      expect(code).toHaveLength(6);
    });

    it('should only contain digits', () => {
      const code = generateSecureCode(10);
      expect(code).toMatch(/^\d+$/);
    });

    it('should generate different codes each time', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateSecureCode(6));
      }
      // Should have many unique codes
      expect(codes.size).toBeGreaterThan(50);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token of specified length', () => {
      const token = generateSecureToken(32);
      // Hex encoding doubles the length
      expect(token).toHaveLength(64);
    });

    it('should only contain hex characters', () => {
      const token = generateSecureToken(16);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate different tokens each time', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken(16));
      }
      // All tokens should be unique
      expect(tokens.size).toBe(100);
    });
  });
});
