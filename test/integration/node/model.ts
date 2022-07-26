import path from 'path';
import { checkImage } from '../../lib/utils/checkImage';
import { prepareScriptBundleForNodeCJS, GetContents, testNodeScript } from '../../lib/node/prepare';
import { LOCAL_UPSCALER_NAME, LOCAL_UPSCALER_NAMESPACE } from '../../lib/node/constants';
import { getAllAvailableModelPackages, getAllAvailableModels } from '../../../scripts/package-scripts/utils/getAllAvailableModels';
import { DefinedDependencies, Dependencies, Main, NodeTestRunner } from '../utils/NodeTestRunner';
import { ModelDefinition } from '../../../packages/upscalerjs/src';

const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT * 1); // 60 seconds timeout

const main: Main = async (deps) => {
  const {
    Upscaler,
    tf,
    base64ArrayBuffer,
    flower,
    model,
  } = deps;
  const upscaler = new Upscaler({
    model,
  });
  const bytes = new Uint8Array(flower);
  const tensor = tf.tensor(bytes).reshape([16, 16, 3]);
  const result = await upscaler.upscale(tensor, {
    output: 'tensor',
    patchSize: 64,
    padding: 6,
  });
  tensor.dispose();
  // because we are requesting a tensor, it is possible that the tensor will
  // contain out-of-bounds pixels; part of the value of this test is ensuring
  // that those values are clipped in a post-process step.
  const upscaledImage = await tf.node.encodePng(result);
  result.dispose();
  return base64ArrayBuffer(upscaledImage);
};

describe('Model Loading Integration Tests', () => {
  const testRunner = new NodeTestRunner({
    main,
    trackTime: false,
    dependencies: {
      'tf': '@tensorflow/tfjs-node',
      'Upscaler': `${LOCAL_UPSCALER_NAME}/node`,
      'fs': 'fs',
      'base64ArrayBuffer': path.resolve(__dirname, '../../lib/utils/base64ArrayBuffer'),
      'flower': path.resolve(__dirname, '../../__fixtures__', 'flower-small-tensor.json'),
    },
  });
  beforeAll(async () => {
    await testRunner.beforeAll(prepareScriptBundleForNodeCJS);
  });

  it("loads the default model", async () => {
    const result = await testRunner.test({
      globals: {
        model: 'undefined',
      },
    });
    expect(result).not.toEqual('');
    const formattedResult = `data:image/png;base64,${result}`;
    checkImage(formattedResult, "upscaled-4x-gans.png", 'diff.png');
  });

  it("loads a locally exposed model via file:// path", async () => {
    const result = await testRunner.test({
      globals: {
        model: JSON.stringify({
          path: 'file://' + path.join(__dirname, '../../__fixtures__', 'pixelator/pixelator.json'),
          scale: 4,
        }),
      },
    });
    expect(result).not.toEqual('');
    const formattedResult = `data:image/png;base64,${result}`;
    checkImage(formattedResult, "upscaled-4x-pixelator.png", 'diff.png');
  });

  describe('Test specific model implementations', () => {
    const SPECIFIC_PACKAGE: string | undefined = undefined;
    const SPECIFIC_MODEL: string | undefined = undefined;
    getAllAvailableModelPackages().filter(m => SPECIFIC_PACKAGE === undefined || m === SPECIFIC_PACKAGE).map(packageName => {
      describe(packageName, () => {
        const models = getAllAvailableModels(packageName);
        models.filter(m => SPECIFIC_MODEL === undefined || m.esm === SPECIFIC_MODEL).forEach(({ cjs }) => {
          const cjsName = cjs || 'index';
          it(`upscales with ${packageName}/${cjsName} as cjs`, async () => {
            const importPath = `${LOCAL_UPSCALER_NAMESPACE}/${packageName}${cjsName === 'index' ? '' : `/${cjsName}`}`;
            const result = await testRunner.test({
              dependencies: {
                customModel: importPath,
              },
              globals: {
                model: 'customModel',
              }
            });

            expect(result).not.toEqual('');
            const formattedResult = `data:image/png;base64,${result}`;
            checkImage(formattedResult, `${packageName}/${cjsName}/result.png`, `${cjsName}/diff.png`, `${cjsName}/upscaled.png`);
          });
        });
      });
    });
  });
});
