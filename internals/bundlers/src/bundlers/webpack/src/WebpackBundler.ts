import * as url from 'url';
import path from 'path';
import { BundleOptions, Bundler, } from '../../../utils/Bundler.js';
import webpack, { Configuration, WebpackPluginInstance, } from 'webpack';
import { getTFJSVersion, } from '../../../utils/get-tfjs-version.js';
import { getPackagesForRegistry, } from '../../../utils/get-packages-for-registry.js';
import { removeIfExists, } from '../../../utils/remove-if-exists.js';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { removePackages, } from '../../../shared/remove-packages.js';
import { getPackagesAndModelsForEnvironment, } from '@internals/common/models';
import { info, verbose, } from '@internals/common/logger';
import { getTemplate as _getTemplate, } from '@internals/common/get-template';
import { copyFile, writeFile, } from '@internals/common/fs';
import { getHashedName, } from '@internals/common/get-hashed-name';
import { pnpmInstall, } from '@internals/common/npm';

/***
 * Constants
 */

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const WEBPACK_ROOT_FOLDER = path.join(__dirname, '..');
const WEBPACK_TEMPLATES_DIR = path.resolve(WEBPACK_ROOT_FOLDER, '_templates');
const packagesWithModels = getPackagesAndModelsForEnvironment('clientside');

/***
 * Functions
 */

const getTemplate = (
  templateName: string,
  args: Parameters<typeof _getTemplate>[1] = {}
) => _getTemplate(path.resolve(WEBPACK_TEMPLATES_DIR, templateName), args);

const compile = (compiler: webpack.Compiler) => new Promise<void>((resolve, reject) => compiler.run((err, stats) => {
  if (err) {
    return reject(err);
  }
  if (stats?.hasErrors()) {
    return reject(new Error(stats?.toJson('errors-only').errors?.map(e => e.message).join('\n')));
  }
  return resolve();
}));

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

const writePackageJSON = async (outFile: string) => {
  const packages = await PACKAGES;
  const tfjsVersion = await getTFJSVersion();
  const dependencies = JSON.stringify(packages.reduce((obj, { name, }) => ({
    ...obj,
    [name]: 'workspace:*',
  }), {
    "upscaler": "workspace:*",
    "@tensorflow/tfjs": tfjsVersion,
  }), null, 2);
  const contents = await getTemplate('package.json.ejs', {
    dependencies,
  });
  await writeFile(outFile, contents);
};

export class WebpackBundler extends Bundler {
  port = 0;
  packages = PACKAGES;

  get name() { // skipcq: JS-0105
    return 'webpack bundler';
  }

  async bundle({ keepWorkingFiles, skipNpmInstall, }: BundleOptions = {}) {
    const dist = path.resolve(this.outDir, this.dist);
    const indexJSFile = path.resolve(this.outDir, 'index.js');
    const packageJSONPath = path.resolve(this.outDir, 'package.json');
    const indexHTMLFile = path.resolve(this.outDir, 'index.html');

    try {
      info('Bundling Webpack...');

      const indexImports = (await packagesWithModels).map(({
        packageDirectoryName,
        modelName,
      }) => path.join('@upscalerjs', packageDirectoryName, modelName));
      await Promise.all([
        writePackageJSON(packageJSONPath),
        writeIndex(indexJSFile, indexImports),
        copyFile(
          path.resolve(WEBPACK_TEMPLATES_DIR, 'index.html.ejs'),
          indexHTMLFile,
        ),
      ]);

      if (skipNpmInstall !== true) {
        info(`PNPM Install to ${this.outDir}...`);
        await pnpmInstall(this.outDir);
      }

      info(`Bundle the code for entry file ${indexJSFile}`);

      const htmlWebpackPlugin: WebpackPluginInstance = new HtmlWebpackPlugin({
        title: 'UpscalerJS Integration Test: ESM via Webpack',
        template: indexHTMLFile,
      });

      const config: Configuration = {
        mode: 'production',
        context: this.outDir,
        entry: indexJSFile,
        stats: 'errors-only',
        plugins: [htmlWebpackPlugin,],
        output: {
          path: dist,
        },
        module: {
          rules: [
            {
              test: /\.(png|svg|jpg|jpeg|gif|json|bin)$/i,
              type: 'asset/resource',
            },
          ],
        },
      };

      const compiler = webpack(config);

      verbose('Running webpack compiler');
      await compile(compiler);

      info(`successfully bundled the code for entry file ${indexJSFile}`);
    } finally {
      if (keepWorkingFiles !== true) {
        await Promise.all([
          packageJSONPath,
          indexHTMLFile,
          indexJSFile,
        ].map(removeIfExists));
      }
    }
  }
}

