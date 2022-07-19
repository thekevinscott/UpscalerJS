import fs from 'fs-extra';
import path from 'path';
import rimraf from 'rimraf';
import { getTFJSVersion } from '../utils/getTFJSVersion';
import { copyFixtures } from '../utils/copyFixtures';
import { getAllAvailableModelPackages, getAllAvailableModels } from '../../../scripts/package-scripts/utils/getAllAvailableModels';
import { mkdirpSync } from 'fs-extra';
import { MockCDN } from '../../integration/utils/BrowserTestRunner';

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

const copyFile = (source: string, dest: string) => {
  mkdirpSync(path.dirname(dest));
  fs.writeFileSync(dest, fs.readFileSync(source, 'utf-8'));
};

const getMinifiedFileName = (fileName: string) => {
  if (fileName === '.') {
    return 'index.min.js';
  }
  return `${fileName}.min.js`;
};

const copyAllModels = () => {
  getAllAvailableModelPackages().forEach(packageName => {
    const models = getAllAvailableModels(packageName);
    models.forEach(({ export: fileName }) => {
      const modelPath = path.resolve(MODELS_PATH, packageName, 'models', fileName);
      const destPath = path.resolve(DIST, 'models', packageName, 'models', fileName);
      fs.copySync(modelPath, destPath);
    });
  });
};

const getMinifiedScripts = () => {
  return getAllAvailableModelPackages().reduce((scripts, packageName) => {
    const models = getAllAvailableModels(packageName);
    const UMD_PATH = path.join(MODELS_PATH, packageName, 'dist/umd');
    return scripts.concat(models.map((model) => {
      const { export: fileName } = model;
      const minifiedFileName = getMinifiedFileName(fileName);
      if (minifiedFileName === '..min.js') {
        throw new Error(`Bad minified file name: ${JSON.stringify(model)}`);
      }
      copyFile(path.join(UMD_PATH, minifiedFileName), path.join(DIST, minifiedFileName));
      return minifiedFileName;
    }))
  }, [] as string[]);
};

export const prepareScriptBundleForUMD = async () => {
  rimraf.sync(DIST);
  mkdirpSync(DIST);
  fs.copyFileSync(path.join(UPSCALER_PATH, 'dist/browser/umd/upscaler.min.js'), path.join(DIST, 'upscaler.min.js'))

  copyAllModels();

  const scriptsToInclude = getMinifiedScripts();

  copyFixtures(DIST);
  fs.writeFileSync(path.join(DIST, 'index.html'), getContent(scriptsToInclude));
};

export const mockCDN: MockCDN = (port, model, pathToModel) => [
  `http://localhost:${port}`,
  'models',
  model,
  pathToModel,
].join('/');
