import path from 'path';
import { prepareScriptBundleForNodeCJS } from '../../lib/node/prepare';
import { LOCAL_UPSCALER_NAME, LOCAL_UPSCALER_NAMESPACE } from '../../lib/node/constants';
import { Main, NodeTestRunner } from '../utils/NodeTestRunner';
import { MODELS_DIR } from '../../../scripts/package-scripts/utils/constants';

const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT * 1); // 60 seconds timeout
const LOWER_THRESHOLD = 20; // in milliseconds
const UPPER_THRESHOLD = 10; // in milliseconds
const DATE_AT_WHICH_SPEED_TESTS_TAKE_EFFECT = new Date('March 1, 2023 00:00:00');

const PIXEL_UPSAMPLER_DIR = path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__');

const main: Main = async (deps) => {
  const FLOWER_SIZE = 16;
  const {
    Upscaler,
    tf,
    flower,
    model: modelPath,
    patchSize = FLOWER_SIZE,
  } = deps;
  const upscaler = new Upscaler({
    model: modelPath,
  });
  const bytes = new Uint8Array(flower);
  let timesToRun = Math.ceil(FLOWER_SIZE / patchSize);
  timesToRun *= timesToRun;
  const input = tf.tensor(bytes).reshape([FLOWER_SIZE, FLOWER_SIZE, 3]);

  const time = async (fn: () => Promise<any>) => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    if (result) {
      result.dispose();
    }
    return duration;
  };

  const [{ model }] = await Promise.all([
    upscaler.getModel(),
    upscaler.warmup([{
      patchSize,
      padding: 0,
    }]),
  ]);
  let rawDurations = 0;
  let upscalerJSDurations = 0;
  const TIMES = 7;
  for (let i = 0; i < TIMES; i++) {
    rawDurations = (await time(async () => {
      tf.tidy(() => {
        for (let i = 0; i < timesToRun; i++) {
          model.predict(input.expandDims(0));
        }
      });
    })) / TIMES;
    upscalerJSDurations = (await time(async () => await upscaler.upscale(input, { output: 'tensor', patchSize, padding: 0 }))) / TIMES;
  }

  input.dispose();

  return JSON.stringify([rawDurations, upscalerJSDurations]);
};

describe('Node Speed Integration Tests', () => {
  const testRunner = new NodeTestRunner({
    main,
    trackTime: false,
    dependencies: {
      'tf': '@tensorflow/tfjs-node',
      'Upscaler': `${LOCAL_UPSCALER_NAME}/node`,
      'fs': 'fs',
      'flower': path.resolve(PIXEL_UPSAMPLER_DIR, 'flower-small-tensor.json'),
    },
  });

  beforeAll(async () => {
    await testRunner.beforeAll(prepareScriptBundleForNodeCJS);
  }, 1000 * 120);

  if (new Date().getTime() > DATE_AT_WHICH_SPEED_TESTS_TAKE_EFFECT.getTime()) {
    console.log('The date is after', DATE_AT_WHICH_SPEED_TESTS_TAKE_EFFECT, 'running speed tests!');
    [
      {
        label: 'Simple Model',
        packageName: 'pixel-upsampler',
        modelName: '4x',
      },
      {
        label: 'GANS',
        packageName: 'esrgan-legacy',
        modelName: 'gans',
      },
    ].forEach(({ label, packageName, modelName }) => {
      it(`ensures that UpscalerJS running a ${label} does not add significant additional latency as compared to running the model directly`, async () => {
        const importPath = `${LOCAL_UPSCALER_NAMESPACE}/${packageName}/${modelName}`;
        const result = await testRunner.run({
          dependencies: {
            customModel: importPath,
          },
          globals: {
            model: 'customModel',
          }
        });

        if (!result) {
          throw new Error('Got no result back from test run.');
        }
        const [rawDuration, upscalerJSDuration] = JSON.parse(result.toString());

        expect(upscalerJSDuration).toBeWithin([rawDuration, LOWER_THRESHOLD, UPPER_THRESHOLD]);
      });

      it(`ensures that UpscalerJS running a ${label} does not add significant additional latency as compared to running the model directly with patch sizes`, async () => {
        const importPath = `${LOCAL_UPSCALER_NAMESPACE}/${packageName}/${modelName}`;
        const result = await testRunner.run({
          dependencies: {
            customModel: importPath,
          },
          globals: {
            model: 'customModel',
            patchSize: 8,
          }
        });

        if (!result) {
          throw new Error('Got no result back from test run.');
        }
        const [rawDuration, upscalerJSDuration] = JSON.parse(result.toString());

        expect(upscalerJSDuration).toBeWithin([rawDuration, LOWER_THRESHOLD, UPPER_THRESHOLD]);
      });
    });
  } else {
    it('passes', () => {
      expect(1).toEqual(1);
    })
  }
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithin: (expected: [number, number, number]) => CustomMatcherResult;
    }
  }
}
