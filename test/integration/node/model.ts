import path from 'path';
import { checkImage } from '../../lib/utils/checkImage';
import { prepareScriptBundleForCJS, executeNodeScript } from '../../lib/node/prepare';

const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT * 1); // 60 seconds timeout

const FIXTURES = path.join(__dirname, '../../../__fixtures__');
const MODEL_PATH = path.join(FIXTURES, 'pixelator/pixelator.json');

type Fn = () => (string | Promise<string>);

// const execute = async (modelPath: string = '') => {
const execute = async (file: string) => {
  let data = '';
  await executeNodeScript(file, chunk => {
    if (chunk.startsWith('OUTPUT: ')) {
      data += chunk.split('OUTPUT: ').pop();
    } else {
      console.log(chunk);
    }
  });
  return data.trim();
}

describe('Model Loading Integration Tests', () => {
  beforeAll(async () => {
    await prepareScriptBundleForCJS();
  });

  // it("loads a locally exposed model via file:// path", async () => {
  // it("loads a model via tf.io.fileSystem", async () => {
  // it("loads a model via URL", async () => {
  it("loads a locally exposed model via file:// path", async () => {
    const result = await execute("localFilePath.js");
    const formattedResult = `data:image/png;base64,${result}`;
    checkImage(formattedResult, "upscaled-4x-pixelator.png", 'diff.png', 'upscaled.png');
  });

  it("loads a model via tf.io.fileSystem", async () => {
    const result = await execute("localFilePath.js");
    const formattedResult = `data:image/png;base64,${result}`;
    checkImage(formattedResult, "upscaled-4x-pixelator.png", 'diff.png', 'upscaled.png');
  });

  it("loads a model via HTTP", async () => {
    const result = await execute("httpPath.js");
    const formattedResult = `data:image/png;base64,${result}`;
    checkImage(formattedResult, "upscaled-4x-pixelator.png", 'diff.png', 'upscaled.png');
  });
});
