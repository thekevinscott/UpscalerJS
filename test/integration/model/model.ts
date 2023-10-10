/****
 * Tests that different approaches to loading a model all load correctly
 */
import { checkImage } from '../../lib/utils/checkImage';
import { mockCDN as esbuildMockCDN } from '../../lib/esm-esbuild/prepare';
import { mockCDN as umdMockCDN } from '../../lib/umd/prepare';
import Upscaler, { ModelDefinition } from 'upscaler';
import * as tf from '@tensorflow/tfjs';
import { AvailableModel, getFilteredModels } from '../../../scripts/package-scripts/utils/getAllAvailableModels';
import { BrowserTestRunner } from '../utils/BrowserTestRunner';
import path from 'path';
import { MODELS_DIR, TMP_DIR } from '../../../scripts/package-scripts/utils/constants';
import { getPackageJSON } from '../../../scripts/package-scripts/utils/packages';
import { LOCAL_UPSCALER_NAME, LOCAL_UPSCALER_NAMESPACE } from '../../lib/node/constants';
import { Main, NodeTestRunner } from '../utils/NodeTestRunner';
import { ServersideTestRunner } from '@internals/test-runner/serverside';
import { getTemplate } from '@internals/common/get-template';

const TRACK_TIME = false;
const LOG = true;
const VERBOSE = false;
const USE_PNPM = `${process.env.USE_PNPM}` === '1';
const USE_GPU = process.env.useGPU === 'true';
const PLATFORMS = process.env.platform?.split(',').filter(platform => typeof platform === 'string' && ['node', 'browser'].includes(platform));

const JEST_TIMEOUT = 60 * 1000 * 15 * 2;
jest.setTimeout(JEST_TIMEOUT);
jest.retryTimes(0);

const ROOT_BUNDLER_OUTPUT_DIR = process.env.ROOT_BUNDLER_OUTPUT_DIR;
if (typeof ROOT_BUNDLER_OUTPUT_DIR !== 'string') {
  throw new Error('ROOT_BUNDLER_OUTPUT_DIR not defined in env');
}
const ESBUILD_DIST = path.resolve(ROOT_BUNDLER_OUTPUT_DIR, 'esbuild/dist')
const UMD_DIST = path.resolve(ROOT_BUNDLER_OUTPUT_DIR, 'umd/dist')
const NODE_DIST_FOLDER = path.resolve(ROOT_BUNDLER_OUTPUT_DIR, 'node')

const SPECIFIC_PACKAGE: string | undefined = undefined;
const SPECIFIC_MODEL: string | undefined = undefined;

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
          const esmTestRunner = new BrowserTestRunner({
            name: 'esm',
            mockCDN: esbuildMockCDN,
            dist: ESBUILD_DIST,
            trackTime: TRACK_TIME,
            log: LOG,
            verbose: VERBOSE,
            usePNPM: USE_PNPM,
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
          const umdTestRunner = new BrowserTestRunner({
            name: 'umd',
            mockCDN: umdMockCDN,
            dist: UMD_DIST,
            port: UMD_PORT,
            verbose: VERBOSE,
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
              const result = await umdTestRunner.page.evaluate(([modelName, packageName]) => {
                const model = window[modelName] as unknown as ModelDefinition;
                if (!model) {
                  throw new Error(`No model for ${modelName}`);
                }
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

        describe('CJS', async () => {
          const cjsTestRunner = new ServersideTestRunner({
            cwd: NODE_DIST_FOLDER,
            trackTime: false,
          });

          describe.each(filteredPackagesAndModels)('%s', (packageName, preparedModels) => {
            test.each(preparedModels.map(({ cjs }) => cjs || 'index'))(`upscales with ${packageName}/%s as cjs`, async (modelName) => {
              const importPath = path.join(LOCAL_UPSCALER_NAMESPACE, packageName, modelName === 'index' ? '' : `/${modelName}`);
              const modelPackageDir = path.resolve(MODELS_DIR, packageName, 'test/__fixtures__');
              const fixturePath = path.resolve(modelPackageDir, 'fixture.png');
            const script = await getTemplate(path.resolve(__dirname, '../_templates/cjs.js.t'), {
              tf: USE_GPU ? `@tensorflow/tfjs-node-gpu` : `@tensorflow/tfjs-node`,
              customModel: importPath,
              fixturePath,
            });
            const buffer = await cjsTestRunner.run(script);
            const result = `data:image/png;base64,${buffer.toString('utf-8')}`
            // expect(result).toMatchImage(getFixturePath(packageDirectoryName, modelName));
            // checkImage(formattedResult, resultPath, diffPath, upscaledPath);
              expect(result).not.toEqual('');
              const formattedResult = `data:image/png;base64,${result}`;
              const resultPath = path.resolve(MODELS_DIR, packageName, `test/__fixtures__${modelName === 'index' ? '' : `/${modelName}`}`, "result.png");
              const outputsPath = path.resolve(TMP_DIR, 'test-output/diff/node', packageName, modelName);
              const diffPath = path.resolve(outputsPath, `diff.png`);
              const upscaledPath = path.resolve(outputsPath, `upscaled.png`);
              checkImage(formattedResult, resultPath, diffPath, upscaledPath);

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
