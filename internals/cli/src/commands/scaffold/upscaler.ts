import { Command } from '@commander-js/extra-typings';
import path from 'path';
import { getEnvironmentFromTFJSLibrary, getTFJSLibraryFromTarget } from '@internals/common/tfjs-library';
import { verbose } from '@internals/common/logger';
import { Environment, TFJSLibrary, isTFJSLibrary } from '@internals/common/types';
import { findEnvironmentSpecificFiles } from '../../lib/utils/find-environment-specific-files.js';
import { writeFile } from '@internals/common/fs';
import { symlinkEnvironmentSpecificFile } from '../../lib/utils/symlink-environment-specific-file.js';
import { UPSCALER_DIR } from '@internals/common/constants';

const SRC = path.resolve(UPSCALER_DIR, 'src');

const getFileExtensionForEnvironment = (environment: Environment) => environment === 'clientside' ? 'browser' : 'node';
const filterFileForEnvironment = (environment: Environment) => (file: string) => file.endsWith(`${getFileExtensionForEnvironment(environment)}.ts`);

export const scaffoldUpscaler = async (tfjsLibrary: TFJSLibrary) => {
  /**
   * For all files in the upscaler src directory that are environment specific,
   * (i.e., ending in .browser.ts or node.ts), create a symlink to the appropriate
   * file for the environment.
   */
  const environment = getEnvironmentFromTFJSLibrary(tfjsLibrary);
  const environmentSpecificFiles = await findEnvironmentSpecificFiles(SRC);
  const filesForEnvironment = environmentSpecificFiles.filter(filterFileForEnvironment(environment));
  const scaffoldedFiles = await Promise.all(filesForEnvironment.map(file => symlinkEnvironmentSpecificFile(SRC, file, tfjsLibrary)));
  if (filesForEnvironment.length) {
    verbose([
      'Scaffolded the following files:',
      ...Array.from(scaffoldedFiles).map(file => `- ${file}`),
    ].join('\n'))
  } else {
    verbose(`Did not scaffold any files for environment ${environment}`);
  }

  const tfjs = getTFJSLibraryFromTarget(tfjsLibrary);

  /**
   * Create a dependencies.generated.ts file that exports the appropriate tfjs library and model
   */
  await writeFile(path.resolve(SRC, `dependencies.generated.ts`), [
    `export * as tf from '${tfjs}';`,
    "export { default as DefaultUpscalerModel } from '@upscalerjs/default-model';",
  ].join('\n'));
  verbose('- dependencies.generated.ts');
};

export default (program: Command) => program.command('upscaler')
  .description('Scaffold UpscalerJS')
  .argument('tfjs-library', 'The TFJS Library to scaffold for. browser, node, or node-gpu')
  .action((
    tfjsLibrary,
  ) => {
    if (!isTFJSLibrary(tfjsLibrary)) {
      throw new Error('tfjsLibrary must be either browser, node or node-gpu')
    }
    return scaffoldUpscaler(tfjsLibrary);
  });
