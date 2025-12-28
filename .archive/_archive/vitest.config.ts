import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Global test setup
    setupFiles: ['./server/__tests__/setup.ts'],

    // Include patterns
    include: [
      'server/**/*.test.ts',
      'client/src/**/*.test.ts',
      'client/src/**/*.test.tsx',
    ],

    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      'mobile',
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['server/**/*.ts', 'client/src/**/*.ts', 'client/src/**/*.tsx'],
      exclude: [
        'node_modules',
        'dist',
        '**/*.test.ts',
        '**/__tests__/**',
        'server/scripts/**',
      ],
    },

    // Timeout for async tests
    testTimeout: 10000,

    // Reporter
    reporters: ['default'],

    // Global variables
    globals: true,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@server': path.resolve(__dirname, './server'),
    },
  },
});
