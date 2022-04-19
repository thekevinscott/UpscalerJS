import { checkImage } from '../../lib/utils/checkImage';
import { prepareScriptBundleForCJS, executeNodeScript } from '../../lib/node/prepare';
import { AVAILABLE_MODELS } from '../../../scripts/package-scripts/build-model';

const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT * 1); // 60 seconds timeout

const execute = async (file: string, logExtra = true) => {
  let data = '';
  await executeNodeScript(file, chunk => {
    if (chunk.startsWith('OUTPUT: ')) {
      data += chunk.split('OUTPUT: ').pop();
    } else if (logExtra) {
      console.log('[SCRIPT]', chunk);
    }
  });
  return data.trim();
}

describe('Model Loading Integration Tests', () => {
  beforeAll(async () => {
    await prepareScriptBundleForCJS(AVAILABLE_MODELS);
  });

  // it("loads the default model", async () => {
  //   const result = await execute("defaultModel.js");
  //   const formattedResult = `data:image/png;base64,${result}`;
  //   checkImage(formattedResult, "upscaled-4x-pixelator.png", 'diff.png');
  // });

  it("loads a model via a require", async () => {
    const result = await execute("specifiedModel.js");
    const formattedResult = `data:image/png;base64,${result}`;
    checkImage(formattedResult, "upscaled-4x-pixelator.png", 'diff.png');
  });

  it("loads a locally exposed model via file:// path", async () => {
    const result = await execute("localFilePath.js");
    const formattedResult = `data:image/png;base64,${result}`;
    checkImage(formattedResult, "upscaled-4x-pixelator.png", 'diff.png');
  });
});
