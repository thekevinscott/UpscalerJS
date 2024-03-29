import path from 'path';
import { describe, it } from 'vitest';
import { MODELS_DIR } from '@internals/common/constants';
import { ServersideTestRunner } from '@internals/test-runner/serverside';
import { getTemplate } from '@internals/common/get-template';

const PIXEL_UPSAMPLER_DIR = path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__');
const NODE_DIST_FOLDER = process.env.NODE_DIST_FOLDER;
if (typeof NODE_DIST_FOLDER !== 'string') {
  throw new Error('NODE_DIST_FOLDER not defined in env');
}

const testRunner = new ServersideTestRunner({
  trackTime: false,
  cwd: NODE_DIST_FOLDER,
});

const runTest = async ({
  tfjsLibrary,
}: {
  tfjsLibrary: string,
}) => {
  const script = await getTemplate(path.resolve(__dirname, '../_templates/platforms.js.ejs'), {
    tf: tfjsLibrary === 'node-gpu' ? `@tensorflow/tfjs-node-gpu` : `@tensorflow/tfjs-node`,
    upscaler: tfjsLibrary === 'node-gpu' ? `upscaler/node-gpu` : `upscaler/node`,
    flower: path.resolve(PIXEL_UPSAMPLER_DIR, 'flower-small-tensor.json'),
  });
  const buffer = await testRunner.run(script);
  const result = buffer.toString('utf-8');
  const fixture = path.resolve(PIXEL_UPSAMPLER_DIR, "x4/result.png");
  expect(`data:image/png;base64,${result}`).toMatchImage(fixture);
}
describe('Node Platforms Integration Tests', () => {
  [
    { platform: 'node', },
    { platform: 'node-gpu', },
  ].forEach(({ platform, }) => {
    it(`loads a model with ${platform}`, async () => {
      return await runTest({
        tfjsLibrary: platform,
      });
    });
  });
});

