import { defineConfig, } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts',],
    exclude: ['**/*.node.test.ts', '**/*.playwright.browser.test.ts',],
    globals: true,
  },
});
