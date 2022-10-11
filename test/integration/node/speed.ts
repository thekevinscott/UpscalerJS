import path from 'path';
import { prepareScriptBundleForNodeCJS } from '../../lib/node/prepare';
import { LOCAL_UPSCALER_NAME, LOCAL_UPSCALER_NAMESPACE } from '../../lib/node/constants';
import { Main, NodeTestRunner } from '../utils/NodeTestRunner';

const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT * 1); // 60 seconds timeout
const THRESHOLD = .05;

const main: Main = async (deps) => {
  const {
    Upscaler,
    tf,
    flower,
    model: modelPath,
  } = deps;
  const upscaler = new Upscaler({
    model: modelPath,
  });
  const bytes = new Uint8Array(flower);
  const input = tf.tensor(bytes).reshape([16, 16, 3]);

  const time = async (fn: () => Promise<any>) => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    result.dispose();
    return duration;
  };

  const [{ model }] = await Promise.all([
    upscaler.getModel(),
    upscaler.warmup([{
      patchSize: 16,
      padding: 0,
    }]),
  ]);
  let rawDurations = 0;
  let upscalerJSDurations = 0;
  const TIMES = 7;
  for (let i = 0; i < TIMES; i++) {
    rawDurations = (await time(async () => tf.tidy(() => model.predict(input.expandDims(0))))) / TIMES;
    upscalerJSDurations = (await time(async () => await upscaler.upscale(input, { output: 'tensor' }))) / TIMES;
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
      'flower': path.resolve(__dirname, '../../__fixtures__', 'flower-small-tensor.json'),
    },
  });

  beforeAll(async () => {
    await testRunner.beforeAll(prepareScriptBundleForNodeCJS);
  }, 1000 * 120);

  [
    {
      label: 'Simple Model',
      packageName: 'pixel-upsampler',
      modelName: '4x',
    },
    // {
    //   label: 'GANS',
    //   packageName: 'esrgan-legacy',
    //   modelName: 'gans',
    // },
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

      expect(upscalerJSDuration).toBeWithin([rawDuration, THRESHOLD]);
    });
  });
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithin: (expected: [number, number]) => CustomMatcherResult;
    }
  }
}

expect.extend({
  toBeWithin(received, [rawDuration, threshold]) {
    const lowerBound = (rawDuration * (1 - THRESHOLD));
    const upperBound = (rawDuration * (1 + THRESHOLD));
    const getMessage = (not = false, extra?: string) => {
      return () => [
        `Expected ${received.toFixed(3)}${not ? ' not' : ''} to be within ${threshold * 100}% of ${rawDuration.toFixed(3)}, or [${lowerBound.toFixed(3)}, ${upperBound.toFixed(3)}].`,
        extra,
      ].join('\n\n');
    }
    if (received <= upperBound && received >= lowerBound) {
      console.log('we good')
      return {
        message: getMessage(true),
        pass: true
      };
    } else {
      console.log('we NOT good!')
      const extra = received < lowerBound ? 
      `The value was less than lower bounds by ${(lowerBound - received).toFixed(3)}.` : 
      `The value was greater than upper bounds by ${(received - upperBound).toFixed(3)}, or ${((1 / (rawDuration / received) - 1) * 100).toFixed(2)}% higher.`;
      return {
        message: getMessage(false, extra),
        pass: false,
      };
    }
  }
});
