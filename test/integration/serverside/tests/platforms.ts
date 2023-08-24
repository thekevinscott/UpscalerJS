import { MODELS_DIR } from '@internals/common/constants';
import { getTemplate } from '@internals/common/get-template';
import { TFJSLibrary } from '@internals/common/tfjs-library';
import { ServersideTestRunner } from '@internals/test-runner/serverside';
import path from 'path';

const PIXEL_UPSAMPLER_DIR = path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__');
const ROOT_BUNDLER_OUTPUT_DIR = process.env.ROOT_BUNDLER_OUTPUT_DIR;
if (typeof ROOT_BUNDLER_OUTPUT_DIR !== 'string') {
  throw new Error('ROOT_BUNDLER_OUTPUT_DIR not defined in env');
}
const NODE_DIST_FOLDER = path.resolve(ROOT_BUNDLER_OUTPUT_DIR, 'node');

describe('Environment integration tests', () => {
  const testRunner = new ServersideTestRunner({
    trackTime: false,
    cwd: NODE_DIST_FOLDER,
  });

  const runTest = async ({
    tfjsLibrary,
  }: {
    tfjsLibrary: string,
  }) => {
    const script = await getTemplate(path.resolve(__dirname, '../_templates/platforms.js.t'), {
      tf: tfjsLibrary === 'node-gpu' ? `@tensorflow/tfjs-node-gpu` : `@tensorflow/tfjs-node`,
      upscaler: tfjsLibrary === 'node-gpu' ? `upscaler/node-gpu` : `upscaler/node`,
      flower: path.resolve(PIXEL_UPSAMPLER_DIR, 'flower-small-tensor.json'),
    });
    const buffer = await testRunner.run(script);
    const result = buffer.toString('utf-8');
    expect(`data:image/png;base64,${result}`).toMatchImage(path.resolve(PIXEL_UPSAMPLER_DIR, "4x/result.png"));
  }
  test.each([
    [
      'node',
    ],
    [
      'node-gpu',
    ],
  ])("%s", async ([tfjsLibrary]) => runTest({
    tfjsLibrary,
  }));
});
