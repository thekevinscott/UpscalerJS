import path from 'path';
import { expect, describe, it } from 'vitest';
import { MODELS_DIR } from '@internals/common/constants';
import { ServersideTestRunner } from '@internals/test-runner/serverside';
import { getTemplate } from '@internals/common/get-template';
import { verbose } from '@internals/common/logger';

const LOWER_THRESHOLD = 20; // in milliseconds
const UPPER_THRESHOLD = 10; // in milliseconds
const DATE_AT_WHICH_SPEED_TESTS_TAKE_EFFECT = new Date('December 1, 2023 00:00:00');

const PIXEL_UPSAMPLER_DIR = path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__');
const USE_GPU = process.env.useGPU === '1';
const NODE_CJS_DIST_FOLDER = process.env.NODE_CJS_DIST_FOLDER;
if (typeof NODE_CJS_DIST_FOLDER !== 'string') {
  throw new Error('NODE_CJS_DIST_FOLDER not defined in env');
}

describe('Node Speed Integration Tests', () => {
  const testRunner = new ServersideTestRunner({
    cwd: NODE_CJS_DIST_FOLDER,
  });

  const runTest = async ({
    model,
    patchSize = 16,
  }: {
    model?: string;
    patchSize?: number;
  }) => {
    const script = await getTemplate(path.resolve(__dirname, '../_templates/speed.js.ejs'), {
      tf: USE_GPU ? `@tensorflow/tfjs-node-gpu` : `@tensorflow/tfjs-node`,
      upscaler: USE_GPU ? `upscaler/node-gpu` : `upscaler/node`,
      model,
      flowerPath: path.resolve(PIXEL_UPSAMPLER_DIR, 'flower-small-tensor.json'),
      patchSize,
    });
    const buffer = await testRunner.run(script);
    const result = buffer.toString('utf-8');
    if (!result) {
      throw new Error('Got no result back from test run.');
    }
    const [rawDuration, upscalerJSDuration] = JSON.parse(result);

    expect(upscalerJSDuration).toBeWithin([rawDuration, LOWER_THRESHOLD, UPPER_THRESHOLD]);
  };

  if (new Date().getTime() > DATE_AT_WHICH_SPEED_TESTS_TAKE_EFFECT.getTime()) {
    verbose('The date is after', DATE_AT_WHICH_SPEED_TESTS_TAKE_EFFECT, 'running speed tests!');
    describe.each([
      [
        'Pixel Upsampler',
        'pixel-upsampler',
        'x4',
      ],
      [
        'GANS',
        'esrgan-legacy',
        'gans',
      ],
    ])("%s", async (_label, packageName, modelName) => {
      it(`ensures that UpscalerJS does not add significant additional latency as compared to running the model directly`, async () => runTest({
        model: `@upscalerjs/${packageName}/${modelName}`,
      }));

      it(`ensures that UpscalerJS does not add significant additional latency as compared to running the model directly with patch sizes`, async () => runTest({
        model: `@upscalerjs/${packageName}/${modelName}`,
        patchSize: 8,
      }));
    });
  } else {
    // dummy test, to avoid complaints
    it('passes', () => {
      expect(1).toEqual(1);
    })
  }
});
