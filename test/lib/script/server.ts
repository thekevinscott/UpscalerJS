import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import * as esbuild from 'esbuild';
import * as rimraf from 'rimraf';
import handler from 'serve-handler';

const ROOT = path.join(__dirname);
const DIST = path.join(ROOT, '/dist');
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

type Callback = () => void;
type StartServer = (PORT: number, callback?: Callback) => Promise<http.Server>;
export const startServer: StartServer = (PORT, callback) => new Promise(async resolve => {
  try {
    const server = http.createServer((request, response) => handler(request, response, {
      public: DIST,
    }));
    server.listen(PORT, () => {
      if (callback) { callback(); }
      resolve(server);
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
});

