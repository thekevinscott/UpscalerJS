/*****
 * This script spins up a local instance of a particular example, and sets up a watch command to build UpscalerJS.
 */

import fs from 'fs';
import path from 'path';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import kill from 'tree-kill';
import chokidar from 'chokidar';
import yargs from 'yargs';

type OnChange = (src: string) => (e: Array<any>) => void;

const runProcess = (command: string) => {
  const spawnedProcess = spawn(command, { shell: true });

  spawnedProcess.stdout.on('data', (data) => {
    process.stdout.write(data.toString());
  });

  spawnedProcess.stderr.on('data', (data) => {
    process.stderr.write(data.toString());
  });

  spawnedProcess.on('exit', (data) => {
    if (data) {
      process.stderr.write(data.toString());
    }
  });

  return spawnedProcess;
};

type Platform = 'browser' | 'node' | 'node-gpu';
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

const getArgs = (platform: Platform, exampleName: string, skipBuild?: boolean) => {
  if (skipBuild) {
    return ['pnpm', '--filter', exampleName, 'start'];
  }
  return ['pnpm', '--filter', 'upscaler', `build:${platform}`, '&&', 'pnpm', '--filter', exampleName, 'start'];
};

const main = async () => {
  const argv = await yargs(process.argv.slice(2)).options({
    skipBuild: { type: 'boolean' },
  }).argv;
  const exampleDirectory = argv._.pop();

  try {
    fs.accessSync(`./examples/${exampleDirectory}`);
  } catch(err) {
    console.log(`Directory ${exampleDirectory} does not exist. Make sure you are specifying a valid folder in the ./examples folder`)
    process.exit(1)
  }

  // get package name from directory
  const packageJSON = JSON.parse(fs.readFileSync(`./examples/${exampleDirectory}/package.json`, 'utf8'));
  const exampleName = packageJSON.name;
  const examplePath = path.resolve(__dirname, `../examples/${exampleName}`);
  const platform = getPlatform(packageJSON);

  let childProcess: ChildProcessWithoutNullStreams;
  const onChange: OnChange = () => () => {
    if (childProcess) {
      kill(childProcess.pid);
    }
    childProcess = runProcess(getArgs(platform, exampleName, argv.skipBuild).join(' '));
  };
  chokidar.watch(path.resolve(__dirname, '../packages/upscalerjs/src'), {
    ignored: /((^|[\/\\])\..|test.ts|generated.ts)/, // ignore dotfiles
    persistent: true
  }).on('all', onChange('upscalerjs'));
  chokidar.watch(examplePath, {
    ignored: /((^|[\/\\])\..|node_modules|dist)/, // ignore dotfiles and other folders
    persistent: true
  }).on('all', onChange('example'));
};

main();
