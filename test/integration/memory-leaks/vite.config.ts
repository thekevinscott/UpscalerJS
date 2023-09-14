import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from '../../vite.config.js';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    root: __dirname,
    retry: 5,
  },
}))
