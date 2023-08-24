import { Command } from '@commander-js/extra-typings';
import path from 'path';
import { EXAMPLES_DIR, isValidGuide } from '../../lib/guides/isValidGuide.js';
import { runNPMCommand } from '@internals/common/npm';
import { pluralize } from '@internals/common/pluralize';
import { getTFJSLibraryTargetFromPackageJSON } from '@internals/common/tfjs-library';
import { getAllDirectories } from '../../lib/utils/get-all-directories.js';
import { findSimilarFiles } from '../../lib/utils/find-similar-files.js';
import { info, output, verbose } from '@internals/common/logger';
import { Action } from '@internals/common/types';
import { buildUpscaler } from '../build/upscaler.js';

interface Options {
  skipUpscalerBuild?: boolean;
}

export const startAction: Action<[string, Options]> = async (guide, { skipUpscalerBuild, }) => {
  info(`Starting guide: "${guide}"`)
  if (!await isValidGuide(guide)) {
    const examples = await getAllDirectories(EXAMPLES_DIR);
    const similarFiles = await findSimilarFiles(examples, guide, { n: 3, distance: 5 });

    throw new Error([
      `"${guide}" is not a valid guide, and was not found in the examples directory.`,
      similarFiles.length > 0 ? `Did you mean ${pluralize(similarFiles)}?` : undefined,
    ].filter(Boolean).join(' '));
  }

  await start(guide, { skipUpscalerBuild });
}

export const start = async (guide: string, { skipUpscalerBuild }: Options) => {
  const guidePath = path.resolve(EXAMPLES_DIR, guide);

  // get package name from directory
  const tfjsLibrary = await getTFJSLibraryTargetFromPackageJSON(guidePath);

  if (skipUpscalerBuild !== true) {
    await buildUpscaler([{
      tfjsLibrary,
    }]);
    verbose(`** built upscaler: ${tfjsLibrary}`)
  }

  await runNPMCommand(['install', '--no-package-lock'], guidePath);
  await runNPMCommand(['run', 'dev'], guidePath);
}

export default (program: Command) => program.command('guide')
    .description('Start a guide')
    .argument('<string>', 'guide to start')
    .option('-u, --skipUpscalerBuild', 'if true, skip building UpscalerJS when starting up')
    .action(start);

