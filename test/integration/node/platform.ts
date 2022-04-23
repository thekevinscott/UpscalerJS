import { checkImage } from '../../lib/utils/checkImage';
import { prepareScriptBundleForCJS, executeNodeScript } from '../../lib/node/prepare';

const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT * 1); // 60 seconds timeout

const execute = async (file: string, logExtra = true) => {
  let data = '';
  await executeNodeScript(file, chunk => {
    if (chunk.startsWith('OUTPUT: ')) {
      data += chunk.split('OUTPUT: ').pop();
    } else if (logExtra) {
      console.log(chunk);
    }
  });
  return data.trim();
}

describe('Platform Integration Tests', () => {
  beforeAll(async () => {
    await prepareScriptBundleForCJS();
  });

  ['node', 'node-gpu'].forEach(platform => {
    it("loads a model with node", async () => {
      const result = await execute(`platforms/${platform}.js`);
      const formattedResult = `data:image/png;base64,${result}`;
      checkImage(formattedResult, "upscaled-4x-pixelator.png", 'diff.png', 'upscaled.png');
    });
  });
});

