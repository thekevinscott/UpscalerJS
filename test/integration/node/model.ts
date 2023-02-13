import path from 'path';
import { checkImage } from '../../lib/utils/checkImage';
import { LOCAL_UPSCALER_NAME, LOCAL_UPSCALER_NAMESPACE } from '../../lib/node/constants';
import { AvailableModel, getAllAvailableModelPackages, getAllAvailableModels } from '../../../scripts/package-scripts/utils/getAllAvailableModels';
import { Main, NodeTestRunner } from '../utils/NodeTestRunner';
import { MODELS_DIR } from '../../../scripts/package-scripts/utils/constants';

const PIXEL_UPSAMPLER_DIR = path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__');
const DEFAULT_MODEL_DIR = path.resolve(MODELS_DIR, 'default-model/test/__fixtures__');

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

describe('Node Model Loading Integration Tests', () => {
  const testRunner = new NodeTestRunner({
    main,
    trackTime: false,
    dependencies: {
      'tf': '@tensorflow/tfjs-node',
      'Upscaler': `${LOCAL_UPSCALER_NAME}/node`,
      'fs': 'fs',
      'base64ArrayBuffer': path.resolve(__dirname, '../../lib/utils/base64ArrayBuffer'),
      'flower': path.resolve(PIXEL_UPSAMPLER_DIR, 'flower-small-tensor.json'),
    },
  });

  it("loads the default model", async () => {
    const result = await testRunner.run({
      globals: {
        model: 'undefined',
      },
    });
    expect(result).not.toEqual('');
    const formattedResult = `data:image/png;base64,${result}`;
    checkImage(formattedResult, path.resolve(DEFAULT_MODEL_DIR, "index/result.png"), 'diff.png');
  });

  it("loads a locally exposed model via file:// path", async () => {
    const result = await testRunner.run({
      globals: {
        model: JSON.stringify({
          path: 'file://' + path.join(__dirname, '../../../models/pixel-upsampler/models/4x/4x.json'),
          scale: 4,
        }),
      },
    });
    expect(result).not.toEqual('');
    const formattedResult = `data:image/png;base64,${result}`;
    checkImage(formattedResult, path.resolve(PIXEL_UPSAMPLER_DIR, "4x/result.png"), 'diff.png');
  });

  describe('Test specific model implementations', () => {
    const SPECIFIC_PACKAGE: string | undefined = undefined;
    const SPECIFIC_MODEL: string | undefined = undefined;
    const filteredPackagesAndModels = getAllAvailableModelPackages().reduce((arr, packageName) => {
      const models = getAllAvailableModels(packageName);
      return arr.concat(models.map(model => {
        return [packageName, model];
      }));
    }, [] as ([string, AvailableModel])[]).filter(([packageName, model]) => {
      if (SPECIFIC_PACKAGE !== undefined) {
        return packageName !== SPECIFIC_PACKAGE;
      }
      if (SPECIFIC_MODEL !== undefined) {
        return model.esm === SPECIFIC_MODEL;
      }
      if (['esrgan-slim', 'esrgan-medium'].includes(packageName) && model.cjs === "8x") {
        return false;
      }
      return true;
    });
    if (filteredPackagesAndModels.length === 0) {
      const allPackages = getAllAvailableModelPackages().map(packageName => {
        return [
          `- ${packageName}`,
          ...getAllAvailableModels(packageName).map(m => `  - ${m.esm}`),
        ].join('\n');
      });
      throw new Error([
        'No models were found for filter',
        'Available models:',
        ...allPackages,
      ].join('\n'));
    }
    const filteredPackagesAndModelsObj = filteredPackagesAndModels.reduce((obj, [packageName, model]) => ({
      ...obj,
      [packageName]: (obj[packageName] || []).concat([model]),
    }), {} as Record<string, AvailableModel[]>);
    Object.entries(filteredPackagesAndModelsObj).forEach(([packageName, filteredModels]) => {
      describe(packageName, () => {
        filteredModels.forEach(({ cjs }) => {
          const cjsName = cjs || 'index';
          it(`upscales with ${packageName}/${cjsName} as cjs`, async () => {
            const importPath = path.join(LOCAL_UPSCALER_NAMESPACE, packageName, cjsName === 'index' ? '' : `/${cjsName}`);
            const result = await testRunner.run({
              dependencies: {
                customModel: importPath,
              },
              globals: {
                model: 'customModel',
              }
            });

            expect(result).not.toEqual('');
            const formattedResult = `data:image/png;base64,${result}`;
            checkImage(formattedResult, path.resolve(MODELS_DIR, packageName, "test/__fixtures__", cjsName, "result.png"), `${cjsName}/diff.png`, `${cjsName}/upscaled.png`);
          });
        });
      });
    });
  });
});
