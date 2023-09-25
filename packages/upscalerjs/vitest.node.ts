import { defineConfig, } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts',],
    exclude: ['**/*.browser.test.ts',],
    globals: true,
  },
});
