import { checkImage } from '../../lib/utils/checkImage';
import { prepareScriptBundleForCJS, executeNodeScript } from '../../lib/node/prepare';

const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT * 1); // 60 seconds timeout

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

  it("can load model definitions in Node", async () => {
    const result = await execute("modelDefinitions.js");
    const formattedResult = `data:image/png;base64,${result}`;
    checkImage(formattedResult, "upscaled-4x-pixelator.png", 'diff.png', 'upscaled.png');
  });
});
