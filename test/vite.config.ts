import { defineConfig } from 'vitest/config';
import path from 'path';
import * as url from 'url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export const TEST_TIMEOUT = 60 * 1000 * 1;

export default defineConfig({
  test: {
    include: [
      'tests/**/*.ts',
    ],
    globals: true,
    testTimeout: TEST_TIMEOUT,
    retry: 2,
    setupFiles: [
      path.resolve(__dirname, 'setup/index.ts'),
    ]
  },
})
