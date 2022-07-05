import fs from 'fs';
import os from 'os';
import path from 'path';
import rimraf from 'rimraf';
import callExec from "../utils/callExec";

const ROOT = path.join(__dirname, '../../..');
const UPSCALER_PATH = path.join(ROOT, 'packages/upscalerjs');
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
  await callExec('npm install', {
    cwd,
  });
}

// dest should be the full path to the upscaler package itself, e.g.:
// /users/foo/upscalerjs/test/lib/node/node_modules/local-upscaler
export const installUpscaler = async (dest: string) => {
  await installLocalPackage(UPSCALER_PATH, dest);
};

const npmPack = async (cwd: string): Promise<string> => {
  let outputName = '';
  await callExec('npm pack', {
    cwd,
  }, chunk => {
    outputName = chunk;
  });

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
