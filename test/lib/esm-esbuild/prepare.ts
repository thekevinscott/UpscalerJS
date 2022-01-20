import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import * as esbuild from 'esbuild';
import * as rimraf from 'rimraf';
import handler from 'serve-handler';
import { getTFJSVersion } from '../utils/getTFJSVersion';
import callExec from '../utils/callExec';
import { copyFixtures } from '../utils/copyFixtures';

const ROOT = path.join(__dirname);
export const DIST = path.join(ROOT, '/dist');

const updateTFJSVersion = () => {
  const packageJSONPath = path.join(__dirname, 'package.json');
  const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath, 'utf-8'));
  packageJSON.dependencies['@tensorflow/tfjs'] = getTFJSVersion();
  fs.writeFileSync(packageJSONPath, JSON.stringify(packageJSON, null, 2), 'utf-8');
};

export const bundle = async () => {
  updateTFJSVersion();
  await callExec('yarn install --frozen-lockfile', {
    cwd: ROOT,
  });
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
