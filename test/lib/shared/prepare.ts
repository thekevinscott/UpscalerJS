import { Dependency } from '@schemastore/package';
import { remove, existsSync, mkdirpSync, writeFileSync } from 'fs-extra';
import path from 'path';
import rimraf from 'rimraf';
import findAllPackages from '../../../scripts/package-scripts/find-all-packages';
import { getPackageJSON, writePackageJSON } from '../../../scripts/package-scripts/utils/packages';
import callExec from "../utils/callExec";
import tar from 'tar';
import crypto from 'crypto';
import { withTmpDir } from '../../../scripts/package-scripts/utils/withTmpDir';
import asyncPool from "tiny-async-pool";
import { ROOT_DIR } from '../../../scripts/package-scripts/utils/constants';

/***
 * Types
 */

export interface Opts {
  verbose?: boolean;
  usePNPM?: boolean;
}

type DependencyDefinition = {
  src: string;
  name: string;
}

export interface Import {
  packageName: string;
  paths: { name: string; path: string; }[];
}

/***
 * Constants
 */

const CONCURRENT_ASYNC_THREADS = 1;

const PACKAGE_PATHS: Map<string, string> = findAllPackages(ROOT_DIR).map(packagePath => path.resolve(ROOT_DIR, packagePath)).reduce((map, packagePath) => {
  const { name } = getPackageJSON(packagePath);
  if (name) {
    map.set(name, packagePath);
  }
  return map;
}, new Map<string, string>());

/***
 * Functions
 */
export const getHashedName = (data: string) => `${crypto.createHash('md5').update(data).digest("hex")}`;

export const installNodeModules = (cwd: string, { verbose = false}: Opts = {}) => callExec(`npm install ${verbose ? '' : '--silent'} --no-audit`, {
  cwd,
});

const installRemoteDependencies = async (dest: string, remoteDependencies: Dependency, { verbose = false }: Opts = {}) => {
  if (Object.keys(remoteDependencies).length) {
    const dependenciesToInstall = Object.entries(remoteDependencies).map(([dependency, version]) => {
      return `${dependency}@${version}`;
    }).join(' ');
    const cmd = [
      'npm install --no-save',
      verbose === false ? '--silent --no-audit' : '',
      dependenciesToInstall,
    ].filter(Boolean).join(' ')
    if (verbose) {
      console.log('NPM INSTALL CMD:', cmd);
    }
    await callExec(cmd, {
      cwd: dest,
    })
  }
};

const installLocalDependencies = async (dest: string, dependencies: DependencyDefinition[], localDependencies: Dependency, opts: Opts = {}) => {
  const localDependenciesKeys = Object.keys(localDependencies);
  for (let i = 0; i < localDependenciesKeys.length; i++) {
    const localDependency = localDependenciesKeys[i];
    const localDependencyFolder = findMatchingFolder(localDependency);
    dependencies.push({
      src: localDependencyFolder,
      name: localDependency,
    });
  }

  const NODE_MODULES = path.resolve(dest, 'node_modules');

  const progress = async (i: number) => {
    const { src, name } = dependencies[i];

    if (opts.verbose) {
      console.log(`**** Installing local dependency ${name}, ${i + 1} of ${dependencies.length} total dependenc${dependencies.length === 1 ? 'y' : 'ies'}`);
    }
    const moduleFolder = path.resolve(NODE_MODULES, name);
    await installLocalPackageWithNewName(src, moduleFolder, name, opts);
  };

  for await (const _ of asyncPool(CONCURRENT_ASYNC_THREADS, Array(dependencies.length).fill('').map((_, i) => i), progress)) { }
};

const buildDependencyTree = (dependencies: DependencyDefinition[]): {
  localDependencies: Dependency;
  remoteDependencies: Dependency;
} => dependencies.reduce((collectedDependencies, { src }) => {
  const { localDependencies, remoteDependencies, } = collectAllDependencies(src);
  return {
    localDependencies: {
      ...collectedDependencies.localDependencies,
      ...localDependencies,
    },
    remoteDependencies: {
      ...collectedDependencies.remoteDependencies,
      ...remoteDependencies,
    }
  }

}, {
  localDependencies: {},
  remoteDependencies: {},
});

export const installLocalPackages = async (dest: string, dependencies: DependencyDefinition[], opts: Opts = {}) => {
  if (dest.endsWith('node_modules')) {
    throw new Error(`Your destination ends with "node_modules", but it should be the root folder (without ending in node_modules). ${dest}`)
  }
  const { localDependencies, remoteDependencies } = buildDependencyTree(dependencies);

  if (opts.verbose) {
    console.log('Installing remote dependencies');
  }
  await installRemoteDependencies(dest, remoteDependencies, opts);

  if (opts.verbose) {
    console.log('Installing local dependencies');
  }
  await installLocalDependencies(dest, dependencies, localDependencies, opts);
}

const installLocalPackageWithNewName = async (src: string, dest: string, localNameForPackage: string, opts: Opts = {}) => {
  const timeoutTime = 12000;
  const timer = setTimeout(() => {
    console.log(`It is taking over ${timeoutTime}ms to install the local package ${localNameForPackage}`);
  }, timeoutTime);
  await installLocalPackage(src, dest, opts);
  clearTimeout(timer);
  const packageJSON = getPackageJSON(dest)
  packageJSON.name = localNameForPackage;
  writePackageJSON(dest, packageJSON)
}

const npmPack = async (src: string, { verbose }: Opts = {}): Promise<string> => {
  let outputName = '';
  await callExec(`npm pack --ignore-scripts ${verbose ? '' : '--quiet'}`, {
    cwd: src,
  }, chunk => {
    outputName = chunk;
  });

  outputName = outputName.trim();

  if (!outputName.endsWith('.tgz')) {
    throw new Error(`Unexpected output name: ${outputName}`)
  }

  const pathToPackedFile = path.resolve(src, outputName);

  if (!existsSync(pathToPackedFile)) {
    throw new Error(`npm pack failed for ${src}`)
  }

  await new Promise(resolve => setTimeout(resolve, 1));

  return pathToPackedFile;
};

const pnpmPack = async (src: string, target: string, { verbose, }: Opts = {}): Promise<string> => {
  let outputName = '';
  await callExec(`pnpm pack --pack-destination ${target} ${verbose === false ? '--silent' : ''}`, {
    cwd: src,
  }, chunk => {
    outputName = chunk;
  });

  outputName = outputName.trim();

  if (!outputName.endsWith('.tgz')) {
    throw new Error(`Unexpected output name: ${outputName}`)
  }

  const packedFile = path.resolve(src, outputName);
  if (!existsSync(packedFile)) {		
    throw new Error(`pnpm pack failed for ${src}`)		
  }

  return packedFile;
};

const unTar = async (target: string, fileName: string, {
  expectedFolderName = 'package',
  removeTarFile = true,
}: {
  expectedFolderName?: string;
  removeTarFile?: boolean;
} = {}) => {
  await tar.extract({
    file: fileName,
    cwd: target,
  });
  const unpackedFolder = path.resolve(target, expectedFolderName);

  // ensure the unpacked folder exists
  if (!existsSync(unpackedFolder)) {
    throw new Error(`Tried to unpack tar file ${fileName} but the output is not present.`)
  }

  if (removeTarFile) {
    await remove(fileName);
  }

  return unpackedFolder;
};

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
  const packagePath = PACKAGE_PATHS.get(dependency);
  if (packagePath) {
    return packagePath;
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

// sometimes npm pack fails with a 'package/models/group1-shard1of1.bin: truncated gzip input' error. Try a few times before failing
const MAX_ATTEMPTS = 2;
const packAndTar = async (src: string, target: string, opts: Opts & { attempts?: number; }= {}): Promise<string> => {
  const { verbose, usePNPM, attempts = 0 } = opts;
  try {
    const pathToPackedFile = await (usePNPM ? pnpmPack(src, target, opts) : npmPack(src, opts));
    return unTar(target, pathToPackedFile);
  } catch (err: unknown) {
    if (attempts >= MAX_ATTEMPTS) {
      throw new Error(`Failed to pack and tar after ${attempts} attempts ${err instanceof Error ? `Error message: ${err.message}` : ''}`);
    }

    if (verbose) {
      const remainingAttempts = MAX_ATTEMPTS - attempts - 1;
      console.log(`Failed to pack and tar, attempts: ${attempts + 1}, remaining attempts: ${remainingAttempts}`);
    }

    return packAndTar(src, target, { ...opts, attempts: attempts + 1 });
  }
}

export const installLocalPackage = async (src: string, dest: string, opts: Opts = {}) => {
  rimraf.sync(dest);
  await withTmpDir(async tmp => {
    try {
      const unpackedFolder = await packAndTar(src, tmp, opts);

      const destParent = path.resolve(dest, '..');
      mkdirpSync(destParent);

      await callExec(`mv ${unpackedFolder} ${dest}`, {
        cwd: tmp,
      });
    } catch (err: unknown) {
      throw new Error(`Failed to pack local package ${src}. ${err instanceof Error ? `Error was: ${err.message}` : ''}`);
    }
  })
};

export const writeIndex = (target: string, upscalerName: string, imports: Import[] = []) => {
  const importCommands = imports.map(({ paths }) => paths.map(({ path }) => {
    return `import _${getHashedName(path)} from '${path}';`;
  }).join('\n')).join('\n');
  const windowDefinitions = imports.map(({ packageName: packageName, paths }) => `window['${packageName}'] = {
${paths.map(({ path, name }) => `  '${name}': _${getHashedName(path)},`).join('\n')}
}`).join('\n');
  const contents = `
import * as tf from '@tensorflow/tfjs';
import Upscaler from '${upscalerName}';
import flower from '../../../__fixtures__/flower-small.png';

/*** Auto-generated import commands ***/
${importCommands}

/*** Auto-generated window definition commands ***/
${windowDefinitions}

window.tf = tf;
window.flower = flower;
window.Upscaler = Upscaler;
document.title = document.title + '| Loaded';
document.body.querySelector('#output').innerHTML = document.title;
`;
  writeFileSync(target, contents.trim(), 'utf-8');
};
