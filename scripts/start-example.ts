/*****
 * This script spins up a local instance of a particular example, and sets up a watch command to build UpscalerJS.
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import yargs from 'yargs';
import { getString } from './package-scripts/prompt/getString';
import buildUpscaler from './package-scripts/build-upscaler';
import { Platform } from './package-scripts/prompt/types';

/****
 * Type Definitions
 */

/****
 * Constants
 */
const ROOT_DIR = path.resolve(__dirname, '..');

/****
 * Utility functions
 */
const getPlatform = (packageJSON: Record<string, any>): Platform => {
  const deps = Object.keys(packageJSON.dependencies);
  if (deps.includes('@tensorflow/tfjs')) {
    return 'browser';
  } else if (deps.includes('@tensorflow/tfjs-node')) {
    return 'node';
  } else if (deps.includes('@tensorflow/tfjs-node-gpu')) {
    return 'node-gpu';
  }

  throw new Error('Could not determine valid TFJS dependency in example package.json')
};

const getExampleInfo = (examplePath: string) => {
  const packageJSON = JSON.parse(fs.readFileSync(path.resolve(examplePath, 'package.json'), 'utf8'));
  const exampleName = packageJSON.name;
  const platform = getPlatform(packageJSON);

  return {
    exampleName,
    platform,
  };
}

/****
 * Main function
 */

const getProcessCommand = (platform: Platform, exampleName: string, skipBuild?: boolean) => {
  const startCommand = ['pnpm', '--filter', exampleName, 'start']
  if (skipBuild) {
    return startCommand;
  }
  return [
    'pnpm', '--filter', 'upscaler', `build:${platform}`, '&&',
    ...startCommand
  ];
};

const startExample = async (example: string, skipBuild?: boolean) => {
  const examplePath = path.resolve(ROOT_DIR, 'examples', example);
  try {
    fs.accessSync(examplePath);
  } catch(err) {
    console.log(`Directory ${example} does not exist. Make sure you are specifying a valid folder in the ./examples folder`)
    process.exit(1)
  }

  // get package name from directory
  const { platform } = getExampleInfo(examplePath);

  if (skipBuild !== true) {
    await buildUpscaler(platform);
    console.log(`** built upscaler: ${platform}`)
  }

  spawn("npm", ['install', '&&', 'npm', 'run', 'dev'], {
    shell: true,
    cwd: examplePath,
    stdio: "inherit"
  });
};


/****
 * Functions to expose the main function as a CLI tool
 */
type Answers = { exampleDirectory: string, skipBuild?: boolean }

const getArgs = async (): Promise<Answers> => {
  const argv = await yargs(process.argv.slice(2)).options({
    skipBuild: { type: 'boolean' },
  }).help().argv;

  const exampleDirectory = await getString('Which hdf5 model do you want to build?', argv._[0]);

  return { exampleDirectory, skipBuild: argv.skipBuild };
}

if (require.main === module) {
  (async () => {
    const { exampleDirectory, skipBuild } = await getArgs();

    await startExample(exampleDirectory, skipBuild);
  })();
}
