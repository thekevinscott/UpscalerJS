/****
 * Tests that different approaches to loading a model all load correctly
 */
import path from 'path';
import { MODELS_DIR } from '@internals/common/constants';
import { ServersideTestRunner } from '@internals/test-runner/serverside';
import { getTemplate } from '@internals/common/get-template';
import { ALL_MODELS, getPackagesAndModelsForEnvironment } from '@internals/common/models';

const VERBOSE = false;
const USE_GPU = process.env.useGPU === '1';

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (typeof value !== 'string') {
    throw new Error(`${key} not defined in env`);
  }
  return value;
};
const NODE_DIST_FOLDER = getEnv('NODE_DIST_FOLDER');

if (VERBOSE) {
  if (USE_GPU) {
    console.log('**** USING GPU in Node')
  } else {
    console.log('**** USING CPU in Node')
  }
}

describe('Serverside model integration tests', () => {
  describe('CJS', async () => {
    const cjsTestRunner = new ServersideTestRunner({
      cwd: NODE_DIST_FOLDER,
      trackTime: false,
    });

    const packagesWithModels = getPackagesAndModelsForEnvironment('serverside', process.env.CI);

    test.each(await packagesWithModels)('%s', async ({ packageDirectoryName, modelName }) => {
      const importPath = path.join('@upscalerjs', packageDirectoryName, modelName === 'index' ? '' : `/${modelName}`);
      const modelPackageDir = path.resolve(MODELS_DIR, packageDirectoryName, 'test/__fixtures__');
      const fixturePath = path.resolve(modelPackageDir, 'fixture.png');
      const script = await getTemplate(path.resolve(__dirname, '../_templates/cjs.js.ejs'), {
        tf: USE_GPU ? `@tensorflow/tfjs-node-gpu` : `@tensorflow/tfjs-node`,
        customModel: importPath,
        fixturePath,
      });
      const buffer = await cjsTestRunner.run(script);
      const result = `data:image/png;base64,${buffer.toString('utf-8')}`
      expect(result).not.toEqual('');
      const formattedResult = `data:image/png;base64,${result}`;
      const resultPath = path.resolve(MODELS_DIR, packageDirectoryName, `test/__fixtures__${modelName === 'index' ? '' : `/${modelName}`}`, "result.png");
      expect(formattedResult).toMatchImage(resultPath);
    });
  });
});
