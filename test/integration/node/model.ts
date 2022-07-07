import { checkImage } from '../../lib/utils/checkImage';
import { executeNodeScript, prepareScriptBundleForNodeCJS } from '../../lib/node/prepare';
import { LOCAL_UPSCALER_NAME } from '../../lib/node/constants';

const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT * 1); // 60 seconds timeout

const execute = async (contents: string, logExtra = true) => {
  let data = '';
  await executeNodeScript(contents.trim(), chunk => {
    if (chunk.startsWith('OUTPUT: ')) {
      data += chunk.split('OUTPUT: ').pop();
    } else if (logExtra) {
      console.log('[PAGE]', chunk);
    }
  });
  return data.trim();
}

const writeScript = (getModelPath: string) => `
const tf = require('@tensorflow/tfjs-node');
const Upscaler = require('${LOCAL_UPSCALER_NAME}/node');
const path = require('path');
const fs = require('fs');
const base64ArrayBuffer = require('../../utils/base64ArrayBuffer')

const FIXTURES = path.join(__dirname, '../../../__fixtures__');
const IMG = path.join(FIXTURES, 'flower-small.png');

const getUpscaler = (model) => {
  if (model) {
    return new Upscaler({
      model: {
        path: model,
        scale: 4,
      }
    });
  }

  return new Upscaler();
}

// Returns a PNG-encoded UInt8Array
const upscaleImageToUInt8Array = async (model, filename) => {
  const upscaler = getUpscaler(model);
  const file = fs.readFileSync(filename)
  const image = tf.node.decodeImage(file, 3)
  return await upscaler.upscale(image, {
    output: 'tensor',
    patchSize: 64,
    padding: 6,
  });
}

const main = async (model) => {
  const tensor = await upscaleImageToUInt8Array(model, IMG);
  const upscaledImage = await tf.node.encodePng(tensor)
  return base64ArrayBuffer(upscaledImage);
}

${getModelPath}

(async () => {
  const data = await main(getModelPath());
  console.log('OUTPUT: ' + data);
})();
`;

describe('Model Loading Integration Tests', () => {
  beforeAll(async () => {
    await prepareScriptBundleForNodeCJS();
  });
//   it("loads the default model", async () => {
//     const result = await execute(writeScript(`
// const getModelPath = () => undefined 
//     `));
//     const formattedResult = `data:image/png;base64,${result}`;
//     checkImage(formattedResult, "upscaled-4x-gans.png", 'diff.png');
//   });

  it("loads a locally exposed model via file:// path", async () => {
    const result = await execute(writeScript(`
const getModelPath = () => {
  const MODEL_PATH = path.join(FIXTURES, 'pixelator/pixelator.json');
  return 'file://' + path.resolve(MODEL_PATH);
}
    `));
    const formattedResult = `data:image/png;base64,${result}`;
    checkImage(formattedResult, "upscaled-4x-pixelator.png", 'diff.png');
  });

  it("loads a model via HTTP", async () => {
    const result = await execute(writeScript(`
const getModelPath = () => {
  return 'https://unpkg.com/@upscalerjs/models@0.10.0-canary.1/models/pixelator/model.json';
}
    `));
    const formattedResult = `data:image/png;base64,${result}`;
    checkImage(formattedResult, "upscaled-4x-pixelator.png", 'diff.png');
  });
});
