import callExec from "../utils/callExec";
import * as fs from 'fs';
import * as path from 'path';
import * as rimraf from 'rimraf';

const ROOT = path.join(__dirname);
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


  [
    ['cjs', `${NODE_MODULES}/${localNameForPackage}/dist/node/cjs/index.js`],
  ].forEach(([key, file]) => {
    const contents = fs.readFileSync(file, 'utf-8');
    fs.writeFileSync(file, `${contents}\nconsole.log('${key}');`)
  });
}

export const prepareScriptBundleForCJS = async () => {
  const localNameForPackage = 'upscale-for-node';

  await callExec('yarn', {
    cwd: ROOT,
  });

  moveUpscalerToLocallyNamedPackage(localNameForPackage);
};

type Stdout = (data: string) => void;
export const executeNodeScript = async (file: string, stdout?: Stdout) => {
  await callExec(`node "./src/${file}"`, {
    cwd: ROOT
  }, stdout);
};
