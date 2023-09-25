import fs from 'fs';
import path from 'path';
import { build } from 'esbuild';
import { copyFixtures } from '../utils/copyFixtures';
import { Import, installLocalPackages, installNodeModules, writeIndex } from '../shared/prepare';
import { LOCAL_UPSCALER_NAME, LOCAL_UPSCALER_NAMESPACE } from './constants';
import { MockCDN } from '../../integration/utils/BrowserTestRunner';
import { getAllAvailableModelPackages, getAllAvailableModels } from '../../../scripts/package-scripts/utils/getAllAvailableModels.mjs';
import { MODELS_DIR, UPSCALER_DIR } from '../../../scripts/package-scripts/utils/constants.mjs';
import { Bundle } from '../../integration/utils/NodeTestRunner';
import { getPackageJSON } from '../../../scripts/package-scripts/utils/packages.mjs';

/***
 * Types
 */
export interface BundleOpts {
  verbose?: boolean;
  skipInstallNodeModules?: boolean;
  skipInstallLocalPackages?: boolean;
  skipCopyFixtures?: boolean;
  usePNPM?: boolean;
}

/***
 * Constants
 */
const ESBUILD_ROOT = path.join(__dirname);
const ESBUILD_SRC = path.resolve(ESBUILD_ROOT, 'src');
export const ESBUILD_DIST = path.join(ESBUILD_ROOT, '/dist');

const PACKAGES = [
  ...getAllAvailableModelPackages().map(packageName => ({
    packageName,
    models: getAllAvailableModels(packageName).map(({ esm }) => {
      return esm === '' ? {
        path: '',
        name: 'index',
      } : {
        path: esm,
        name: esm,
      };
    }),
  })),
];

const indexImports: Import[] = PACKAGES.reduce((arr, { packageName, models }) => arr.concat({
  packageName,
  paths: models.filter(({ name }) => {
    // If a model package has defined supported platforms for its models, only
    // include those models that are supported in a browser
    const packagePath = path.resolve(MODELS_DIR, packageName);
    const packageJSON = getPackageJSON(packagePath);
    const supportedPlatforms = packageJSON['@upscalerjs']?.models?.[`./${name}`]?.supportedPlatforms;
    return supportedPlatforms === undefined || supportedPlatforms.includes('browser');
  }).map(({ name, path }) => ({
    name,
    path: [LOCAL_UPSCALER_NAMESPACE, packageName, name === 'index' ? '' : '', path].filter(Boolean).join('/'),
  })),
}), [] as Import[]);


/***
 * Functions
 */

export const bundleEsbuild: Bundle<BundleOpts> = async ({ 
  verbose = false, 
  skipInstallNodeModules = false, 
  skipInstallLocalPackages = false,
  skipCopyFixtures = false,
  usePNPM = false,
} = {}) => {
  const entryFile = path.resolve(ESBUILD_SRC, 'index.js');
  if (verbose) {
    console.log(JSON.stringify(indexImports, null, 2));
  }
  writeIndex(entryFile, LOCAL_UPSCALER_NAME, indexImports, {
    verbose,
  });
  if (skipInstallNodeModules !== true) {
    if (verbose) {
      console.log('installing node modules');
    }
    await installNodeModules(ESBUILD_ROOT, { verbose });
  }
  if (skipInstallLocalPackages !== true) {
    if (verbose) {
      console.log('installing local packages');
    }
    await installLocalPackages(ESBUILD_ROOT, [
      {
        src: UPSCALER_DIR,
        name: LOCAL_UPSCALER_NAME,
      },
      ...PACKAGES.map(({ packageName }) => ({
        src: path.resolve(MODELS_DIR, packageName),
        name: path.join(LOCAL_UPSCALER_NAMESPACE, packageName),
      })),
    ], {
      verbose,
      usePNPM,
    });
  }
  if (skipCopyFixtures !== true) {
    if (verbose) {
      console.log('copying local fixtures');
    }
    copyFixtures(ESBUILD_DIST, {
      includeFixtures: false,
      includeModels: true,
    });
  }

  if (verbose) {
    console.log(`bundle the code for entry file ${entryFile}`);
  }
  const buildResult = await build({
    entryPoints: [entryFile],
    bundle: true,
    loader: {
      '.png': 'file',
    },
    outdir: ESBUILD_DIST,
    // watch: {
    //   onRebuild(error, result) {
    //     if (error) {
    //       console.error('watch build failed:', error);
    //     } else {
    //       console.log('watch build succeeded:', result);
    //     }
    //   },
    // },
  });
  if (verbose) {
    console.log(`successfully bundled the code for entry file ${entryFile}`);
  }
  // buildResult.stop();
  fs.copyFileSync(path.join(ESBUILD_ROOT, 'src/index.html'), path.join(ESBUILD_DIST, 'index.html'))
  try {
    fs.symlinkSync(path.resolve(ESBUILD_ROOT, 'node_modules'), path.join(ESBUILD_DIST, 'node_modules'));
  } catch(err) {}
};

export const mockCDN: MockCDN = (port, model, pathToModel) => {
  return [
    `http://localhost:${port}`,
    'node_modules',
    LOCAL_UPSCALER_NAMESPACE,
    model,
    pathToModel,
  ].join('/');
};
