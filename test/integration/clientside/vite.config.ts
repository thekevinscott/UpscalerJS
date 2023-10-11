import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from '../../vite.config.mjs';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    root: __dirname,
  },
}))
