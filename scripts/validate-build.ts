import path from 'path';
import fs from 'fs';

const ROOT = path.resolve(__dirname, '..');
const UPSCALER_JS = path.resolve(ROOT, 'packages/upscalerjs');
const UPSCALER_JS_DIST = path.resolve(UPSCALER_JS, 'dist');

const validateBuild = async () => {
  // confirm node/cjs/cjs.js exists
  [
    'node/cjs/cjs.js',
    'node/cjs/cjs.d.ts',
    'node-gpu/cjs/cjs.js',
    'node-gpu/cjs/cjs.d.ts',
    'browser/esm/index.js',
    'browser/esm/index.d.ts',
    'browser/umd/upscaler.js',
    'browser/umd/upscaler.min.js',
  ].forEach(file => {
    if (!fs.existsSync(path.resolve(UPSCALER_JS_DIST, file))) {
      throw new Error(`File ${file} was not built or does not exist`);
    }
  });
};

export default validateBuild;

if (require.main === module) {
  (async () => {
    await validateBuild();
  })();
}

