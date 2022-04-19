import * as fs from 'fs';
import * as path from 'path';
import * as rimraf from 'rimraf';
import { getTFJSVersion } from '../utils/getTFJSVersion';
import { copyFixtures } from '../utils/copyFixtures';

const ROOT = path.join(__dirname);
export const DIST = path.join(ROOT, '/dist');
const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs')
const PIXEL_UPSAMPLER_PATH = path.join(ROOT, '../../../models/pixel-upsampler')

export const prepareScriptBundleForUMD = async () => {
  rimraf.sync(DIST);
  fs.mkdirSync(DIST, { recursive: true });

  fs.copyFileSync(path.join(UPSCALER_PATH, 'dist/browser/umd/upscaler.min.js'), path.join(DIST, 'upscaler.min.js'))
  fs.copyFileSync(path.join(PIXEL_UPSAMPLER_PATH, 'dist/browser/umd/2x-3.min.js'), path.join(DIST, '2x-3.min.js'))
  copyFixtures(DIST);
  fs.writeFileSync(path.join(DIST, 'index.html'), `
    <html>
      <head>
        <title>UpscalerJS Integration Test: UMD</title>
      </head>
      <body>
        <div id="output">Bootstrapping elements...</div>
        <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@${getTFJSVersion()}/dist/tf.min.js"></script>
        <script src="/2x-3.min.js"></script>
        <script src="/upscaler.min.js"></script>
        <img src="./flower-small.png" id="flower"/>
      </body>
    </html>
  `);
};
