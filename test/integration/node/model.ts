import { checkImage } from '../../lib/utils/checkImage';
import { prepareScriptBundleForNodeCJS, GetContents, testNodeScript } from '../../lib/node/prepare';
import { LOCAL_UPSCALER_NAMESPACE } from '../../lib/node/constants';
import { getAllAvailableModelPackages, getAllAvailableModels } from '../../../scripts/package-scripts/utils/getAllAvailableModels';

const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT * 1); // 60 seconds timeout

const writeScript = (getUpscalerArgs: string, imports: string = ''): GetContents => (outputFile: string) => `
const path = require('path');
const fs = require('fs');
const tf = require('@tensorflow/tfjs-node');
const Upscaler = require('${LOCAL_UPSCALER_NAMESPACE}/node');
${imports}
const base64ArrayBuffer = require('../../utils/base64ArrayBuffer')

const FIXTURES = path.join(__dirname, '../../../__fixtures__');
const TENSOR_PATH = path.join(FIXTURES, 'flower-small-tensor.json');

// Returns a PNG-encoded UInt8Array
const upscaleImageToUInt8Array = async (args = {}, filename) => {
  const upscaler = new Upscaler({
    ...args,
  });
  const file = fs.readFileSync(filename)
  const image = tf.node.decodeImage(file, 3)
  return await upscaler.upscale(image, {
    output: 'tensor',
    patchSize: 64,
    padding: 6,
  });
}

const main = async (model) => {
  const tensor = await upscaleImageToUInt8Array(model, TENSOR_PATH);
  const upscaledImage = await tf.node.encodePng(tensor)
  return base64ArrayBuffer(upscaledImage);
}

(async () => {
  ${getUpscalerArgs}
  const data = await main(getUpscalerArgs());
  fs.writeFileSync('${outputFile}', data);
})();
`;

describe('Model Loading Integration Tests', () => {
  beforeAll(async () => {
    await prepareScriptBundleForNodeCJS();
  });

//   it("loads the default model", async () => {
//     const result = await testNodeScript(writeScript(`
// const getUpscalerArgs = () => ({});
//     `));
//     expect(result).not.toEqual('');
//     const formattedResult = `data:image/png;base64,${result}`;
//     checkImage(formattedResult, "upscaled-4x-gans.png", 'diff.png');
//   });

//   it("loads a locally exposed model via file:// path", async () => {
//     const result = await testNodeScript(writeScript(`
// const getUpscalerArgs = () => {
//   return {
//     model: {
//       path: 'file://' + path.resolve(FIXTURES, 'pixelator/pixelator.json'),
//       scale: 4,
//     },
//   };
// }
//     `));
//     expect(result).not.toEqual('');
//     const formattedResult = `data:image/png;base64,${result}`;
//     checkImage(formattedResult, "upscaled-4x-pixelator.png", 'diff.png');
//   });

// TODO: I'm not sure Node should support loading models via HTTP
//   it("loads a model via HTTP", async () => {
//     const result = await testNodeScript(writeScript(`
// const getUpscalerArgs = () => {
//   return {
//     model: {
//       path: 'https://unpkg.com/@upscalerjs/models@0.10.0-canary.1/models/pixelator/model.json',
//       scale: 4,
//     },
//   };
// }
//     `));
//     expect(result).not.toEqual('');
//     const formattedResult = `data:image/png;base64,${result}`;
//     checkImage(formattedResult, "upscaled-4x-pixelator.png", 'diff.png');
//   });

  describe('Test specific model implementations', () => {
    getAllAvailableModelPackages().filter(p => p === 'esrgan-legacy').map(packageName => {
      describe(packageName, () => {
        const models = getAllAvailableModels(packageName);
        models.filter(m => m).forEach(({ cjs }) => {
          const cjsName = cjs || 'index';
          it(`upscales with ${packageName}/${cjsName} as cjs`, async () => {
            const importPath = `${LOCAL_UPSCALER_NAMESPACE}/${packageName}${cjsName === 'index' ? '' : `/${cjsName}`}`;
            const result = await testNodeScript(writeScript(`
              const getUpscalerArgs = () => {
                return {
                  model,
                };
              }
            `, `
            const model = require('${importPath}').default;
            `));
            expect(result).not.toEqual('');
            const formattedResult = `data:image/png;base64,${result}`;
            console.log(`${packageName}/${cjsName}/result.png`);
            checkImage(formattedResult, `${packageName}/${cjsName}/result.png`, `${cjsName}/diff.png`, `${cjsName}/upscaled.png`);
          });
        });
      });
    });
  });
});
