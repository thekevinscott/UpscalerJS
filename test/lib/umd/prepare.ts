import * as fs from 'fs';
import * as path from 'path';
import * as rimraf from 'rimraf';
import { getTFJSVersion } from '../utils/getTFJSVersion';
import { copyFixtures } from '../utils/copyFixtures';
import { getAllAvailableModelPackages, getAllAvailableModels } from '../utils/getAllAvailableModels';
import { mkdirp } from 'fs-extra';

const UMD_ROOT = path.join(__dirname);
// const ROOT = path.resolve(UMD_ROOT, '../../../');
export const DIST = path.join(UMD_ROOT, '/dist');
const UPSCALER_PATH = path.join(UMD_ROOT, '../../../packages/upscalerjs')
const MODELS_PATH = path.join(UMD_ROOT, '../../../models/');

export const prepareScriptBundleForUMD = async () => {
  rimraf.sync(DIST);
  fs.mkdirSync(DIST, { recursive: true });

  fs.copyFileSync(path.join(UPSCALER_PATH, 'dist/browser/umd/upscaler.min.js'), path.join(DIST, 'upscaler.min.js'))
  const scriptsToInclude: Array<string> = [];
  const availableModelPackages = getAllAvailableModelPackages();
  for (let i = 0; i < availableModelPackages.length; i++) {
    const packageName = availableModelPackages[i];
    const models = getAllAvailableModels(packageName);
    models.forEach(({ export: fileName }) => {
      const MODEL_PATH = path.join(MODELS_PATH, packageName);
      console.log('MODEL_PATH', MODEL_PATH);
      const minifiedFileName = `${fileName}.min.js`;
      const source = path.join(MODEL_PATH, 'dist/browser/umd', minifiedFileName);
      const dest = path.join(DIST, minifiedFileName);
      console.log('dest', dest);
      const destDir = path.dirname(dest);
      mkdirp(destDir);
      console.log('made directory', destDir);
      [
        MODEL_PATH, 
        path.join(MODEL_PATH, 'dist'),
        path.join(MODEL_PATH, 'dist/browser'),
        path.join(MODEL_PATH, 'dist/browser/umd'),
    ].forEach(dir => {
        console.log(dir, fs.readdirSync(dir))
      })
      const contents = fs.readFileSync(source, 'utf-8');
      fs.writeFileSync(dest, contents);
      scriptsToInclude.push(minifiedFileName);
    });
  }
  copyFixtures(DIST);
  fs.writeFileSync(path.join(DIST, 'index.html'), `
    <html>
      <head>
        <link rel="shortcut icon" href="data:image/x-icon;," type="image/x-icon"> 
        <title>UpscalerJS Integration Test: UMD</title>
      </head>
      <body>
        <div id="output">Bootstrapping elements...</div>
        <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@${getTFJSVersion()}/dist/tf.min.js"></script>
        ${scriptsToInclude.map(script => `<script src="/${script}"></script>`)}
        <script src="/upscaler.min.js"></script>
        <img src="./flower-small.png" id="flower"/>
      </body>
    </html>
  `);
};
