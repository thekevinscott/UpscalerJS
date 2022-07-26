import path from 'path';
import { checkImage } from '../../lib/utils/checkImage';
import { prepareScriptBundleForNodeCJS, GetContents, testNodeScript } from '../../lib/node/prepare';
import { LOCAL_UPSCALER_NAME } from '../../lib/node/constants';
import { Main, NodeTestRunner } from '../utils/NodeTestRunner';

const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT * 1); // 60 seconds timeout

const main: Main = async (deps) => {
  const {
    Upscaler,
    tf,
    base64ArrayBuffer,
    flower,
    model,
  } = deps;
  const upscaler = new Upscaler({
    model,
  });
  const bytes = new Uint8Array(flower);
  const tensor = tf.tensor(bytes).reshape([16, 16, 3]);
  const result = await upscaler.upscale(tensor, {
    output: 'tensor',
    patchSize: 64,
    padding: 6,
  });
  tensor.dispose();
  // because we are requesting a tensor, it is possible that the tensor will
  // contain out-of-bounds pixels; part of the value of this test is ensuring
  // that those values are clipped in a post-process step.
  const upscaledImage = await tf.node.encodePng(result);
  result.dispose();
  return base64ArrayBuffer(upscaledImage);
};

describe('Platform Integration Tests', () => {
  const testRunner = new NodeTestRunner({
    main,
    trackTime: false,
    dependencies: {
      'fs': 'fs',
      'base64ArrayBuffer': path.resolve(__dirname, '../../lib/utils/base64ArrayBuffer'),
      'flower': path.resolve(__dirname, '../../__fixtures__', 'flower-small-tensor.json'),
    },
    globals: {
      model: JSON.stringify({
        path: 'file://' + path.join(__dirname, '../../__fixtures__', 'pixelator/pixelator.json'),
        scale: 4,
      }),
    },
  });
  beforeAll(async () => {
    await testRunner.beforeAll(prepareScriptBundleForNodeCJS);
  });

  [
    { platform: 'node', },
    { platform: 'node-gpu', },
  ].forEach(({ platform, }) => {
    it(`loads a model with ${platform}`, async () => {
      const result = await testRunner.test({
        dependencies: {
          'tf': `@tensorflow/tfjs-${platform}`,
          'Upscaler': `${LOCAL_UPSCALER_NAME}/${platform}`,
        },
      });
      const formattedResult = `data:image/png;base64,${result}`;
      checkImage(formattedResult, "upscaled-4x-pixelator.png", 'diff.png');
    });
  });
});

