import { defineConfig } from 'vitest/config';

export const TEST_TIMEOUT = 60 * 1000 * 1;

export default defineConfig({
  test: {
    include: [
      'tests/**/*.ts',
      'tests/**/*.mts',
      'tests/**/*.cts',
    ],
    globals: true,
    testTimeout: TEST_TIMEOUT,
    retry: 0,
    setupFiles: [
      // path.resolve(__dirname, 'setup/index.ts'),
    ]
  },
})
