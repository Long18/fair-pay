import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom', // Enable for frontend tests
    setupFiles: ['./tests/frontend-setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.claude/worktrees/**',
      '**/.git/**',
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.test.tsx',
        'dist/',
        '.cursor/',
        'supabase/',
      ],
    },
  },
  resolve: {
    alias: [
      // Map Deno/CDN URL imports used in Edge Function modules to local equivalents
      // so vitest can import shared domain/contract files directly.
      { find: /^https:\/\/esm\.sh\/zod@.*$/, replacement: 'zod' },
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: 'virtual:pwa-register/react', replacement: path.resolve(__dirname, './tests/mocks/virtual-pwa-register-react.ts') },
    ],
  },
});
