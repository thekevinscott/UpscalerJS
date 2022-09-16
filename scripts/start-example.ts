/*****
 * This script spins up a local instance of a particular example, and sets up a watch command to build UpscalerJS.
 */

import fs from 'fs';
import path from 'path';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import kill from 'tree-kill';
import chokidar from 'chokidar';
import yargs from 'yargs';
import { getString } from './package-scripts/prompt/getString';
import callExec, { runProcess } from '../test/lib/utils/callExec';
import buildUpscaler from './package-scripts/build-upscaler';

/****
 * Type Definitions
 */

type OnChange = (src: string) => (e: Array<any>) => void;
type Platform = 'browser' | 'node' | 'node-gpu';

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

const startExample = async (exampleDirectory: string, skipBuild?: boolean) => {
  const exampleDirectoryPath = path.resolve(ROOT_DIR, 'examples', exampleDirectory);
  try {
    fs.accessSync(exampleDirectoryPath);
  } catch(err) {
    console.log(`Directory ${exampleDirectory} does not exist. Make sure you are specifying a valid folder in the ./examples folder`)
    process.exit(1)
  }

  // get package name from directory
  const packageJSON = JSON.parse(fs.readFileSync(path.resolve(exampleDirectoryPath, 'package.json'), 'utf8'));
  const exampleName = packageJSON.name;
  const platform = getPlatform(packageJSON);

  if (skipBuild !== true) {
    buildUpscaler(platform);
  }

  let childProcess = callExec(`pnpm --filter ${exampleName} dev`, true, true);
  while (childProcess) {

  }
  // let childProcess: ChildProcessWithoutNullStreams;
  // const onChange: OnChange = () => () => {
  //   if (childProcess?.pid) {
  //     kill(childProcess.pid);
  //   }
  //   childProcess = runProcess(getProcessCommand(platform, exampleName, skipBuild).join(' '));
  // };
  // chokidar.watch(path.resolve(__dirname, '../packages/upscalerjs/src'), {
  //   ignored: /((^|[\/\\])\..|test.ts|generated.ts)/, // ignore dotfiles
  //   persistent: true
  // }).on('all', onChange('upscalerjs'));
  // chokidar.watch(exampleDirectoryPath, {
  //   ignored: /((^|[\/\\])\..|node_modules|dist)/, // ignore dotfiles and other folders
  //   persistent: true
  // }).on('all', onChange('example'));
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
