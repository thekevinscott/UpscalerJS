import * as fs from 'fs';
import * as path from 'path';
import * as esbuild from 'esbuild';
import * as rimraf from 'rimraf';
import { copyFixtures } from '../utils/copyFixtures';
import { updateTFJSVersion } from '../utils/updateTFJSVersion';
import callExec from '../utils/callExec';
import { getAllAvailableModelPackages } from '../utils/getAllAvailableModels';

const ROOT = path.join(__dirname);
export const DIST = path.join(ROOT, '/dist');
const NODE_MODULES = path.join(ROOT, '/node_modules');
const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs')

const recreateNodeModuleFolder = async (localPackageName: string) => {
  rimraf.sync(`${NODE_MODULES}/${localPackageName}`);
  await callExec(`mkdir -p ./node_modules/${localPackageName}`, {
    cwd: ROOT,
  });
};

const movePackageToLocalPackage = async (originalPackageName: string, localPackageName: string) => {
  // Make sure we load the version local to node_modules, _not_ the local version on disk,
  // so we can ensure the build process is accurate and working correctly
  rimraf.sync(`${NODE_MODULES}/${localPackageName}`);

  await callExec(`mkdir -p ./node_modules`, {
    cwd: ROOT,
  });

  [
    '.ignored_eslint',
    '.ignored_eslint-config-prettier',
    '.ignored_eslint-plugin-prefer-arrow',
    '.ignored_eslint-plugin-jsdoc',
  ].forEach(name => {
    rimraf.sync(path.resolve(originalPackageName, `node_modules/${name}`));
  });

  await callExec(`cp -r ${originalPackageName} ${NODE_MODULES}/${localPackageName}`, {
    cwd: originalPackageName,
  });
  
  const packageJSON = JSON.parse(fs.readFileSync(`${NODE_MODULES}/${localPackageName}/package.json`, 'utf-8'));
  packageJSON.name = localPackageName;
  fs.writeFileSync(`${NODE_MODULES}/${localPackageName}/package.json`, JSON.stringify(packageJSON, null, 2));
}

export const bundle = async () => {
  const localNameForPackage = 'upscaler-for-esbuild'
  await updateTFJSVersion(ROOT);
  await movePackageToLocalPackage(UPSCALER_PATH, localNameForPackage);

  recreateNodeModuleFolder('@upscalerjs-for-esbuild');

  const models = getAllAvailableModelPackages();
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const MODEL_PATH = path.join(ROOT, '../../../models', model)
    await movePackageToLocalPackage(MODEL_PATH, `@upscalerjs-for-esbuild/${model}`);
  }

  rimraf.sync(DIST);
  copyFixtures(DIST, false);
  const entryFiles = path.join(ROOT, 'src/index.js');
  try {
    esbuild.buildSync({
      entryPoints: [entryFiles],
      bundle: true,
      loader: {
        '.png': 'file',
      },
      outdir: DIST,
    });
    fs.copyFileSync(path.join(ROOT, 'src/index.html'), path.join(DIST,'index.html'))
  } catch (err) {
    console.error(err);
  }
}
