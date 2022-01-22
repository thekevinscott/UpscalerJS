import * as browserstack from 'browserstack-local';
import * as webdriver from 'selenium-webdriver';
import { checkImage } from '../lib/utils/checkImage';
import { prepareScriptBundleForCJS, executeNodeScript } from '../lib/node/prepare';

const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT * 1); // 60 seconds timeout

describe('Builds', () => {
  beforeAll(async function beforeAll() {
  });

  afterAll(async function afterAll() {
  });

  afterEach(async function afterEach() {
  });

  it("upscales using a CJS build in Node", async () => {
    await prepareScriptBundleForCJS();
    const result = await executeNodeScript();
    checkImage(result, "upscaled-4x-pixelator.png", 'diff.png', 'upscaled.png');
  });
});
