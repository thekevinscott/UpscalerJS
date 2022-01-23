import { checkImage } from '../../lib/utils/checkImage';
import { prepareScriptBundleForCJS, executeNodeScript } from '../../lib/node/prepare';
import { buildUpscalerJS } from '../../lib/utils/buildUpscalerJS';

const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT * 1); // 60 seconds timeout

describe('Builds', () => {
  beforeAll(() => {
    buildUpscalerJS('node');
  });
  it("upscales using a CJS build in Node", async () => {
    await prepareScriptBundleForCJS();
    const result = await executeNodeScript();
    checkImage(result, "upscaled-4x-pixelator.png", 'diff.png', 'upscaled.png');
  });
});
