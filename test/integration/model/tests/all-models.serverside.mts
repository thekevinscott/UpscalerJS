/****
 * Tests that different approaches to loading a model all load correctly
 */
import { AvailableModel, getFilteredModels } from '../../../../scripts/package-scripts/utils/getAllAvailableModels.js';
import path from 'path';
import { MODELS_DIR, TMP_DIR } from '@internals/common/constants';
import { getPackageJSON } from '../../../../scripts/package-scripts/utils/packages.js';
import { LOCAL_UPSCALER_NAMESPACE } from '../../../lib/node/constants.js';
import { ServersideTestRunner } from '@internals/test-runner/serverside';
import { getTemplate } from '@internals/common/get-template';

const VERBOSE = false;
const USE_GPU = process.env.useGPU === '1';

const SPECIFIC_PACKAGE: string | undefined = undefined;
const SPECIFIC_MODEL: string | undefined = undefined;

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (typeof value !== 'string') {
    throw new Error(`${key} not defined in env`);
  }
  return value;
};
const NODE_DIST_FOLDER = getEnv('NODE_DIST_FOLDER');

const filteredPackagesAndModels = getFilteredModels({
  specificPackage: SPECIFIC_PACKAGE,
  specificModel: SPECIFIC_MODEL,
  filter: (packageName, model) => {
    if (packageName === 'default-model') {
      return false;
    }
    const packagePath = path.resolve(MODELS_DIR, packageName);
    const packageJSON = getPackageJSON(packagePath);
    const supportedPlatforms = packageJSON['@upscalerjs']?.models?.[model.export]?.supportedPlatforms;

    return supportedPlatforms === undefined || supportedPlatforms.includes('browser');
  },
}).reduce<[ string, AvailableModel[] ][]>((arr, [packageName, models]) => {
  const preparedModels: AvailableModel[] = models.map(({ esm, ...model }) => {
    return {
      ...model,
      esm: esm === '' ? 'index' : esm,
    };
  });
  return arr.concat([[
    packageName,
    preparedModels,
  ]]);
}, []);

if (VERBOSE) {
  if (USE_GPU) {
    console.log('**** USING GPU in Node')
  } else {
    console.log('**** USING CPU in Node')
  }
}

describe('Serverside model integration tests', () => {
  describe('CJS', () => {
    const cjsTestRunner = new ServersideTestRunner({
      cwd: NODE_DIST_FOLDER,
      trackTime: false,
    });

    describe.each(filteredPackagesAndModels)('%s', (packageName, preparedModels) => {
      test.each(preparedModels.map(({ cjs }) => cjs || 'index'))(`upscales with ${packageName}/%s as cjs`, async (modelName) => {
        const importPath = path.join(LOCAL_UPSCALER_NAMESPACE, packageName, modelName === 'index' ? '' : `/${modelName}`);
        const modelPackageDir = path.resolve(MODELS_DIR, packageName, 'test/__fixtures__');
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
        const resultPath = path.resolve(MODELS_DIR, packageName, `test/__fixtures__${modelName === 'index' ? '' : `/${modelName}`}`, "result.png");
        expect(formattedResult).toMatchImage(resultPath);

      });
    });
  });
});
