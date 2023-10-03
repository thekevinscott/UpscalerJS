import { defineConfig, } from 'vitest/config';

export default defineConfig({
  test: {
    threads: false,
    include: [
      'src/shared/**/*.test.ts',
      'src/browser/**/*.test.ts',
    ],
    exclude: ['src/browser/**/*.playwright.browser.test.ts',],
    globals: true,
  },
});
