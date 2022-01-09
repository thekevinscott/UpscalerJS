import * as fs from 'fs';
import * as path from 'path';
import * as rimraf from 'rimraf';

const ROOT = path.join(__dirname);
export const DIST = path.join(ROOT, '/dist');
const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs')

const { exec } = require("child_process");
const callExec = (cmd: string, options: any) => new Promise((resolve, reject) => {
  const spawnedProcess = exec(cmd, options, (error) => {
    if (error) {
      reject(error.message);
    } else {
      resolve();
    }
  });
  spawnedProcess.stdout.pipe(process.stdout);
  spawnedProcess.stderr.pipe(process.stderr);

})

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
