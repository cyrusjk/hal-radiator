import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.js'],
    exclude: ['node_modules'],
    globals: false,
  },
});
