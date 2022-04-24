import callExec from "../utils/callExec";
import { mkdirp } from "fs-extra";
import * as fs from 'fs';
import * as path from 'path';
import * as rimraf from 'rimraf';
import crypto from 'crypto';

const ROOT = path.join(__dirname);
const NODE_MODULES = path.join(ROOT, '/node_modules');
const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs')
const UPSCALERJS_ALT_NAME = 'upscaler-for-node';
const MODELS_PATH = path.join(ROOT, '../../../models');
const MODELS_ALT_NAME = '@upscalerjs';

const copySrcToDest = async (src: string, dest: string) => {
  // Make sure we load the version local to node_modules, _not_ the local version on disk,
  // so we can ensure the build process is accurate and working correctly
  const destFolder = path.resolve(NODE_MODULES, dest);
  rimraf.sync(destFolder);

  // await callExec(`rsync -av -q ${src} ${destFolder} --exclude .ignored --exclude src`, {
  //   cwd: src,
  // });

  await callExec(`rm -rf ${path.resolve(src, 'node_modules/.ignored')}`, {
    cwd: ROOT,
  });


  await callExec(`cp -r ${src} ${destFolder}`, {
    cwd: src,
  });

  const packageJSON = JSON.parse(fs.readFileSync(path.resolve(destFolder, 'package.json'), 'utf-8'));
  packageJSON.name = dest;
  fs.writeFileSync(path.resolve(destFolder, 'package.json'), JSON.stringify(packageJSON, null, 2));
}

export const prepareScriptBundleForCJS = async (models: Array<string>) => {
  await callExec('yarn', {
    cwd: ROOT,
  });

  await copySrcToDest(UPSCALER_PATH, UPSCALERJS_ALT_NAME);

  await callExec(`mkdir -p ${path.resolve(NODE_MODULES, MODELS_ALT_NAME)}`, {
    cwd: NODE_MODULES,
  });
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    await copySrcToDest(path.resolve(MODELS_PATH, model), path.join(MODELS_ALT_NAME, model));
  }
};

type Stdout = (data: string) => void;
export const executeNodeScriptFromFilePath = async (file: string, stdout?: Stdout) => {
  await callExec(`node "./src/${file}"`, {
    cwd: ROOT
  }, stdout);
};

export const executeNodeScript = async (contents: string, stdout?: Stdout) => {
  const TMP = path.resolve(ROOT, './tmp');
  mkdirp(TMP);
  const hash = crypto.createHash('md5').update(contents).digest('hex');
  const FILENAME = path.resolve(TMP, `${hash}.js`);
  fs.writeFileSync(FILENAME, contents, 'utf-8');

  await callExec(`node "${FILENAME}"`, {
    cwd: ROOT
  }, stdout);
};
