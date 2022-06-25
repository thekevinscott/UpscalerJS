import * as fs from 'fs';
import * as path from 'path';
import * as esbuild from 'esbuild';
import * as rimraf from 'rimraf';
import { copyFixtures } from '../utils/copyFixtures';
import { updateTFJSVersion } from '../utils/updateTFJSVersion';
import buildModels from '../../../scripts/package-scripts/build-model';
import { getAllAvailableModelPackages } from '../utils/getAllAvailableModels';

const ROOT = path.join(__dirname);
export const DIST = path.join(ROOT, '/dist');

export const bundle = async () => {
  await updateTFJSVersion(ROOT);
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
