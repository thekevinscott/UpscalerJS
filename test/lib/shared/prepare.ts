import fs from 'fs';
import os from 'os';
import path from 'path';
import rimraf from 'rimraf';
import { getPackageJSON, writePackageJSON } from '../../../scripts/package-scripts/utils/packages';
import callExec from "../utils/callExec";

const ROOT = path.join(__dirname, '../../..');
const UPSCALER_PATH = path.join(ROOT, 'packages/upscalerjs');
const MODELS_PATH = path.join(ROOT, 'models');
// const moveUpscalerToLocallyNamedPackage = async (localNameForPackage: string) => {
//   // Make sure we load the version local to node_modules, _not_ the local version on disk,
//   // so we can ensure the build process is accurate and working correctly
//   rimraf.sync(`${NODE_MODULES}/${localNameForPackage}`);


//   await callExec(`cp -r ${UPSCALER_PATH} ${NODE_MODULES}`, {
//     cwd: UPSCALER_PATH,
//   });

//   await callExec(`mv ${NODE_MODULES}/upscalerjs ${NODE_MODULES}/${localNameForPackage}`, {
//     cwd: UPSCALER_PATH,
//   });
  
//   const packageJSON = JSON.parse(fs.readFileSync(`${NODE_MODULES}/${localNameForPackage}/package.json`, 'utf-8'));
//   packageJSON.name = localNameForPackage;
//   fs.writeFileSync(`${NODE_MODULES}/${localNameForPackage}/package.json`, JSON.stringify(packageJSON, null, 2));
// }

export const installNodeModules = async (cwd: string) => {
  await callExec('npm install --quiet', {
    cwd,
  });
}

// dest should be the full path to the upscaler package itself, e.g.:
// /users/foo/upscalerjs/test/lib/node/node_modules/local-upscaler
export const installUpscaler = async (dest: string, name: string) => {
  await installLocalPackageWithNewName(UPSCALER_PATH, dest, name);
};

export const installModels = async (rootDest: string, modelNames: string[]) => {
  await Promise.all(modelNames.map(async modelName => {
    const src = path.resolve(MODELS_PATH, modelName);
    const dest = path.resolve(rootDest, modelName);
    await installLocalPackageWithNewName(src, dest, modelName);
  }));
};

const installLocalPackageWithNewName = async (src: string, dest: string, localNameForPackage: string) => {
  await installLocalPackage(src, dest);
  const packageJSON = getPackageJSON(dest)
  packageJSON.name = localNameForPackage;
  writePackageJSON(dest, packageJSON)
}

const npmPack = async (cwd: string): Promise<string> => {
  let outputName = '';
  await callExec('npm pack --silent --quiet', {
    cwd,
  }, chunk => {
    outputName = chunk;
  });

  console.log('PACK HAS DONE');

  outputName = outputName.trim();

  if (!outputName.endsWith('.tgz')) {
    throw new Error(`Unexpected output name: ${outputName}`)
  }

  return outputName;
};

const unTar = async (cwd: string, fileName: string) => {
  await callExec(`tar zxvf ${fileName}`, {
    cwd,
  });
}

export const installLocalPackage = async (src: string, dest: string) => {
  rimraf.sync(dest);
  const packedFile = await npmPack(src);
  const tmp = os.tmpdir();
  const tmpPackedFile = path.resolve(tmp, packedFile);
  fs.renameSync(path.resolve(src, packedFile), tmpPackedFile)
  await unTar(tmp, packedFile);
  await callExec(`mv package ${dest}`, {
    cwd: tmp,
  });
}
