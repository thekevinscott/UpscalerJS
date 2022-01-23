import path from 'path';
import { checkImage } from '../../lib/utils/checkImage';
import { prepareScriptBundleForCJS, executeNodeScript } from '../../lib/node/prepare';
import { buildUpscalerJS } from '../../lib/utils/buildUpscalerJS';

const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT * 1); // 60 seconds timeout

const FIXTURES = path.join(__dirname, '../../../__fixtures__');
const MODEL_PATH = path.join(FIXTURES, 'pixelator/pixelator.json');

const execute = async (modelPath: string = '') => {
  return await executeNodeScript(path.resolve(__dirname, './tests/upscale_image.js'), `${modelPath}`);
}

describe('Builds', () => {
  beforeAll(async (done) => {
    buildUpscalerJS('node');
    await prepareScriptBundleForCJS();
    done();
  });

  it("upscales using a CJS build in Node using a file:// model link", async () => {
    const result = await execute('--useTfIOFileSystem 0');
    checkImage(result, "upscaled-4x-pixelator.png", 'diff.png', 'upscaled.png');
  });

  it("upscales using a CJS build in Node using a tf.io.fileSystem model link", async () => {
    const result = await execute('--useTfIOFileSystem 1');
    checkImage(result, "upscaled-4x-pixelator.png", 'diff.png', 'upscaled.png');
  });
});
