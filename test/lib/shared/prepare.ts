import { Dependency } from '@schemastore/package';
import fs from 'fs';
import { mkdirpSync, writeFileSync } from 'fs-extra';
import path from 'path';
import rimraf from 'rimraf';
import findAllPackages from '../../../scripts/package-scripts/find-all-packages';
import { getPackageJSON, writePackageJSON } from '../../../scripts/package-scripts/utils/packages';
import callExec from "../utils/callExec";
import tar from 'tar';
import crypto from 'crypto';
import { withTmpDir } from '../../../scripts/package-scripts/utils/withTmpDir';
import asyncPool from "tiny-async-pool";

const ROOT = path.join(__dirname, '../../..');

const CONCURRENT_ASYNC_THREADS = 1;

export const getHashedName = (data: string) => `${crypto.createHash('md5').update(data).digest("hex")}`;

export const installNodeModules = (cwd: string, silent = true) => callExec(`npm install ${silent ? '--silent' : ''} --no-audit`, {
  cwd,
});

const installRemoteDependencies = async (dest: string, remoteDependencies: Dependency, verbose = false) => {
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
      console.log(cmd);
    }
    await callExec(cmd, {
      cwd: dest,
    })
  }
};

const installLocalDependencies = async (dest: string, dependencies: DependencyDefinition[], localDependencies: Dependency, {
  verbose = false,
}: {
  verbose?: boolean;
} = {}) => {
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

    if (verbose) {
      console.log(`**** Installing local dependency ${name}, ${i + 1} of ${dependencies.length}`);
    }
    const moduleFolder = path.resolve(NODE_MODULES, name);
    await installLocalPackageWithNewName(src, moduleFolder, name, { verbose });
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

type DependencyDefinition = {
  src: string;
  name: string;
}
export const installLocalPackages = async (dest: string, dependencies: DependencyDefinition[], {
  verbose = false,
}: {
  verbose?: boolean;
} = {}) => {
  if (dest.endsWith('node_modules')) {
    throw new Error(`Your destination ends with "node_modules", but it should be the root folder (without ending in node_modules). ${dest}`)
  }
  const { localDependencies, remoteDependencies } = buildDependencyTree(dependencies);

  if (verbose) {
    console.log('Installing remote dependencies');
  }
  await installRemoteDependencies(dest, remoteDependencies);

  if (verbose) {
    console.log('Installing local dependencies');
  }
  await installLocalDependencies(dest, dependencies, localDependencies, { verbose });
}

const installLocalPackageWithNewName = async (src: string, dest: string, localNameForPackage: string, {
  verbose = false,
}: {
  verbose?: boolean;
} = {}) => {
  const timer = setTimeout(() => {
    console.log(`It is taking a long time to install the local package ${localNameForPackage}`);
  }, 10000);
  await installLocalPackage(src, dest, { verbose });
  clearTimeout(timer);
  const packageJSON = getPackageJSON(dest)
  packageJSON.name = localNameForPackage;
  writePackageJSON(dest, packageJSON)
}

const npmPack = async (src: string): Promise<string> => {
  let outputName = '';
  await callExec('npm pack --quiet', {
    cwd: src,
  }, chunk => {
    outputName = chunk;
  });

  outputName = outputName.trim();

  if (!outputName.endsWith('.tgz')) {
    throw new Error(`Unexpected output name: ${outputName}`)
  }

  return path.resolve(src, outputName);
};

const pnpmPack = async (src: string, target: string, {
  verbose = false,
}: {
  verbose?: boolean;
} = {}): Promise<string> => {
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

  return path.resolve(src, outputName);
};

const unTar = (cwd: string, fileName: string) => tar.extract({
  file: fileName,
  cwd,
});

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

// sometimes npm pack fails with a 'package/models/group1-shard1of1.bin: truncated gzip input' error. Try a few times before failing
const MAX_ATTEMPTS = 2;
const packAndTar = async (src: string, target: string, {
  verbose = false,
}: {
  verbose?: boolean;
} = {}, attempts = 0): Promise<string> => {
  try {
    const packedFile = await npmPack(src);
    if (!fs.existsSync(packedFile)) {
      throw new Error(`npm pack failed for ${src}`)
    }
    const tmpPackedFile = path.resolve(target, packedFile);
    fs.renameSync(packedFile, tmpPackedFile);
    await new Promise(resolve => setTimeout(resolve, 1));
    await unTar(target, packedFile);
    const unpackedFolder = path.resolve(target, 'package');
    // ensure the unpacked folder exists
    if (!fs.existsSync(unpackedFolder)) {
      throw new Error(`Tried to unpack tar file in src ${packedFile} but the output is not present.`)
    }
    return unpackedFolder;
  } catch (err: unknown) {
    if (attempts >= MAX_ATTEMPTS - 1) {
      throw new Error(`Failed to pack and tar after ${attempts} attempts ${err instanceof Error ? `Error message: ${err.message}` : ''}`);
    }

    if (verbose) {
      const remainingAttempts = MAX_ATTEMPTS - attempts - 1;
      console.log(`Failed to pack and tar, attempts: ${attempts + 1}, remaining attempts: ${remainingAttempts}`);
    }

    return packAndTar(src, target, { verbose }, attempts + 1);
  }
}

export const installLocalPackage = async (src: string, dest: string, {
  verbose = false,
}: {
  verbose?: boolean;
} = {}) => {
  rimraf.sync(dest);
  await withTmpDir(async tmp => {
    try {
      const unpackedFolder = await packAndTar(src, tmp, { verbose });

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

export interface Import {
  packageName: string;
  paths: { name: string; path: string; }[];
}

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
