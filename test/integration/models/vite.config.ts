import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from '../../vite.config.js';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    root: __dirname,
    testTimeout: 60 * 1000 * 15, // 15 minutes
    retry: 0,
  },
}))
