import { defineConfig } from 'vitest/config';
import viteConfig from '../vite.config.mjs';

export default defineConfig({
  ...viteConfig,
  test: {
    ...viteConfig.test,
    root: __dirname,
    retry: 0,
    include: [
      'tests/**/*.clientside.mts',
    ],
  },
});
