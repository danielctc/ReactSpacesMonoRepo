import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    include: ['packages/**/src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/**/src/**/*.{js,jsx,ts,tsx}'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.*', '**/*.spec.*'],
    },
  },
});
