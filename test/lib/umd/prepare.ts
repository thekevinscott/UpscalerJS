import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import { getTFJSVersion } from '../utils/getTFJSVersion';
import { copyFixtures } from '../utils/copyFixtures';
import { getAllAvailableModelPackages, getAllAvailableModels } from '../utils/getAllAvailableModels';
import { mkdirpSync } from 'fs-extra';

const UMD_ROOT = path.join(__dirname);
// const ROOT = path.resolve(UMD_ROOT, '../../../');
export const DIST = path.join(UMD_ROOT, 'dist');
const UPSCALER_PATH = path.join(UMD_ROOT, '../../../packages/upscalerjs')
const MODELS_PATH = path.join(UMD_ROOT, '../../../models/');

const getContent = (scriptsToInclude: string[]) => `
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
`;

export const prepareScriptBundleForUMD = async () => {
  rimraf.sync(DIST);
  mkdirpSync(DIST);
  fs.copyFileSync(path.join(UPSCALER_PATH, 'dist/browser/umd/upscaler.min.js'), path.join(DIST, 'upscaler.min.js'))
  const scriptsToInclude = getAllAvailableModelPackages().reduce((scripts, packageName) => {
    const models = getAllAvailableModels(packageName);
    const MODEL_PATH = path.join(MODELS_PATH, packageName);
    const UMD_PATH = path.join(MODEL_PATH, 'dist/browser/umd');
    return scripts.concat(models.map(({ export: fileName }) => {
      const minifiedFileName = `${fileName}.min.js`;
      const source = path.join(UMD_PATH, minifiedFileName);
      const dest = path.join(DIST, minifiedFileName);
      mkdirpSync(path.dirname(dest));
      fs.writeFileSync(dest, fs.readFileSync(source, 'utf-8'));
      return minifiedFileName;
    }))
  }, [] as string[]);
  copyFixtures(DIST);
  fs.writeFileSync(path.join(DIST, 'index.html'), getContent(scriptsToInclude));
};
