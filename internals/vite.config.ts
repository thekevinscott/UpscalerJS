import { defineConfig, } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      '**/*.test.*',
    ],
    globals: true,
    typecheck: {
      tsconfig: './tsconfig.vitest.json'
    }
  },
});
