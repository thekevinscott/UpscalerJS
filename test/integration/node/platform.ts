import { checkImage } from '../../lib/utils/checkImage';
import { prepareScriptBundleForNodeCJS, GetContents, testNodeScript } from '../../lib/node/prepare';
import { LOCAL_UPSCALER_NAME } from '../../lib/node/constants';

const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT * 1); // 60 seconds timeout

const writeScript = (deps: string): GetContents => outputFile => `
${deps}
const path = require('path');
const fs = require('fs');
const base64ArrayBuffer = require('../../utils/base64ArrayBuffer')

const FIXTURES = path.join(__dirname, '../../../__fixtures__');
const MODEL_PATH = path.join(FIXTURES, 'pixelator/pixelator.json');
const IMG = path.join(FIXTURES, 'flower-small.png');

// Returns a PNG-encoded UInt8Array
const upscaleImageToUInt8Array = async (model, filename) => {
  const upscaler = new Upscaler({
    model: {
      path: model,
      scale: 4,
    }
  });
  const file = fs.readFileSync(filename)
  const image = tf.node.decodeImage(file, 3)
  return await upscaler.upscale(image, {
    output: 'tensor',
    patchSize: 64,
    padding: 6
  });
}

const main = async (model) => {
  const tensor = await upscaleImageToUInt8Array(model, IMG);
  const upscaledImage = await tf.node.encodePng(tensor)
  return base64ArrayBuffer(upscaledImage);
}

const getModelPath = () => {
  return 'file://' + path.resolve(MODEL_PATH);
}

(async () => {
  const data = await main(getModelPath());
  fs.writeFileSync('${outputFile}', data);
})();
`;

describe('Platform Integration Tests', () => {
  beforeAll(async () => {
    await prepareScriptBundleForNodeCJS();
  });

  [
    { platform: 'node', deps: `
const tf = require('@tensorflow/tfjs-node');
const Upscaler = require('${LOCAL_UPSCALER_NAME}/node');
    `},
    { platform: 'node-gpu', deps: `
const tf = require('@tensorflow/tfjs-node-gpu');
const Upscaler = require('${LOCAL_UPSCALER_NAME}/node-gpu');
    `},
  ].forEach(({ platform, deps }) => {
    it(`loads a model with ${platform}`, async () => {
      const result = await testNodeScript(writeScript(deps));
      const formattedResult = `data:image/png;base64,${result}`;
      checkImage(formattedResult, "upscaled-4x-pixelator.png", 'diff.png');
    });
  });
});

