import path from 'path';
import rimraf from 'rimraf';
import { getTFJSVersion } from '../utils/getTFJSVersion';
import { copyFixtures } from '../utils/copyFixtures';
import { getAllAvailableModelPackages, getAllAvailableModels } from '../../../scripts/package-scripts/utils/getAllAvailableModels';
import { copyFileSync, copySync, mkdirpSync, readFileSync, writeFileSync } from 'fs-extra';
import { MockCDN } from '../../integration/utils/BrowserTestRunner';

const UMD_ROOT = path.join(__dirname);
// const ROOT = path.resolve(UMD_ROOT, '../../../');
export const DIST = path.join(UMD_ROOT, 'dist');
const UPSCALER_PATH = path.join(UMD_ROOT, '../../../packages/upscalerjs')
const MODELS_PATH = path.join(UMD_ROOT, '../../../models/');

const getContent = (scriptsToInclude: string[], fixturesToInclude: { packageName: string; pathName: string }[]) => `
<html>
  <head>
    <link rel="shortcut icon" href="data:image/x-icon;," type="image/x-icon"> 
    <title>UpscalerJS Integration Test: UMD</title>
  </head>
  <body>
    <div id="output">Bootstrapping elements...</div>
    <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@${getTFJSVersion()}/dist/tf.min.js"></script>
    ${scriptsToInclude.map(script => `<script src="${script}"></script>`)}
    <script src="/upscaler.min.js"></script>
    ${fixturesToInclude.map(({ pathName, packageName }) => `<script src="${pathName}" id="fixture-${packageName}"></script>`)}
  </body>
</html>
`;

const copyFile = (source: string, dest: string) => {
  mkdirpSync(path.dirname(dest));
  writeFileSync(dest, readFileSync(source, 'utf-8'));
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
      copySync(modelPath, destPath);
    });
  });
};

const getFixtures = (): { packageName: string; pathName: string }[] => getAllAvailableModelPackages().map((packageName) => ({
  packageName,
  pathName: `./models/${packageName}/assets/fixture.png`,
}));

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
      const destPath = path.resolve(DIST, 'models', packageName, 'dist', minifiedFileName);
      copyFile(path.join(UMD_PATH, minifiedFileName), destPath);
      return `/models/${packageName}/dist/${minifiedFileName}`;
    }))
  }, [] as string[]);
};

export const prepareScriptBundleForUMD = async () => {
  rimraf.sync(DIST);
  mkdirpSync(DIST);
  copyFileSync(path.join(UPSCALER_PATH, 'dist/browser/umd/upscaler.min.js'), path.join(DIST, 'upscaler.min.js'))

  copyAllModels();

  const scriptsToInclude = getMinifiedScripts();
  const fixturesToInclude = getFixtures();

  copyFixtures(DIST);
  writeFileSync(path.join(DIST, 'index.html'), getContent(scriptsToInclude, fixturesToInclude));
};

export const mockCDN: MockCDN = (port, model, pathToModel) => [
  `http://localhost:${port}`,
  'models',
  model,
  pathToModel,
].join('/');
