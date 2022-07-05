import { Dependency } from '@schemastore/package';
import { string } from '@tensorflow/tfjs';
import fs from 'fs';
import os from 'os';
import path from 'path';
import rimraf from 'rimraf';
import findAllPackages from '../../../scripts/package-scripts/find-all-packages';
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

export const installLocalPackages = async (dest: string, dependencies: Array<{ src: string; name: string;}>) => {
  let localDependencies: Dependency = {};
  let remoteDependencies: Dependency = {};
  for (let i = 0; i < dependencies.length; i++) {
    const dep = dependencies[i];
    const subDeps = collectAllDependencies(dep.src);
    localDependencies = {
      ...localDependencies,
      ...subDeps.localDependencies,
    };
    remoteDependencies = {
      ...remoteDependencies,
      ...subDeps.remoteDependencies,
    };
  }

  const localDependenciesKeys = Object.keys(localDependencies);
  for (let i = 0; i < localDependenciesKeys.length; i++) {
    const localDependency = localDependenciesKeys[i];
    const localDependencyFolder = findMatchingFolder(localDependency);
    dependencies.push({
      src: localDependencyFolder,
      name: localDependency,
    })
  }

  if (Object.keys(remoteDependencies).length) { 
    const dependenciesToInstall = Object.entries(remoteDependencies).map(([dependency, version]) => {
      return `${dependency}@${version}`;
    }).join(' ');
    await callExec(`npm install --silent --no-audit --no-save ${dependenciesToInstall}`, {
      cwd: dest,
    })
  }

  for (let i = 0; i < dependencies.length; i++) {
    const { src, name } = dependencies[i];
    installLocalPackageWithNewName(src, path.resolve(dest, 'node_modules', name), name);
// const installLocalPackageWithNewName = async (src: string, dest: string, localNameForPackage: string) => {
    // const subDeps = collectAllDependencies(dep.src);
    // localDependencies = {
    //   ...localDependencies,
    //   ...subDeps.localDependencies,
    // };
    // remoteDependencies = {
    //   ...remoteDependencies,
    //   ...subDeps.remoteDependencies,
    // };
  }
}

// // dest should be the full path to the upscaler package itself, e.g.:
// // /users/foo/upscalerjs/test/lib/node/node_modules/local-upscaler
// export const installUpscaler = async (dest: string, name: string) => {
//   await installLocalPackageWithNewName(UPSCALER_PATH, dest, name);
// };

// export const installModels = async (rootDest: string, modelNames: string[]) => {
//   for (let i = 0; i < modelNames.length; i++ ) {
//     const modelName = modelNames[i];
//     const src = path.resolve(MODELS_PATH, modelName);
//     const dest = path.resolve(rootDest, modelName);
//     await installLocalPackageWithNewName(src, dest, modelName);
//   };
// };

const installLocalPackageWithNewName = async (src: string, dest: string, localNameForPackage: string) => {
  await installLocalPackage(src, dest);
  const packageJSON = getPackageJSON(dest)
  packageJSON.name = localNameForPackage;
  writePackageJSON(dest, packageJSON)
}

const npmPack = async (cwd: string): Promise<string> => {
  let outputName = '';
  await callExec('npm pack --quiet', {
    cwd,
  }, chunk => {
    outputName = chunk;
  });

  outputName = outputName.trim();

  if (!outputName.endsWith('.tgz')) {
    throw new Error(`Unexpected output name: ${outputName}`)
  }

  return outputName;
};

const unTar = async (cwd: string, fileName: string) => {
  await callExec(`tar zxf ${fileName}`, {
    cwd,
  });
}

const getLocalAndRemoteDependencies = (dir: string) => {
  const { dependencies = {} as Dependency } = getPackageJSON(dir);

  const localDependencies: Dependency = {};
  const remoteDependencies: Dependency = {};

  const entries: Array<[string, string]> = Object.entries(dependencies);

  for (let i = 0; i < entries.length; i++) {
    const [dependency, version] = entries[i];
    if (version.startsWith('workspace:')) {
      localDependencies[dependency] = version;
    } else {
      remoteDependencies[dependency] = version;
    }
  }

  return { localDependencies, remoteDependencies };
};

const findMatchingFolder = (dependency: string): string => {
  const packagePaths = findAllPackages(ROOT);

  for (let i = 0; i < packagePaths.length; i++) {
    const packagePath = path.resolve(ROOT, packagePaths[i]);
    const { name } = getPackageJSON(packagePath);
    if (name === dependency) {
      return path.join(packagePath, '..');
    }
  }

  throw new Error(`Could not find local dependency ${dependency}`);
};

const collectAllDependencies = (src: string) => {
  let { localDependencies, remoteDependencies } = getLocalAndRemoteDependencies(src);
  const localDependencyNames = Object.keys(localDependencies);
  for (let i = 0; i < localDependencyNames.length; i++) {
    const localDependency = findMatchingFolder(localDependencyNames[i]);
    const { localDependencies: subLocalDeps, remoteDependencies: subRemoteDeps } = collectAllDependencies(localDependency);
    localDependencies = {
      ...localDependencies,
      ...subLocalDeps,
    };
    remoteDependencies = {
      ...remoteDependencies,
      ...subRemoteDeps,
    };
  }

  return { localDependencies, remoteDependencies };
}

export const installLocalPackage = async (src: string, dest: string) => {
  rimraf.sync(dest);
  // if (installDependencies) {
  //   const { localDependencies, remoteDependencies } = collectAllDependencies(src);
  //   const nodeModules = path.join(dest, '..');

  //   const dependenciesToInstall = Object.entries(remoteDependencies).map(([dependency, version]) => {
  //     return `${dependency}@${version}`;
  //   }).join(' ');

  //   if (dependenciesToInstall) {
  //     // console.log(dependenciesToInstall, 'for', src);
  //     await callExec(`npm install --silent --no-audit --no-save ${dependenciesToInstall}`, {
  //       cwd: path.join(nodeModules, '..'),
  //     })
  //   }

  //   await Promise.all(Object.keys(localDependencies).map(async dependency => {
  //     const localSrc = findMatchingFolder(dependency);
  //     const localDest = path.resolve(nodeModules, dependency);
  //     localPackages.push({ src: localSrc, dest: localDest });
  //   }));
  // }

  // console.log(localPackages, 'for', src)
    // rimraf.sync(dest);
  const packedFile = await npmPack(src);
  // console.log('file has been packed', packedFile);
  // console.log(fs.readdirSync(src))
  const tmp = await getTmpDir();
  const tmpPackedFile = path.resolve(tmp, packedFile);
  fs.renameSync(path.resolve(src, packedFile), tmpPackedFile)
  // console.log('renamed packed file', packedFile)
  await unTar(tmp, packedFile);
  // console.log(fs.readdirSync(tmp))
  // console.log(dest)
  // console.log(fs.readdirSync(path.resolve(dest, '..')))
  await callExec(`mv package ${dest}`, {
    cwd: tmp,
  });
};

const getTmpDir = async (): Promise<string> => new Promise((resolve, reject) => {
  fs.mkdtemp(os.tmpdir(), (err, folder) => {
    if (err) {
      reject(err);
    } else {
      resolve(folder);
    }
  });
});

const l = (dest: string) => {
  const fullPath = dest.trim().endsWith('core') ? path.resolve(dest, '../..') : path.resolve(dest, '..');
  const files = fs.readdirSync(fullPath);

  console.log(fullPath, files);

  if (!files.includes('upscaler-for-esbuild')) {
    throw new Error('STOP')
  }
}
