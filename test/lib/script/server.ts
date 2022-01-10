import * as fs from 'fs';
import * as path from 'path';
import * as rimraf from 'rimraf';
import callExec from '../utils/callExec';

const ROOT = path.join(__dirname);
export const DIST = path.join(ROOT, '/dist');
const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs')

export const prepareScriptBundle = async () => {
  rimraf.sync(DIST);
  fs.mkdirSync(DIST, { recursive: true });

  await callExec('yarn build:umd', {
    cwd: UPSCALER_PATH,
  });

  fs.copyFileSync(path.join(UPSCALER_PATH, 'dist/umd/upscaler.min.js'), path.join(DIST, 'upscaler.min.js'))

  fs.copyFileSync(path.join(ROOT, 'src/flower.png'), path.join(DIST, 'flower.png'))
  fs.copyFileSync(path.join(ROOT, 'src/flower-small.png'), path.join(DIST, 'flower-small.png'))
  fs.copyFileSync(path.join(ROOT, 'src/index.html'), path.join(DIST, 'index.html'))
};
