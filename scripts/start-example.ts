/*****
 * This script spins up a local instance of a particular example, and sets up a watch command to build UpscalerJS.
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import yargs from 'yargs';
import { getString } from './package-scripts/prompt/getString';
import { Platform } from './package-scripts/prompt/types.mjs';
import { EXAMPLES_DIR } from './package-scripts/utils/constants';

/****
 * Utility functions
 */
const parseCommand = (_command: string | string[]) => {
  const command = Array.isArray(_command) ? _command : _command.split(' ');
  if (command[0] === 'npm' || command[0] === 'pnpm') {
    return command.slice(1);
  }
  return command;
};

export const runPNPMScript = (
  command: string | string[],
  cwd: string,
  runner: 'npm' | 'pnpm' = 'npm',
) => new Promise<void>((resolve, reject) => {
  const child = spawn(runner, parseCommand(command), {
    shell: true,
    cwd,
    stdio: "inherit"
  });

  child.on('error', reject);

  child.on('close', (code) => {
    if (code === 0) {
      resolve();
    } else {
      reject(code);
    }
  });
});

/****
 * Main function
 */

const startExample = async (example: string) => {
  const examplePath = path.resolve(EXAMPLES_DIR, example);
  try {
    fs.accessSync(examplePath);
  } catch(err) {
    console.log(`Directory ${example} does not exist. Make sure you are specifying a valid folder in the ./examples folder`)
    process.exit(1)
  }

  spawn("npm", ['install', '--no-package-lock', '&&', 'npm', 'run', 'dev'], {
    shell: true,
    cwd: examplePath,
    stdio: "inherit"
  });
};


/****
 * Functions to expose the main function as a CLI tool
 */
type Answers = { exampleDirectory: string }

const getArgs = async (): Promise<Answers> => {
  const argv = await yargs(process.argv.slice(2)).options({
  }).help().argv;

  const exampleDirectory = await getString('Which example do you want to start?', argv._[0]);

  return { exampleDirectory, };
}

if (require.main === module) {
  (async () => {
    const { exampleDirectory } = await getArgs();

    await startExample(exampleDirectory);
  })();
}
