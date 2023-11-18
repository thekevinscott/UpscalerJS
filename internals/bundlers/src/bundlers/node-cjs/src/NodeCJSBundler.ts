import * as url from 'url';
import path from 'path';
import { Bundler, } from '../../../utils/Bundler.js';
import { getTFJSVersion, } from '../../../utils/get-tfjs-version.js';
import { getPackagesForRegistry, } from '../../../utils/get-packages-for-registry.js';
import { info, } from '@internals/common/logger';
import { getTemplate, } from '@internals/common/get-template';
import { writeFile, } from '@internals/common/fs';
import { pnpmInstall, } from '@internals/common/npm';
import { TMP_DIR, } from '@internals/common/constants';

/***
 * Constants
 */

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const ROOT_FOLDER = path.join(__dirname, '..');
const NODE_TEMPLATES_DIR = path.resolve(ROOT_FOLDER, '_templates');
// export const NODE_WORK_DIR = path.join(TMP_DIR, 'work-dirs', 'node');
// export const DIST_FOLDER = path.join(ROOT_FOLDER, 'dist');
const PACKAGES = getPackagesForRegistry();

/***
 * Functions
 */

const writePackageJSON = async (outputDir: string) => {
  const packages = await PACKAGES;
  const tfjsVersion = await getTFJSVersion();
  const dependencies = JSON.stringify(packages.reduce((obj, { name, }) => ({
    ...obj,
    [name]: 'workspace:*',
  }), {
    "upscaler": "workspace:*",
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

export class NodeCJSBundler extends Bundler {
  port = 0;
  packages = PACKAGES;

  get name() { // skipcq: JS-0105
    return 'node cjs bundler';
  }

  async bundle() {
    info('Bundling Node CJS...');
    await writePackageJSON(this.outDir);

    info(`PNPM Install to ${this.outDir}...`);
    await pnpmInstall(this.outDir, {
      // isSilent,
      // registryURL,
    });

    info('Bundled Node CJS successfully');
  }
}

