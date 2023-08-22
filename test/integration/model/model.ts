/****
 * Tests that different approaches to loading a model all load correctly
 */
import { checkImage } from '../../lib/utils/checkImage';
import { ESBUILD_DIST as ESBUILD_DIST, mockCDN as esbuildMockCDN } from '../../lib/esm-esbuild/prepare';
import { DIST as UMD_DIST, mockCDN as umdMockCDN } from '../../lib/umd/prepare';
import Upscaler, { ModelDefinition } from 'upscaler';
import * as tf from '@tensorflow/tfjs';
import { AvailableModel, getAllAvailableModels, getFilteredModels } from '../../../scripts/package-scripts/utils/getAllAvailableModels';
import { BrowserTestRunner } from '../utils/BrowserTestRunner';
import path from 'path';
import { MODELS_DIR, TMP_DIR } from '../../../scripts/package-scripts/utils/constants';
import { getPackageJSON } from '../../../scripts/package-scripts/utils/packages';
import { LOCAL_UPSCALER_NAME, LOCAL_UPSCALER_NAMESPACE } from '../../lib/node/constants';
import { Main, NodeTestRunner } from '../utils/NodeTestRunner';
import yargs from 'yargs';

const TRACK_TIME = false;
const LOG = true;
const VERBOSE = true;
const USE_PNPM = `${process.env.USE_PNPM}` === '1';
const USE_GPU = process.env.useGPU === 'true';

const JEST_TIMEOUT = 60 * 1000 * 15 * 2;
jest.setTimeout(JEST_TIMEOUT);
jest.retryTimes(0);

const getSupportedPlatforms = (packageName: string, modelName: string) => {
  const model = getAllAvailableModels(packageName).filter(model => model.esm === modelName).pop();
  if (!model) {
    throw new Error(`No model found for ${packageName}/${modelName}`);
  }
  const packagePath = path.resolve(MODELS_DIR, packageName);
  const packageJSON = getPackageJSON(packagePath);
  const { supportedPlatforms = ['browser', 'node' ]} = packageJSON['@upscalerjs']?.models?.[model.export] || {};
  return supportedPlatforms;
};

describe('Model Tests', () => {
  const argv = yargs(process.argv.slice(2))
    .parserConfiguration({ 'unknown-options-as-args': true })
    .options({
      package: { type: 'string' },
      model: { type: 'string' },
      flavor: { type: 'string' },
    }).argv;

  if (argv instanceof Promise) {
    throw new Error('Promise');
  }

  const { flavor, package: specificPackage, model: specificModel } = argv;

  const filteredPackagesAndModels = getFilteredModels({
    specificPackage,
    specificModel,
    filter: (packageName, model) => {
      const packagePath = path.resolve(MODELS_DIR, packageName);
      const packageJSON = getPackageJSON(packagePath);
      const supportedPlatforms = packageJSON['@upscalerjs']?.models?.[model.export]?.supportedPlatforms;

      return supportedPlatforms === undefined || supportedPlatforms.includes('browser');
    },
  }).reduce<(AvailableModel & { packageName: string })[]>((arr, [packageName, models]) => {
    const preparedModels: AvailableModel[] = models.map(({ esm, ...model }) => {
      return {
        ...model,
        esm: esm === '' ? 'index' : esm,
      };
    });
    return arr.concat(preparedModels.map(model => ({
      ...model,
      packageName,
    })));
  }, []);

  if (flavor === undefined || ['esm', 'umd'].includes(flavor)) {
    if (flavor === undefined || flavor === 'esm') {
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

        test.each(filteredPackagesAndModels.filter(({ packageName, esm }) => {
          return getSupportedPlatforms(packageName, esm || 'index').includes('browser');
        }).map(({ packageName, esm }) => [packageName, esm || 'index']))(`%s/%s`, async (packageName, modelName) => {
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
    }

    if (flavor === undefined || flavor === 'umd') {
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

        test.each(filteredPackagesAndModels.filter(({ packageName, esm }) => {
          return getSupportedPlatforms(packageName, esm || 'index').includes('browser');
        }).map(({ packageName, umd, esm }) => [packageName, umd || 'index', esm || 'index']))(`%s/%s`, async (packageName, modelName, esmName) => {
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
    }
  }

  if (flavor === undefined || flavor === 'cjs') {
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
      const cjsTestRunner = new NodeTestRunner({
        main,
        trackTime: false,
        dependencies: {
          'tf': `@tensorflow/tfjs-node${USE_GPU ? '-gpu' : ''}`,
          'Upscaler': `${LOCAL_UPSCALER_NAME}/node`,
          'fs': 'fs',
          'base64ArrayBuffer': path.resolve(__dirname, '../../lib/utils/base64ArrayBuffer'),
        },
        verbose: VERBOSE,
      });

      test.each(filteredPackagesAndModels.map(({ packageName, cjs }) => [packageName, cjs || 'index']))(`%s/%s`, async (packageName, modelName) => {
        const importPath = path.join(LOCAL_UPSCALER_NAMESPACE, packageName, modelName === 'index' ? '' : `/${modelName}`);
        const modelPackageDir = path.resolve(MODELS_DIR, packageName, 'test/__fixtures__');
        const fixturePath = path.resolve(modelPackageDir, 'fixture.png');
        const result = await cjsTestRunner.run({
          dependencies: {
            customModel: importPath,
          },
          globals: {
            model: 'customModel',
            imagePath: JSON.stringify(fixturePath),
          }
        });

        expect(result).not.toEqual('');
        const formattedResult = `data:image/png;base64,${result}`;
        const resultPath = path.resolve(MODELS_DIR, packageName, `test/__fixtures__${modelName === 'index' ? '' : `/${modelName}`}`, "result.png");
        const outputsPath = path.resolve(TMP_DIR, 'test-output/diff/node', packageName, modelName);
        const diffPath = path.resolve(outputsPath, `diff.png`);
        const upscaledPath = path.resolve(outputsPath, `upscaled.png`);
        checkImage(formattedResult, resultPath, diffPath, upscaledPath);
      });
    });
  }
});

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    tf: typeof tf;
    fixtures: Record<string, string>;
    PixelUpsampler2x: ModelDefinition;
  }
}
