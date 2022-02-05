import * as fs from 'fs';
import * as path from 'path';
import * as esbuild from 'esbuild';
import * as rimraf from 'rimraf';
import { copyFixtures } from '../utils/copyFixtures';
import { updateTFJSVersion } from '../utils/updateTFJSVersion';
import callExec from '../utils/callExec';

const ROOT = path.join(__dirname);
export const DIST = path.join(ROOT, '/dist');
const NODE_MODULES = path.join(ROOT, '/node_modules');
const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs')

const moveUpscalerToLocallyNamedPackage = async (localNameForPackage: string) => {
  // Make sure we load the version local to node_modules, _not_ the local version on disk,
  // so we can ensure the build process is accurate and working correctly
  rimraf.sync(`${NODE_MODULES}/${localNameForPackage}`);

  await callExec(`cp -r ${UPSCALER_PATH} ${NODE_MODULES}`, {
    cwd: UPSCALER_PATH,
  });

  await callExec(`mv ${NODE_MODULES}/upscalerjs ${NODE_MODULES}/${localNameForPackage}`, {
    cwd: UPSCALER_PATH,
  });
  
  const packageJSON = JSON.parse(fs.readFileSync(`${NODE_MODULES}/${localNameForPackage}/package.json`, 'utf-8'));
  packageJSON.name = localNameForPackage;
  fs.writeFileSync(`${NODE_MODULES}/${localNameForPackage}/package.json`, JSON.stringify(packageJSON, null, 2));
}

export const bundle = async () => {
  const localNameForPackage = 'upscaler-for-esbuild'
  await updateTFJSVersion(ROOT);
  await moveUpscalerToLocallyNamedPackage(localNameForPackage);
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
