import path from 'path';
import { checkImage } from '../../lib/utils/checkImage';
import { LOCAL_UPSCALER_NAME, LOCAL_UPSCALER_NAMESPACE } from '../../lib/node/constants';
import { AvailableModel, getAllAvailableModelPackages, getAllAvailableModels, getFilteredModels } from '../../../scripts/package-scripts/utils/getAllAvailableModels';
import { Main, NodeTestRunner } from '../utils/NodeTestRunner';
import { MODELS_DIR, TMP_DIR } from '../../../scripts/package-scripts/utils/constants';

const PIXEL_UPSAMPLER_DIR = path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__');
const DEFAULT_MODEL_DIR = path.resolve(MODELS_DIR, 'default-model/test/__fixtures__');

const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT * 1); // 60 seconds timeout

const main: Main = async (deps) => {
  const {
    Upscaler,
    tf,
    base64ArrayBuffer,
    imagePath,
    model,
    fs,
  } = deps;

  const upscaler = new Upscaler({
    model,
  });

  const imageData = fs.readFileSync(imagePath);
  const tensor = tf.node.decodeImage(imageData).slice([0, 0, 0], [-1, -1, 3]); // discard alpha channel, if exists
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
    },
  });

  it("loads the default model", async () => {
    const fixturePath = path.resolve(PIXEL_UPSAMPLER_DIR, 'fixture.png');
    const result = await testRunner.run({
      dependencies: {
      },
      globals: {
        model: 'undefined',
        imagePath: JSON.stringify(fixturePath),
      },
    });
    expect(result).not.toEqual('');
    const formattedResult = `data:image/png;base64,${result}`;
    checkImage(formattedResult, path.resolve(DEFAULT_MODEL_DIR, "index/result.png"), 'diff.png');
  });

  it("loads a locally exposed model via file:// path", async () => {
    const fixturePath = path.resolve(PIXEL_UPSAMPLER_DIR, 'fixture.png');
    const result = await testRunner.run({
      dependencies: {
      },
      globals: {
        model: JSON.stringify({
          path: 'file://' + path.join(__dirname, '../../../models/pixel-upsampler/models/4x/4x.json'),
          scale: 4,
        }),
        imagePath: JSON.stringify(fixturePath),
      },
    });
    expect(result).not.toEqual('');
    const formattedResult = `data:image/png;base64,${result}`;
    checkImage(formattedResult, path.resolve(PIXEL_UPSAMPLER_DIR, "4x/result.png"), 'diff.png');
  });

  describe('Test specific model implementations', () => {
    const SPECIFIC_PACKAGE: string | undefined = undefined;
    const SPECIFIC_MODEL: string | undefined = undefined;

    const filteredPackagesAndModels = getFilteredModels({
      specificPackage: SPECIFIC_PACKAGE, 
      specificModel: SPECIFIC_MODEL,
      filter: (packageName, model) => {
        if (['esrgan-slim', 'esrgan-medium'].includes(packageName) && model.cjs === "8x") {
          return false;
        }
        return true;
      },
    });
    filteredPackagesAndModels.forEach(([packageName, filteredModels]) => {
      describe(packageName, () => {
        filteredModels.forEach(({ cjs }) => {
          const cjsName = cjs || 'index';
          it(`upscales with ${packageName}/${cjsName} as cjs`, async () => {
            const importPath = path.join(LOCAL_UPSCALER_NAMESPACE, packageName, cjsName === 'index' ? '' : `/${cjsName}`);
            const modelPackageDir = path.resolve(MODELS_DIR, packageName, 'test/__fixtures__');
            const fixturePath = path.resolve(modelPackageDir, 'fixture.png');
            const result = await testRunner.run({
              dependencies: {
                customModel: importPath,
              },
              globals: {
                model: 'customModel',
                imagePath: JSON.stringify(fixturePath),
              }
            });

            expect(result).not.toEqual('');
            const formattedResult = `data:image/png;base64,${result}`;
            const resultPath = path.resolve(MODELS_DIR, packageName, "test/__fixtures__", cjsName, "result.png")
            const diffPath = path.resolve(TMP_DIR, 'test-output/diff', `${packageName}/${cjsName}/diff.png`);
            const upscaledPath = path.resolve(TMP_DIR, 'test-output/diff', `${packageName}/${cjsName}/upscaled.png`);
            checkImage(formattedResult, resultPath, diffPath, upscaledPath);
          }, 60000 * 4); // 4 minutes per model
        });
      });
    });
  });
});
