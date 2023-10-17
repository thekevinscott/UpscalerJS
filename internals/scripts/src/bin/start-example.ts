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

const startExample = (example: string) => {
  const examplePath = path.resolve(EXAMPLES_DIR, example);

  const command = 'npm install --force --no-package-lock && npm run dev'.split(' ');

  return spawn(command[0], command.slice(1), {
    shell: true,
    cwd: examplePath,
    stdio: "inherit"
  });
};


const isValidExample = async (exampleDirectory: string) => {
  const examplePath = path.resolve(EXAMPLES_DIR, exampleDirectory);
  return await exists(examplePath) && (await stat(examplePath)).isDirectory();
};

const main = async () => {
  const {
    positionals: [
      exampleDirectory,
    ]
  } = parseArgs({
    allowPositionals: true,
  });

  if (!await isValidExample(exampleDirectory)) {
    throw new Error(`Example directory does not exist: "${exampleDirectory}"`);
  }
  startExample(exampleDirectory);
};

main();
