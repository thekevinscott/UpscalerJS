/****
 * Tests that different approaches to loading a model all load correctly
 */
import { checkImage } from '../../lib/utils/checkImage';
import { ESBUILD_DIST as ESBUILD_DIST, mockCDN as esbuildMockCDN } from '../../lib/esm-esbuild/prepare';
import { DIST as UMD_DIST, mockCDN as umdMockCDN } from '../../lib/umd/prepare';
import Upscaler, { ModelDefinition } from 'upscaler';
import * as tf from '@tensorflow/tfjs';
import { AvailableModel, getFilteredModels } from '../../../scripts/package-scripts/utils/getAllAvailableModels';
import { BrowserTestRunner } from '../utils/BrowserTestRunner';
import path from 'path';
import { MODELS_DIR, TMP_DIR } from '../../../scripts/package-scripts/utils/constants';
import { getPackageJSON } from '../../../scripts/package-scripts/utils/packages';
import { LOCAL_UPSCALER_NAME, LOCAL_UPSCALER_NAMESPACE } from '../../lib/node/constants';
import { Main, NodeTestRunner } from '../utils/NodeTestRunner';

const TRACK_TIME = false;
const LOG = true;
const VERBOSE = false;
const USE_PNPM = `${process.env.USE_PNPM}` === '1';
const USE_GPU = process.env.useGPU === 'true';
const PLATFORMS = process.env.platform?.split(',');

const JEST_TIMEOUT = 60 * 1000 * 5;
jest.setTimeout(JEST_TIMEOUT); // 5 minute timeout
jest.retryTimes(0);


if (PLATFORMS?.includes('browser')) {
  const MODELS_TO_TEST = getFilteredModels({
    specificPackage: undefined,
    specificModel: undefined,
    filter: (packageName, model) => {
      const packagePath = path.resolve(MODELS_DIR, packageName);
      const packageJSON = getPackageJSON(packagePath);
      const supportedPlatforms = packageJSON['@upscalerjs']?.models?.[model.export]?.supportedPlatforms;

      return supportedPlatforms === undefined || supportedPlatforms.includes('browser');
    },
  }).reduce((arr, [packageName, models]) => {
    return arr.concat(models.map(({ esm, ...model }) => {
      return [
        packageName, {
          ...model,
          esm: esm === '' ? 'index' : esm,
        }];
    }));
  }, [] as [string, AvailableModel][]);

  describe('Browser Model Loading Integration Tests', () => {
    const testRunner = new BrowserTestRunner({
      name: 'esm',
      mockCDN: esbuildMockCDN,
      dist: ESBUILD_DIST,
      trackTime: TRACK_TIME,
      log: LOG,
      verbose: VERBOSE,
      usePNPM: USE_PNPM,
    });
    const page = () => testRunner.page;

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

    describe('esm', () => {
      MODELS_TO_TEST.map(([packageName, { esm: esmName }]) => {
        it(`upscales with ${packageName}/${esmName} as esm`, async () => {
          await testRunner.navigateToServer('| Loaded');
          const result = await page().evaluate(([packageName, modelName]) => {
            if (!modelName) {
              throw new Error(`No model name found for package ${packageName}`);
            }
            // TODO: window fails to be typed correctly in CI
            // https://github.com/thekevinscott/UpscalerJS/runs/7176553596?check_suite_focus=true#step:7:60
            // Locally it works fine
            const modelDefinition = (window as any)[packageName][modelName];
            if (!modelDefinition) {
              throw new Error(`No model definition found for package name ${packageName} and model name ${modelName}`);
            }
            const upscaler = new window['Upscaler']({
              model: modelDefinition,
            });
            return upscaler.execute(window['fixtures'][packageName]);
          }, [packageName, esmName]);
          const resultPath = path.resolve(MODELS_DIR, packageName, "test/__fixtures__", esmName, "result.png")
          const outputsPath = path.resolve(TMP_DIR, 'test-output/diff/browser/umd', packageName, esmName);
          const diffPath = path.resolve(outputsPath, `diff.png`);
          const upscaledPath = path.resolve(outputsPath, `upscaled.png`);
          checkImage(result, resultPath, diffPath, upscaledPath);
        });
      });
    });

    describe('umd', () => {
      const UMD_PORT = 8096;
      const umdTestRunner = new BrowserTestRunner({
        name: 'umd',
        mockCDN: umdMockCDN,
        dist: UMD_DIST,
        port: UMD_PORT,
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

      MODELS_TO_TEST.map(([packageName, { esm: esmName, umd: umdName }]) => {
        it(`upscales with ${packageName}/${esmName} as umd`, async () => {
          const result = await umdTestRunner.page.evaluate(([umdName, packageName]) => {
            const model: ModelDefinition = (<any>window)[umdName];
            const upscaler = new window['Upscaler']({
              model,
            });
            return upscaler.execute(window['fixtures'][packageName]);
          }, [umdName, packageName]);
          const resultPath = path.resolve(MODELS_DIR, packageName, "test/__fixtures__", esmName, "result.png")
          const outputsPath = path.resolve(TMP_DIR, 'test-output/diff/browser/esm', packageName, esmName);
          const diffPath = path.resolve(outputsPath, `diff.png`);
          const upscaledPath = path.resolve(outputsPath, `upscaled.png`);
          checkImage(result, resultPath, diffPath, upscaledPath);
        });
      });
    });

  });
}

if (PLATFORMS?.includes('node')) {
  const main: Main = async (deps) => {
    const {
      Upscaler,
      tf,
      base64ArrayBuffer,
      imagePath,
      model,
      fs,
    } = deps;
    console.log('Running main script with model', JSON.stringify(typeof model === 'function' ? model(tf) : model, null, 2));

    const upscaler = new Upscaler({
      model,
    });

    const imageData = fs.readFileSync(imagePath);
    const tensor = tf.node.decodeImage(imageData).slice([0, 0, 0], [-1, -1, 3]); // discard alpha channel, if exists
    const result = await upscaler.execute(tensor, {
      output: 'tensor',
      patchSize: 64,
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

  describe('Node Model Loading Integration Tests', () => {
    const testRunner = new NodeTestRunner({
      main,
      trackTime: false,
      dependencies: {
        'tf': `@tensorflow/tfjs-node${USE_GPU ? '-gpu' : ''}`,
        'Upscaler': `${LOCAL_UPSCALER_NAME}/node`,
        'fs': 'fs',
        'base64ArrayBuffer': path.resolve(__dirname, '../../lib/utils/base64ArrayBuffer'),
      },
    });

    const filteredPackagesAndModels = getFilteredModels({
      filter: (packageName, model) => {
        const packagePath = path.resolve(MODELS_DIR, packageName);
        const packageJSON = getPackageJSON(packagePath);
        const supportedPlatforms = packageJSON['@upscalerjs']?.models?.[model.export]?.supportedPlatforms;

        return supportedPlatforms === undefined || supportedPlatforms.includes('node');
      },
    });
    filteredPackagesAndModels.forEach(([packageName, filteredModels]) => {
      describe(packageName, () => {
        filteredModels.forEach(({ cjs }) => {
          const cjsName = cjs || 'index';
          it(`upscales with ${packageName}/${cjsName} as cjs`, async () => {
            const importPath = path.join(LOCAL_UPSCALER_NAMESPACE, packageName, cjsName === 'index' ? '' : `/${cjsName}`);
            const modelPackageDir = path.resolve(MODELS_DIR, packageName, 'test/__fixtures__');
            const fixturePath = path.resolve(modelPackageDir, 'fixture.png');
            const result = await testRunner.run({
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
            const resultPath = path.resolve(MODELS_DIR, packageName, "test/__fixtures__", cjsName, "result.png")
            const outputsPath = path.resolve(TMP_DIR, 'test-output/diff/node', packageName, cjsName);
            const diffPath = path.resolve(outputsPath, `diff.png`);
            const upscaledPath = path.resolve(outputsPath, `upscaled.png`);
            checkImage(formattedResult, resultPath, diffPath, upscaledPath);
          });
        });
      });
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
