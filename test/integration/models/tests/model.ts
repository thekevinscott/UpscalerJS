/****
 * Tests that different approaches to loading a model all load correctly
 */
import Upscaler, { ModelDefinition } from 'upscaler';
import * as tf from '@tensorflow/tfjs';
import path from 'path';
import { MODELS_DIR } from '@internals/common/constants';
import { ClientsideTestRunner } from '@internals/test-runner/clientside';
import { ServersideTestRunner } from '@internals/test-runner/serverside';
import { getPackagesAndModelsForEnvironment } from '@internals/common/models';
import { getPackageJSON } from '@internals/common/package-json';
import { getTemplate } from '@internals/common/get-template';

import * as url from 'url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const ROOT_BUNDLER_OUTPUT_DIR = process.env.ROOT_BUNDLER_OUTPUT_DIR;
if (typeof ROOT_BUNDLER_OUTPUT_DIR !== 'string') {
  throw new Error('ROOT_BUNDLER_OUTPUT_DIR not defined in env');
}
const ESBUILD_DIST_FOLDER = path.resolve(ROOT_BUNDLER_OUTPUT_DIR, 'esbuild/dist')
const UMD_DIST_FOLDER = path.resolve(ROOT_BUNDLER_OUTPUT_DIR, 'umd/dist')
const NODE_DIST_FOLDER = path.resolve(ROOT_BUNDLER_OUTPUT_DIR, 'node')

const TRACK_TIME = false;
const LOG = true;
const USE_GPU = process.env.useGPU === '1';
const WATCH_MODE = process.env.watch === '1';
const ENVIRONMENTS = ['browser', 'node'];

const getFixturePath = (packageName: string, modelName: string) => path.resolve(...[
  MODELS_DIR,
  packageName,
  'test/__fixtures__',
  modelName === 'index' ? '' : modelName,
  'result.png'
].filter(Boolean));

const getMinifiedFileName = (fileName: string) => {
  if (fileName === '.') {
    return 'index.min.js';
  }
  const minifiedFileName = `${fileName}.min.js`;
  if (minifiedFileName === '..min.js') {
    throw new Error(`Bad minified file name: ${fileName}`);
  }
  return minifiedFileName;
};

const [
  filteredPackagesAndModelsForBrowser,
  filteredPackagesAndModelsForNode,
] = await Promise.all([
  getPackagesAndModelsForEnvironment('clientside'),
  getPackagesAndModelsForEnvironment('serverside'),
]);

const packageDirectoryNames = Array.from(filteredPackagesAndModelsForBrowser.reduce((set, { packageDirectoryName }) => {
  set.add(packageDirectoryName);
  return set;
}, new Set<string>()));

describe('Model Tests', async () => {

  describe.each(ENVIRONMENTS)('%s', (platform) => {
    if (platform === 'browser') {
      describe('ESM', () => {
        let fixtureServerURL: string = '';

        const esmTestRunner = new ClientsideTestRunner({
          name: 'esm',
          mock: true,
          dist: ESBUILD_DIST_FOLDER,
          trackTime: TRACK_TIME,
          log: LOG,
        });

        beforeAll(async function beforeAll() {
          await esmTestRunner.beforeAll();
          fixtureServerURL = await esmTestRunner.getFixturesServerURL();
        }, 60000);

        afterAll(async function modelAfterAll() {
          await esmTestRunner.afterAll();
        }, 10000);

        beforeEach(async function beforeEach() {
          await esmTestRunner.beforeEach('| Loaded');
        });

        afterEach(async function afterEach() {
          await esmTestRunner.afterEach();
        });

        test.each(filteredPackagesAndModelsForBrowser.map(({
          packageDirectoryName,
          modelName,
        }) => [packageDirectoryName, modelName]))('%s/%s', async (packageDirectoryName, modelName) => {
          const fixturePath = `${fixtureServerURL}/${packageDirectoryName}/test/__fixtures__/fixture.png`;
          const modelPath = [
            '@upscalerjs',
            packageDirectoryName,
            modelName === 'index' || modelName === '.' ? undefined : modelName.replace(/\.\//, ''),
          ].filter(Boolean).join('/');
          const result = await esmTestRunner.page.evaluate(({ fixturePath, modelPath }) => {
            if (window[modelPath] === undefined) {
              throw new Error(`No model for ${modelPath} found in window`);
            }
            const model = window[modelPath] as ModelDefinition;
            const upscaler = new window['Upscaler']({
              model,
            });
            return upscaler.execute(fixturePath, {
              patchSize: 64,
              padding: 2,
            });
          }, { fixturePath, modelPath });
          expect(result).toMatchImage(getFixturePath(packageDirectoryName, modelName));
        });
      });

      describe('UMD', () => {
        let fixtureServerURL: string = '';
        // const UMD_PORT = 8096;
        const umdTestRunner = new ClientsideTestRunner({
          name: 'umd',
          mock: true,
          dist: UMD_DIST_FOLDER,
          // port: UMD_PORT,
          // verbose: VERBOSE,
        });

        beforeAll(async function modelBeforeAll() {
          await umdTestRunner.beforeAll();
          fixtureServerURL = await umdTestRunner.getFixturesServerURL();
        }, 20000);

        afterAll(async function modelAfterAll() {
          await umdTestRunner.afterAll();
        }, 30000);

        beforeEach(async function beforeEach() {
          await umdTestRunner.beforeEach(null);
        });

        afterEach(async function afterEach() {
          await umdTestRunner.afterEach();
        });

        test.each(filteredPackagesAndModelsForBrowser.map(({
          packageDirectoryName,
          modelName,
          modelUMDName,
        }) => [packageDirectoryName, modelName, modelUMDName]))('%s/%s', async (packageDirectoryName, modelName, umdName) => {
          const fixturePath = `${fixtureServerURL}/${packageDirectoryName}/test/__fixtures__/fixture.png`;
          const src = `${fixtureServerURL}/${packageDirectoryName}/dist/umd/${getMinifiedFileName(modelName)}`;
          const result = await umdTestRunner.page.evaluate(({src, umdName, fixturePath }) => {
            return window['loadScript'](src).then(() => {
              const model = window[umdName] as ModelDefinition;
              const upscaler = new window['Upscaler']({
                model,
              });
              return upscaler.execute(fixturePath, {
                patchSize: 64,
                padding: 2,
              });
            })
          }, {src, umdName, fixturePath});
          expect(result).toMatchImage(getFixturePath(packageDirectoryName, modelName));
        });
        
        test.each(filteredPackagesAndModelsForBrowser.map(({
          packageDirectoryName,
          modelName,
          modelUMDName,
        }) => [packageDirectoryName, modelName, modelUMDName]))('%s/%s from index.min.js', async (packageDirectoryName, modelName, umdName) => {
          const fixturePath = `${fixtureServerURL}/${packageDirectoryName}/test/__fixtures__/fixture.png`;
          const umdNamesPath = `${fixtureServerURL}/${packageDirectoryName}/umd-names.json`;
          const src = `${fixtureServerURL}/${packageDirectoryName}/dist/umd/index.min.js`;
          const result = await umdTestRunner.page.evaluate(async ({ src, fixturePath, umdNamesPath, umdName }) => {
            await window['loadScript'](src);
            const umdNames = await fetch(umdNamesPath).then(r => r.json()) as Record<string, string>;
            const indexName = umdNames['.'];
            const model = window[indexName][umdName];
            const upscaler = new window['Upscaler']({
              model,
            });
            return upscaler.execute(fixturePath, {
              patchSize: 64,
              padding: 2,
            });
          }, { src, umdNamesPath, fixturePath, umdName });
          expect(result).toMatchImage(getFixturePath(packageDirectoryName, modelName));
        });
      });
    }

    if (platform === 'node') {
      describe('CJS', async () => {
        const cjsTestRunner = new ServersideTestRunner({
          cwd: NODE_DIST_FOLDER,
          trackTime: false,
        });

        test.each(filteredPackagesAndModelsForNode.map(({
          packageDirectoryName,
          modelName,
        }) => [packageDirectoryName, modelName]))('%s/%s', async (packageDirectoryName, modelName) => {
          const { name } = await getPackageJSON(path.resolve(MODELS_DIR, packageDirectoryName));
          if (!name) {
            throw new Error(`Could not get package name for ${packageDirectoryName}`);
          }
          const importPath = path.join(name, modelName === 'index' ? '' : `/${modelName}`);
          const modelPackageDir = path.resolve(MODELS_DIR, packageDirectoryName, 'test/__fixtures__');
          const fixturePath = path.resolve(modelPackageDir, 'fixture.png');
          const script = await getTemplate(path.resolve(__dirname, '../_templates/cjs.js.t'), {
            tf: USE_GPU ? `@tensorflow/tfjs-node-gpu` : `@tensorflow/tfjs-node`,
            customModel: importPath,
            fixturePath,
          });
          const buffer = await cjsTestRunner.run(script);
          const result = `data:image/png;base64,${buffer.toString('utf-8')}`
          expect(result).toMatchImage(getFixturePath(packageDirectoryName, modelName));
        });
      });
    }
  });
});

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    tf: typeof tf;
  }
}
