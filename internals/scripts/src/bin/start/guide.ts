/*****
 * This script spins up a local instance of a particular example, and sets up a watch command to build UpscalerJS.
 */

import path from 'path';
import { spawn } from 'child_process';
import { EXAMPLES_DIR } from '@internals/common/constants';
import { stat, exists } from '@internals/common/fs';
import { parseArgs } from "node:util";

/****
 * Main function
 */

const startGuide = (guide: string) => {
  const guidePath = path.resolve(EXAMPLES_DIR, guide);

  const command = 'npm install --force --no-package-lock && npm run dev'.split(' ');

  return spawn(command[0], command.slice(1), {
    shell: true,
    cwd: guidePath,
    stdio: "inherit"
  });
};


const isValidGuide = async (exampleDirectory: string) => {
  const guidePath = path.resolve(EXAMPLES_DIR, exampleDirectory);
  return await exists(guidePath) && (await stat(guidePath)).isDirectory();
};

const main = async () => {
  const {
    positionals: [
      guideDirectory,
    ]
  } = parseArgs({
    allowPositionals: true,
  });

  if (!await isValidGuide(guideDirectory)) {
    throw new Error(`Guide directory does not exist: "${guideDirectory}"`);
  }
  startGuide(guideDirectory);
};

main();
