import { defineConfig, } from 'vitest/config';

export default defineConfig({
  test: {
    threads: false,
    include: [
      'src/shared/**/*.test.ts',
      'src/node/**/*.test.ts',
      'src/node-gpu/**/*.test.ts',
    ],
    globals: true,
  },
});
