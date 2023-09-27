import { defineConfig, } from 'vitest/config';

export default defineConfig({
  test: {
    threads: false,
    include: ['**/*.test.ts',],
    exclude: ['**/*.browser.test.ts',],
    globals: true,
  },
});
