/****
 * Tests that different approaches to loading a model all load correctly
 */
import { checkImage } from '../../../lib/utils/checkImage.js';
import Upscaler, { ModelDefinition } from 'upscaler';
import * as tf from '@tensorflow/tfjs';
import { AvailableModel, getFilteredModels } from '../../../../scripts/package-scripts/utils/getAllAvailableModels.js';
import path from 'path';
import { MODELS_DIR, TMP_DIR } from '@internals/common/constants';
import { getPackageJSON } from '../../../../scripts/package-scripts/utils/packages.js';
import { LOCAL_UPSCALER_NAMESPACE } from '../../../lib/node/constants.js';
import { ClientsideTestRunner } from '@internals/test-runner/clientside';
import { ServersideTestRunner } from '@internals/test-runner/serverside';
import { getTemplate } from '@internals/common/get-template';

const VERBOSE = false;
const USE_GPU = process.env.useGPU === 'true';
const PLATFORMS = process.env.platform?.split(',').filter(platform => typeof platform === 'string' && ['node', 'browser'].includes(platform));

const SPECIFIC_PACKAGE: string | undefined = undefined;
const SPECIFIC_MODEL: string | undefined = undefined;

const ROOT_BUNDLER_OUTPUT_DIR = process.env.ROOT_BUNDLER_OUTPUT_DIR;
if (typeof ROOT_BUNDLER_OUTPUT_DIR !== 'string') {
  throw new Error('ROOT_BUNDLER_OUTPUT_DIR not defined in env');
}
const NODE_DIST_FOLDER = path.resolve(ROOT_BUNDLER_OUTPUT_DIR, 'node')
const ESBUILD_DIST_FOLDER = path.resolve(ROOT_BUNDLER_OUTPUT_DIR, 'esbuild/dist')
const UMD_DIST_FOLDER = path.resolve(ROOT_BUNDLER_OUTPUT_DIR, 'umd/dist')

if (PLATFORMS === undefined || PLATFORMS.length === 0) {
  throw new Error('You must provide at least one valid platform of "node" or "browser".')
} else {
  const filteredPackagesAndModels = getFilteredModels({
    specificPackage: SPECIFIC_PACKAGE,
    specificModel: SPECIFIC_MODEL,
    filter: (packageName, model) => {
      if (packageName === 'default-model') {
        return false;
      }
      const packagePath = path.resolve(MODELS_DIR, packageName);
      const packageJSON = getPackageJSON(packagePath);
      const supportedPlatforms = packageJSON['@upscalerjs']?.models?.[model.export]?.supportedPlatforms;

      return supportedPlatforms === undefined || supportedPlatforms.includes('browser');
    },
  }).reduce<[string, AvailableModel[]][]>((arr, [packageName, models]) => {
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
          const testRunner = new ClientsideTestRunner({
            name: 'esm',
            mock: true,
            dist: ESBUILD_DIST_FOLDER,
          });

          beforeAll(async function beforeAll() {
            await testRunner.beforeAll();
          }, 60000);

          afterAll(async function modelAfterAll() {
            await testRunner.afterAll();
          }, 10000);

          beforeEach(async function beforeEach() {
            await testRunner.beforeEach('| Loaded');
          });

          afterEach(async function afterEach() {
            await testRunner.afterEach();
          });

          describe.each(filteredPackagesAndModels)('%s', (packageName, preparedModels) => {
            test.each(preparedModels.map(({ esm }) => esm || 'index'))(`upscales with ${packageName}/%s as esm`, async (modelName) => {
              const fixturePath = `${await testRunner.getFixturesServerURL()}/${packageName}/test/__fixtures__/fixture.png`;
              const result = await testRunner.page.evaluate(({ fixturePath, packageName, modelName }) => {
                const model = window[`@upscalerjs/${packageName}/${modelName}`] as unknown as ModelDefinition;
                if (!model) {
                  throw new Error('No model found')
                }
                const upscaler = new window['Upscaler']({
                  model,
                });
                return upscaler.execute(fixturePath, {
                  patchSize: 64,
                  padding: 2,
                });
              }, { fixturePath, packageName, modelName });
              const FIXTURE_PATH = path.resolve(MODELS_DIR, packageName, `test/__fixtures__${modelName === 'index' ? '' : `/${modelName}`}`, 'result.png');
              checkImage(result, FIXTURE_PATH, 'diff.png');
            });
          });
        });

        describe('UMD', () => {
          const UMD_PORT = 8096;
          const testRunner = new ClientsideTestRunner({
            name: 'umd',
            mock: true,
            dist: UMD_DIST_FOLDER,
            port: UMD_PORT,
          });


          beforeAll(async function modelBeforeAll() {
            await testRunner.beforeAll();
          }, 20000);

          afterAll(async function modelAfterAll() {
            await testRunner.afterAll();
          }, 30000);

          beforeEach(async function beforeEach() {
            await testRunner.beforeEach(null);
          });

          afterEach(async function afterEach() {
            await testRunner.afterEach();
          });

          describe.each(filteredPackagesAndModels)('%s', (packageName, preparedModels) => {
            test.each(preparedModels.map(({
              umd,
              esm,
              mainUMDName,
              pathName,
              ...rest
            }) => [
                umd || 'index',
                esm || 'index',
                mainUMDName,
                rest['umd:main'],
              ]))(`upscales with ${packageName}/%s as umd from index`, async (
                modelName,
                esmName,
                mainUMDName,
                umdMain,
              ) => {
                const fixturePath = `${await testRunner.getFixturesServerURL()}/${packageName}/test/__fixtures__/fixture.png`;
                const modelScriptPath = `${await testRunner.getFixturesServerURL()}/${packageName}/${umdMain}`;
                const umdName = mainUMDName;
                const result = await testRunner.page.evaluate(async ({ fixturePath, modelScriptPath, umdName, modelName }) => {
                  await window['loadScript'](modelScriptPath);
                  const model = window[umdName][modelName];
                  if (!model) {
                    throw new Error(`No model for ${umdName} ${modelName}`);
                  }
                  const upscaler = new window['Upscaler']({
                    model,
                  });
                  return upscaler.execute(fixturePath, {
                    patchSize: 64,
                    padding: 2,
                  });
                }, { modelScriptPath, umdName, modelName, fixturePath });
                const FIXTURE_PATH = path.resolve(MODELS_DIR, packageName, `test/__fixtures__${esmName === 'index' ? '' : `/${esmName}`}`, 'result.png');
                checkImage(result, FIXTURE_PATH, 'diff.png');
              });

            test.each(preparedModels.map(({
              umd,
              esm,
              mainUMDName,
              pathName,
            }) => [
                umd || 'index',
                esm || 'index',
                mainUMDName,
                pathName,
              ]))(`upscales with ${packageName}/%s as umd directly`, async (
                modelName,
                esmName,
                mainUMDName,
                pathName,
              ) => {
                const fixturePath = `${await testRunner.getFixturesServerURL()}/${packageName}/test/__fixtures__/fixture.png`;
                const modelScriptPath = `${await testRunner.getFixturesServerURL()}/${packageName}/${pathName.umd}`;
                const umdName = mainUMDName;
                await testRunner.page.evaluate(async ({ modelScriptPath, fixturePath, umdName, modelName }) => {
                  await window['loadScript'](modelScriptPath);
                  const model = window[modelName];
                  if (!model) {
                    throw new Error(`No model for ${modelName}`);
                  }
                  window['model'] = model;
                }, { modelScriptPath, fixturePath, umdName, modelName });
                const result = await testRunner.page.evaluate(async ({ modelScriptPath, fixturePath, umdName, modelName }) => {
                  const upscaler = new window['Upscaler']({
                    model: window['model'],
                  });
                  return upscaler.execute(fixturePath, {
                    patchSize: 64,
                    padding: 2,
                  });
                }, { modelScriptPath, fixturePath, umdName, modelName });
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
              const script = await getTemplate(path.resolve(__dirname, '../_templates/cjs.js.ejs'), {
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
