import * as fs from 'fs';
import * as path from 'path';
import * as rimraf from 'rimraf';
import callExec from '../utils/callExec';
import { getTFJSVersion } from '../utils/getTFJSVersion';
import { copyFixtures } from '../utils/copyFixtures';

const ROOT = path.join(__dirname);
export const DIST = path.join(ROOT, '/dist');
const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs')

export const prepareScriptBundleForUMD = async () => {
  rimraf.sync(DIST);
  fs.mkdirSync(DIST, { recursive: true });

  await callExec('yarn install --frozen-lockfile', {
    cwd: UPSCALER_PATH,
  });

  await callExec('yarn build:umd', {
    cwd: UPSCALER_PATH,
  });

  fs.copyFileSync(path.join(UPSCALER_PATH, 'dist/umd/upscaler.min.js'), path.join(DIST, 'upscaler.min.js'))
  copyFixtures(DIST);
  fs.writeFileSync(path.join(DIST, 'index.html'), `
    <html>
      <head>
        <title>UpscalerJS Integration Test: UMD</title>
      </head>
    <body>
      <div id="output">Bootstrapping elements...</div>
      <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@${getTFJSVersion()}/dist/tf.min.js"></script>
      <script src="/upscaler.min.js"></script>
      <img src="./flower-small.png" id="flower"/>
    </body>
    </html>

    `);
};
