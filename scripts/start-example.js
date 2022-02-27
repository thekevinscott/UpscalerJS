/*****
 * This script spins up a local instance of a particular example, and sets up a watch command to build UpscalerJS.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const kill = require('tree-kill');
const chokidar = require('chokidar');


const exampleDirectory = process.argv.pop();

try {
  fs.accessSync(`./examples/${exampleDirectory}`);
} catch(err) {
  console.log(`Directory ${exampleDirectory} does not exist. Make sure you are specifying a valid folder in the ./examples folder`)
  process.exit(1)
}

const runProcess = (command, args = []) => {
  const spawnedProcess = spawn(command, args, { shell: true });

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
}

const getPlatform = () => {
  const deps = Object.keys(packageJSON.dependencies);
  if (deps.includes('@tensorflow/tfjs')) {
    return 'browser';
  } else if (deps.includes('@tensorflow/tfjs-node')) {
    return 'node';
  } else if (deps.includes('@tensorflow/tfjs-node-gpu')) {
    return 'node-gpu';
  }

  throw new Error('Could not determine valid TFJS dependency in example package.json')
}

// get package name from directory
const packageJSON = JSON.parse(fs.readFileSync(`./examples/${exampleDirectory}/package.json`, 'utf8'));
const exampleName = packageJSON.name;
const examplePath = path.resolve(__dirname, `../examples/${exampleName}`);
const platform = getPlatform();

const main = () => {
  let process;
  const onChange = src => (...e) => {
    if (process) {
      kill(process.pid);
    }
    const args = ['yarn', 'workspace', 'upscaler', `build:${platform}`, '&&', 'yarn', 'workspace', exampleName, 'start'];
    process = runProcess(args.join(' '));
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
