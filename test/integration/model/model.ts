/****
 * Tests that different approaches to loading a model all load correctly
 */
import { checkImage } from '../../lib/utils/checkImage';
import { ESBUILD_DIST as ESBUILD_DIST_FOLDER } from '../../lib/esm-esbuild/prepare';
import { DIST as UMD_DIST_FOLDER } from '../../lib/umd/prepare';
import { NODE_ROOT as NODE_DIST_FOLDER } from '../../lib/node/prepare';
import Upscaler, { ModelDefinition } from 'upscaler';
import * as tf from '@tensorflow/tfjs';
import { AvailableModel, getFilteredModels } from '../../../scripts/package-scripts/utils/getAllAvailableModels';
import { ClientsideTestRunner } from '@internals/test-runner/clientside';
import { ServersideTestRunner } from '@internals/test-runner/serverside';
import path from 'path';
import { MODELS_DIR, TMP_DIR } from '@internals/common/constants';
import { getPackageJSON } from 'import { getPackageJSON } from '@internals/common/package-json';
import { getTemplate } from '@internals/common/get-template';

const TRACK_TIME = false;
const LOG = true;
const VERBOSE = true;
const USE_GPU = process.env.useGPU === 'true';
const PLATFORMS = process.env.platform?.split(',').filter(platform => typeof platform === 'string' && ['node', 'browser'].includes(platform));

const JEST_TIMEOUT = 60 * 1000 * 15 * 2;
jest.setTimeout(JEST_TIMEOUT);
jest.retryTimes(0);

const SPECIFIC_PACKAGE: string | undefined = undefined;
const SPECIFIC_MODEL: string | undefined = undefined;

const getFixturePath = (packageName: string, modelName?: string) => path.resolve(...[
  MODELS_DIR,
  packageName,
  'test/__fixtures__',
  modelName === undefined || modelName === 'index' ? '' : modelName,
  'result.png'
].filter(Boolean));

if (PLATFORMS === undefined || PLATFORMS.length === 0) {
  throw new Error('You must provide at least one valid platform of "node" or "browser".')
} else {
  const filteredPackagesAndModels = getFilteredModels({
    specificPackage: SPECIFIC_PACKAGE,
    specificModel: SPECIFIC_MODEL,
    filter: (packageName, model) => {
      const packagePath = path.resolve(MODELS_DIR, packageName);
      const packageJSON = getPackageJSON(packagePath);
      const supportedPlatforms = packageJSON['@upscalerjs']?.models?.[model.export]?.supportedPlatforms;

      return supportedPlatforms === undefined || supportedPlatforms.includes('browser');
    },
  }).reduce<[ string, AvailableModel[] ][]>((arr, [packageName, models]) => {
    const preparedModels: AvailableModel[] = models.map(({ esm, ...model }) => {
      return {
        ...model,
        esm: esm === '' ? 'index' : esm,
      };
    });
    return arr.concat([[
      packageName,
      preparedModels,
    ]]);
  }, []);

  describe('Model Tests', () => {
    describe.each(PLATFORMS)('%s', (platform) => {
      if (platform === 'browser') {
        describe('ESM', () => {
          const esmTestRunner = new ClientsideTestRunner({
            name: 'esm',
            mock: true,
            dist: ESBUILD_DIST_FOLDER,
            trackTime: TRACK_TIME,
            log: LOG,
          });

          beforeAll(async function beforeAll() {
            await esmTestRunner.beforeAll();
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

          describe.each(filteredPackagesAndModels)('%s', (packageName, preparedModels) => {
            test.each(preparedModels.map(({ esm }) => esm || 'index'))(`upscales with ${packageName}/%s as esm`, async (modelName) => {
              if (VERBOSE) {
                console.log('ESM Test', packageName, modelName)
              }
              const fixture = packageName;
              const result = await esmTestRunner.page.evaluate(({ fixture, packageName, modelName }) => {
                const model = window[packageName][modelName] as unknown as ModelDefinition;
                const upscaler = new window['Upscaler']({
                  model,
                });
                return upscaler.execute(window['fixtures'][fixture], {
                  patchSize: 64,
                  padding: 2,
                });
              }, { fixture, packageName, modelName });
              const FIXTURE_PATH = path.resolve(MODELS_DIR, packageName, `test/__fixtures__${modelName === 'index' ? '' : `/${modelName}`}`, 'result.png');
              checkImage(result, FIXTURE_PATH, 'diff.png');
            });
          });
        });

        describe('UMD', () => {
          const UMD_PORT = 8096;
          const umdTestRunner = new ClientsideTestRunner({
            name: 'umd',
            mock: true,
            dist: UMD_DIST_FOLDER,
            // port: UMD_PORT,
            // verbose: VERBOSE,
          });

          beforeAll(async function modelBeforeAll() {
            await umdTestRunner.beforeAll();
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

          describe.each(filteredPackagesAndModels)('%s', (packageName, preparedModels) => {
            test.each(preparedModels.map(({ umd, esm }) => [umd || 'index', esm || 'index']))(`upscales with ${packageName}/%s as umd`, async (modelName, esmName) => {
              if (VERBOSE) {
                console.log('UMD Test', packageName, modelName)
              }
              const result = await umdTestRunner.page.evaluate(([modelName, packageName]) => {
                const model = window[modelName] as unknown as ModelDefinition;
                const upscaler = new window['Upscaler']({
                  model,
                });
                return upscaler.execute(window['fixtures'][packageName], {
                  patchSize: 64,
                  padding: 2,
                });
              }, [modelName, packageName]);
              const FIXTURE_PATH = path.resolve(MODELS_DIR, packageName, `test/__fixtures__${esmName === 'index' ? '' : `/${esmName}`}`, 'result.png');
              checkImage(result, FIXTURE_PATH, 'diff.png');
            });
          });
        });
      }

      if (platform === 'node') {
        if (VERBOSE) {
          if (USE_GPU) {
            console.log('**** USING GPU in Node')
          } else {
            console.log('**** USING CPU in Node')
          }
        }

        describe('CJS', () => {
          const main: Main = async (deps) => {
            const {
              Upscaler,
              tf,
              base64ArrayBuffer,
              imagePath,
              model,
              fs,
              usePatchSize = false,
            } = deps;
            console.log('Running main script with model', JSON.stringify(typeof model === 'function' ? model(tf) : model, null, 2));

            const upscaler = new Upscaler({
              model,
            });

            const imageData = fs.readFileSync(imagePath);
            const tensor = tf.node.decodeImage(imageData).slice([0, 0, 0], [-1, -1, 3]); // discard alpha channel, if exists
            const result = await upscaler.execute(tensor, {
              output: 'tensor',
              patchSize: usePatchSize ? 64 : undefined,
              padding: 6,
              progress: console.log,
            });
            tensor.dispose();
            // because we are requesting a tensor, it is possible that the tensor will
            // contain out-of-bounds pixels; part of the value of this test is ensuring
            // that those values are clipped in a post-process step.
            const upscaledImage = await tf.node.encodePng(result);
            result.dispose();
            return base64ArrayBuffer(upscaledImage);
          };
          const cjsTestRunner = new ServersideTestRunner({
            cwd: NODE_DIST_FOLDER,
            trackTime: false,
          });

          describe.each(filteredPackagesAndModels)('%s', (packageDirectoryName, preparedModels) => {
            test.each(preparedModels.map(({ cjs }) => cjs || 'index'))(`upscales with ${packageDirectoryName}/%s as cjs`, async (modelName) => {
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

              const formattedResult = `data:image/png;base64,${result}`;
              const resultPath = path.resolve(MODELS_DIR, packageDirectoryName, `test/__fixtures__${modelName === 'index' ? '' : `/${modelName}`}`, "result.png");
              const outputsPath = path.resolve(TMP_DIR, 'test-output/diff/node', packageDirectoryName, modelName);
              const diffPath = path.resolve(outputsPath, `diff.png`);
              const upscaledPath = path.resolve(outputsPath, `upscaled.png`);
              checkImage(formattedResult, resultPath, diffPath, upscaledPath);
              // expect(result).toMatchImage(getFixturePath(packageDirectoryName, modelName));
            });
          });

        });
      }
    });
  });
}

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    tf: typeof tf;
    fixtures: Record<string, string>;
    PixelUpsampler2x: ModelDefinition;
  }
}
