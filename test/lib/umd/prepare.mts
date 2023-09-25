import path from 'path';
import { sync as rimraf } from 'rimraf';
import { getTFJSVersion } from '../utils/getTFJSVersion.mjs';
import { copyFixtures } from '../utils/copyFixtures.mjs';
import { getAllAvailableModelPackages, getAllAvailableModels } from '../../../scripts/package-scripts/utils/getAllAvailableModels.mjs';
import fsExtra from 'fs-extra';
const { copyFileSync, copySync, mkdirpSync, readFileSync, writeFileSync } = fsExtra;
import { MockCDN } from '../../integration/utils/BrowserTestRunner';
import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const UMD_ROOT = path.join(__dirname);
// const ROOT = path.resolve(UMD_ROOT, '../../../');
export const DIST = path.join(UMD_ROOT, 'dist');
const UPSCALER_PATH = path.join(UMD_ROOT, '../../../packages/upscalerjs')
const MODELS_PATH = path.join(UMD_ROOT, '../../../models/');

const getContent = (scriptsToInclude: string[], fixturesToInclude: Record<string, string>) => `
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
    <script type="text/javascript">
${`window['fixtures'] = ${JSON.stringify(fixturesToInclude, null, 2)}`.split('\n').map(line => `      ${line}`).join('\n')}
    </script>
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

const getFixtures = (): Record<string, string> => getAllAvailableModelPackages().reduce((obj, packageName) => ({
  ...obj,
  [packageName]: `/models/${packageName}/test/__fixtures__/fixture.png`,
}), {} as Record<string, string>);

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
  rimraf(DIST);
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
