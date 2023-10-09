import { defineConfig, mergeConfig } from 'vitest/config';
import configShared from '../vite.config';

export default mergeConfig(configShared, defineConfig({
}));

