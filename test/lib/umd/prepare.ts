import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import { getTFJSVersion } from '../utils/getTFJSVersion';
import { copyFixtures } from '../utils/copyFixtures';
import { getAllAvailableModelPackages, getAllAvailableModels } from '../utils/getAllAvailableModels';
import { mkdirp } from 'fs-extra';

const UMD_ROOT = path.join(__dirname);
// const ROOT = path.resolve(UMD_ROOT, '../../../');
export const DIST = path.join(UMD_ROOT, 'dist');
const UPSCALER_PATH = path.join(UMD_ROOT, '../../../packages/upscalerjs')
const MODELS_PATH = path.join(UMD_ROOT, '../../../models/');

export const prepareScriptBundleForUMD = async () => {
  rimraf.sync(DIST);
  await mkdirp(DIST);
  fs.copyFileSync(path.join(UPSCALER_PATH, 'dist/browser/umd/upscaler.min.js'), path.join(DIST, 'upscaler.min.js'))
  const scriptsToInclude: Array<string> = [];
  const availableModelPackages = getAllAvailableModelPackages();
  for (let i = 0; i < availableModelPackages.length; i++) {
    const packageName = availableModelPackages[i];
    const models = getAllAvailableModels(packageName);
    for (let j = 0; j < models.length; j++) {
      const { export: fileName } = models[j];
      const MODEL_PATH = path.join(MODELS_PATH, packageName);
      const minifiedFileName = `${fileName}.min.js`;
      const source = path.join(MODEL_PATH, 'dist/browser/umd', minifiedFileName);
      const dest = path.join(DIST, minifiedFileName);
      const destDir = path.dirname(dest);
      await mkdirp(destDir);
      const contents = fs.readFileSync(source, 'utf-8');
      fs.writeFileSync(dest, contents);
      scriptsToInclude.push(minifiedFileName);
    }
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
