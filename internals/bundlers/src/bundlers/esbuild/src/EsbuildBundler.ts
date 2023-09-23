import * as url from 'url';
import path from 'path';
import { build as esbuild } from 'esbuild';
import { getPackagesAndModelsForEnvironment } from '@internals/common/models';
import { BundleOptions, Bundler } from '../../../utils/Bundler.js';
import { getLogLevel, info } from '@internals/common/logger';
import { pnpmInstall } from '@internals/common/npm';
import { writeFile } from '@internals/common/fs';
import { getHashedName } from '@internals/common/get-hashed-name';
import { getTemplate as _getTemplate } from '@internals/common/get-template';
import { getTFJSVersion } from '../../../utils/get-tfjs-version.js';
import { removeIfExists } from '../../../utils/remove-if-exists.js';
import { getPackagesForRegistry } from '../../../utils/get-packages-for-registry.js';
import { removePackages } from '../../../shared/remove-packages.js';

/***
 * Constants
 */

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const ESBUILD_ROOT_FOLDER = path.join(__dirname, '..');
const ESBUILD_TEMPLATES_DIR = path.resolve(ESBUILD_ROOT_FOLDER, '_templates');

const packagesWithModels = getPackagesAndModelsForEnvironment('clientside');

const getTemplate = (
  templateName: string,
  args: Parameters<typeof _getTemplate>[1] = {}
) => _getTemplate(path.resolve(ESBUILD_TEMPLATES_DIR, templateName), args);

/***
 * Functions
 */

export const writeIndex = async (target: string, imports: string[] = []) => {
  const contents = await getTemplate('index.js.ejs', {
    dependencies: imports.map(pathName => ({
      name: pathName,
      hashedName: `_${getHashedName(pathName)}`,
    })),
  });
  await writeFile(target, contents.trim());
  return target;
};

const PACKAGES = getPackagesForRegistry();

const writePackageJSON = async (packageJSONPath: string) => {
  const packages = await PACKAGES;
  const tfjsVersion = await getTFJSVersion();
  const dependencies = JSON.stringify(packages.reduce((obj, { name }) => ({
    ...obj,
    [name]: 'latest',
  }), {
    "upscaler": "latest",
    "@tensorflow/tfjs": tfjsVersion,
  }), null, 2);
  const contents = await getTemplate('package.json.ejs', {
    dependencies,
  });
  await writeFile(packageJSONPath, contents);
  return packageJSONPath;
};

export class EsbuildBundler extends Bundler {
  port = 0;
  packages = PACKAGES;

  get name() { // skipcq: JS-0105
    return 'esbuild bundler';
  }

  async bundle(registryURL: string, { skipNpmInstall, keepWorkingFiles }: BundleOptions = {}) {
    const dist = path.resolve(this.outDir, this.dist);
    // let indexPath: string | null = null;

    // this file produces the final js file
    const indexJSEntryFile = path.resolve(this.outDir, 'index.js');
    // this file is used to npm install dependencies
    const packageJSONPath = path.resolve(this.outDir, 'package.json');

    // this file is the final html file served to the user
    const indexHTMLFile = path.join(dist, 'index.html');

    try {
      info('Bundling esbuild...');
      const indexImports = (await packagesWithModels).map(({
        packageDirectoryName,
        modelName,
      }) => path.join('@upscalerjs', packageDirectoryName, modelName));
      await Promise.all([
        writePackageJSON(packageJSONPath),
        writeIndex(indexJSEntryFile, indexImports),
        await writeFile(
          indexHTMLFile,
          await getTemplate('index.html.ejs'),
        ),
      ]);

      if (skipNpmInstall !== true) {
        await removePackages(path.resolve(this.outDir, 'node_modules'), this.packages);
        await pnpmInstall(this.outDir, {
          // isSilent: getLogLevel() !== 'verbose',
          // registryURL,
        });
      }

      info(`Bundle the code for entry file ${indexJSEntryFile}`)
      await esbuild({
        entryPoints: [indexJSEntryFile],
        absWorkingDir: this.outDir,
        bundle: true,
        loader: {
          '.png': 'file',
        },
        outdir: dist,
      });
      info(`successfully bundled the code for entry file ${indexJSEntryFile}`);

      info(`Bundled esbuild successfully to ${dist}`);
    } finally {
      if (keepWorkingFiles !== true) {
        await Promise.all([
          packageJSONPath,
          indexJSEntryFile,
        ].map(removeIfExists));
      }
    }
  }
}
