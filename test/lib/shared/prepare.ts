import { Dependency } from '@schemastore/package';
import crypto from 'crypto';
import fs from 'fs';
import { mkdirp, mkdirpSync } from 'fs-extra';
import path from 'path';
import rimraf from 'rimraf';
import findAllPackages from '../../../scripts/package-scripts/find-all-packages';
import { getPackageJSON, writePackageJSON } from '../../../scripts/package-scripts/utils/packages';
import callExec from "../utils/callExec";

const ROOT = path.join(__dirname, '../../..');

export const installNodeModules = (cwd: string) => callExec('npm install --quiet', {
  cwd,
});

const installRemoteDependencies = async (dest: string, remoteDependencies: Dependency) => {
  if (Object.keys(remoteDependencies).length) {
    const dependenciesToInstall = Object.entries(remoteDependencies).map(([dependency, version]) => {
      return `${dependency}@${version}`;
    }).join(' ');
    await callExec(`npm install --silent --no-audit --no-save ${dependenciesToInstall}`, {
      cwd: dest,
    })
  }
};

const installLocalDependencies = async (dest: string, dependencies: DependencyDefinition[], localDependencies: Dependency) => {
  const localDependenciesKeys = Object.keys(localDependencies);
  for (let i = 0; i < localDependenciesKeys.length; i++) {
    const localDependency = localDependenciesKeys[i];
    const localDependencyFolder = findMatchingFolder(localDependency);
    dependencies.push({
      src: localDependencyFolder,
      name: localDependency,
    })
  }

  const NODE_MODULES = path.resolve(dest, 'node_modules');

  await Promise.all(dependencies.map(async ({ src, name }) => {
    const moduleFolder = path.resolve(NODE_MODULES, name);
    await installLocalPackageWithNewName(src, moduleFolder, name);
  }))
};

const buildDependencies = (dependencies: DependencyDefinition[]): {
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
export const installLocalPackages = async (dest: string, dependencies: DependencyDefinition[]) => {
  if (dest.endsWith('node_modules')) {
    throw new Error(`Your destination ends with "node_modules", but it should be the root folder (without ending in node_modules). ${dest}`)
  }
  const { localDependencies, remoteDependencies } = buildDependencies(dependencies);

  await installRemoteDependencies(dest, remoteDependencies);
  await installLocalDependencies(dest, dependencies, localDependencies);
}

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
  const packedFile = await npmPack(src);
  await withTmpDir(async tmp => {
    const tmpPackedFile = path.resolve(tmp, packedFile);
    fs.renameSync(path.resolve(src, packedFile), tmpPackedFile)
    await unTar(tmp, packedFile);
    const unpackedFolder = path.resolve(tmp, 'package');
    // ensure the unpacked folder exists
    if (!fs.existsSync(unpackedFolder)) {
      throw new Error(`Tried to unpack tar file ${packedFile} but the output is not present.`)
    }

    // ensure the destination exists
    const destParent = path.resolve(dest, '..');
    mkdirpSync(destParent);

    await callExec(`mv ${unpackedFolder} ${dest}`, {
      cwd: tmp,
    });
  })
};

type WithTmpDirFn = (tmp: string) => Promise<void>;
const withTmpDir = async (callback: WithTmpDirFn) => {
  const tmp = getTmpDir();
  await callback(tmp)
  rimraf.sync(tmp);
};

const getTmpDir = (): string => {
  const folder = path.resolve(ROOT, 'tmp', getCryptoName(`${Math.random()}`));
  mkdirpSync(folder);
  return folder;
};

export const getCryptoName = (contents: string) => crypto.createHash('md5').update(contents).digest('hex');
