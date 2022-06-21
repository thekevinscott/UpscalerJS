import * as fs from 'fs';
import * as path from 'path';
import * as esbuild from 'esbuild';
import * as rimraf from 'rimraf';
import { copyFixtures } from '../utils/copyFixtures';
import { updateTFJSVersion } from '../utils/updateTFJSVersion';

const ROOT = path.join(__dirname);
export const DIST = path.join(ROOT, '/dist');

export const bundle = async () => {
  await updateTFJSVersion(ROOT);
  rimraf.sync(DIST);
  copyFixtures(DIST, false);
  const entryFiles = path.join(ROOT, 'src/index.js');
  try {
    console.log('Going to build esbuild');
    [
      ROOT,
      path.resolve(ROOT, 'node_modules'),
      path.resolve(ROOT, 'node_modules/@upscalerjs-for-esbuild'),
      path.resolve(ROOT, 'node_modules/@upscalerjs-for-esbuild/pixel-upsampler'),
      path.resolve(ROOT, 'node_modules/@upscalerjs-for-esbuild/pixel-upsampler/dist'),
      path.resolve(ROOT, 'node_modules/@upscalerjs-for-esbuild/pixel-upsampler/dist/browser'),
      path.resolve(ROOT, 'node_modules/@upscalerjs-for-esbuild/pixel-upsampler/dist/browser/esm'),
    ].forEach(dir => {
    console.log(dir, fs.readdirSync(dir));
    })
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
