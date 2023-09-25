import { defineConfig, } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.vitest.ts',],
    exclude: ['**/*.browser.test.ts',],
    globals: true,
  },
});
