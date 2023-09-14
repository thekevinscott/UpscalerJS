import * as url from 'url';
import path from 'path';
import { Bundler } from '../../../utils/Bundler.js';
import { getLogLevel, info, verbose } from '@internals/common/logger';
import { getTemplate } from '@internals/common/get-template';
import { getTFJSVersion } from '../../../utils/get-tfjs-version.js';
import { exists, writeFile } from '@internals/common/fs';
import { getPackagesForRegistry } from '../../../utils/get-packages-for-registry.js';
import { npmInstall } from '@internals/common/npm';
import { TMP_DIR } from '@internals/common/constants';
import { RegistryPackage } from '@internals/registry';
import { pluralize } from '@internals/common/pluralize';
import { rimraf } from 'rimraf';

/***
 * Constants
 */

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const NODE_ROOT_FOLDER = path.join(__dirname, '..');
const NODE_TEMPLATES_DIR = path.resolve(NODE_ROOT_FOLDER, '_templates');
export const NODE_WORK_DIR = path.join(TMP_DIR, 'work-dirs', 'node');
export const NODE_DIST_FOLDER = path.join(NODE_ROOT_FOLDER, 'dist');
const PACKAGES = getPackagesForRegistry();

/***
 * Functions
 */

const writePackageJSON = async (outputDir: string) => {
  const packages = await PACKAGES;
  const tfjsVersion = await getTFJSVersion();
  const dependencies = JSON.stringify(packages.reduce((obj, { name }) => ({
    ...obj,
    [name]: 'latest',
  }), {
    "upscaler": "latest",
    "@tensorflow/tfjs-node": tfjsVersion,
    "@tensorflow/tfjs-node-gpu": tfjsVersion,
  }), null, 2);
  const contents = await getTemplate(path.resolve(NODE_TEMPLATES_DIR, 'package.json.ejs'), {
    dependencies,
  });
  const packageJSONPath = path.resolve(outputDir, 'package.json');
  await writeFile(packageJSONPath, contents);
  return packageJSONPath;
};

const clearExistingNodeModules = async (outDir: string, packages: RegistryPackage[]) => {
  const nodeModulesPath = path.resolve(outDir, 'node_modules');
  const packageNames = pluralize(packages.map(p => p.name), 'and');
  if (await exists(nodeModulesPath)) {
    verbose(`Clearing existing node_modules of packages: ${packageNames}...`);;
    await Promise.all(packages.map(async ({ name }) => {
      const nodeModulePath = path.resolve(nodeModulesPath, name);
      if (await exists(nodeModulePath)) {
        return rimraf(nodeModulePath);
      }
    }));
    verbose(`Cleared existing node_modules of packages: ${packageNames}...`);;
  }
}

export class NodeBundler extends Bundler {
  port = 0;
  packages = PACKAGES;

  get name() { // skipcq: JS-0105
    return 'node bundler';
  }

  async bundle(registryURL: string) {
    info('Bundling Node...');
    await writePackageJSON(this.outDir);
    const logLevel = getLogLevel();
    const isSilent = logLevel !== 'verbose';

    await clearExistingNodeModules(this.outDir, await this.packages);
    await npmInstall(this.outDir, {
      isSilent,
      registryURL,
    });

    info('Bundled Node successfully');
  }
}

