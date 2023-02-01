import { defineConfig, } from 'vite';
import path from 'path';

const ROOT = path.resolve(__dirname, '../');

export default defineConfig({
  root: path.resolve(ROOT, './dev'),
});
