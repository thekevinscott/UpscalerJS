import fs from 'fs';
import path from 'path';
import esbuild from 'esbuild';
import { copyFixtures } from '../utils/copyFixtures';
import { installModels, installNodeModules, installUpscaler } from '../shared/prepare';
import { LOCAL_UPSCALER_NAME, LOCAL_UPSCALER_NAMESPACE } from './constants';

const ROOT = path.join(__dirname);
export const DIST = path.join(ROOT, '/dist');
const NODE_MODULES = path.join(ROOT, '/node_modules');

// const moveUpscalerToLocallyNamedPackage = async (localNameForPackage: string) => {
//   // Make sure we load the version local to node_modules, _not_ the local version on disk,
//   // so we can ensure the build process is accurate and working correctly
//   rimraf.sync(`${NODE_MODULES}/${localNameForPackage}`);

//   await callExec(`mkdir -p ./node_modules`, {
//     cwd: ROOT,
//   });

//   rimraf.sync(path.resolve(UPSCALER_PATH, 'node_modules/.ignored_eslint'));
//   rimraf.sync(path.resolve(UPSCALER_PATH, 'node_modules/.ignored_eslint-config-prettier'));
//   rimraf.sync(path.resolve(UPSCALER_PATH, 'node_modules/.ignored_eslint-plugin-prefer-arrow'));
//   rimraf.sync(path.resolve(UPSCALER_PATH, 'node_modules/.ignored_eslint-plugin-jsdoc'));

//   await callExec(`cp -r ${UPSCALER_PATH} ${NODE_MODULES}/${localNameForPackage}`, {
//     cwd: UPSCALER_PATH,
//   });
  
//   const packageJSON = JSON.parse(fs.readFileSync(`${NODE_MODULES}/${localNameForPackage}/package.json`, 'utf-8'));
//   packageJSON.name = localNameForPackage;
//   fs.writeFileSync(`${NODE_MODULES}/${localNameForPackage}/package.json`, JSON.stringify(packageJSON, null, 2));
// }

export const bundle = async () => {
  await installNodeModules(ROOT);
  await installUpscaler(path.resolve(NODE_MODULES, LOCAL_UPSCALER_NAME), LOCAL_UPSCALER_NAME);
  await installModels(path.resolve(NODE_MODULES, LOCAL_UPSCALER_NAMESPACE), ['esrgan-legacy', 'pixel-upsampler'])
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
