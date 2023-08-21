import path from 'path';
import buildUpscaler from '../../lib/package-scripts/build-upscaler.js';
import { EXAMPLES_DIR, isValidGuide } from '../../lib/guides/isValidGuide.js';
import { runNPMCommand } from '../../lib/utils/run-npm-command.js';
import { pluralize } from '../../lib/utils/pluralize.js';
import { getTFJSLibraryTarget } from '../../lib/utils/get-tfjs-library-target.js';
import { getAllDirectories } from '../../lib/utils/get-all-directories.js';
import { findSimilarFiles } from '../../lib/utils/find-similar-files.js';

interface Options {
  verbose?: boolean;
  skipUpscalerBuild?: boolean;
}

type Action<T extends unknown[]> = (...args: T) => Promise<void>;

export const start: Action<[string, Options]> = async (guide, { skipUpscalerBuild, verbose, }) => {
  console.log(`Starting guide: "${guide}"`);
  if (!await isValidGuide(guide)) {
    const examples = await getAllDirectories(EXAMPLES_DIR);
    const similarFiles = await findSimilarFiles(examples, guide, { n: 3, distance: 5 });

    throw new Error([
      `"${guide}" is not a valid guide, and was not found in the examples directory.`,
      similarFiles.length > 0 ? `Did you mean ${pluralize(similarFiles)}?` : undefined,
    ].filter(Boolean).join(' '));
  }

  const guidePath = path.resolve(EXAMPLES_DIR, guide);

  // get package name from directory
  const platform = await getTFJSLibraryTarget(guidePath);

  if (skipUpscalerBuild !== true) {
    await buildUpscaler(platform);
    if (verbose) {
      console.log(`** built upscaler: ${platform}`)
    }
  }

  await runNPMCommand(['install', '--no-package-lock'], guidePath);
  await runNPMCommand(['run', 'dev'], guidePath);
}
