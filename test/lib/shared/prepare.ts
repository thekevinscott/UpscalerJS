import { Dependency } from '@schemastore/package';
import fs from 'fs';
import { mkdirpSync, writeFileSync } from 'fs-extra';
import path from 'path';
import rimraf from 'rimraf';
import findAllPackages from '../../../scripts/package-scripts/find-all-packages';
import { getPackageJSON, writePackageJSON } from '../../../scripts/package-scripts/utils/packages';
import callExec from "../utils/callExec";
import crypto from 'crypto';
import tar from 'tar';
import { withTmpDir } from '../../../scripts/package-scripts/utils/withTmpDir';

const ROOT = path.join(__dirname, '../../..');

export const getHashedName = (data: string) => `${crypto.createHash('md5').update(data).digest("hex")}`;

export const installNodeModules = (cwd: string) => callExec('npm install --silent --no-audit', {
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
export const installLocalPackages = async (dest: string, dependencies: DependencyDefinition[]) => {
  if (dest.endsWith('node_modules')) {
    throw new Error(`Your destination ends with "node_modules", but it should be the root folder (without ending in node_modules). ${dest}`)
  }
  const { localDependencies, remoteDependencies } = buildDependencyTree(dependencies);

  await installRemoteDependencies(dest, remoteDependencies);
  await installLocalDependencies(dest, dependencies, localDependencies);
}

const installLocalPackageWithNewName = async (src: string, dest: string, localNameForPackage: string) => {
  await installLocalPackage(src, dest);
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
const MAX_ATTEMPTS = 3;
const packAndTar = async (src: string, tmp: string, attempts = 0): Promise<string> => {
  try {
    const packedFile = await npmPack(src);
    if (!fs.existsSync(packedFile)) {
      throw new Error(`npm pack failed for ${src}`)
    }
    const tmpPackedFile = path.resolve(tmp, packedFile);
    fs.renameSync(packedFile, tmpPackedFile);
    await new Promise(resolve => setTimeout(resolve, 1));
    await unTar(tmp, packedFile);
    const unpackedFolder = path.resolve(tmp, 'package');
    // ensure the unpacked folder exists
    if (!fs.existsSync(unpackedFolder)) {
      throw new Error(`Tried to unpack tar file in src ${packedFile} but the output is not present.`)
    }
    return unpackedFolder;
  } catch (err) {
    if (attempts >= MAX_ATTEMPTS) {
      console.error(err);
      throw new Error(`Failed to pack and tar after ${attempts} attempts`);
    }

    return packAndTar(src, tmp, attempts + 1);
  }
}

export const installLocalPackage = async (src: string, dest: string) => {
  rimraf.sync(dest);
  await withTmpDir(async tmp => {
    const unpackedFolder = await packAndTar(src, tmp);

    const destParent = path.resolve(dest, '..');
    mkdirpSync(destParent);

    await callExec(`mv ${unpackedFolder} ${dest}`, {
      cwd: tmp,
    });
  })
};

export interface Import {
  packageName: string;
  paths: { name: string; path: string; }[];
}

export const writeIndex = async (target: string, upscalerName: string, imports: Import[] = []) => {
  writeFileSync(target, `
import * as tf from '@tensorflow/tfjs';
import ESRGANSlim from '@upscalerjs-for-esbuild/esrgan-slim';
import Upscaler from 'upscaler-for-esbuild';
import pixelUpsampler2x from '@upscalerjs-for-esbuild/pixel-upsampler/2x';
import pixelUpsampler3x from '@upscalerjs-for-esbuild/pixel-upsampler/3x';
import pixelUpsampler4x from '@upscalerjs-for-esbuild/pixel-upsampler/4x';
import ESRGANDiv2K2x from '@upscalerjs-for-esbuild/esrgan-legacy/div2k/2x';
import ESRGANDiv2K3x from '@upscalerjs-for-esbuild/esrgan-legacy/div2k/3x';
import ESRGANDiv2K4x from '@upscalerjs-for-esbuild/esrgan-legacy/div2k/4x';
import ESRGANPSNR from '@upscalerjs-for-esbuild/esrgan-legacy/psnr-small';
import ESRGANGANS from '@upscalerjs-for-esbuild/esrgan-legacy/gans';
import flower from '../../../__fixtures__/flower-small.png';
window.tf = tf;
window.flower = flower;
window.Upscaler = Upscaler;
window['esrgan-slim'] = {
  'index': ESRGANSlim,
};
window['pixel-upsampler'] = {
  '2x': pixelUpsampler2x,
  '3x': pixelUpsampler3x,
  '4x': pixelUpsampler4x,
};
window['esrgan-legacy'] = {
  'div2k/2x': ESRGANDiv2K2x,
  'div2k/3x': ESRGANDiv2K3x,
  'div2k/4x': ESRGANDiv2K4x,
  'psnr-small': ESRGANPSNR,
  'gans': ESRGANGANS,
};
document.title = document.title + ' | Loaded';
document.body.querySelector('#output').innerHTML = document.title;

  `,
    'utf-8');
  const importCommands = imports.map(({ paths }) => paths.map(({ path }) => {
    return `import _${getHashedName(path)} from '${path}';`;
  }).join('\n')).join('\n');
  const windowDefinitions = imports.map(({ packageName: packageName, paths }) => `window['${packageName}'] = {
${paths.map(({ path, name }) => `  ['${name}']: _${getHashedName(path)},`).join('\n')}
}`).join('\n');
  const contents = `
import * as tf from '@tensorflow/tfjs';
import Upscaler from '${upscalerName}';
import flower from '../../../__fixtures__/flower-small.png';

/*** Auto-generated import commands ***/
${importCommands}

/*** Auto-generated window definition commands ***/
${windowDefinitions}

window.tfjs = tf;
window.flower = flower;
window.Upscaler = Upscaler;
document.title = document.title + '| Loaded';
document.body.querySelector('#output').innerHTML = document.title;
`;
  writeFileSync(target, contents.trim(), 'utf-8');
};
